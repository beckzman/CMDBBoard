
import sys
import os

# Add the parent directory to the path so we can import the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set dummy SECRET_KEY for script execution if not present
if not os.environ.get("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "script-dummy-key-super-secret"

from sqlalchemy import text, inspect
from app.db.database import engine

def migrate():
    print("Starting migration: Adding Software Catalog tables...")
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    with engine.connect() as connection:
        # 1. Create software_catalog table if it doesn't exist
        if "software_catalog" not in existing_tables:
            print("Creating table 'software_catalog'...")
            connection.execute(text("""
                CREATE TABLE software_catalog (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(255) NOT NULL,
                    version VARCHAR(100),
                    publisher VARCHAR(255),
                    category VARCHAR(50) NOT NULL,
                    status VARCHAR(50) NOT NULL,
                    aliases TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                );
            """))
            connection.execute(text("CREATE INDEX ix_software_catalog_id ON software_catalog (id);"))
            connection.execute(text("CREATE INDEX ix_software_catalog_name ON software_catalog (name);"))
            print("Table 'software_catalog' created.")
        else:
            print("Table 'software_catalog' already exists.")

        # 2. Add software_id column to configuration_items if it doesn't exist
        columns = [col['name'] for col in inspector.get_columns("configuration_items")]
        if "software_id" not in columns:
            print("Adding 'software_id' column to 'configuration_items'...")
            connection.execute(text("ALTER TABLE configuration_items ADD COLUMN software_id INTEGER REFERENCES software_catalog(id);"))
            print("Column 'software_id' added.")
        else:
            print("Column 'software_id' already exists in 'configuration_items'.")

        connection.commit()
        print("Migration completed successfully.")

if __name__ == "__main__":
    migrate()
