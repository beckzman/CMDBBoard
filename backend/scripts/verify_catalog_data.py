
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set dummy SECRET_KEY if needed
if not os.environ.get("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "script-dummy-key-super-secret"

from app.db.database import SessionLocal
from app.db.models import SoftwareCatalog

def verify():
    db = SessionLocal()
    try:
        items = db.query(SoftwareCatalog).all()
        print(f"Total Software Catalog Items: {len(items)}")
        for item in items:
            print(f"- [{item.id}] {item.name} ({item.version}) - Status: {item.status}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
