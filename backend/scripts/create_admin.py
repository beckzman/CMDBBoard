import sys
import os

# Add the parent directory to sys.path to allow importing app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import User, UserRole
from app.core.auth import get_password_hash

def create_admin_user():
    db: Session = SessionLocal()
    try:
        email = "admin@example.com"
        username = "admin"
        password = "adminpassword"
        
        # Check if user already exists
        if db.query(User).filter(User.email == email).first():
            print(f"User with email {email} already exists.")
            return
        
        if db.query(User).filter(User.username == username).first():
            print(f"User with username {username} already exists.")
            return
        
        # Create new admin user
        new_user = User(
            email=email,
            username=username,
            full_name="System Administrator",
            hashed_password=get_password_hash(password),
            role=UserRole.ADMIN,
            is_active=True
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        print(f"Admin user created successfully:")
        print(f"Username: {username}")
        print(f"Password: {password}")
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()
