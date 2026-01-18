import os
import sys
import json
import logging
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), 'backend')))

from app.core.import_engine import ReconciliationService, CSVConnector
from app.db.database import SessionLocal, engine, Base
from app.db.models import ImportSource, ConfigurationItem, CIType, CIStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_csv_import_raw_data():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    csv_file = "test_import.csv"
    with open(csv_file, "w") as f:
        f.write("name,ci_type,status,description,extra_col\n")
        f.write("TEST-CI-RAW,server,active,Test Description,SomeRawValue\n")
        
    try:
        # Create Dummy Source
        source = ImportSource(
            name="Test CSV Source",
            source_type="csv",
            config=json.dumps({
                "file_path": os.path.abspath(csv_file),
                "field_mapping": {"name": "name"}
            }),
            is_active=True
        )
        db.add(source)
        db.commit()
        db.refresh(source)
        
        print(f"Created Source ID: {source.id}")

        # Run Import
        service = ReconciliationService(db, source)
        service.run_import()
        
        # Verify
        ci = db.query(ConfigurationItem).filter(ConfigurationItem.name == "TEST-CI-RAW").first()
        if ci and ci.raw_data:
            print("SUCCESS: Raw Data found!")
            print(f"Raw Data: {ci.raw_data}")
            raw_json = json.loads(ci.raw_data)
            if raw_json.get('extra_col') == "SomeRawValue":
                 print("SUCCESS: extra_col captured correctly")
            else:
                 print("FAILURE: extra_col missing")
        else:
            print("FAILURE: CI not found or raw_data empty")
            if ci:
                print(f"CI raw_data: {ci.raw_data}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        if 'ci' in locals() and ci:
            db.delete(ci)
        if 'source' in locals() and source:
            try:
                db.delete(source)
            except Exception as e:
                print(f"Cleanup warning: {e}")
        db.commit()
        db.close()
        if os.path.exists(csv_file):
            os.remove(csv_file)

if __name__ == "__main__":
    test_csv_import_raw_data()
