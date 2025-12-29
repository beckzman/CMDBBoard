import sys
import os
import random
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.models import Relationship, ConfigurationItem, RelationType
from app.core.config import settings

def seed_relationships():
    print("Connecting to database...")
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get all CI IDs
        cis = db.query(ConfigurationItem.id).all()
        # cis is a list of tuples like [(1,), (2,), ...], flat it
        ci_ids = [c[0] for c in cis]

        if len(ci_ids) < 2:
            print("Not enough CIs to create relationships.")
            return

        print(f"Found {len(ci_ids)} CIs. Creating random relationships...")
        
        created_count = 0
        relation_types = list(RelationType)

        for _ in range(20):
            source_id = random.choice(ci_ids)
            target_id = random.choice(ci_ids)
            
            # Avoid self-loops
            if source_id == target_id:
                continue
                
            # Check if relationship already exists
            exists = db.query(Relationship).filter(
                Relationship.source_ci_id == source_id,
                Relationship.target_ci_id == target_id
            ).first()
            
            if not exists:
                rel_type = random.choice(relation_types)
                new_rel = Relationship(
                    source_ci_id=source_id,
                    target_ci_id=target_id,
                    relationship_type=rel_type,
                    description=f"Auto-generated dependency: {source_id} -> {target_id}"
                )
                db.add(new_rel)
                created_count += 1
                print(f"Created relationship: {source_id} --[{rel_type.value}]--> {target_id}")

        db.commit()
        print(f"Successfully created {created_count} new relationships.")

    except Exception as e:
        print(f"Error seeding relationships: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_relationships()
