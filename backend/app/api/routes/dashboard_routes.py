"""
Dashboard statistics and overview routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ConfigurationItem, User, CIStatus, CIType, ImportLog, CostRule
from app.schemas import DashboardStats, CIResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def normalize_os(os_name: str) -> str:
    """Normalize OS name to generic categories."""
    if not os_name:
        return ""
    
    os_name = os_name.lower()
    
    # Linux
    if any(x in os_name for x in ['ubuntu', 'debian', 'centos', 'redhat', 'fedora', 'suse', 'linux', 'rhel', 'aix']):
        return "linux"
    
    # Windows Server
    if any(x in os_name for x in ['windows server', 'windows 20']):
        return "windows server"
        
    # Windows Client
    if any(x in os_name for x in ['windows 1', 'windows 7', 'windows 8', 'windows xp', 'windows vista']):
        return "windows client"
        
    # macOS
    if any(x in os_name for x in ['darwin', 'macos', 'osx']):
        return "macos"
        
    return os_name


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

    # CIs by Department
    cis_by_dept_query = db.query(
        ConfigurationItem.department,
        func.count(ConfigurationItem.id)
    ).filter(
        ConfigurationItem.deleted_at.is_(None)
    ).group_by(ConfigurationItem.department).all()

    cis_by_department = {dept or "Unknown": count for dept, count in cis_by_dept_query}

    # CIs by Location
    cis_by_loc_query = db.query(
        ConfigurationItem.location,
        func.count(ConfigurationItem.id)
    ).filter(
        ConfigurationItem.deleted_at.is_(None)
    ).group_by(ConfigurationItem.location).all()

    cis_by_location = {loc or "Unknown": count for loc, count in cis_by_loc_query}
    
    # Calculate Costs by Cost Center
    # 1. Fetch all cost rules
    cost_rules = db.query(CostRule).all()
    
    # 2. Fetch all active CIs with relevant fields
    active_cis_data = db.query(
        ConfigurationItem.ci_type,
        ConfigurationItem.sla,
        ConfigurationItem.operating_system,
        ConfigurationItem.cost_center
    ).filter(
        ConfigurationItem.deleted_at.is_(None),
        ConfigurationItem.status == CIStatus.ACTIVE
    ).all()
    
    # 3. Calculate cost per CI and aggregate
    costs_by_cost_center = {}
    
    for ci in active_cis_data:
        # Filter rules for this CI type
        relevant_rules = [r for r in cost_rules if r.ci_type == ci.ci_type]
        
        best_match_cost = 0.0
        best_score = -1
        
        normalized_ci_os = normalize_os(ci.operating_system)
        
        for rule in relevant_rules:
            score = 0
            
            # Check SLA
            if rule.sla:
                if rule.sla.lower() == (ci.sla or "").lower():
                    score += 2
                else:
                    score = -1 # Mismatch, rule doesn't apply
                    continue
            
            # Check OS
            if rule.operating_system:
                rule_os = rule.operating_system.lower()
                ci_os = (ci.operating_system or "").lower()
                
                # Check 1: Direct Match or Substring (Existing logic)
                is_direct_match = rule_os == ci_os or (ci_os and rule_os in ci_os)
                
                # Check 2: Normalized Match (New Intelligence)
                # e.g. Rule="Linux", CI="Ubuntu" -> Norm(CI)="Linux" -> Match
                is_normalized_match = rule_os == normalized_ci_os
                
                if is_direct_match:
                     score += 1.5 # Specific match preferred slightly?
                elif is_normalized_match:
                     score += 1 # Generic match
                else:
                    score = -1
                    continue
            
            if score > best_score:
                best_score = score
                best_match_cost = rule.base_cost
            
            if score > best_score:
                best_score = score
                best_match_cost = rule.base_cost
                
        # If no rule matches, cost is 0.0
        
        cc = ci.cost_center or "Unassigned"
        costs_by_cost_center[cc] = costs_by_cost_center.get(cc, 0.0) + best_match_cost

    return {
        "total_cis": total_cis,
        "active_cis": active_cis,
        "inactive_cis": inactive_cis,
        "cis_by_type": cis_by_type,
        "cis_by_status": cis_by_status,
        "cis_by_department": cis_by_department,
        "cis_by_location": cis_by_location,
        "costs_by_cost_center": costs_by_cost_center,
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
