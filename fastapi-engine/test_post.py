import jwt
import requests
import uuid

secret = "96b24d0305e58197c9ef40b5c85057d657afe5dfc7e783b1c76a081a5f2ac833"
payload = {
    "id": "00000000-0000-0000-0000-000000000000", # Need a real user id maybe?
    "email": "test@example.com",
    "role": "user"
}
token = jwt.encode(payload, secret, algorithm="HS256")

url = "http://localhost:8000/api/repos/"
params = {
    "repo_url": "https://github.com/tester/repo_" + str(uuid.uuid4())[:8]
}
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

resp = requests.post(url, json=params, headers=headers)
print(f"STATUS: {resp.status_code}")
print(f"BODY: {resp.text}")
