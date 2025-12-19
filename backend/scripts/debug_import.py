import sys
import os
import json
import logging
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.database import SessionLocal
from app.core.import_engine import ReconciliationService
from app.db.models import ImportSource, ImportLog

# Setup logging
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
log_filename = f"import_debug_{timestamp}.log"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_filename),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def debug_last_import():
    db = SessionLocal()
    try:
        # Get the i-doit source
        source = db.query(ImportSource).filter(ImportSource.source_type == 'idoit').first()
        if not source:
            print("No i-doit import source found.")
            return

        print(f"Starting debug import for source: {source.name} (ID: {source.id})")
        
        # Initialize service
        service = ReconciliationService(db, source)
        
        # Run import (synchronously)
        # We need to capture the logs/actions. 
        # The ReconciliationService writes to ImportLog but doesn't necessarily return details unless we modify it 
        # or we rely on the internal log object.
        
        # Let's run it and then check the log object
        service.run_import()
        log_entry = service.log
        
        # Verify result
        print(f"Import finished. Status: {log_entry.status}")
        print(f"Processed: {log_entry.records_processed}")
        print(f"Created: {log_entry.records_success}") # Note: success includes updates in current logic
        
        # Log summary via logger (so it goes to file)
        logger.info("-" * 50)
        logger.info(f"Import Summary for {source.name}")
        logger.info(f"Status: {log_entry.status}")
        logger.info(f"Processed: {log_entry.records_processed}")
        
        if log_entry.details:
             logger.info(f"Details: {log_entry.details}")
                
        print(f"Log written to {log_filename}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_last_import()
