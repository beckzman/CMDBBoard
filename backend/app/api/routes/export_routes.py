"""
Export routes for generating CI exports.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import tempfile
from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, CIType, CIStatus
from app.services.export_service import ExportService

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get("/csv")
def export_csv(
    ci_type: Optional[CIType] = None,
    status: Optional[CIStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export CIs to CSV file."""
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv', mode='w')
    temp_file.close()
    
    try:
        # Export to CSV
        export_service = ExportService(db)
        export_service.export_to_csv(temp_file.name, ci_type, status)
        
        # Return file
        return FileResponse(
            temp_file.name,
            media_type='text/csv',
            filename=f'cmdb_export_{ci_type.value if ci_type else "all"}.csv'
        )
    
    except Exception as e:
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.get("/excel")
def export_excel(
    ci_type: Optional[CIType] = None,
    status: Optional[CIStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export CIs to Excel file."""
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx', mode='wb')
    temp_file.close()
    
    try:
        # Export to Excel
        export_service = ExportService(db)
        export_service.export_to_excel(temp_file.name, ci_type, status)
        
        # Return file
        return FileResponse(
            temp_file.name,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            filename=f'cmdb_export_{ci_type.value if ci_type else "all"}.xlsx'
        )
    
    except Exception as e:
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )


@router.get("/json")
def export_json(
    ci_type: Optional[CIType] = None,
    status: Optional[CIStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export CIs to JSON file."""
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.json', mode='w')
    temp_file.close()
    
    try:
        # Export to JSON
        export_service = ExportService(db)
        export_service.export_to_json(temp_file.name, ci_type, status)
        
        # Return file
        return FileResponse(
            temp_file.name,
            media_type='application/json',
            filename=f'cmdb_export_{ci_type.value if ci_type else "all"}.json'
        )
    
    except Exception as e:
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )
