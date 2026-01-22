import sys
import os
import json
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import ConfigurationItem, ImportSource, CIType, CIStatus
from app.core.import_engine import ReconciliationService

# Setup path
sys.path.append(os.getcwd())

def test_raw_merge():
    # Mock DB
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cmdb_user:cmdb_password@localhost:5433/cmdb_database")
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Create Dummy Source
        source = ImportSource(
            name="Test Source",
            source_type="wsus", # Defines the key 'wsus'
            config="{}"
        )
        # We simulate the source being in DB even if we don't commit it, but easier to use fake object
        source.id = 999 

        # Create Existing CI with pre-existing data (simulating vCenter)
        existing_raw = {"vcenter": {"cpu": 8, "mem": 16384}}
        ci = ConfigurationItem(
            name="MERGE-TEST-SERVER",
            ci_type=CIType.SERVER,
            status=CIStatus.ACTIVE,
            raw_data=json.dumps(existing_raw),
            import_source_id=1,
            last_sync=datetime.utcnow()
        )
        db.add(ci)
        db.commit()
        print(f"Created CI {ci.name} with raw_data: {ci.raw_data}")

        # Initialize Recon Service
        service = ReconciliationService(db, source)
        
        # New "WSUS" data
        new_wsus_data = {"patch_count": 5, "last_scan": "2024-01-01"}
        mapped_record = {"name": "MERGE-TEST-SERVER"} # Simple map
        
        print("Running update...")
        service._update_ci(ci, mapped_record, new_wsus_data)
        
        # Verify
        db.refresh(ci)
        final_raw = json.loads(ci.raw_data)
        
        print(f"Final raw_data keys: {final_raw.keys()}")
        
        if "vcenter" in final_raw and "wsus" in final_raw:
            print("SUCCESS: Both sections exist!")
            print(json.dumps(final_raw, indent=2))
        else:
            print("FAILURE: Missing sections.")
            print(json.dumps(final_raw, indent=2))
            
    finally:
        # Cleanup
        if 'ci' in locals():
            db.delete(ci)
            db.commit()
            print("Cleanup complete.")
        db.close()

if __name__ == "__main__":
    test_raw_merge()
