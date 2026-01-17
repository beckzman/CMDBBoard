import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

def migrate():
    print("Migrating database: Adding 'contact' column to 'configuration_items' table...")
    
    engine = create_engine(str(settings.DATABASE_URL))
    
    # Use explicit connection and transaction
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            # Check if column exists - this query MUST be valid so it doesn't abort the transaction
            # Using information_schema is safer than try/except on SELECT
            result = connection.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name='configuration_items' AND column_name='contact'"
            ))
            if result.fetchone():
                print("Column 'contact' already exists.")
                return

            print("Adding column...")
            connection.execute(text("ALTER TABLE configuration_items ADD COLUMN contact VARCHAR(255)"))
            trans.commit()
            print("Successfully added 'contact' column.")
            
        except Exception as e:
            trans.rollback()
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    migrate()
