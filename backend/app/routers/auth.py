from fastapi import APIRouter, HTTPException

from app import schemas

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserRegister) -> schemas.UserOut:
    raise HTTPException(status_code=501, detail="auth register implemented by ticket #5")


@router.post("/login", response_model=schemas.Token, status_code=200)
def login(payload: schemas.UserLogin) -> schemas.Token:
    raise HTTPException(status_code=501, detail="auth login implemented by ticket #5")


@router.post("/logout", status_code=204)
def logout() -> None:
    raise HTTPException(status_code=501, detail="auth logout implemented by ticket #5")
