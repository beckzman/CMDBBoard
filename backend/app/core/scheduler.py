import logging
"""
Scheduler for background tasks (Import jobs).
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import ImportSource
from app.core.import_engine import ReconciliationService
from app.core.health_service import HealthService
from app.db.models import ConfigurationItem, CIStatus

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def run_import_job(source_id: int):
    """Job to run a specific import source."""
    logger.info(f"Starting import job for source ID: {source_id}")
    db = SessionLocal()
    try:
        source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
        if not source or not source.is_active:
            logger.warning(f"Import source {source_id} not found or inactive.")
            return

        service = ReconciliationService(db, source)
        service.run_import()
        logger.info(f"Import job for source {source_id} completed.")
    except Exception as e:
        logger.error(f"Error in import job {source_id}: {e}")
    finally:
        db.close()

def run_daily_health_check():
    """Job to run health checks for all active CIs."""
    logger.info("Starting daily health check job...")
    db = SessionLocal()
    try:
        cis = db.query(ConfigurationItem).filter(
            ConfigurationItem.status != CIStatus.RETIRED
        ).all()
        
        logger.info(f"Found {len(cis)} CIs to check.")
        
        for ci in cis:
            try:
                # We don't need the return value here, just the side effect of updating the DB
                HealthService.check_ci_health(db, ci)
            except Exception as e:
                logger.error(f"Error checking health for CI {ci.name}: {e}")
                
        logger.info("Daily health check job completed.")
    except Exception as e:
        logger.error(f"Error in daily health check job: {e}")
    finally:
        db.close()

def start_scheduler():
    """Start the scheduler and load jobs from DB."""
    if not scheduler.running:
        scheduler.start()
        logger.info("Scheduler started.")
        
        # Schedule daily health check (runs at 00:00 every day)
        scheduler.add_job(
            run_daily_health_check,
            CronTrigger(hour=0, minute=0),
            id="daily_health_check",
            replace_existing=True
        )
        logger.info("Scheduled daily health check job at 00:00.")
        
        # Load existing active sources and schedule them
        db = SessionLocal()
        try:
            sources = db.query(ImportSource).filter(
                ImportSource.is_active == True,
                ImportSource.schedule_cron != None
            ).all()
            
            for source in sources:
                schedule_job(source)
        finally:
            db.close()

def schedule_job(source: ImportSource):
    """Add or update a job in the scheduler."""
    job_id = f"import_{source.id}"
    
    # Remove existing if any
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    
    if source.schedule_cron:
        try:
            scheduler.add_job(
                run_import_job,
                CronTrigger.from_crontab(source.schedule_cron),
                id=job_id,
                args=[source.id],
                replace_existing=True
            )
            logger.info(f"Scheduled job {job_id} with cron: {source.schedule_cron}")
        except Exception as e:
            logger.error(f"Failed to schedule job {job_id}: {e}")
