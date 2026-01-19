import oracledb
import json
import os
import sys

# Configuration will be loaded from a file 'oracle_config.json' to avoid hardcoding secrets
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'oracle_config.json')
OUTPUT_FILE = 'oracle_export.json'

def fetch_data():
    if not os.path.exists(CONFIG_FILE):
        print(f"Error: Config file {CONFIG_FILE} not found.")
        sys.exit(1)

    with open(CONFIG_FILE, 'r') as f:
        config = json.load(f)

    user = config.get('user')
    password = config.get('password')
    host = config.get('host')
    port = config.get('port')
    service_name = config.get('service_name')
    
    dsn = f"{host}:{port}/{service_name}"
    
    print(f"Connecting to Oracle DB: {dsn} as {user}...")
    
    try:
        with oracledb.connect(user=user, password=password, dsn=dsn) as connection:
            with connection.cursor() as cursor:
                sql = "SELECT * FROM CMDB_EXPORT"
                print(f"Executing: {sql}")
                cursor.execute(sql)
                
                columns = [col[0] for col in cursor.description]
                cursor.rowfactory = lambda *args: dict(zip(columns, args))
                
                rows = cursor.fetchall()
                print(f"Fetched {len(rows)} rows.")
                
                with open(OUTPUT_FILE, 'w') as f:
                    json.dump(rows, f, indent=2, default=str)
                print(f"Data saved to {OUTPUT_FILE}")
                
    except oracledb.Error as e:
        print(f"Oracle Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fetch_data()
