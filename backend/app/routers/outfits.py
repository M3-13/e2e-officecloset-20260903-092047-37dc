from fastapi import APIRouter, HTTPException

from app import schemas

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


@router.get("", response_model=list[schemas.OutfitOut], status_code=200)
def list_outfits() -> list[schemas.OutfitOut]:
    raise HTTPException(status_code=501, detail="outfits list implemented by ticket #12")


@router.post("", response_model=schemas.OutfitOut, status_code=201)
def create_outfit(payload: schemas.OutfitCreate) -> schemas.OutfitOut:
    raise HTTPException(status_code=501, detail="outfits create implemented by ticket #12")


@router.get("/{outfit_id}", response_model=schemas.OutfitOut, status_code=200)
def get_outfit(outfit_id: int) -> schemas.OutfitOut:
    raise HTTPException(status_code=501, detail="outfits get implemented by ticket #12")


@router.delete("/{outfit_id}", status_code=204)
def delete_outfit(outfit_id: int) -> None:
    raise HTTPException(status_code=501, detail="outfits delete implemented by ticket #12")
