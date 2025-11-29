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
from app.schemas import ImportLogResponse
from app.services.csv_importer import CSVImporter

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
