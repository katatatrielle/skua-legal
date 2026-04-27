from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.platform_provider import ProviderRuntime, canonical_provider_name, resolve_provider_secret
from app.settings import get_settings


SETTINGS = get_settings()


@dataclass(frozen=True)
class ProviderGeneration:
    text: str
    provider: str
    model: str
    input_tokens: int | None = None
    output_tokens: int | None = None


def generate_provider_text(
    session: Session,
    *,
    workspace_id: str,
    runtime: ProviderRuntime,
    instructions: str,
    prompt: str,
    max_output_tokens: int = 700,
) -> ProviderGeneration | None:
    if SETTINGS.provider_bridge_mode != "live":
        return None
    secret = resolve_provider_secret(session, runtime)
    if not secret:
        return None
    provider = canonical_provider_name(runtime.provider)
    try:
        if provider == "openai":
            return call_openai_responses(
                api_key=secret,
                model=runtime.model,
                instructions=instructions,
                prompt=prompt,
                max_output_tokens=max_output_tokens,
            )
        if provider == "anthropic":
            return call_anthropic_messages(
                api_key=secret,
                model=runtime.model,
                instructions=instructions,
                prompt=prompt,
                max_output_tokens=max_output_tokens,
            )
    except (OSError, urllib.error.HTTPError, urllib.error.URLError, json.JSONDecodeError, KeyError, TypeError, ValueError):
        return None
    return None


def call_openai_responses(
    *,
    api_key: str,
    model: str,
    instructions: str,
    prompt: str,
    max_output_tokens: int,
) -> ProviderGeneration:
    payload = {
        "model": model,
        "instructions": instructions,
        "input": prompt,
        "max_output_tokens": max_output_tokens,
        "store": False,
    }
    response = post_json(
        "https://api.openai.com/v1/responses",
        payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    text = extract_openai_text(response)
    usage = response.get("usage") if isinstance(response.get("usage"), dict) else {}
    return ProviderGeneration(
        text=text,
        provider="openai",
        model=str(response.get("model") or model),
        input_tokens=optional_int(usage.get("input_tokens")),
        output_tokens=optional_int(usage.get("output_tokens")),
    )


def call_anthropic_messages(
    *,
    api_key: str,
    model: str,
    instructions: str,
    prompt: str,
    max_output_tokens: int,
) -> ProviderGeneration:
    payload = {
        "model": model,
        "system": instructions,
        "max_tokens": max_output_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    response = post_json(
        "https://api.anthropic.com/v1/messages",
        payload,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
    )
    text = "\n".join(
        str(item.get("text") or "")
        for item in response.get("content", [])
        if isinstance(item, dict) and item.get("type") == "text"
    ).strip()
    if not text:
        raise ValueError("Anthropic response did not include text content.")
    usage = response.get("usage") if isinstance(response.get("usage"), dict) else {}
    return ProviderGeneration(
        text=text,
        provider="anthropic",
        model=str(response.get("model") or model),
        input_tokens=optional_int(usage.get("input_tokens")),
        output_tokens=optional_int(usage.get("output_tokens")),
    )


def post_json(url: str, payload: dict[str, object], *, headers: dict[str, str]) -> dict[str, object]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=SETTINGS.provider_request_timeout_seconds) as response:
        return json.loads(response.read().decode("utf-8"))


def extract_openai_text(response: dict[str, object]) -> str:
    output_text = response.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()
    parts: list[str] = []
    for item in response.get("output", []):
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []):
            if isinstance(content, dict) and content.get("type") in {"output_text", "text"}:
                text = content.get("text")
                if isinstance(text, str):
                    parts.append(text)
    text = "\n".join(parts).strip()
    if not text:
        raise ValueError("OpenAI response did not include text output.")
    return text


def optional_int(value: object) -> int | None:
    if value is None:
        return None
    return int(value)
