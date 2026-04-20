from __future__ import annotations

import base64
import hashlib
import hmac
import os
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.platform_db import platform_session
from app.platform_models import Membership, User, Workspace
from app.settings import get_settings


SETTINGS = get_settings()
WORKSPACE_ROLES = {"owner", "admin", "member"}


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt_b64, digest_b64 = password_hash.split("$", 1)
    except ValueError:
        return False

    salt = base64.b64decode(salt_b64.encode())
    expected = base64.b64decode(digest_b64.encode())
    candidate = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return hmac.compare_digest(candidate, expected)


def create_access_token(user: User) -> str:
    issued_at = datetime.now(UTC)
    payload = {
        "sub": user.id,
        "email": user.email,
        "iss": SETTINGS.jwt_issuer,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + timedelta(days=7)).timestamp()),
    }
    return jwt.encode(payload, SETTINGS.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SETTINGS.jwt_secret, algorithms=["HS256"], issuer=SETTINGS.jwt_issuer)


def get_user_by_email(session: Session, email: str) -> User | None:
    return session.execute(select(User).where(User.email == email.lower().strip())).scalar_one_or_none()


def get_user_by_id(session: Session, user_id: str) -> User | None:
    return session.execute(select(User).where(User.id == user_id)).scalar_one_or_none()


def ensure_workspace_membership(
    session: Session,
    *,
    user_id: str,
    workspace_id: str,
    role: str = "owner",
) -> Membership:
    if role not in WORKSPACE_ROLES:
        raise ValueError(f"Invalid workspace role: {role}")

    membership = session.execute(
        select(Membership).where(
            Membership.user_id == user_id,
            Membership.workspace_id == workspace_id,
        )
    ).scalar_one_or_none()
    if membership is not None:
        return membership

    membership = Membership(
        id=f"mbr-{uuid4().hex[:12]}",
        user_id=user_id,
        workspace_id=workspace_id,
        role=role,
    )
    session.add(membership)
    return membership


def ensure_platform_workspace(
    session: Session,
    *,
    workspace_id: str,
    name: str,
) -> Workspace:
    workspace = session.execute(select(Workspace).where(Workspace.id == workspace_id)).scalar_one_or_none()
    if workspace is not None:
        if workspace.name != name:
            workspace.name = name
            workspace.updated_at = datetime.utcnow()
        return workspace

    workspace = Workspace(
        id=workspace_id,
        name=name,
    )
    session.add(workspace)
    return workspace


def register_user(session: Session, *, email: str, password: str, full_name: str | None = None) -> User:
    existing = get_user_by_email(session, email)
    if existing is not None:
        raise ValueError("A user with that email already exists.")

    user = User(
        id=f"user-{uuid4().hex[:12]}",
        email=email.lower().strip(),
        full_name=full_name.strip() if full_name else None,
        password_hash=hash_password(password),
    )
    session.add(user)
    return user


def build_default_workspace_name(*, email: str, full_name: str | None = None) -> str:
    if full_name and full_name.strip():
        return f"{full_name.strip()} Workspace"

    local_part = email.split("@", 1)[0].replace(".", " ").replace("_", " ").replace("-", " ").strip()
    if not local_part:
        return "My Workspace"
    return f"{local_part.title()} Workspace"


def authenticate_user(session: Session, *, email: str, password: str) -> User | None:
    user = get_user_by_email(session, email)
    if user is None:
        return None
    if not verify_password(password, user.password_hash):
        return None
    if not user.is_active:
        return None
    return user


def get_workspace_ids_for_user(session: Session, user_id: str) -> list[str]:
    rows = session.execute(
        select(Membership.workspace_id).where(Membership.user_id == user_id)
    ).all()
    return [row[0] for row in rows]


def resolve_bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("Authorization", "").strip()
    if not authorization.lower().startswith("bearer "):
        return None
    return authorization.split(" ", 1)[1].strip() or None


def get_optional_current_user(request: Request) -> User | None:
    return getattr(request.state, "current_user", None)


def require_current_user(request: Request) -> User:
    user = get_optional_current_user(request)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return user


def require_workspace_access(request: Request, workspace_id: str) -> None:
    user = get_optional_current_user(request)
    if user is None:
        return

    with platform_session() as session:
        allowed_workspace_ids = set(get_workspace_ids_for_user(session, user.id))
    if workspace_id not in allowed_workspace_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found.")
