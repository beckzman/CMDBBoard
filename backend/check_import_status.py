
import sys
import os
sys.path.append(os.getcwd())
from app.db.database import SessionLocal
from app.db.models import ImportLog
from sqlalchemy import desc

db = SessionLocal()
last_log = db.query(ImportLog).order_by(desc(ImportLog.started_at)).first()

if last_log:
    print(f"ID: {last_log.id}")
    print(f"Source: {last_log.source}")
    print(f"Status: {last_log.status}")
    print(f"Started: {last_log.started_at}")
    print(f"Completed: {last_log.completed_at}")
    print(f"Records Processed: {last_log.records_processed}")
    print(f"Details: {last_log.details}")
else:
    print("No import logs found.")
