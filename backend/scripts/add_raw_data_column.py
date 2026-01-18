import sys
import os
sys.path.append(os.getcwd())

from app.db.database import engine
from sqlalchemy import text

def add_column():
    print("Attempting to add raw_data column to configuration_items table...")
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE configuration_items ADD COLUMN raw_data TEXT"))
            conn.commit()
        print("✓ Successfully added raw_data column.")
    except Exception as e:
        if "duplicate column name" in str(e).lower():
            print("✓ Column raw_data already exists.")
        else:
            print(f"❌ Error adding column: {e}")

if __name__ == "__main__":
    add_column()
