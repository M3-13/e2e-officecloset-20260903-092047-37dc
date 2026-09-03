import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Item, User
from app.security import create_access_token, hash_password


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_user(db, email: str) -> User:
    user = User(email=email, password_hash=hash_password("secret"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_item(db, user: User, name: str, category: str = "Oberteil") -> Item:
    item = Item(name=name, category=category, user_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@pytest.fixture
def env(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    session_factory = sessionmaker(
        bind=engine, autocommit=False, autoflush=False, expire_on_commit=False
    )

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as client:
        yield client, session_factory
    app.dependency_overrides.clear()


def test_create_list_open_delete_outfit(env) -> None:
    client, session_factory = env
    db = session_factory()
    user = _create_user(db, "owner@example.com")
    shirt = _create_item(db, user, "Hemd")
    pants = _create_item(db, user, "Hose", "Unterteil")
    db.close()

    headers = _auth(create_access_token(user.id))

    response = client.post(
        "/api/outfits",
        json={"name": "Gala", "item_ids": [shirt.id, pants.id]},
        headers=headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Gala"
    assert sorted(body["item_ids"]) == sorted([shirt.id, pants.id])
    assert {item["id"] for item in body["items"]} == {shirt.id, pants.id}
    assert all(item["image_url"] is None for item in body["items"])
    outfit_id = body["id"]

    response = client.get("/api/outfits", headers=headers)
    assert response.status_code == 200
    assert [outfit["id"] for outfit in response.json()] == [outfit_id]

    response = client.get(f"/api/outfits/{outfit_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == outfit_id

    response = client.delete(f"/api/outfits/{outfit_id}", headers=headers)
    assert response.status_code == 204

    response = client.get(f"/api/outfits/{outfit_id}", headers=headers)
    assert response.status_code == 404


def test_create_outfit_rejects_foreign_items(env) -> None:
    client, session_factory = env
    db = session_factory()
    owner = _create_user(db, "owner@example.com")
    other = _create_user(db, "other@example.com")
    my_item = _create_item(db, owner, "Hemd")
    foreign_item = _create_item(db, other, "Fremde Hose")
    db.close()

    headers = _auth(create_access_token(owner.id))
    response = client.post(
        "/api/outfits",
        json={"name": "Kaputt", "item_ids": [my_item.id, foreign_item.id]},
        headers=headers,
    )
    assert response.status_code == 422
    assert "detail" in response.json()


def test_foreign_user_cannot_access_outfit(env) -> None:
    client, session_factory = env
    db = session_factory()
    owner = _create_user(db, "owner@example.com")
    other = _create_user(db, "other@example.com")
    item = _create_item(db, owner, "Hemd")
    db.close()

    response = client.post(
        "/api/outfits",
        json={"name": "Gala", "item_ids": [item.id]},
        headers=_auth(create_access_token(owner.id)),
    )
    outfit_id = response.json()["id"]

    other_headers = _auth(create_access_token(other.id))

    response = client.get(f"/api/outfits/{outfit_id}", headers=other_headers)
    assert response.status_code == 404

    response = client.delete(f"/api/outfits/{outfit_id}", headers=other_headers)
    assert response.status_code == 404

    response = client.get("/api/outfits", headers=other_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_outfits_require_authentication(env) -> None:
    client, _ = env
    assert client.get("/api/outfits").status_code == 401
    assert client.post("/api/outfits", json={"name": "X", "item_ids": []}).status_code == 401
