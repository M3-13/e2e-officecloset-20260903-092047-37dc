import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.security import get_current_user

router = APIRouter(prefix="/api/account", tags=["account"])


def _remove_image_file(upload_dir: str, image_path: str) -> None:
    target = image_path if os.path.isabs(image_path) else os.path.join(upload_dir, image_path)
    try:
        os.remove(target)
    except FileNotFoundError:
        pass
    except OSError:
        pass


@router.delete("", status_code=204)
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    settings = get_settings()
    image_paths = [item.image_path for item in user.items if item.image_path]
    for image_path in image_paths:
        _remove_image_file(settings.upload_dir, image_path)
    db.delete(user)
    db.commit()
