import hashlib
import secrets

from sqlalchemy.orm import Session

from app.models import DnsRecord, HostedZone, RecordType

NS_TLDS = ["com", "net", "org", "co.uk"]


def generate_zone_id() -> str:
    return "Z" + secrets.token_hex(6).upper()


def _pseudo_ns_names(zone_id: str) -> list[str]:
    """Deterministic-per-zone, AWS-looking nameserver hostnames (cosmetic only)."""
    seed = int(hashlib.sha256(zone_id.encode()).hexdigest(), 16)
    names = []
    for i, tld in enumerate(NS_TLDS):
        cluster = (seed >> (i * 8)) % 2000 + 1000
        sub = (seed >> (i * 4 + 32)) % 64
        names.append(f"ns-{cluster}.awsdns-{sub:02d}.{tld}.")
    return names


def create_default_records(db: Session, zone: HostedZone) -> None:
    """Mirrors real Route53: every new hosted zone starts with an NS and an SOA record."""
    ns_values = _pseudo_ns_names(zone.id)
    soa_value = f"{ns_values[0]} awsdns-hostmaster.amazon.com. 1 7200 900 1209600 86400"

    db.add(
        DnsRecord(
            hosted_zone_id=zone.id,
            name=zone.name,
            record_type=RecordType.NS,
            ttl=172800,
            values=ns_values,
            is_default=True,
        )
    )
    db.add(
        DnsRecord(
            hosted_zone_id=zone.id,
            name=zone.name,
            record_type=RecordType.SOA,
            ttl=900,
            values=[soa_value],
            is_default=True,
        )
    )


def zone_has_custom_records(db: Session, zone_id: str) -> bool:
    count = (
        db.query(DnsRecord)
        .filter(DnsRecord.hosted_zone_id == zone_id, DnsRecord.is_default.is_(False))
        .count()
    )
    return count > 0
