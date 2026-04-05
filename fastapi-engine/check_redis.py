import redis
import os
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("REDIS_URL", "redis://localhost:6379")

try:
    print(f"Connecting to {url}")
    r = redis.from_url(url)
    r.ping()
    print("REDIS_OK")
except Exception as e:
    print(f"REDIS_FAIL: {e}")
