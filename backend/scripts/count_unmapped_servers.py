import sys
import os
from dotenv import load_dotenv

# Add the backend directory to the sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load env vars from backend/.env
# env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
# load_dotenv(env_path)

# Override with Postgres connection from docker-compose
os.environ['DATABASE_URL'] = "postgresql://cmdb_user:cmdb_password@localhost:5433/cmdb_database"

from app.db.database import SessionLocal, engine
from app.db.models import ConfigurationItem, CIType
from sqlalchemy import or_, text

def count_unmapped_servers():
    print(f"CWD: {os.getcwd()}")
    print(f"Checking if sql_app.db exists: {os.path.exists('sql_app.db')}")
    print(f"Database URL: {os.getenv('DATABASE_URL')}")
    
    # Try raw connection test
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            tables = [row[0] for row in result]
            print(f"Tables found: {tables}")
    except Exception as e:
        print(f"Raw connection failed: {e}")

    db = SessionLocal()
    try:
        # Query for servers where cost_center is NULL or empty string
        # selecting id and name
        servers = db.query(ConfigurationItem.id, ConfigurationItem.name).filter(
            ConfigurationItem.ci_type == CIType.SERVER,
            or_(
                ConfigurationItem.cost_center == None,
                ConfigurationItem.cost_center == ""
            )
        ).all()
        
        print(f"Found {len(servers)} unmapped servers.")
        
        output_file = "unmapped_servers_postgres.txt"
        with open(output_file, "w") as f:
            for server in servers:
                f.write(f"ID: {server.id}, Name: {server.name}\n")
        
        print(f"List saved to {output_file}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    count_unmapped_servers()
