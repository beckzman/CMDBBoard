"""
Database models for ITIL CMDB.
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum


class CIStatus(str, enum.Enum):
    """Configuration Item status enumeration."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    RETIRED = "retired"
    PLANNED = "planned"
    MAINTENANCE = "maintenance"


class CIType(str, enum.Enum):
    """Configuration Item type enumeration."""
    SERVER = "server"
    APPLICATION = "application"
    NETWORK_DEVICE = "network_device"
    DATABASE = "database"
    WORKSTATION = "workstation"
    STORAGE = "storage"
    OTHER = "other"


class RelationType(str, enum.Enum):
    """Relationship type enumeration."""
    DEPENDS_ON = "depends_on"
    RUNS_ON = "runs_on"
    CONNECTS_TO = "connects_to"
    USES = "uses"
    HOSTS = "hosts"
    MANAGED_BY = "managed_by"


class UserRole(str, enum.Enum):
    """User role enumeration."""
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"


class User(Base):
    """User model for authentication and authorization."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ConfigurationItem(Base):
    """Base Configuration Item model."""
    __tablename__ = "configuration_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    ci_type = Column(Enum(CIType), nullable=False, index=True)
    status = Column(Enum(CIStatus), default=CIStatus.ACTIVE, nullable=False, index=True)
    domain = Column(String(255), nullable=True)
    description = Column(Text)
    owner = Column(String(255))
    location = Column(String(255))
    environment = Column(String(50))  # production, development, test, etc.
    cost_center = Column(String(100))
    
    # Technical details (JSON-like text field for flexibility)
    technical_details = Column(Text)  # Store as JSON string
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)  # Soft delete
    
    # Relationships
    source_relationships = relationship(
        "Relationship",
        foreign_keys="Relationship.source_ci_id",
        back_populates="source_ci",
        cascade="all, delete-orphan"
    )
    target_relationships = relationship(
        "Relationship",
        foreign_keys="Relationship.target_ci_id",
        back_populates="target_ci",
        cascade="all, delete-orphan"
    )


class Relationship(Base):
    """CI-to-CI relationship model."""
    __tablename__ = "relationships"
    
    id = Column(Integer, primary_key=True, index=True)
    source_ci_id = Column(Integer, ForeignKey("configuration_items.id"), nullable=False)
    target_ci_id = Column(Integer, ForeignKey("configuration_items.id"), nullable=False)
    relationship_type = Column(Enum(RelationType), nullable=False)
    description = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    source_ci = relationship(
        "ConfigurationItem",
        foreign_keys=[source_ci_id],
        back_populates="source_relationships"
    )
    target_ci = relationship(
        "ConfigurationItem",
        foreign_keys=[target_ci_id],
        back_populates="target_relationships"
    )


class ImportLog(Base):
    """Import history tracking."""
    __tablename__ = "import_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    import_type = Column(String(50), nullable=False)  # csv, sharepoint, api
    source = Column(String(500))  # filename, URL, etc.
    status = Column(String(50), nullable=False)  # pending, success, failed
    records_processed = Column(Integer, default=0)
    records_success = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    error_message = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
