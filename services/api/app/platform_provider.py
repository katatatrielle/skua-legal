from __future__ import annotations

import base64
import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    PlatformSpendEstimateRecord,
    PlatformUsageLedgerRecord,
    PlatformUsageSummaryRecord,
)
from app.platform_models import ProviderConfig, UsageLedger
from app.settings import get_settings


SETTINGS = get_settings()

MODEL_PRICING = {
    "gpt-5.4-mini": {"input_per_1k": 0.0006, "output_per_1k": 0.0018},
    "gpt-5.4": {"input_per_1k": 0.0030, "output_per_1k": 0.0090},
    "text-embedding-3-small": {"input_per_1k": 0.00002, "output_per_1k": 0.0},
}
SUPPORTED_PROVIDERS = {
    "openai": {
        "hosted_models": {"review": "gpt-5.4-mini", "ask": "gpt-5.4-mini", "revise": "gpt-5.4-mini", "embeddings": "text-embedding-3-small"},
        "byok_prefixes": ("sk-",),
    }
}
DEFAULT_POLICY = {
    "review": "gpt-5.4-mini",
    "ask": "gpt-5.4-mini",
    "revise": "gpt-5.4-mini",
    "embeddings": "text-embedding-3-small",
    "monthly_warning_usd": 25.0,
    "monthly_hard_cap_usd": 100.0,
    "per_run_max_estimate_usd": 5.0,
    "plan": "hosted",
}


@dataclass(frozen=True)
class ProviderRuntime:
    provider: str
    model: str
    plan_type: str
    warning_threshold: float
    hard_cap: float
    per_run_limit: float
    config_id: str | None


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def encrypt_secret(secret: str | None) -> str | None:
    if not secret:
        return None
    key = hashlib.sha256(SETTINGS.encryption_secret.encode("utf-8")).digest()
    raw = secret.encode("utf-8")
    encrypted = bytes(byte ^ key[index % len(key)] for index, byte in enumerate(raw))
    return base64.urlsafe_b64encode(encrypted).decode("ascii")


def decrypt_secret(secret: str | None) -> str | None:
    if not secret:
        return None
    key = hashlib.sha256(SETTINGS.encryption_secret.encode("utf-8")).digest()
    encrypted = base64.urlsafe_b64decode(secret.encode("ascii"))
    raw = bytes(byte ^ key[index % len(key)] for index, byte in enumerate(encrypted))
    return raw.decode("utf-8")


def validate_provider_config(*, provider_name: str, raw_secret: str | None, model_policy: dict[str, object]) -> tuple[str, dict[str, object]]:
    provider = provider_name.strip().lower()
    if provider not in SUPPORTED_PROVIDERS:
        raise ValueError(f"Unsupported provider '{provider_name}'.")
    policy = normalize_model_policy(model_policy)
    requested_plan = str(policy.get("plan") or "").strip().lower()
    prefixes = SUPPORTED_PROVIDERS[provider]["byok_prefixes"]
    if requested_plan == "byok" or (raw_secret and raw_secret.startswith(prefixes)):
        plan_type = "byok"
    else:
        plan_type = "hosted"
    if plan_type not in {"hosted", "byok"}:
        raise ValueError("Provider plan must be 'hosted' or 'byok'.")
    if plan_type == "byok":
        if not raw_secret:
            raise ValueError("BYOK requires a provider secret.")
        if not raw_secret.startswith(prefixes):
            raise ValueError(f"{provider_name} keys must start with {prefixes[0]}.")
    for capability in ("review", "ask", "revise", "embeddings"):
        model = str(policy.get(capability) or "")
        if model and model not in MODEL_PRICING:
            raise ValueError(f"Unsupported model '{model}' for {capability}.")
    policy["plan"] = plan_type
    return plan_type, policy


