import sys
import os
import json
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from app.core.config import settings

# Setup DB connection to get config
engine = create_engine(str(settings.DATABASE_URL))
SessionLocal = sessionmaker(bind=engine)

def get_sharepoint_config():
    with SessionLocal() as db:
        # Find the SharePoint source (assuming import_source_id 9 based on log filename)
        # Or search by name/type
        result = db.execute(text("SELECT id, config FROM import_sources WHERE source_type='sharepoint' LIMIT 1"))
        row = result.fetchone()
        if not row:
            print("No SharePoint source found in DB")
            sys.exit(1)
        
        print(f"Found SharePoint source ID: {row[0]}")
        return json.loads(row[1])

def inspect_sharepoint_item(config):
    from office365.sharepoint.client_context import ClientContext
    from office365.runtime.auth.user_credential import UserCredential
    
    site_url = config.get('site_url')
    list_name = config.get('list_name')
    username = config.get('username')
    password = config.get('password')
    
    print(f"Connecting to {site_url}, List: {list_name}")
    
    credentials = UserCredential(username, password)
    ctx = ClientContext(site_url).with_credentials(credentials)
    
    sp_list = ctx.web.lists.get_by_title(list_name)
    
    # Fetch Item ID 1
    # Expand FieldValuesAsText AND the lookup field strictly
    # We assume 'Datenbank_x0020_Version' is the internal name, based on log keys
    
    print("Fetching Item ID 1...")
    
    # Try 1: Standard fetch with FieldValuesAsText
    item = sp_list.get_item_by_id(1)
    item.expand(["FieldValuesAsText", "Datenbank_x0020_Version"]) # Try expanding the lookup directly
    ctx.load(item)
    try:
        ctx.execute_query()
    except Exception as e:
        print(f"Error fetching item: {e}")
        # Try finding the correct internal name for database version
        print("Fetching fields to find correct internal name...")
        fields = sp_list.fields.get().execute_query()
        for f in fields:
            if "Datenbank" in f.title or "Version" in f.title:
                print(f"Candidate Field: Title='{f.title}', Internal='{f.internal_name}', Type='{f.type_as_string}'")
        return

    print("\n--- Item Properties ---")
    props = item.properties
    print(json.dumps(props, indent=2, default=str))
    
    print("\n--- FieldValuesAsText ---")
    fv = props.get('FieldValuesAsText', {})
    if hasattr(fv, 'properties'):
        print(json.dumps(fv.properties, indent=2))
    else:
        print(json.dumps(fv, indent=2))

    print("\n--- Datenbank_x0020_Version Expansion ---")
    # Check if the lookup object is present
    db_ver = props.get('Datenbank_x0020_Version')
    if db_ver:
        print("Datenbank_x0020_Version object FOUND:")
        print(json.dumps(db_ver, indent=2, default=str))
    else:
        print("Datenbank_x0020_Version object NOT found in properties.")

if __name__ == "__main__":
    try:
        config = get_sharepoint_config()
        inspect_sharepoint_item(config)
    except Exception as e:
        print(f"An error occurred: {e}")
