import io
import urllib.parse

from fastapi import APIRouter, Depends, HTTPException, Request, status
from python_multipart import parse_form
from python_multipart.exceptions import ParseError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import schemas, storage
from app.config import get_settings
from app.database import get_db
from app.models import Item, User
from app.security import get_current_user

router = APIRouter(prefix="/api/items", tags=["items"])

# Multipart bodies carry framing on top of the file bytes: the boundary markers
# plus the `name`/`category` form fields. This allowance keeps a file at exactly
# the size limit from being rejected by the pre-parse body check; the file itself
# is still checked precisely after parsing.
_MULTIPART_FRAMING_BYTES = 64 * 1024


def _image_url(image_path: str | None) -> str | None:
    return f"/uploads/{image_path}" if image_path else None


def _to_item_out(item: Item) -> schemas.ItemOut:
    return schemas.ItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        image_url=_image_url(item.image_path),
    )


def _size_exceeded_error(max_upload_mb: int) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_413_CONTENT_TOO_LARGE,
        detail=f"Image exceeds the maximum size of {max_upload_mb} MB",
    )


async def _read_multipart_form(request: Request) -> tuple[str | None, str | None, bytes | None]:
    """Read and parse a multipart body, enforcing the size limit before parsing.

    Returns ``(name, category, image)`` where ``image`` is the raw file bytes or
    ``None`` when no image part was sent.
    """
    settings = get_settings()
    max_upload_mb = settings.max_upload_mb
    max_body_bytes = max_upload_mb * 1024 * 1024 + _MULTIPART_FRAMING_BYTES

    # Fast path: reject an oversized upload from its declared length without
    # reading the body at all.
    content_length = request.headers.get("content-length")
    if (
        content_length is not None
        and content_length.isdigit()
        and int(content_length) > max_body_bytes
    ):
        raise _size_exceeded_error(max_upload_mb)

    # Stream the body with a hard cap so an oversized upload is rejected before
    # the multipart form is ever parsed or buffered past the limit.
    chunks: list[bytes] = []
    received = 0
    async for chunk in request.stream():
        received += len(chunk)
        if received > max_body_bytes:
            raise _size_exceeded_error(max_upload_mb)
        chunks.append(chunk)
    body = b"".join(chunks)

    fields: dict[str, str] = {}
    files: dict[str, bytes] = {}
    content_type = request.headers.get("content-type", "")

    if content_type.startswith("multipart/form-data"):

        def on_field(field) -> None:
            fields[field.field_name.decode()] = field.value.decode()

        def on_file(file) -> None:
            if file.field_name is None:
                return
            file.file_object.seek(0)
            files[file.field_name.decode()] = file.file_object.read()

        try:
            parse_form({"Content-Type": content_type}, io.BytesIO(body), on_field, on_file)
        except (ParseError, ValueError) as exc:
            raise HTTPException(status_code=400, detail="Invalid multipart form data") from exc
    else:
        fields = dict(urllib.parse.parse_qsl(body.decode("utf-8")))

    return fields.get("name"), fields.get("category"), files.get("image")


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
async def create_item(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> schemas.ItemOut:
    name, category, image_content = await _read_multipart_form(request)
    if name is None or category is None:
        raise HTTPException(status_code=422, detail="name and category are required")

    image_path: str | None = None
    if image_content is not None:
        settings = get_settings()
        max_bytes = settings.max_upload_mb * 1024 * 1024
        if len(image_content) > max_bytes:
            raise _size_exceeded_error(settings.max_upload_mb)

        extension = storage.detect_image_type(image_content[: storage.MAGIC_BYTES_TO_READ])
        if extension is None:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Unsupported image type; only JPEG, PNG and WebP are allowed",
            )
        image_path = storage.save_image(image_content, extension)

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
