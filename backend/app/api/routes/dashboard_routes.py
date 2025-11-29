"""
Dashboard statistics and overview routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ConfigurationItem, User, CIStatus, CIType, ImportLog
from app.schemas import DashboardStats, CIResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dashboard statistics."""
    # Total CIs
    total_cis = db.query(ConfigurationItem).filter(
        ConfigurationItem.deleted_at.is_(None)
    ).count()
    
    # Active CIs
    active_cis = db.query(ConfigurationItem).filter(
        ConfigurationItem.deleted_at.is_(None),
        ConfigurationItem.status == CIStatus.ACTIVE
    ).count()
    
    # Inactive CIs
    inactive_cis = db.query(ConfigurationItem).filter(
        ConfigurationItem.deleted_at.is_(None),
        ConfigurationItem.status == CIStatus.INACTIVE
    ).count()
    
    # CIs by type
    cis_by_type_query = db.query(
        ConfigurationItem.ci_type,
        func.count(ConfigurationItem.id)
    ).filter(
        ConfigurationItem.deleted_at.is_(None)
    ).group_by(ConfigurationItem.ci_type).all()
    
    cis_by_type = {ci_type.value: count for ci_type, count in cis_by_type_query}
    
    # CIs by status
    cis_by_status_query = db.query(
        ConfigurationItem.status,
        func.count(ConfigurationItem.id)
    ).filter(
        ConfigurationItem.deleted_at.is_(None)
    ).group_by(ConfigurationItem.status).all()
    
    cis_by_status = {status.value: count for status, count in cis_by_status_query}
    
    # Recent imports (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_imports = db.query(ImportLog).filter(
        ImportLog.started_at >= seven_days_ago
    ).count()
    
    return {
        "total_cis": total_cis,
        "active_cis": active_cis,
        "inactive_cis": inactive_cis,
        "cis_by_type": cis_by_type,
        "cis_by_status": cis_by_status,
        "recent_imports": recent_imports
    }


@router.get("/recent", response_model=list[CIResponse])
def get_recent_cis(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get recently added or modified CIs."""
    recent_cis = db.query(ConfigurationItem).filter(
        ConfigurationItem.deleted_at.is_(None)
    ).order_by(
        ConfigurationItem.updated_at.desc().nullslast(),
        ConfigurationItem.created_at.desc()
    ).limit(limit).all()
    
    return recent_cis
