import os
import uuid
from contextlib import suppress

from app.config import get_settings

MAGIC_BYTES_TO_READ = 12

_JPEG_MAGIC = b"\xff\xd8\xff"
_PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
_WEBP_RIFF = b"RIFF"
_WEBP_TAG = b"WEBP"


def detect_image_type(header: bytes) -> str | None:
    """Return the file extension for a recognized image header, else None.

    Only JPEG, PNG and WebP are accepted, identified by their magic bytes.
    """
    if header.startswith(_JPEG_MAGIC):
        return "jpg"
    if header.startswith(_PNG_MAGIC):
        return "png"
    if len(header) >= 12 and header.startswith(_WEBP_RIFF) and header[8:12] == _WEBP_TAG:
        return "webp"
    return None


def save_image(content: bytes, extension: str) -> str:
    """Write image bytes to the upload dir under a UUID-based filename."""
    settings = get_settings()
    os.makedirs(settings.upload_dir, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.{extension}"
    path = os.path.join(settings.upload_dir, filename)
    with open(path, "wb") as fh:
        fh.write(content)
    return filename


def delete_image(filename: str) -> None:
    """Remove an uploaded image file from disk, ignoring a missing file."""
    if not filename:
        return
    settings = get_settings()
    path = os.path.join(settings.upload_dir, filename)
    with suppress(FileNotFoundError):
        os.remove(path)
