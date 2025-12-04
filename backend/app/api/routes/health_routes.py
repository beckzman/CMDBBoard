from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ConfigurationItem, User
from app.core.auth import get_current_user
from app.core.health_service import HealthService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/ci/{ci_id}/check-health")
async def check_ci_health(
    ci_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Check the health of a Configuration Item by pinging its hostname (name field).
    Updates the last_ping_success timestamp on successful ping.
    """
    ci = db.query(ConfigurationItem).filter(ConfigurationItem.id == ci_id).first()
    if not ci:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration Item not found"
        )
    
    result = HealthService.check_ci_health(db, ci)
    
    # Format datetime for JSON response
    if result.get("last_ping_success"):
        result["last_ping_success"] = result["last_ping_success"].isoformat()
        
    return result
