from sqlalchemy.orm import Session

from app.auth import hash_password
from app.models import User

SEED_EMAIL = "admin@example.com"
SEED_PASSWORD = "Admin@12345"
SEED_NAME = "Admin User"


def seed_db(db: Session) -> None:
    """Idempotent: creates the demo login on first run only."""
    existing = db.query(User).filter(User.email == SEED_EMAIL).first()
    if existing:
        return
    db.add(User(email=SEED_EMAIL, password_hash=hash_password(SEED_PASSWORD), name=SEED_NAME))
    db.commit()
