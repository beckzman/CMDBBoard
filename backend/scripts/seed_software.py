
import sys
import os
import json
from datetime import datetime

# Add the parent directory to the path so we can import the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set dummy SECRET_KEY for script execution if not present
if not os.environ.get("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "script-dummy-key-super-secret"

from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.db.models import SoftwareCatalog, SoftwareCategory, SoftwareStatus

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

SOFTWARE_DATA = [
    # --- Windows Server ---
    {
        "name": "Windows Server 2016",
        "version": "2016",
        "publisher": "Microsoft",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2027, 1, 12),
        "aliases": ["Windows 2016", "Win2016", "Microsoft Windows Server 2016 Standard", "Microsoft Windows Server 2016 Datacenter"]
    },
    {
        "name": "Windows Server 2019",
        "version": "2019",
        "publisher": "Microsoft",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2029, 1, 9),
        "aliases": ["Windows 2019", "Win2019", "Microsoft Windows Server 2019 Standard", "Microsoft Windows Server 2019 Datacenter"]
    },
    {
        "name": "Windows Server 2022",
        "version": "2022",
        "publisher": "Microsoft",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2031, 10, 14),
        "aliases": ["Windows 2022", "Win2022", "Microsoft Windows Server 2022 Standard", "Microsoft Windows Server 2022 Datacenter"]
    },
    {
        "name": "Windows Server 2012 R2",
        "version": "2012 R2",
        "publisher": "Microsoft",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.END_OF_LIFE,
        "end_of_life_date": datetime(2023, 10, 10),
        "aliases": ["Windows 2012 R2", "Win2012R2", "Microsoft Windows Server 2012 R2"]
    },

    # --- Linux ---
    {
        "name": "Red Hat Enterprise Linux 7",
        "version": "7",
        "publisher": "Red Hat",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.END_OF_LIFE,
        "end_of_life_date": datetime(2024, 6, 30),
        "aliases": ["RHEL 7", "Red Hat 7", "Red Hat Enterprise Linux Server release 7.9"]
    },
    {
        "name": "Red Hat Enterprise Linux 8",
        "version": "8",
        "publisher": "Red Hat",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2029, 5, 31),
        "aliases": ["RHEL 8", "Red Hat 8", "Red Hat Enterprise Linux release 8.8"]
    },
    {
        "name": "Red Hat Enterprise Linux 9",
        "version": "9",
        "publisher": "Red Hat",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2032, 5, 31),
        "aliases": ["RHEL 9", "Red Hat 9", "Red Hat Enterprise Linux release 9.2"]
    },
    {
        "name": "Ubuntu 20.04 LTS",
        "version": "20.04",
        "publisher": "Canonical",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2025, 4, 2),
        "aliases": ["Ubuntu 20", "Ubuntu 20.04.6 LTS"]
    },
    {
        "name": "Ubuntu 22.04 LTS",
        "version": "22.04",
        "publisher": "Canonical",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2027, 4, 1),
        "aliases": ["Ubuntu 22", "Ubuntu 22.04.2 LTS"]
    },

    # --- AIX ---
    {
        "name": "AIX 7.2",
        "version": "7.2",
        "publisher": "IBM",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.RESTRICTED,
        "end_of_life_date": datetime(2024, 4, 30),
        "aliases": ["AIX 7.", "AIX 7.2"]
    },
    {
        "name": "AIX 7.3",
        "version": "7.3",
        "publisher": "IBM",
        "category": SoftwareCategory.OS,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2029, 12, 31), # Estimated
        "aliases": ["AIX 7.3"]
    },

    # --- Databases ---
    {
        "name": "Oracle Database 19c",
        "version": "19c",
        "publisher": "Oracle",
        "category": SoftwareCategory.DATABASE,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2027, 4, 30),
        "aliases": ["Oracle 19c", "Oracle Database 19c Enterprise Edition"]
    },
    {
        "name": "Oracle Database 12c",
        "version": "12c",
        "publisher": "Oracle",
        "category": SoftwareCategory.DATABASE,
        "status": SoftwareStatus.END_OF_LIFE,
        "end_of_life_date": datetime(2022, 3, 31),
        "aliases": ["Oracle 12c", "Oracle Database 12c Enterprise Edition"]
    },
    {
        "name": "SQL Server 2017",
        "version": "2017",
        "publisher": "Microsoft",
        "category": SoftwareCategory.DATABASE,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2027, 10, 12),
        "aliases": ["MSSQL 2017", "Microsoft SQL Server 2017"]
    },
    {
        "name": "SQL Server 2019",
        "version": "2019",
        "publisher": "Microsoft",
        "category": SoftwareCategory.DATABASE,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2030, 1, 8),
        "aliases": ["MSSQL 2019", "Microsoft SQL Server 2019"]
    },
    {
        "name": "PostgreSQL 14",
        "version": "14",
        "publisher": "PostgreSQL Global Development Group",
        "category": SoftwareCategory.DATABASE,
        "status": SoftwareStatus.APPROVED,
        "end_of_life_date": datetime(2026, 11, 12),
        "aliases": ["Postgres 14", "Postgres 14.8"]
    }
]

def seed_data():
    db = next(get_db())
    print("Starting software catalog seeding...")
    
    count_new = 0
    count_existing = 0

    for item in SOFTWARE_DATA:
        # Check if exists by name
        existing = db.query(SoftwareCatalog).filter(SoftwareCatalog.name == item["name"]).first()
        
        if existing:
            print(f"Skipping {item['name']} (already exists)")
            count_existing += 1
        else:
            print(f"Creating {item['name']}...")
            new_software = SoftwareCatalog(
                name=item["name"],
                version=item["version"],
                publisher=item["publisher"],
                category=item["category"],
                status=item["status"],
                end_of_life_date=item["end_of_life_date"],
                aliases=json.dumps(item["aliases"])
            )
            db.add(new_software)
            count_new += 1
    
    db.commit()
    print(f"Seeding completed. New: {count_new}, Existing: {count_existing}")

if __name__ == "__main__":
    seed_data()
