import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.models import ConfigurationItem

sys.path.append(os.getcwd())

def check_recent_cis():
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://cmdb_user:cmdb_password@localhost:5433/cmdb_database")
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    print("Checking recent CIs...")
    recent_cis = db.query(ConfigurationItem).order_by(ConfigurationItem.updated_at.desc(), ConfigurationItem.created_at.desc()).limit(5).all()

    for ci in recent_cis:
        print(f"ID: {ci.id}, Name: {ci.name}")
        print(f"  Type: {ci.ci_type} ({type(ci.ci_type)})")
        print(f"  Status: {ci.status} ({type(ci.status)})")
        print(f"  Raw Data Type: {type(ci.raw_data)}")
        if ci.ci_type is None:
            print("  [ERROR] ci_type is None!")
        if ci.status is None:
            print("  [ERROR] status is None!")
        
    db.close()

if __name__ == "__main__":
    check_recent_cis()
