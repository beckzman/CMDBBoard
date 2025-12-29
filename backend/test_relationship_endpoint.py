import requests
import json

# Login to get token
login_url = "http://localhost:8000/api/auth/login"
data = {"username": "debug_admin", "password": "debugpassword"}
headers = {"Content-Type": "application/x-www-form-urlencoded"}

try:
    print("Logging in...")
    response = requests.post(login_url, data=data, headers=headers)
    response.raise_for_status()
    token = response.json()["access_token"]
    print("Login successful.")

    # Fetch relationships
    print("Fetching relationships...")
    api_url = "http://localhost:8000/api/relationships"
    auth_header = {"Authorization": f"Bearer {token}"}
    
    resp = requests.get(api_url, headers=auth_header)
    resp.raise_for_status()
    
    data = resp.json()
    print(f"Status Code: {resp.status_code}")
    print(f"Record Count: {len(data)}")
    
    if data:
        print("Sample Record:")
        print(json.dumps(data[0], indent=2))
    else:
        print("No records return.")

except Exception as e:
    print(f"Error: {e}")
    if 'response' in locals():
        print(f"Response Content: {response.text}")
