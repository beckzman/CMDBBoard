"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.db.models import CIStatus, CIType, RelationType, UserRole


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


    class Config:
        from_attributes = True


# Software Catalog Schemas
class SoftwareCatalogBase(BaseModel):
    name: str
    version: Optional[str] = None
    publisher: Optional[str] = None
    category: Optional[str] = "other"  # Using str to avoid enum complexity in circular deps if any, or simpler validation
    status: Optional[str] = "unapproved"
    end_of_life_date: Optional[datetime] = None
    aliases: Optional[List[str]] = []

class SoftwareCatalogCreate(SoftwareCatalogBase):
    pass

class SoftwareCatalogUpdate(SoftwareCatalogBase):
    pass

class SoftwareCatalogResponse(SoftwareCatalogBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    ci_count: int = 0

    class Config:
        from_attributes = True


class SoftwareCatalogNested(BaseModel):
    id: int
    name: str
    version: Optional[str] = None
    publisher: Optional[str] = None
    # Exclude aliases to avoid JSON serialization issues

    class Config:
        from_attributes = True


class MatchRequest(BaseModel):
    software_id: int
    string_to_match: str


# Configuration Item Schemas
class CIBase(BaseModel):
    name: str
    ci_type: CIType
    status: CIStatus = CIStatus.ACTIVE
    domain: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    environment: Optional[str] = None
    cost_center: Optional[str] = None
    sla: Optional[str] = None
    os_db_system: Optional[str] = None
    technical_details: Optional[str] = None
    software_id: Optional[int] = None


class CICreate(CIBase):
    pass


class CIUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[CIStatus] = None
    domain: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    environment: Optional[str] = None
    cost_center: Optional[str] = None
    sla: Optional[str] = None
    os_db_system: Optional[str] = None
    technical_details: Optional[str] = None
    software_id: Optional[int] = None


class CIResponse(CIBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_ping_success: Optional[datetime] = None
    software: Optional[SoftwareCatalogNested] = None
    
    class Config:
        from_attributes = True



# Relationship Schemas
class RelationshipBase(BaseModel):
    source_ci_id: int
    target_ci_id: int
    relationship_type: RelationType
    description: Optional[str] = None


class RelationshipCreate(RelationshipBase):
    pass


class RelationshipResponse(RelationshipBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Import Log Schemas
class ImportLogResponse(BaseModel):
    id: int
    import_type: str
    source: Optional[str] = None
    status: str
    records_processed: int
    records_success: int
    records_failed: int
    records_created: int
    records_updated: int
    error_message: Optional[str] = None
    details: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

    class Config:
        from_attributes = True


# Import Source Schemas
class ImportSourceBase(BaseModel):
    name: str
    source_type: str
    config: Optional[str] = None
    is_active: bool = True
    schedule_cron: Optional[str] = None


class ImportSourceCreate(ImportSourceBase):
    pass


class ImportSourceResponse(ImportSourceBase):
    id: int
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ImportConfigCheck(BaseModel):
    source_type: str
    config: str  # JSON string

# Dashboard Schemas
class DashboardStats(BaseModel):
    total_cis: int
    active_cis: int
    inactive_cis: int
    cis_by_type: dict
    cis_by_status: dict
    cis_by_department: dict
    cis_by_location: dict
    costs_by_cost_center: dict
    cis_by_os_db_system: dict
    cis_by_sla: dict
    ci_growth: dict
    recent_imports: int


class CIListResponse(BaseModel):
    items: List[CIResponse]
    total: int
    page: int
    page_size: int


# Domain Schemas
class DomainBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class DomainCreate(DomainBase):
    pass


class DomainResponse(DomainBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Cost Rule Schemas
class CostRuleBase(BaseModel):
    ci_type: CIType
    sla: Optional[str] = None
    os_db_system: Optional[str] = None
    base_cost: float
    currency: str = "EUR"


class CostRuleCreate(CostRuleBase):
    pass


class CostRuleUpdate(BaseModel):
    ci_type: Optional[CIType] = None
    sla: Optional[str] = None
    os_db_system: Optional[str] = None
    base_cost: Optional[float] = None
    currency: Optional[str] = None


class CostRuleResponse(CostRuleBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
