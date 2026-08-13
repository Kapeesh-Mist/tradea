from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from passlib.hash import bcrypt
from app.db.database import get_connection
from app.routes.jwtt import create_access_token
auth_router = APIRouter()

# 📦 Request Models
class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    email: EmailStr
    old_password: str
    new_password: str

# 🔐 Signup
@auth_router.post("/auth/signup")
async def signup(payload: SignupRequest):
    username = payload.username
    email = payload.email
    password = payload.password

    password_hash = bcrypt.hash(password)

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        cur.close()
        conn.close()
        raise HTTPException(status_code=409, detail="Email already exists")

    try:
        cur.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (username, email, password_hash)
        )
        conn.commit()
        return {"message": "Signup successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# 🔑 Login
@auth_router.post("/auth/login")
async def login(payload: LoginRequest):
    email = payload.email
    password = payload.password

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, username, password_hash FROM users WHERE email = %s", (email,))
    user = cur.fetchone()

    cur.close()
    conn.close()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_id, username, password_hash = user

    if not bcrypt.verify(password, password_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")

    token = create_access_token(user_id)

    return {
        "status": "success",
        "user_id": user_id,
        "username": username,
        "access_token": token,
        "token_type": "bearer",
        "message": "Login successful"
    }

# 📧 Check if email is taken
@auth_router.get("/auth/check-email")
def check_email(email: str):
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    exists = cur.fetchone() is not None

    cur.close()
    conn.close()

    return {"email": email, "available": not exists}

# 🔁 Change password
@auth_router.post("/auth/change-password")
async def change_password(payload: ChangePasswordRequest):
    email = payload.email
    old_password = payload.old_password
    new_password = payload.new_password

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("SELECT password_hash FROM users WHERE email = %s", (email,))
    user = cur.fetchone()

    if not user:
        cur.close()
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")

    stored_hash = user[0]

    if not bcrypt.verify(old_password, stored_hash):
        cur.close()
        conn.close()
        raise HTTPException(status_code=401, detail="Incorrect old password")

    new_hash = bcrypt.hash(new_password)
    cur.execute("UPDATE users SET password_hash = %s WHERE email = %s", (new_hash, email))
    conn.commit()

    cur.close()
    conn.close()

    return {"status": "success", "message": "Password changed successfully"}