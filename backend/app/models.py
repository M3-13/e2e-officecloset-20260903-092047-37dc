from __future__ import annotations

from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

outfit_items = Table(
    "outfit_items",
    Base.metadata,
    Column("outfit_id", ForeignKey("outfits.id", ondelete="CASCADE"), primary_key=True),
    Column("item_id", ForeignKey("items.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    items: Mapped[list[Item]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    outfits: Mapped[list[Outfit]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    image_path: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    owner: Mapped[User] = relationship(back_populates="items")
    outfits: Mapped[list[Outfit]] = relationship(secondary=outfit_items, back_populates="items")


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    owner: Mapped[User] = relationship(back_populates="outfits")
    items: Mapped[list[Item]] = relationship(secondary=outfit_items, back_populates="outfits")
