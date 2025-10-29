from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
load_dotenv(dotenv_path="D:/Project/tradea/tradea-backend/.env")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
EXPIRY_MINUTES = 60

def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=EXPIRY_MINUTES)
    to_encode = {
        "sub": str(user_id),
        "exp": expire
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        print("✅ Token verified. User ID:", user_id)
        return user_id
    except JWTError as e:
        print("❌ Token verification failed:", str(e))
        return None
    

