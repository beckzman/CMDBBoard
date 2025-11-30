import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.db.models import User

def check_user():
    db = SessionLocal()
    user = db.query(User).filter(User.username == "admin").first()
    if user:
        print(f"User found: {user.username}")
        print(f"Email: {user.email}")
        print(f"Role: {user.role}")
        print(f"Active: {user.is_active}")
        print(f"Password Hash: {user.hashed_password}")
    else:
        print("User not found")
    db.close()

if __name__ == "__main__":
    check_user()
