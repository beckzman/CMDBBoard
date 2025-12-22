import sys
import os
import json
import logging
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.database import SessionLocal
from app.core.import_engine import ReconciliationService
from app.db.models import ImportSource, ImportLog

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_logging():
    db = SessionLocal()
    try:
        # 1. Create a dummy Import Source
        source = db.query(ImportSource).filter_by(name="Test Log Source").first()
        if not source:
            source = ImportSource(
                name="Test Log Source",
                source_type="csv",
                config=json.dumps({
                    "file_path": "test_import.csv",
                    "field_mapping": {
                        "name": "Name",
                        "status": "Status"
                    },
                    "reconciliation": {
                        "key_field": "name",
                        "update_mode": "upsert"
                    }
                })
            )
            db.add(source)
            db.commit()
            db.refresh(source)
        
        # 2. Create a dummy CSV file
        csv_path = os.path.join(os.path.dirname(__file__), '..', 'test_import.csv')
        csv_path = os.path.abspath(csv_path)
        
        # Update config with absolute path
        config = json.loads(source.config)
        config['file_path'] = csv_path
        source.config = json.dumps(config)
        db.commit()
        
        with open(csv_path, 'w') as f:
            f.write("Name,Status\n")
            f.write(f"TestCI_Log_{datetime.now().timestamp()},Active\n")
        
        # 3. Run Import
        logger.info("Running import...")
        service = ReconciliationService(db, source)
        service.run_import()
        
        # 4. Check ImportLog
        log_entry = db.query(ImportLog).filter_by(source=source.name).order_by(ImportLog.id.desc()).first()
        if not log_entry:
            logger.error("No ImportLog found!")
            return
        
        logger.info(f"Import Log Status: {log_entry.status}")
        logger.info(f"Import Log Details: {log_entry.details}")
        
        if not log_entry.details:
            logger.error("Details field is empty!")
            return
            
        details = json.loads(log_entry.details)
        log_file = details.get('log_file')
        
        if not log_file:
            logger.error("No log_file path in details!")
            return
            
        if not os.path.exists(log_file):
            logger.error(f"Log file does not exist at: {log_file}")
            return
            
        # 5. Check Log File Content
        with open(log_file, 'r') as f:
            audit_data = json.load(f)
            logger.info(f"Audit Log Content: {json.dumps(audit_data, indent=2)}")
            
        if len(audit_data) > 0 and audit_data[0]['action'] == 'created':
            logger.info("SUCCESS: Audit log contains created item.")
        else:
            logger.error("FAILURE: Audit log missing or incorrect.")

    except Exception as e:
        logger.error(f"Verification failed: {e}")
    finally:
        db.close()
        # Cleanup
        if os.path.exists("test_import.csv"):
            os.remove("test_import.csv")
        # Don't delete source logs for manual inspection

if __name__ == "__main__":
    verify_logging()
