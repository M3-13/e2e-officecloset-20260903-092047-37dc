from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/account", tags=["account"])


@router.delete("", status_code=204)
def delete_account() -> None:
    raise HTTPException(status_code=501, detail="account delete implemented by ticket #2")
