from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import PlatformUserRecord, PlatformWorkspaceRecord, ProviderConfigRecord
from app.platform_auth import ensure_platform_workspace, ensure_workspace_membership, get_workspace_ids_for_user
from app.platform_models import Membership, ProviderConfig, User, Workspace


def sync_legacy_workspace_membership(
    session: Session,
    *,
    user: User,
    workspace_id: str,
    workspace_name: str,
) -> None:
    workspace = ensure_platform_workspace(
        session,
        workspace_id=workspace_id,
        name=workspace_name,
    )
    session.flush()
    ensure_workspace_membership(
        session,
        user_id=user.id,
        workspace_id=workspace.id,
        role="owner",
    )


def build_platform_user_record(session: Session, user: User) -> PlatformUserRecord:
    return PlatformUserRecord(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active,
        workspace_ids=get_workspace_ids_for_user(session, user.id),
        created_at=user.created_at.isoformat(),
    )


def list_platform_workspaces_for_user(session: Session, user: User) -> list[PlatformWorkspaceRecord]:
    workspace_ids = get_workspace_ids_for_user(session, user.id)
    if not workspace_ids:
        return []
    rows = session.execute(
        select(Workspace).where(Workspace.id.in_(workspace_ids)).order_by(Workspace.created_at.asc())
    ).scalars()
    return [
        PlatformWorkspaceRecord(
            id=row.id,
            name=row.name,
            created_at=row.created_at.isoformat(),
            updated_at=row.updated_at.isoformat(),
        )
        for row in rows
    ]


def create_provider_config(
    session: Session,
    *,
    workspace_id: str,
    provider_name: str,
    encrypted_secret: str | None,
    model_policy: dict[str, object],
) -> ProviderConfigRecord:
    config = ProviderConfig(
        id=f"pcfg-{uuid4().hex[:12]}",
        workspace_id=workspace_id,
        provider_name=provider_name.strip(),
        encrypted_secret=encrypted_secret,
        model_policy_json=model_policy,
        is_active=True,
    )
    session.add(config)
    session.flush()
    return build_provider_config_record(config)


def list_provider_configs(session: Session, *, workspace_id: str) -> list[ProviderConfigRecord]:
    rows = session.execute(
        select(ProviderConfig).where(ProviderConfig.workspace_id == workspace_id).order_by(ProviderConfig.created_at.desc())
    ).scalars()
    return [build_provider_config_record(row) for row in rows]


def get_provider_config(session: Session, config_id: str) -> ProviderConfigRecord | None:
    config = session.execute(select(ProviderConfig).where(ProviderConfig.id == config_id)).scalar_one_or_none()
    if config is None:
        return None
    return build_provider_config_record(config)


def delete_provider_config(session: Session, config_id: str) -> ProviderConfigRecord | None:
    config = session.execute(select(ProviderConfig).where(ProviderConfig.id == config_id)).scalar_one_or_none()
    if config is None:
        return None
    record = build_provider_config_record(config)
    session.delete(config)
    return record


def build_provider_config_record(config: ProviderConfig) -> ProviderConfigRecord:
    return ProviderConfigRecord(
        id=config.id,
        workspace_id=config.workspace_id,
        provider_name=config.provider_name,
        encrypted_secret=config.encrypted_secret,
        model_policy=config.model_policy_json,
        is_active=config.is_active,
        created_at=config.created_at.isoformat(),
    )
