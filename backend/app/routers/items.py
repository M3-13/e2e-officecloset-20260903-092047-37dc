from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app import schemas

router = APIRouter(prefix="/api/items", tags=["items"])


@router.get("", response_model=list[schemas.ItemOut], status_code=200)
def list_items(category: str | None = None) -> list[schemas.ItemOut]:
    raise HTTPException(status_code=501, detail="items list implemented by ticket #9")


@router.post("", response_model=schemas.ItemOut, status_code=201)
def create_item(
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile | None = File(None),
) -> schemas.ItemOut:
    raise HTTPException(status_code=501, detail="items create implemented by ticket #9")


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int) -> None:
    raise HTTPException(status_code=501, detail="items delete implemented by ticket #9")
