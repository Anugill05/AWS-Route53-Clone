import re
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models import RecordType, ZoneType

DOMAIN_NAME_RE = re.compile(r"^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*\.?$")


# ---- Auth ----


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserOut(BaseModel):
    id: int
    email: str
    name: str

    class Config:
        from_attributes = True


# ---- Hosted zones ----


class HostedZoneCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    comment: str | None = Field(default=None, max_length=1024)
    zone_type: ZoneType = ZoneType.PUBLIC

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip().rstrip(".")
        if not v or not DOMAIN_NAME_RE.match(v + "."):
            raise ValueError("Enter a valid domain name, e.g. example.com")
        return v.lower()


class HostedZoneUpdate(BaseModel):
    comment: str | None = Field(default=None, max_length=1024)


class HostedZoneOut(BaseModel):
    id: str
    name: str
    comment: str | None
    zone_type: ZoneType
    record_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HostedZoneListOut(BaseModel):
    items: list[HostedZoneOut]
    total: int


# ---- DNS records ----


class DnsRecordCreate(BaseModel):
    name: str = Field(max_length=255)
    record_type: RecordType
    ttl: int = Field(default=300, gt=0, le=2_147_483_647)
    values: list[str] = Field(min_length=1)

    @field_validator("record_type")
    @classmethod
    def validate_record_type(cls, v: RecordType) -> RecordType:
        if v == RecordType.SOA:
            raise ValueError("SOA records are managed automatically and cannot be created")
        return v

    @field_validator("values")
    @classmethod
    def validate_values(cls, v: list[str]) -> list[str]:
        cleaned = [item.strip() for item in v if item.strip()]
        if not cleaned:
            raise ValueError("Provide at least one value")
        return cleaned


class DnsRecordUpdate(DnsRecordCreate):
    pass


class DnsRecordOut(BaseModel):
    id: int
    hosted_zone_id: str
    name: str
    record_type: RecordType
    ttl: int
    values: list[str]
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DnsRecordListOut(BaseModel):
    items: list[DnsRecordOut]
    total: int