def normalize_model_policy(model_policy: dict[str, object] | None) -> dict[str, object]:
    policy = {**DEFAULT_POLICY, **(model_policy or {})}
    return {
        "review": str(policy.get("review") or DEFAULT_POLICY["review"]),
        "ask": str(policy.get("ask") or DEFAULT_POLICY["ask"]),
        "revise": str(policy.get("revise") or DEFAULT_POLICY["revise"]),
        "embeddings": str(policy.get("embeddings") or DEFAULT_POLICY["embeddings"]),
        "monthly_warning_usd": float(policy.get("monthly_warning_usd") or DEFAULT_POLICY["monthly_warning_usd"]),
        "monthly_hard_cap_usd": float(policy.get("monthly_hard_cap_usd") or DEFAULT_POLICY["monthly_hard_cap_usd"]),
        "per_run_max_estimate_usd": float(policy.get("per_run_max_estimate_usd") or DEFAULT_POLICY["per_run_max_estimate_usd"]),
        "plan": str(policy.get("plan") or DEFAULT_POLICY["plan"]),
    }


def resolve_provider_runtime(session: Session, *, workspace_id: str, capability: str) -> ProviderRuntime:
    config = session.execute(
        select(ProviderConfig)
        .where(ProviderConfig.workspace_id == workspace_id, ProviderConfig.is_active.is_(True))
        .order_by(ProviderConfig.created_at.desc())
    ).scalars().first()
    if config is None:
        policy = normalize_model_policy({})
        return ProviderRuntime(
            provider="hosted-openai",
            model=str(policy.get(capability) or DEFAULT_POLICY[capability]),
            plan_type="hosted",
            warning_threshold=float(policy["monthly_warning_usd"]),
            hard_cap=float(policy["monthly_hard_cap_usd"]),
            per_run_limit=float(policy["per_run_max_estimate_usd"]),
            config_id=None,
        )
    policy = normalize_model_policy(config.model_policy_json or {})
    plan_type = "byok" if config.encrypted_secret else str(policy.get("plan") or "hosted")
    return ProviderRuntime(
        provider=config.provider_name,
        model=str(policy.get(capability) or DEFAULT_POLICY.get(capability) or "gpt-5.4-mini"),
        plan_type=plan_type,
        warning_threshold=float(policy["monthly_warning_usd"]),
        hard_cap=float(policy["monthly_hard_cap_usd"]),
        per_run_limit=float(policy["per_run_max_estimate_usd"]),
        config_id=config.id,
    )


def estimate_usage(
    session: Session,
    *,
    workspace_id: str,
    run_type: str,
    runtime: ProviderRuntime,
    input_texts: list[str],
    output_texts: list[str],
) -> PlatformSpendEstimateRecord:
    input_tokens = sum(estimate_tokens(text) for text in input_texts if text)
    output_tokens = sum(estimate_tokens(text) for text in output_texts if text)
    pricing = MODEL_PRICING.get(runtime.model, MODEL_PRICING["gpt-5.4-mini"])
    estimated_cost = round(
        (input_tokens / 1000.0) * float(pricing["input_per_1k"])
        + (output_tokens / 1000.0) * float(pricing["output_per_1k"]),
        6,
    )
    monthly_actual_cost = monthly_actual_cost_total(session, workspace_id=workspace_id)
    monthly_projected_cost = round(monthly_actual_cost + estimated_cost, 6)
    warning = monthly_projected_cost >= runtime.warning_threshold or estimated_cost >= (runtime.per_run_limit * 0.8)
    blocked = monthly_projected_cost > runtime.hard_cap or estimated_cost > runtime.per_run_limit
    if blocked and monthly_projected_cost > runtime.hard_cap:
        message = f"Blocked: monthly projected spend ${monthly_projected_cost:.2f} exceeds the hard cap of ${runtime.hard_cap:.2f}."
    elif blocked:
        message = f"Blocked: estimated run cost ${estimated_cost:.2f} exceeds the per-run limit of ${runtime.per_run_limit:.2f}."
    elif warning:
        message = f"Warning: estimated {run_type} cost is ${estimated_cost:.2f}; projected monthly spend is ${monthly_projected_cost:.2f}."
    else:
        message = f"Estimated {run_type} cost is ${estimated_cost:.2f}."
    return PlatformSpendEstimateRecord(
        workspace_id=workspace_id,
        run_type=run_type,
        provider=runtime.provider,
        model=runtime.model,
        plan_type=runtime.plan_type,
        estimated_input_tokens=input_tokens,
        estimated_output_tokens=output_tokens,
        estimated_cost=estimated_cost,
        monthly_actual_cost=monthly_actual_cost,
        monthly_projected_cost=monthly_projected_cost,
        warning_threshold=runtime.warning_threshold,
        hard_cap=runtime.hard_cap,
        per_run_limit=runtime.per_run_limit,
        warning=warning,
        blocked=blocked,
        message=message,
    )


