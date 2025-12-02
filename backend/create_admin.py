"""
Create admin user with specified password.
"""
import sys
sys.path.append('/Users/andreasbeckmann/CMDBBoard/CMDBBoard/backend')

from app.db.database import SessionLocal
from app.db.models import User, UserRole
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.username == "admin").first()
        
        if admin:
            # Update password
            admin.hashed_password = pwd_context.hash("adminpassword")
            print("Admin user password updated to 'adminpassword'")
        else:
            # Create new admin
            admin = User(
                username="admin",
                email="admin@cmdb.local",
                full_name="Administrator",
                hashed_password=pwd_context.hash("adminpassword"),
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("Admin user created with password 'adminpassword'")
        
        db.commit()
        print("✓ Admin user setup complete")
        print("  Username: admin")
        print("  Password: adminpassword")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
