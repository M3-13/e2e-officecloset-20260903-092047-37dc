from pydantic import BaseModel, ConfigDict


class UserRegister(BaseModel):
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str


class ItemOut(BaseModel):
    id: int
    name: str
    category: str
    image_url: str | None


class OutfitCreate(BaseModel):
    name: str
    item_ids: list[int]


class OutfitOut(BaseModel):
    id: int
    name: str
    item_ids: list[int]
    items: list[ItemOut]
