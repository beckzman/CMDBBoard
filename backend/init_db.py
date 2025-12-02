"""
Initialize database tables and create admin user using bcrypt directly.
"""
import sys
sys.path.append('/Users/andreasbeckmann/CMDBBoard/CMDBBoard/backend')

from app.db.database import Base, engine, SessionLocal
from app.db.models import User, UserRole
import bcrypt

def init_db():
    # Create all tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")
    
    # Create admin user
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.username == "admin").first()
        
        # Hash password using bcrypt directly
        password = "adminpassword".encode('utf-8')
        hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')
        
        if admin:
            admin.hashed_password = hashed
            print("✓ Admin user password updated to 'adminpassword'")
        else:
            admin = User(
                username="admin",
                email="admin@cmdb.local",
                full_name="Administrator",
                hashed_password=hashed,
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("✓ Admin user created with password 'adminpassword'")
        
        db.commit()
        print("\n✅ Setup complete!")
        print("  Username: admin")
        print("  Password: adminpassword")
        print("\nYou can now login at http://localhost:5173/login")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
