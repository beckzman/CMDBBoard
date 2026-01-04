
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
    print("Starting migration: Adding 'end_of_life_date' to Software Catalog...")
    
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns("software_catalog")]

    with engine.connect() as connection:
        if "end_of_life_date" not in columns:
            print("Adding 'end_of_life_date' column...")
            connection.execute(text("ALTER TABLE software_catalog ADD COLUMN end_of_life_date TIMESTAMP;"))
            print("Column 'end_of_life_date' added.")
        else:
            print("Column 'end_of_life_date' already exists.")

        connection.commit()
        print("Migration completed successfully.")

if __name__ == "__main__":
    migrate()
