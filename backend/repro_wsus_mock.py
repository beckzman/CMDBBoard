import sys
import os
import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import time

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.db.database import Base
from app.db.models import ConfigurationItem, CIType, CIStatus
from app.core.config import settings

def mock_wsus_data():
    print("Connecting to DB...")
    # Use Environment variable if available (e.g. inside Docker), else localhost fallback
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cmdb_user:cmdb_password@localhost:5433/cmdb_database")
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Create a Mock Server with Critical Updates missing
        mock_ci = ConfigurationItem(
            name="WSUS-TEST-SERVER",
            ci_type=CIType.SERVER,
            status=CIStatus.ACTIVE,
            description="Mock Server to test WSUS Patch indicators",
            department="IT - Infrastructure",
            patch_summary={
                "needed_critical": 5,
                "needed_security": 12,
                "last_sync": datetime.datetime.now().isoformat()
            },
            created_at=datetime.datetime.now(),
            updated_at=datetime.datetime.now()
        )
        
        # Check if exists
        existing = db.query(ConfigurationItem).filter(ConfigurationItem.name == "WSUS-TEST-SERVER").first()
        if existing:
            print("Updating existing mock server...")
            existing.patch_summary = mock_ci.patch_summary
        else:
            print("Creating new mock server...")
            db.add(mock_ci)
            
        # Create a Fully Patched Server
        patched_ci = ConfigurationItem(
            name="WSUS-SECURE-SERVER",
            ci_type=CIType.SERVER,
            status=CIStatus.ACTIVE,
            description="Mock Server - Fully Patched",
            department="IT - Infrastructure",
            patch_summary={
                "needed_critical": 0,
                "needed_security": 0,
                "last_sync": datetime.datetime.now().isoformat()
            },
            created_at=datetime.datetime.now(),
            updated_at=datetime.datetime.now()
        )
        
        existing_secure = db.query(ConfigurationItem).filter(ConfigurationItem.name == "WSUS-SECURE-SERVER").first()
        if existing_secure:
            existing_secure.patch_summary = patched_ci.patch_summary
        else:
            db.add(patched_ci)

        db.commit()
        print("Mock Data Inserted Successfully!")
        print("1. WSUS-TEST-SERVER should show '17 Missing' in red.")
        print("2. WSUS-SECURE-SERVER should show 'Fully Patched' in green.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    mock_wsus_data()
