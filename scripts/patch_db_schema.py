import sys
import os
from sqlalchemy import create_engine, text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

def patch_db():
    print("Connecting to DB...")
    # Update this connection string if needed - ensuring we use the one visible from HOST machine
    DATABASE_URL = "postgresql://cmdb_user:cmdb_password@localhost:5433/cmdb_database"
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        print("Checking for missing columns...")
        
        try:
            # 1. Add patch_summary column
            try:
                conn.execute(text("ALTER TABLE configuration_items ADD COLUMN patch_summary JSONB;"))
                print("Added 'patch_summary' column.")
            except Exception as e:
                if "already exists" in str(e):
                    print("'patch_summary' column already exists.")
                else:
                    print(f"Error adding patch_summary: {e}")

            # 2. Change raw_data to JSONB if it's currently TEXT
            # We use USING raw_data::jsonb to convert existing text to jsonb.
            # If standard JSON is preferred, use JSON instead of JSONB, but JSONB is better for Postgres.
            # SQLAlchemy JSON type maps to JSON type in Postgres, but JSONB is usually what we want for performance/indexing.
            # Let's stick to JSON to match the model definition loosely, or just alter type.
            
            try:
                # Sanitize 'NaN' values in the text to 'null' before conversion
                conn.execute(text("UPDATE configuration_items SET raw_data = REPLACE(raw_data, ': NaN', ': null') WHERE raw_data LIKE '%: NaN%';"))
                conn.execute(text("ALTER TABLE configuration_items ALTER COLUMN raw_data TYPE JSONB USING raw_data::jsonb;"))
                print("Converted 'raw_data' to JSONB.")
            except Exception as e:
                print(f"Error converting raw_data: {e}")
                
        except Exception as e:
            print(f"General Error: {e}")

if __name__ == "__main__":
    patch_db()
