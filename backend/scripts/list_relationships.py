import sys
import os
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.models import Relationship, ConfigurationItem
from app.core.config import settings

def list_relationships():
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        query = select(Relationship)
        relationships = db.execute(query).scalars().all()

        if not relationships:
            print("No relationships found in the database.")
            return

        print(f"Found {len(relationships)} relationships:")
        print("-" * 60)
        print(f"{'Source CI':<25} | {'Type':<15} | {'Target CI':<25}")
        print("-" * 60)

        for rel in relationships:
            # Fetch names directly to avoid object validation errors (e.g. invalid Status Enum)
            source_name = db.query(ConfigurationItem.name).filter(ConfigurationItem.id == rel.source_ci_id).scalar() or f"Unknown ({rel.source_ci_id})"
            target_name = db.query(ConfigurationItem.name).filter(ConfigurationItem.id == rel.target_ci_id).scalar() or f"Unknown ({rel.target_ci_id})"
            
            # handle both relation_type (model) and relationship_type (property)
            # accessing the column attribute directly for safety
            rel_type = rel.relationship_type

            print(f"{source_name:<25} | {rel_type.value:<15} | {target_name:<25}")

    except Exception as e:
        print(f"Error listing relationships: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_relationships()
