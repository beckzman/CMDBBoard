import requests

# Constants
API_URL = "http://localhost:8000/api"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "adminpassword"

def get_admin_token():
    try:
        response = requests.post(f"{API_URL}/auth/login", data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
        response.raise_for_status()
        return response.json()["access_token"]
    except Exception as e:
        print(f"Failed to login as admin: {e}")
        return None

def trigger_import():
    token = get_admin_token()
    if not token:
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Trigger import for source ID 5 (SP CSV)
    print("Triggering import for source ID 5 (SP CSV)...")
    res = requests.post(f"{API_URL}/import/sources/5/run", headers=headers)
    
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
    
    if res.status_code == 202:
        print("\n✓ Import job scheduled successfully")
        print("Waiting 5 seconds for import to complete...")
        import time
        time.sleep(5)
        
        # Check import history
        hist_res = requests.get(f"{API_URL}/import/history?limit=1", headers=headers)
        if hist_res.status_code == 200:
            logs = hist_res.json()
            if logs:
                log = logs[0]
                print(f"\nLatest import:")
                print(f"  Status: {log['status']}")
                print(f"  Processed: {log['records_processed']}")
                print(f"  Success: {log['records_success']}")
                print(f"  Failed: {log['records_failed']}")
                if log.get('error_message'):
                    print(f"  Error: {log['error_message']}")

if __name__ == "__main__":
    trigger_import()
