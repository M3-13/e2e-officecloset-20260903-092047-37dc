from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app import schemas
from app.database import get_db
from app.models import Item, Outfit, User
from app.security import get_current_user

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


def _item_to_out(item: Item) -> schemas.ItemOut:
    image_url = f"/uploads/{item.image_path}" if item.image_path else None
    return schemas.ItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        image_url=image_url,
    )


def _outfit_to_out(outfit: Outfit) -> schemas.OutfitOut:
    items = sorted(outfit.items, key=lambda item: item.id)
    return schemas.OutfitOut(
        id=outfit.id,
        name=outfit.name,
        item_ids=[item.id for item in items],
        items=[_item_to_out(item) for item in items],
    )


def _resolve_owned_items(db: Session, user_id: int, item_ids: list[int]) -> list[Item]:
    unique_ids = list(dict.fromkeys(item_ids))
    items = list(
        db.scalars(select(Item).where(Item.id.in_(unique_ids), Item.user_id == user_id)).all()
    )
    if len(items) != len(unique_ids):
        raise HTTPException(
            status_code=422,
            detail="Nicht alle Kleidungsstücke gehören dir",
        )
    return items


@router.get("", response_model=list[schemas.OutfitOut], status_code=200)
def list_outfits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[schemas.OutfitOut]:
    outfits = db.scalars(
        select(Outfit)
        .where(Outfit.user_id == current_user.id)
        .options(selectinload(Outfit.items))
        .order_by(Outfit.id)
    ).all()
    return [_outfit_to_out(outfit) for outfit in outfits]


@router.post("", response_model=schemas.OutfitOut, status_code=201)
def create_outfit(
    payload: schemas.OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> schemas.OutfitOut:
    items = _resolve_owned_items(db, current_user.id, payload.item_ids)
    outfit = Outfit(name=payload.name, user_id=current_user.id, items=items)
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    return _outfit_to_out(outfit)


@router.get("/{outfit_id}", response_model=schemas.OutfitOut, status_code=200)
def get_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> schemas.OutfitOut:
    outfit = db.scalars(
        select(Outfit)
        .where(Outfit.id == outfit_id, Outfit.user_id == current_user.id)
        .options(selectinload(Outfit.items))
    ).first()
    if outfit is None:
        raise HTTPException(status_code=404, detail="Outfit nicht gefunden")
    return _outfit_to_out(outfit)


@router.delete("/{outfit_id}", status_code=204)
def delete_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    outfit = db.scalars(
        select(Outfit).where(Outfit.id == outfit_id, Outfit.user_id == current_user.id)
    ).first()
    if outfit is None:
        raise HTTPException(status_code=404, detail="Outfit nicht gefunden")
    db.delete(outfit)
    db.commit()
