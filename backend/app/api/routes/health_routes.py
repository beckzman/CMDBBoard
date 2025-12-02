from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ConfigurationItem, User
from app.core.auth import get_current_user
import subprocess
import platform
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
    """
    ci = db.query(ConfigurationItem).filter(ConfigurationItem.id == ci_id).first()
    if not ci:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuration Item not found"
        )
    
    hostname = ci.name
    if not hostname:
        return {"status": "unknown", "details": "No hostname provided"}
        
    # Construct FQDN if domain is present
    target = hostname
    if ci.domain:
        target = f"{hostname}.{ci.domain}"

    # Determine ping command based on OS
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', target]
    
    try:
        # Run ping command with a timeout of 2 seconds
        output = subprocess.run(
            command, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE, 
            timeout=2,
            text=True
        )
        
        if output.returncode == 0:
            return {"status": "alive", "details": "Host is reachable"}
        else:
            return {"status": "unreachable", "details": "Host is unreachable"}
            
    except subprocess.TimeoutExpired:
        return {"status": "unreachable", "details": "Request timed out"}
    except Exception as e:
        logger.error(f"Ping failed for {target}: {str(e)}")
        return {"status": "error", "details": str(e)}
