import requests
import json

try:
    # Login to get token
    auth_response = requests.post(
        "http://localhost:8000/api/auth/login",
        data={"username": "admin", "password": "adminpassword"}
    )
    auth_response.raise_for_status()
    token = auth_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Call sources endpoint
    response = requests.get("http://localhost:8000/api/import/sources", headers=headers)
    
    print(f"Status Code: {response.status_code}")
    if response.status_code == 422:
        print("Validation Error Details:")
        print(json.dumps(response.json(), indent=2))
    else:
        print("Response:")
        print(response.text)

except Exception as e:
    print(f"Error: {e}")
