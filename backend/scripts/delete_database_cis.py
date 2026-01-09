import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings
from app.db.models import ConfigurationItem, CIType

def delete_databases():
    engine = create_engine(str(settings.DATABASE_URL))
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Filter by CI Type 'database'
        # The Enum value is likely 'database' based on previous context
        cis_to_delete = db.query(ConfigurationItem).filter(ConfigurationItem.ci_type == CIType.DATABASE).all()
        
        count = len(cis_to_delete)
        print(f"Found {count} CIs of type 'Database'.")
        
        if count > 0:
            for ci in cis_to_delete:
                db.delete(ci)
            db.commit()
            print(f"Successfully deleted {count} items.")
        else:
            print("No items to delete.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_databases()
