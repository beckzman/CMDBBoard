import sqlite3
import os

# Path to the database file
DB_PATH = "sql_app.db"

def add_column():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Check if column already exists to be safe
        cursor.execute("PRAGMA table_info(configuration_items)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if "operating_system" in columns:
            print("Column 'operating_system' already exists.")
        else:
            print("Adding 'operating_system' column...")
            cursor.execute("ALTER TABLE configuration_items ADD COLUMN operating_system VARCHAR(255)")
            conn.commit()
            print("Column added successfully.")

        if "last_ping_success" in columns:
            print("Column 'last_ping_success' already exists.")
        else:
            print("Adding 'last_ping_success' column...")
            cursor.execute("ALTER TABLE configuration_items ADD COLUMN last_ping_success DATETIME")
            conn.commit()
            print("Column 'last_ping_success' added successfully.")

        # List of potential missing columns to check and add
        missing_columns = {
            "external_id": "VARCHAR(255)",
            "last_sync": "DATETIME",
            "import_source_id": "INTEGER REFERENCES import_sources(id)",
            "technical_details": "TEXT",
            "deleted_at": "DATETIME"
        }

        for col_name, col_type in missing_columns.items():
            if col_name in columns:
                 print(f"Column '{col_name}' already exists.")
            else:
                print(f"Adding '{col_name}' column...")
                try:
                    cursor.execute(f"ALTER TABLE configuration_items ADD COLUMN {col_name} {col_type}")
                    conn.commit()
                    print(f"Column '{col_name}' added successfully.")
                except Exception as e:
                    print(f"Failed to add '{col_name}': {e}")
                    conn.rollback()

            
    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    add_column()
