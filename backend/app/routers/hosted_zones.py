from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import DnsRecord, HostedZone
from app.schemas import HostedZoneCreate, HostedZoneListOut, HostedZoneOut, HostedZoneUpdate
from app.services import create_default_records, generate_zone_id, zone_has_custom_records

router = APIRouter(
    prefix="/api/hosted-zones",
    tags=["hosted-zones"],
    dependencies=[Depends(get_current_user)],
)


def _record_counts(db: Session, zone_ids: list[str]) -> dict[str, int]:
    if not zone_ids:
        return {}
    rows = (
        db.query(DnsRecord.hosted_zone_id, func.count(DnsRecord.id))
        .filter(DnsRecord.hosted_zone_id.in_(zone_ids))
        .group_by(DnsRecord.hosted_zone_id)
        .all()
    )
    return dict(rows)


def _to_out(zone: HostedZone, record_count: int) -> HostedZoneOut:
    return HostedZoneOut(
        id=zone.id,
        name=zone.name,
        comment=zone.comment,
        zone_type=zone.zone_type,
        record_count=record_count,
        created_at=zone.created_at,
        updated_at=zone.updated_at,
    )


def _get_zone_or_404(db: Session, zone_id: str) -> HostedZone:
    zone = db.get(HostedZone, zone_id)
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hosted zone not found")
    return zone


@router.get("", response_model=HostedZoneListOut)
def list_hosted_zones(
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(HostedZone)
    if search:
        query = query.filter(HostedZone.name.ilike(f"%{search}%"))

    total = query.count()
    zones = (
        query.order_by(HostedZone.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    counts = _record_counts(db, [z.id for z in zones])
    items = [_to_out(z, counts.get(z.id, 0)) for z in zones]
    return HostedZoneListOut(items=items, total=total)


@router.post("", response_model=HostedZoneOut, status_code=status.HTTP_201_CREATED)
def create_hosted_zone(payload: HostedZoneCreate, db: Session = Depends(get_db)):
    full_name = payload.name + "."
    existing = db.query(HostedZone).filter(HostedZone.name == full_name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A hosted zone with this domain name already exists",
        )

    zone = HostedZone(
        id=generate_zone_id(),
        name=full_name,
        comment=payload.comment,
        zone_type=payload.zone_type,
    )
    db.add(zone)
    db.flush()
    create_default_records(db, zone)
    db.commit()
    db.refresh(zone)
    return _to_out(zone, record_count=2)


@router.get("/{zone_id}", response_model=HostedZoneOut)
def get_hosted_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = _get_zone_or_404(db, zone_id)
    count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id).count()
    return _to_out(zone, count)


@router.put("/{zone_id}", response_model=HostedZoneOut)
def update_hosted_zone(zone_id: str, payload: HostedZoneUpdate, db: Session = Depends(get_db)):
    zone = _get_zone_or_404(db, zone_id)
    zone.comment = payload.comment
    db.commit()
    db.refresh(zone)
    count = db.query(DnsRecord).filter(DnsRecord.hosted_zone_id == zone_id).count()
    return _to_out(zone, count)


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hosted_zone(zone_id: str, db: Session = Depends(get_db)):
    zone = _get_zone_or_404(db, zone_id)
    if zone_has_custom_records(db, zone_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "The hosted zone contains resource record sets that must be deleted "
                "before the hosted zone can be deleted."
            ),
        )
    db.delete(zone)
    db.commit()
    return None
