from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.database import Base, get_db
from app.main import app
from app.models import User

PNG_HEADER = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16
NOT_AN_IMAGE = b"GIF89a this is not an image"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path / "uploads"))
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    def make_user(email: str = "user@example.com") -> User:
        db = testing_session()
        user = User(email=email, password_hash="x")
        db.add(user)
        db.commit()
        db.refresh(user)
        db.close()
        return user

    def auth_headers(user: User) -> dict[str, str]:
        settings = get_settings()
        payload = {
            "sub": str(user.id),
            "exp": datetime.now(UTC) + timedelta(hours=1),
        }
        token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
        return {"Authorization": f"Bearer {token}"}

    with TestClient(app) as c:
        yield c, make_user, auth_headers
    app.dependency_overrides.clear()


def test_create_item_with_image(client):
    c, make_user, auth = client
    user = make_user()
    resp = c.post(
        "/api/items",
        data={"name": "Blazer", "category": "Oberteil"},
        files={"image": ("blazer.png", PNG_HEADER, "image/png")},
        headers=auth(user),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Blazer"
    assert body["category"] == "Oberteil"
    assert body["image_url"].startswith("/uploads/")


def test_create_item_without_image(client):
    c, make_user, auth = client
    user = make_user()
    resp = c.post(
        "/api/items",
        data={"name": "Hose", "category": "Unterteil"},
        headers=auth(user),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["image_url"] is None


def test_list_items_filtered_by_category(client):
    c, make_user, auth = client
    user = make_user()
    for name, cat in [
        ("Blazer", "Oberteil"),
        ("Hose", "Unterteil"),
        ("Pumps", "Schuhe"),
        ("Pumps 2", "Schuhe"),
    ]:
        c.post("/api/items", data={"name": name, "category": cat}, headers=auth(user))

    resp = c.get("/api/items", params={"category": "Schuhe"}, headers=auth(user))
    assert resp.status_code == 200
    names = [item["name"] for item in resp.json()]
    assert names == ["Pumps", "Pumps 2"]


def test_foreign_user_cannot_see_or_delete_items(client):
    c, make_user, auth = client
    owner = make_user("owner@example.com")
    intruder = make_user("intruder@example.com")

    created = c.post(
        "/api/items",
        data={"name": "Blazer", "category": "Oberteil"},
        headers=auth(owner),
    )
    item_id = created.json()["id"]

    resp = c.get("/api/items", headers=auth(intruder))
    assert resp.status_code == 200
    assert resp.json() == []

    resp = c.delete(f"/api/items/{item_id}", headers=auth(intruder))
    assert resp.status_code == 404


def test_create_item_too_large_returns_413(client, monkeypatch):
    monkeypatch.setenv("MAX_UPLOAD_MB", "0")
    c, make_user, auth = client
    user = make_user()
    resp = c.post(
        "/api/items",
        data={"name": "Blazer", "category": "Oberteil"},
        files={"image": ("blazer.png", PNG_HEADER, "image/png")},
        headers=auth(user),
    )
    assert resp.status_code == 413


def test_create_item_wrong_magic_bytes_returns_415(client):
    c, make_user, auth = client
    user = make_user()
    resp = c.post(
        "/api/items",
        data={"name": "Fake", "category": "Oberteil"},
        files={"image": ("fake.gif", NOT_AN_IMAGE, "image/gif")},
        headers=auth(user),
    )
    assert resp.status_code == 415


def test_delete_item_removes_image_file(client, tmp_path):
    c, make_user, auth = client
    user = make_user()
    created = c.post(
        "/api/items",
        data={"name": "Blazer", "category": "Oberteil"},
        files={"image": ("blazer.png", PNG_HEADER, "image/png")},
        headers=auth(user),
    )
    body = created.json()
    filename = body["image_url"].rsplit("/", 1)[-1]
    path = tmp_path / "uploads" / filename
    assert path.exists()

    resp = c.delete(f"/api/items/{body['id']}", headers=auth(user))
    assert resp.status_code == 204
    assert not path.exists()


def test_unauthenticated_items_returns_401(client):
    c, _, _ = client
    assert c.get("/api/items").status_code == 401
    assert c.post("/api/items", data={"name": "X", "category": "Oberteil"}).status_code == 401
