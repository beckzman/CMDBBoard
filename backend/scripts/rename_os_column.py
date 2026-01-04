
import sys
import os
from sqlalchemy import text

# Add the parent directory to sys.path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Manually load .env file
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                # Only set if not already present (prioritize Docker env vars)
                if key not in os.environ:
                    os.environ[key] = value

from app.db.database import SessionLocal

def rename_os_column():
    print("Starting migration: Renaming 'operating_system' to 'os_db_system'...")
    db = SessionLocal()
    try:
        # 1. Rename usage in configuration_items
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='configuration_items' AND column_name='operating_system';
        """)
        result = db.execute(check_query).fetchone()
        
        if result:
            print("Found 'operating_system' in 'configuration_items'. Renaming...")
            alter_query = text("ALTER TABLE configuration_items RENAME COLUMN operating_system TO os_db_system;")
            db.execute(alter_query)
            print("Renamed in 'configuration_items'.")
        else:
            print("'operating_system' not found in 'configuration_items' (maybe already renamed?).")

        # 2. Rename usage in cost_rules
        check_query_cost = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='cost_rules' AND column_name='operating_system';
        """)
        result_cost = db.execute(check_query_cost).fetchone()

        if result_cost:
             print("Found 'operating_system' in 'cost_rules'. Renaming...")
             alter_query_cost = text("ALTER TABLE cost_rules RENAME COLUMN operating_system TO os_db_system;")
             db.execute(alter_query_cost)
             print("Renamed in 'cost_rules'.")
        else:
            print("'operating_system' not found in 'cost_rules'.")

        db.commit()
        print("Migration completed successfully.")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    rename_os_column()
