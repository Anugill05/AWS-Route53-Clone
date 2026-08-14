from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import DnsRecord, HostedZone, RecordType
from app.schemas import DnsRecordCreate, DnsRecordListOut, DnsRecordOut, DnsRecordUpdate

router = APIRouter(
    prefix="/api/hosted-zones/{zone_id}/records",
    tags=["dns-records"],
    dependencies=[Depends(get_current_user)],
)


def _get_zone_or_404(db: Session, zone_id: str) -> HostedZone:
    zone = db.get(HostedZone, zone_id)
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found")
    return zone


def _get_record_or_404(db: Session, zone_id: str, record_id: int) -> DnsRecord:
    record = (
        db.query(DnsRecord)
        .filter(DnsRecord.id == record_id, DnsRecord.hosted_zone_id == zone_id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")
    return record


def _full_name(zone: HostedZone, sub_name: str) -> str:
    sub_name = sub_name.strip().rstrip(".")
    return zone.name if not sub_name else f"{sub_name}.{zone.name}"


@router.get("", response_model=DnsRecordListOut)
def list_records(
    zone_id: str,
    search: str | None = Query(default=None),
    type: RecordType | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    _get_zone_or_404(db, zone_id)
    query = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id)
    if search:
        query = query.filter(DnsRecord.name.ilike(f"%{search}%"))
    if type:
        query = query.filter(DnsRecord.record_type == type)

    total = query.count()
    records = (
        query.order_by(DnsRecord.is_default.desc(), DnsRecord.name)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return DnsRecordListOut(items=[DnsRecordOut.model_validate(r) for r in records], total=total)


@router.post("", response_model=DnsRecordOut, status_code=status.HTTP_201_CREATED)
def create_record(zone_id: str, payload: DnsRecordCreate, db: Session = Depends(get_db)):
    zone = _get_zone_or_404(db, zone_id)
    full_name = _full_name(zone, payload.name)

    existing = (
        db.query(DnsRecord)
        .filter(
            DnsRecord.hosted_zone_id == zone_id,
            DnsRecord.name == full_name,
            DnsRecord.record_type == payload.record_type,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A record with this name and type already exists in this hosted zone.",
        )

    record = DnsRecord(
        hosted_zone_id=zone_id,
        name=full_name,
        record_type=payload.record_type,
        ttl=payload.ttl,
        values=payload.values,
        is_default=False,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.get("/{record_id}", response_model=DnsRecordOut)
def get_record(zone_id: str, record_id: int, db: Session = Depends(get_db)):
    _get_zone_or_404(db, zone_id)
    return _get_record_or_404(db, zone_id, record_id)


@router.put("/{record_id}", response_model=DnsRecordOut)
def update_record(
    zone_id: str, record_id: int, payload: DnsRecordUpdate, db: Session = Depends(get_db)
):
    zone = _get_zone_or_404(db, zone_id)
    record = _get_record_or_404(db, zone_id, record_id)
    if record.is_default:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Default NS and SOA records cannot be modified.",
        )

    full_name = _full_name(zone, payload.name)
    duplicate = (
        db.query(DnsRecord)
        .filter(
            DnsRecord.hosted_zone_id == zone_id,
            DnsRecord.name == full_name,
            DnsRecord.record_type == payload.record_type,
            DnsRecord.id != record_id,
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A record with this name and type already exists in this hosted zone.",
        )

    record.name = full_name
    record.record_type = payload.record_type
    record.ttl = payload.ttl
    record.values = payload.values
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(zone_id: str, record_id: int, db: Session = Depends(get_db)):
    _get_zone_or_404(db, zone_id)
    record = _get_record_or_404(db, zone_id, record_id)
    if record.is_default:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Default NS and SOA records cannot be deleted.",
        )
    db.delete(record)
    db.commit()
    return None
