from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.db.models import CostRule, User, UserRole, CIType
from app.schemas import CostRuleResponse, CostRuleCreate, CostRuleUpdate
from app.api.routes.auth_routes import get_current_user

router = APIRouter(
    prefix="/api/cost-rules",
    tags=["cost-rules"]
)

def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

@router.get("", response_model=List[CostRuleResponse])
def get_cost_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all cost rules."""
    return db.query(CostRule).all()

@router.post("", response_model=CostRuleResponse, status_code=status.HTTP_201_CREATED)
def create_cost_rule(
    rule: CostRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Create a new cost rule (Admin only)."""
    # Check for duplicate rule? Maybe logic to avoid exact duplicates if needed, but for now simple modify is fine.
    db_rule = CostRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.put("/{rule_id}", response_model=CostRuleResponse)
def update_cost_rule(
    rule_id: int,
    rule_update: CostRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Update a cost rule (Admin only)."""
    db_rule = db.query(CostRule).filter(CostRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Cost rule not found")
    
    update_data = rule_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_rule, key, value)
    
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cost_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user)
):
    """Delete a cost rule (Admin only)."""
    db_rule = db.query(CostRule).filter(CostRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Cost rule not found")
    
    db.delete(db_rule)
    db.commit()
