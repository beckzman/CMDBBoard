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


@router.post("/upload-source-file", status_code=status.HTTP_201_CREATED)
async def upload_source_file(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Upload a file to be used as an import source configuration."""
    # Validate file type (allow .csv, .json, .xlsx)
    allowed_exts = ['.csv', '.json', '.xlsx']
    ext = os.path.splitext(file.filename)[1].lower()
    
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_exts)}"
        )
    
    # Ensure uploads directory exists
    # We use a persistent path 'uploads' at the app root 
    # (assuming app runs from /app in docker or backend/ in local)
    upload_dir = os.path.abspath(os.path.join(os.getcwd(), "uploads"))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Create unique filename to avoid collisions
    import uuid
    safe_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
            
        return {"file_path": file_path, "filename": file.filename}
        
    except Exception as e:
        logger.error(f"File upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )


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
def list_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all import sources."""
    from app.db.models import ImportSource
    sources = db.query(ImportSource).all()
    
    # Convert to response format, ensuring config is a string
    result = []
    for source in sources:
        result.append({
            "id": source.id,
            "name": source.name,
            "source_type": source.source_type,
            "config": source.config if isinstance(source.config, str) else str(source.config),
            "is_active": source.is_active,
            "schedule_cron": source.schedule_cron,
            "last_run": source.last_run.isoformat() if source.last_run else None,
            "created_at": source.created_at.isoformat() if source.created_at else None
        })
    
    return result


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
    
    # Run in background (using scheduler)
    from app.core.scheduler import scheduler, start_scheduler
    from datetime import datetime, timedelta
    import uuid
    
    # Ensure scheduler is running
    if not scheduler.running:
        start_scheduler()
    
    # Use UUID to prevent ID collisions
    job_id = f"manual_run_{source_id}_{uuid.uuid4().hex}"
    
    scheduler.add_job(
        run_import_job,
        'date',
        run_date=datetime.now() + timedelta(seconds=1),
        args=[source_id],
        id=job_id
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


@router.post("/schema", status_code=status.HTTP_200_OK)
def get_source_schema(
    check_data: ImportConfigCheck,
    current_user: User = Depends(get_current_user)
):
    """Get list of available fields from import source."""
    try:
        config = parse_import_config(check_data.config)
        connector = get_connector_for_test(check_data.source_type, config)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown source type: {check_data.source_type}"
            )
        
        fields = connector.get_schema()
        
        return {"fields": fields}
        
    except Exception as e:
        logger.error(f"Get schema error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch schema: {str(e)}"
        )


@router.post("/categories", status_code=status.HTTP_200_OK)
def get_source_categories(
    check_data: ImportConfigCheck,
    current_user: User = Depends(get_current_user)
):
    """Get list of available object categories (types) from import source."""
    try:
        config = parse_import_config(check_data.config)
        connector = get_connector_for_test(check_data.source_type, config)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown source type: {check_data.source_type}"
            )
        
        categories = connector.get_categories()
        
        return {"categories": categories}
        
    except Exception as e:
        logger.error(f"Get categories error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch categories: {str(e)}"
        )


@router.post("/preview", status_code=status.HTTP_200_OK)
def get_source_preview(
    check_data: ImportConfigCheck,
    current_user: User = Depends(get_current_user)
):
    """Preview data from import source."""
    try:
        config = parse_import_config(check_data.config)
        connector = get_connector_for_test(check_data.source_type, config)
        
        if not connector:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown source type: {check_data.source_type}"
            )
        
        data = connector.preview_data(limit=5)
        
        return {"data": data}
        
    except Exception as e:
        logger.error(f"Preview error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch preview: {str(e)}"
        )


@router.delete("/sources/{source_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_import_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Delete an import source."""
    from app.db.models import ImportSource
    source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import source not found"
        )
    
    db.delete(source)
    db.commit()
    return None


@router.put("/sources/{source_id}", response_model=ImportSourceResponse)
def update_import_source(
    source_id: int,
    source_update: ImportSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN))
):
    """Update an import source."""
    from app.db.models import ImportSource
    source = db.query(ImportSource).filter(ImportSource.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Import source not found"
        )
    
    source.name = source_update.name
    source.source_type = source_update.source_type
    source.config = source_update.config
    source.is_active = source_update.is_active
    source.schedule_cron = source_update.schedule_cron
    
    db.commit()
    db.refresh(source)
    return source


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
