import sys
import os
from sqlalchemy import text

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.db.database import engine

def migrate():
    with engine.connect() as conn:
        conn.execution_options(isolation_level="AUTOCOMMIT")
        print("Adding service_provider column...")
        try:
            conn.execute(text("ALTER TABLE configuration_items ADD COLUMN service_provider VARCHAR(255)"))
            print("Column added successfully.")
        except Exception as e:
            print(f"Error (column might already exist): {e}")

if __name__ == "__main__":
    migrate()
