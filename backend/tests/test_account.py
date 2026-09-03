from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings
from app.database import Base, get_db
from app.main import app
from app.models import Item, Outfit, User
from app.security import hash_password


@pytest.fixture
def env(tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    upload_dir.mkdir()
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("UPLOAD_DIR", str(upload_dir))
    monkeypatch.setenv("SECRET_KEY", "a" * 32)

    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield session_factory, upload_dir
    app.dependency_overrides.clear()


def _create_user(db: Session, email: str) -> User:
    user = User(email=email, password_hash=hash_password("secret-password"))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _add_item(db: Session, user_id: int, name: str, image_path: str | None) -> Item:
    item = Item(name=name, category="Oberteil", image_path=image_path, user_id=user_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _auth_headers(user_id: int) -> dict[str, str]:
    settings = get_settings()
    payload = {"sub": str(user_id), "exp": datetime.now(UTC) + timedelta(minutes=30)}
    token = jwt.encode(payload, settings.secret_key, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}


def test_delete_account_removes_user_items_outfits_and_images(env) -> None:
    session_factory, upload_dir = env
    with session_factory() as db:
        user = _create_user(db, "a@example.com")
        image_file = upload_dir / "a_item.jpg"
        image_file.write_bytes(b"fake-jpeg")
        item = _add_item(db, user.id, "Bluse", "a_item.jpg")
        outfit = Outfit(name="Outfit", user_id=user.id)
        db.add(outfit)
        db.commit()
        db.refresh(outfit)
        outfit.items.append(item)
        db.commit()
        user_id = user.id
        item_id = item.id
        outfit_id = outfit.id

    with TestClient(app) as client:
        response = client.delete("/api/account", headers=_auth_headers(user_id))

    assert response.status_code == 204
    assert not image_file.exists()

    with session_factory() as db:
        assert db.get(User, user_id) is None
        assert db.get(Item, item_id) is None
        assert db.get(Outfit, outfit_id) is None


def test_delete_account_rejects_reused_token(env) -> None:
    session_factory, _ = env
    with session_factory() as db:
        user = _create_user(db, "b@example.com")
        user_id = user.id

    with TestClient(app) as client:
        first = client.delete("/api/account", headers=_auth_headers(user_id))
        assert first.status_code == 204
        second = client.delete("/api/account", headers=_auth_headers(user_id))

    assert second.status_code == 401


def test_delete_account_keeps_other_users_data(env) -> None:
    session_factory, upload_dir = env
    with session_factory() as db:
        user_a = _create_user(db, "a@example.com")
        user_b = _create_user(db, "b@example.com")
        img_a = upload_dir / "a.jpg"
        img_b = upload_dir / "b.jpg"
        img_a.write_bytes(b"a")
        img_b.write_bytes(b"b")
        _add_item(db, user_a.id, "A", "a.jpg")
        item_b = _add_item(db, user_b.id, "B", "b.jpg")
        item_b_id = item_b.id
        user_a_id = user_a.id
        user_b_id = user_b.id

    with TestClient(app) as client:
        response = client.delete("/api/account", headers=_auth_headers(user_a_id))

    assert response.status_code == 204
    assert not img_a.exists()
    assert img_b.exists()

    with session_factory() as db:
        assert db.get(User, user_b_id) is not None
        assert db.get(Item, item_b_id) is not None


def test_delete_account_requires_auth(env) -> None:
    with TestClient(app) as client:
        response = client.delete("/api/account")

    assert response.status_code == 401
