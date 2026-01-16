import sys
import logging
from app.db.database import SessionLocal
from app.db.models import User, ConfigurationItem, Relationship, UserRole, CIType, CIStatus, RelationType
from app.core.auth import get_password_hash

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_data():
    db = SessionLocal()
    try:
        # 1. Create Users
        logger.info("Seeding users...")
        users = [
            {
                "email": "admin@example.com",
                "username": "admin",
                "password": "adminpassword",
                "full_name": "Admin User",
                "role": UserRole.ADMIN
            },
            {
                "email": "user@example.com",
                "username": "user",
                "password": "userpassword",
                "full_name": "Regular User",
                "role": UserRole.VIEWER
            }
        ]

        for user_data in users:
            existing_user = db.query(User).filter(User.username == user_data["username"]).first()
            if not existing_user:
                new_user = User(
                    email=user_data["email"],
                    username=user_data["username"],
                    hashed_password=get_password_hash(user_data["password"]),
                    full_name=user_data["full_name"],
                    role=user_data["role"]
                )
                db.add(new_user)
                logger.info(f"Created user: {user_data['username']}")
            else:
                logger.info(f"User {user_data['username']} already exists.")
        
        db.commit()

        # 2. Create CIs
        logger.info("Seeding Configuration Items...")
        cis = [
            {
                "name": "srv-prod-01",
                "ci_type": CIType.SERVER,
                "status": CIStatus.ACTIVE,
                "description": "Primary production server",
                "environment": "Production",
                "os_db_system": "Ubuntu 22.04 LTS"
            },
            {
                "name": "db-prod-primary",
                "ci_type": CIType.DATABASE,
                "status": CIStatus.ACTIVE,
                "description": "Primary PostgreSQL database",
                "environment": "Production",
                "technical_details": '{"version": "15", "port": 5432}'
            },
            {
                "name": "app-ecommerce-web",
                "ci_type": CIType.APPLICATION,
                "status": CIStatus.ACTIVE,
                "description": "E-commerce Web Frontend",
                "environment": "Production",
                "department": "Web Team"
            },
            {
                "name": "net-switch-core",
                "ci_type": CIType.NETWORK_DEVICE,
                "status": CIStatus.ACTIVE,
                "description": "Core Switch",
                "location": "Data Center A, Rack 1"
            },
            {
                "name": "srv-test-01",
                "ci_type": CIType.SERVER,
                "status": CIStatus.MAINTENANCE,
                "description": "Test server",
                "environment": "Test",
                "os_db_system": "Windows Server 2022"
            }
        ]

        created_cis = {}
        for ci_data in cis:
            existing_ci = db.query(ConfigurationItem).filter(ConfigurationItem.name == ci_data["name"]).first()
            if not existing_ci:
                new_ci = ConfigurationItem(**ci_data)
                db.add(new_ci)
                # Flush to get the ID for relationships
                db.flush()
                created_cis[ci_data["name"]] = new_ci
                logger.info(f"Created CI: {ci_data['name']}")
            else:
                created_cis[ci_data["name"]] = existing_ci
                logger.info(f"CI {ci_data['name']} already exists.")
        
        db.commit()

        # 3. Create Relationships
        logger.info("Seeding Relationships...")
        relationships = [
            {
                "source": "app-ecommerce-web",
                "target": "srv-prod-01",
                "type": RelationType.RUNS_ON
            },
            {
                "source": "app-ecommerce-web",
                "target": "db-prod-primary",
                "type": RelationType.CONNECTS_TO
            },
            {
                "source": "srv-prod-01",
                "target": "net-switch-core",
                "type": RelationType.CONNECTS_TO
            }
        ]

        for rel in relationships:
            source_ci = created_cis.get(rel["source"])
            target_ci = created_cis.get(rel["target"])
            
            if source_ci and target_ci:
                # Check if relationship exists (simplified check)
                existing_rel = db.query(Relationship).filter(
                    Relationship.source_ci_id == source_ci.id,
                    Relationship.target_ci_id == target_ci.id,
                    Relationship.relationship_type == rel["type"]
                ).first()
                
                if not existing_rel:
                    new_rel = Relationship(
                        source_ci_id=source_ci.id,
                        target_ci_id=target_ci.id,
                        relationship_type=rel["type"]
                    )
                    db.add(new_rel)
                    logger.info(f"Created relationship: {rel['source']} -> {rel['type']} -> {rel['target']}")
                else:
                    logger.info(f"Relationship {rel['source']} -> {rel['target']} already exists.")

        db.commit()
        logger.info("Data seeding completed successfully.")

    except Exception as e:
        logger.error(f"Error seeding data: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
