from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import User
from app.routers.auth import _rate_limiter


def test_register_creates_user() -> None:
    with TestClient(app) as client:
        _rate_limiter.reset()
        response = client.post(
            "/api/auth/register",
            json={"email": "user@example.com", "password": "secret123"},
        )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "user@example.com"
    assert isinstance(body["id"], int)


def test_register_duplicate_email_returns_409() -> None:
    with TestClient(app) as client:
        _rate_limiter.reset()
        first = client.post(
            "/api/auth/register",
            json={"email": "dup@example.com", "password": "secret123"},
        )
        assert first.status_code == 201
        second = client.post(
            "/api/auth/register",
            json={"email": "dup@example.com", "password": "other123"},
        )
    assert second.status_code == 409


def test_login_returns_token() -> None:
    with TestClient(app) as client:
        _rate_limiter.reset()
        client.post(
            "/api/auth/register",
            json={"email": "login@example.com", "password": "secret123"},
        )
        response = client.post(
            "/api/auth/login",
            json={"email": "login@example.com", "password": "secret123"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_wrong_credentials_returns_401() -> None:
    with TestClient(app) as client:
        _rate_limiter.reset()
        client.post(
            "/api/auth/register",
            json={"email": "bad@example.com", "password": "secret123"},
        )
        response = client.post(
            "/api/auth/login",
            json={"email": "bad@example.com", "password": "wrong"},
        )
    assert response.status_code == 401


def test_password_stored_as_hash_not_plaintext() -> None:
    with TestClient(app) as client:
        _rate_limiter.reset()
        client.post(
            "/api/auth/register",
            json={"email": "hash@example.com", "password": "plainpassword"},
        )
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "hash@example.com").first()
    finally:
        db.close()
    assert user is not None
    assert user.password_hash != "plainpassword"
    assert "plainpassword" not in user.password_hash
    assert user.password_hash.startswith("$argon2")


def test_429_after_five_failed_attempts() -> None:
    with TestClient(app) as client:
        _rate_limiter.reset()
        client.post(
            "/api/auth/register",
            json={"email": "limit@example.com", "password": "secret123"},
        )
        for _ in range(5):
            response = client.post(
                "/api/auth/login",
                json={"email": "limit@example.com", "password": "wrong"},
            )
            assert response.status_code == 401
        blocked = client.post(
            "/api/auth/login",
            json={"email": "limit@example.com", "password": "secret123"},
        )
    assert blocked.status_code == 429
