"""
Import routes for CSV, SharePoint, and API imports.
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import os
import tempfile
from app.core.auth import get_current_user, require_role
from app.db.database import get_db
from app.db.models import User, UserRole, ImportLog
from app.services.csv_importer import CSVImporter
from app.core.import_engine import get_connector_for_test, parse_import_config
from app.schemas import ImportLogResponse, ImportSourceCreate, ImportSourceResponse, ImportConfigCheck
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/import", tags=["Import"])


@router.post("/csv", response_model=ImportLogResponse)
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.EDITOR))
):
    """Import configuration items from CSV file."""
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_file_path = temp_file.name
    
    try:
        # Import from CSV
        importer = CSVImporter(db, current_user.id)
        import_log = importer.import_from_file(temp_file_path)
        
        return import_log
    
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@router.get("/history", response_model=List[ImportLogResponse])
def get_import_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get import history."""
    import_logs = db.query(ImportLog).order_by(
        ImportLog.started_at.desc()
    ).limit(limit).all()
    
    return import_logs


@router.get("/{import_id}", response_model=ImportLogResponse)
def get_import_status(
    import_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific import status."""
    import_log = db.query(ImportLog).filter(ImportLog.id == import_id).first()
    
    if not import_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import log not found"
        )
    
    return import_log
    return import_log


@router.post("/sources", response_model=ImportSourceResponse, status_code=status.HTTP_201_CREATED)
def create_import_source(
    source_data: ImportSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Create a new import source."""
    from app.db.models import ImportSource
    from app.core.scheduler import schedule_job
    
    new_source = ImportSource(**source_data.model_dump())
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    
    # Schedule if active and has cron
    if new_source.is_active and new_source.schedule_cron:
        schedule_job(new_source)
    
    return new_source


@router.get("/sources", response_model=List[ImportSourceResponse])
def list_import_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all import sources."""
    from app.db.models import ImportSource
    return db.query(ImportSource).all()


@router.post("/sources/{source_id}/run", status_code=status.HTTP_202_ACCEPTED)
async def run_import_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Manually trigger an import job."""
    from app.db.models import ImportSource
    from app.core.scheduler import run_import_job
    
    source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import source not found"
        )
    
    # Run in background (using scheduler's executor or just async)
    # For simplicity, we'll run it directly in the background task
    # But since run_import_job is synchronous (DB ops), we should be careful.
    # Ideally, use BackgroundTasks from FastAPI.
    from fastapi import BackgroundTasks
    
    # Re-implementing run_import_job call here to use BackgroundTasks properly
    # or just call the function if it was async.
    # Let's use the scheduler to add a one-time job "now"
    from app.core.scheduler import scheduler, start_scheduler
    from datetime import datetime, timedelta
    
    # Ensure scheduler is running
    if not scheduler.running:
        start_scheduler()
    
    scheduler.add_job(
        run_import_job,
        'date',
        run_date=datetime.now() + timedelta(seconds=1),
        args=[source_id],
        id=f"manual_run_{source_id}_{int(datetime.now().timestamp())}"
    )
    
    
    scheduler.add_job(
        run_import_job,
        'date',
        run_date=datetime.now() + timedelta(seconds=1),
        args=[source_id],
        id=f"manual_run_{source_id}_{int(datetime.now().timestamp())}"
    )
    
    return {"message": "Import job scheduled"}


@router.post("/test-connection", status_code=status.HTTP_200_OK)
def test_connection_endpoint(
    check_data: ImportConfigCheck,
    current_user: User = Depends(get_current_user)
):
    """Test connection to an import source."""
    try:
        config = parse_import_config(check_data.config)
        connector = get_connector_for_test(check_data.source_type, config)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown source type: {check_data.source_type}"
            )
            
        is_connected = connector.test_connection()
        
        if not is_connected:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connection failed"
            )
            
        return {"message": "Connection successful"}
        
    except Exception as e:
        logger.error(f"Test connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection check failed: {str(e)}"
        )
