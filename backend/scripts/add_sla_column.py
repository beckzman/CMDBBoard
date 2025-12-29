
import sys
import os
from sqlalchemy import text

# Add the parent directory to sys.path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal

def add_sla_column():
    print("Starting migration: Checking for 'sla' column...")
    db = SessionLocal()
    try:
        # Check if column exists
        # Postgres specific check
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='configuration_items' AND column_name='sla';
        """)
        result = db.execute(check_query).fetchone()
        
        if result:
            print("Column 'sla' already exists. No action needed.")
        else:
            print("Column 'sla' missing. Adding it...")
            # Add the column
            alter_query = text("ALTER TABLE configuration_items ADD COLUMN sla VARCHAR(255);")
            db.execute(alter_query)
            db.commit()
            print("Column 'sla' added successfully.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_sla_column()