def enforce_spend_controls(estimate: PlatformSpendEstimateRecord) -> None:
    if estimate.blocked:
        raise ValueError(estimate.message)


def record_usage_ledger(
    session: Session,
    *,
    workspace_id: str,
    run_type: str,
    run_id: str,
    provider: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    estimated_cost: float,
    actual_cost: float,
) -> PlatformUsageLedgerRecord:
    row = UsageLedger(
        id=f"usage-{uuid4().hex[:12]}",
        workspace_id=workspace_id,
        run_type=run_type,
        run_id=run_id,
        provider=provider,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        estimated_cost=estimated_cost,
        actual_cost=actual_cost,
    )
    session.add(row)
    session.flush()
    return build_usage_record(row)


def summarize_usage_for_workspace(session: Session, *, workspace_id: str) -> PlatformUsageSummaryRecord:
    runtime = resolve_provider_runtime(session, workspace_id=workspace_id, capability="review")
    start, end = current_month_window()
    rows = list(
        session.execute(
            select(UsageLedger)
            .where(
                UsageLedger.workspace_id == workspace_id,
                UsageLedger.created_at >= start,
                UsageLedger.created_at < end,
            )
            .order_by(UsageLedger.created_at.desc())
        ).scalars()
    )
    input_tokens = sum(int(row.input_tokens or 0) for row in rows)
    output_tokens = sum(int(row.output_tokens or 0) for row in rows)
    estimated_cost = round(sum(float(row.estimated_cost or 0.0) for row in rows), 6)
    actual_cost = round(sum(float(row.actual_cost or 0.0) for row in rows), 6)
    warning = actual_cost >= runtime.warning_threshold
    over_cap = actual_cost > runtime.hard_cap
    return PlatformUsageSummaryRecord(
        workspace_id=workspace_id,
        month=start.strftime("%Y-%m"),
        plan_type=runtime.plan_type,
        provider=runtime.provider,
        model=runtime.model,
        run_count=len(rows),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        estimated_cost=estimated_cost,
        actual_cost=actual_cost,
        warning_threshold=runtime.warning_threshold,
        hard_cap=runtime.hard_cap,
        per_run_limit=runtime.per_run_limit,
        warning=warning,
        over_cap=over_cap,
        recent_runs=[build_usage_record(row) for row in rows[:10]],
    )


def monthly_actual_cost_total(session: Session, *, workspace_id: str) -> float:
    start, end = current_month_window()
    total = session.execute(
        select(func.coalesce(func.sum(UsageLedger.actual_cost), 0.0)).where(
            UsageLedger.workspace_id == workspace_id,
            UsageLedger.created_at >= start,
            UsageLedger.created_at < end,
        )
    ).scalar_one()
    return round(float(total or 0.0), 6)


def list_usage_anomalies(session: Session) -> list[PlatformUsageLedgerRecord]:
    rows = list(
        session.execute(
            select(UsageLedger)
            .where(
                (UsageLedger.actual_cost >= 5.0) | (UsageLedger.estimated_cost >= 5.0)
            )
            .order_by(UsageLedger.created_at.desc())
        ).scalars()
    )
    return [build_usage_record(row) for row in rows[:20]]


def build_usage_record(row: UsageLedger) -> PlatformUsageLedgerRecord:
    return PlatformUsageLedgerRecord(
        id=row.id,
        workspace_id=row.workspace_id,
        run_type=row.run_type,
        run_id=row.run_id,
        provider=row.provider,
        model=row.model,
        input_tokens=row.input_tokens,
        output_tokens=row.output_tokens,
        estimated_cost=row.estimated_cost,
        actual_cost=row.actual_cost,
        created_at=row.created_at.isoformat(),
    )


def mask_secret(secret: str | None) -> str | None:
    if not secret:
        return None
    raw = decrypt_secret(secret) or ""
    if len(raw) <= 6:
        return "*" * len(raw)
    return f"{raw[:3]}...{raw[-4:]}"


def estimate_tokens(text: str | None) -> int:
    if not text:
        return 0
    normalized = " ".join(text.split())
    return max(1, len(normalized) // 4)


def current_month_window() -> tuple[datetime, datetime]:
    now = utcnow()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end
