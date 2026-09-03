from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import schemas, storage
from app.config import get_settings
from app.database import get_db
from app.models import Item, User
from app.security import get_current_user

router = APIRouter(prefix="/api/items", tags=["items"])

_MULTIPART_OVERHEAD_BYTES = 1024 * 1024


def _image_url(image_path: str | None) -> str | None:
    return f"/uploads/{image_path}" if image_path else None


def _to_item_out(item: Item) -> schemas.ItemOut:
    return schemas.ItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        image_url=_image_url(item.image_path),
    )


def _read_and_validate_image(upload: UploadFile | None) -> str | None:
    if upload is None:
        return None
    settings = get_settings()
    max_bytes = settings.max_upload_mb * 1024 * 1024

    content = upload.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Image exceeds the maximum size of {settings.max_upload_mb} MB",
        )

    extension = storage.detect_image_type(content)
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported image type; only JPEG, PNG and WebP are allowed",
        )

    return storage.save_image(content, extension)


@router.get("", response_model=list[schemas.ItemOut], status_code=200)
def list_items(
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[schemas.ItemOut]:
    query = select(Item).where(Item.user_id == current_user.id)
    if category is not None:
        query = query.where(Item.category == category)
    items = db.scalars(query).all()
    return [_to_item_out(item) for item in items]


@router.post("", response_model=schemas.ItemOut, status_code=201)
def create_item(
    request: Request,
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> schemas.ItemOut:
    settings = get_settings()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    content_length = request.headers.get("content-length")
    if (
        content_length is not None
        and content_length.isdigit()
        and int(content_length) > max_bytes + _MULTIPART_OVERHEAD_BYTES
    ):
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"Image exceeds the maximum size of {settings.max_upload_mb} MB",
        )

    image_path = _read_and_validate_image(image)

    item = Item(name=name, category=category, image_path=image_path, user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_item_out(item)


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    item = db.get(Item, item_id)
    if item is None or item.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    image_path = item.image_path
    db.delete(item)
    db.commit()
    if image_path:
        storage.delete_image(image_path)
