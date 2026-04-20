from __future__ import annotations

from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.platform_auth import ensure_platform_workspace, ensure_workspace_membership, get_user_by_email, hash_password
from app.platform_models import Matter, Playbook, User
from app.platform_review import sync_platform_playbooks
from app.settings import get_settings


SETTINGS = get_settings()


def seed_platform_dev_data(session: Session) -> None:
    user = get_user_by_email(session, SETTINGS.dev_user_email)
    if user is None:
        user = User(
            id=f"user-{uuid4().hex[:12]}",
            email=SETTINGS.dev_user_email,
            full_name="Skua Founder",
            password_hash=hash_password(SETTINGS.dev_user_password),
        )
        session.add(user)
        session.flush()

    workspace = ensure_platform_workspace(
        session,
        workspace_id="project-redwood",
        name="Project Redwood",
    )
    session.flush()
    ensure_workspace_membership(
        session,
        user_id=user.id,
        workspace_id=workspace.id,
        role="owner",
    )

    matter = session.execute(
        select(Matter).where(Matter.id == "matter-redwood")
    ).scalar_one_or_none()
    if matter is None:
        session.add(
            Matter(
                id="matter-redwood",
                workspace_id=workspace.id,
                name="Project Redwood",
                represented_party="Buyer",
                jurisdiction="Ontario",
            )
        )

    sync_platform_playbooks(session)
