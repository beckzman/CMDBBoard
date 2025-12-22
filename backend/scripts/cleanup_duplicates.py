
import sys
import os
from sqlalchemy import func, text

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.db.database import SessionLocal
from app.db.models import ConfigurationItem

def cleanup_duplicates():
    db = SessionLocal()
    try:
        print("Starting duplicate cleanup...")
        
        # 1. Find names that have duplicates
        # Group by name, count > 1
        duplicates_query = db.query(
            ConfigurationItem.name, 
            func.count(ConfigurationItem.id).label('count')
        ).group_by(ConfigurationItem.name).having(func.count(ConfigurationItem.id) > 1)
        
        duplicates = duplicates_query.all()
        
        if not duplicates:
            print("No duplicates found.")
            return

        print(f"Found {len(duplicates)} names with duplicates.")
        
        total_removed = 0
        
        for name, count in duplicates:
            print(f"Processing '{name}' (Count: {count})...")
            
            # Get all CIs with this name
            cis = db.query(ConfigurationItem).filter(
                ConfigurationItem.name == name
            ).order_by(
                ConfigurationItem.updated_at.desc(), # Keep most recently updated
                ConfigurationItem.id.desc()          # Tie-breaker: keep highest ID
            ).all()
            
            # Keep the first one (most recent), delete the rest
            ci_to_keep = cis[0]
            cis_to_remove = cis[1:]
            
            print(f"  Keeping ID: {ci_to_keep.id} (Updated: {ci_to_keep.updated_at})")
            
            for ci in cis_to_remove:
                print(f"  Deleting ID: {ci.id} (Updated: {ci.updated_at})")
                db.delete(ci)
                total_removed += 1
                
        db.commit()
        print(f"Cleanup complete. Removed {total_removed} duplicate records.")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_duplicates()
