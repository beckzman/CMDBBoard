import sys
import os
import json
import logging

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

from app.db.database import SessionLocal
from app.db.models import ImportSource
from app.core.import_engine import OracleConnector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_oracle_connection():
    db = SessionLocal()
    try:
        # Find Oracle source
        sources = db.query(ImportSource).filter(ImportSource.source_type == 'oracle').all()
        
        if not sources:
            print("No Oracle import sources found.")
            return

        for source in sources:
            print(f"Testing Source: {source.name} (ID: {source.id})")
            config = json.loads(source.config)
            
            # Mask password for display
            safe_config = config.copy()
            if 'password' in safe_config:
                safe_config['password'] = '******'
            print(f"Configuration: {safe_config}")

            connector = OracleConnector(config)
            
            print("Attempting connection...")
            try:
                success = connector.test_connection()
                if success:
                    print("SUCCESS: Connection established.")
                else:
                    print("FAILURE: Connection test returned False.")
            except Exception as e:
                print(f"ERROR: Exception during connection test: {e}")
                import traceback
                traceback.print_exc()

    except Exception as e:
        print(f"General Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_oracle_connection()
