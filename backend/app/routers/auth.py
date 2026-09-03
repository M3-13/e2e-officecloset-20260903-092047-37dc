import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.models import User
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

_MAX_ATTEMPTS = 5
_ATTEMPT_WINDOW_SECONDS = 60.0
_LOCKOUT_SECONDS = 15 * 60


class RateLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._failures: dict[str, list[float]] = {}
        self._lockout_until: dict[str, float] = {}

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            until = self._lockout_until.get(key)
            if until is None:
                return
            if now < until:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Please try again later.",
                )
            self._lockout_until.pop(key, None)
            self._failures.pop(key, None)

    def record_failure(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            failures = [
                t for t in self._failures.get(key, []) if now - t <= _ATTEMPT_WINDOW_SECONDS
            ]
            failures.append(now)
            if len(failures) >= _MAX_ATTEMPTS:
                self._lockout_until[key] = now + _LOCKOUT_SECONDS
                self._failures.pop(key, None)
            else:
                self._failures[key] = failures

    def reset(self) -> None:
        with self._lock:
            self._failures.clear()
            self._lockout_until.clear()


_rate_limiter = RateLimiter()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(
    payload: schemas.UserRegister,
    request: Request,
    db: Session = Depends(get_db),
) -> schemas.UserOut:
    client_ip = _client_ip(request)
    _rate_limiter.check(client_ip)

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing is not None:
        _rate_limiter.record_failure(client_ip)
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token, status_code=200)
def login(
    payload: schemas.UserLogin,
    request: Request,
    db: Session = Depends(get_db),
) -> schemas.Token:
    client_ip = _client_ip(request)
    _rate_limiter.check(client_ip)

    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        _rate_limiter.record_failure(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )

    return schemas.Token(access_token=create_access_token(user.id), token_type="bearer")


@router.post("/logout", status_code=204)
def logout() -> None:
    return None
