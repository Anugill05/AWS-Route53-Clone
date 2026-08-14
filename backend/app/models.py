import enum
import json
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Boolean, TypeDecorator, Text

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class JSONEncodedList(TypeDecorator):
    """Stores a list[str] as a JSON-encoded string in a TEXT column."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        return json.loads(value)


class ZoneType(str, enum.Enum):
    PUBLIC = "Public"
    PRIVATE = "Private"


class RecordType(str, enum.Enum):
    A = "A"
    AAAA = "AAAA"
    CNAME = "CNAME"
    TXT = "TXT"
    MX = "MX"
    NS = "NS"
    PTR = "PTR"
    SRV = "SRV"
    CAA = "CAA"
    SOA = "SOA"


# Record types selectable by a user when creating/editing a record.
# SOA is system-managed only (created automatically with a hosted zone).
CREATABLE_RECORD_TYPES = [t for t in RecordType if t != RecordType.SOA]


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, default="Admin User")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    comment: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    zone_type: Mapped[ZoneType] = mapped_column(
        Enum(ZoneType, native_enum=False, length=16), nullable=False, default=ZoneType.PUBLIC
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    records: Mapped[list["DnsRecord"]] = relationship(
        back_populates="hosted_zone", cascade="all, delete-orphan"
    )


class DnsRecord(Base):
    __tablename__ = "dns_records"
    __table_args__ = (
        UniqueConstraint("hosted_zone_id", "name", "record_type", name="uq_zone_name_type"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    hosted_zone_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("hosted_zones.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    record_type: Mapped[RecordType] = mapped_column(
        Enum(RecordType, native_enum=False, length=8), nullable=False
    )
    ttl: Mapped[int] = mapped_column(Integer, nullable=False, default=300)
    values: Mapped[list[str]] = mapped_column(JSONEncodedList, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    hosted_zone: Mapped["HostedZone"] = relationship(back_populates="records")
