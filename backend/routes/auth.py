"""
Authentication Routes
"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from datetime import datetime, timezone, timedelta
import uuid
import os
import httpx
import asyncio

router = APIRouter(prefix="/auth", tags=["auth"])

# These will be set from server.py
db = None
logger = None
hash_password = None
generate_token = None
get_current_user = None
require_auth = None
send_email_notification = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

def init_dependencies(database, log, hash_pw_func, gen_token_func, get_user_func, req_auth_func, send_email_func):
    global db, logger, hash_password, generate_token, get_current_user, require_auth, send_email_notification
    db = database
    logger = log
    hash_password = hash_pw_func
    generate_token = gen_token_func
    get_current_user = get_user_func
    require_auth = req_auth_func
    send_email_notification = send_email_func

@router.post("/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "picture": None,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create session
    session_token = generate_token()
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Send welcome email (non-blocking)
    asyncio.create_task(send_email_notification(
        data.email,
        "welcome",
        {"name": data.name, "site_url": "https://x67digital.com"}
    ))
    
    # Send notification to admin about new registration
    asyncio.create_task(send_email_notification(
        "contact@x67digital.com",
        "admin_new_registration",
        {
            "user_name": data.name,
            "user_email": data.email,
            "user_phone": data.phone or "-",
            "registered_at": datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M"),
            "site_url": "https://x67digital.com"
        }
    ))
    
    # Return token in response body for cross-domain auth (localStorage) + cookie as fallback
    response = JSONResponse(content={
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "role": "user",
        "token": session_token  # Token for localStorage-based auth
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    return response

@router.post("/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or user.get("password_hash") != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = generate_token()
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Return token in response body for cross-domain auth (localStorage) + cookie as fallback
    response = JSONResponse(content={
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user"),
        "token": session_token  # Token for localStorage-based auth
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    return response

@router.post("/google-session")
async def google_session(request: Request):
    """Process Google OAuth session from Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Get user data from Emergent Auth
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = response.json()
    
    email = auth_data.get("email")
    name = auth_data.get("name")
    picture = auth_data.get("picture")
    emergent_session_token = auth_data.get("session_token")
    
    # Find or create user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    is_new_user = False
    if not user:
        is_new_user = True
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "password_hash": None,
            "name": name,
            "phone": None,
            "picture": picture,
            "role": "user",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    else:
        user_id = user["user_id"]
        # Update picture if changed
        if picture and picture != user.get("picture"):
            await db.users.update_one({"user_id": user_id}, {"$set": {"picture": picture}})
    
    # Create session
    session_token = emergent_session_token or generate_token()
    session_doc = {
        "user_id": user["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Send welcome email for new users
    if is_new_user and email:
        asyncio.create_task(send_email_notification(
            email,
            "welcome",
            {"name": name or "User", "site_url": "https://x67digital.com"}
        ))
        # Send notification to admin about new registration
        asyncio.create_task(send_email_notification(
            "contact@x67digital.com",
            "admin_new_registration",
            {
                "user_name": name or "User",
                "user_email": email,
                "user_phone": "-",
                "registered_at": datetime.now(timezone.utc).strftime("%d.%m.%Y %H:%M"),
                "site_url": "https://x67digital.com"
            }
        ))
    
    # Return token in response body for cross-domain auth (localStorage) + cookie as fallback
    response = JSONResponse(content={
        "user_id": user["user_id"],
        "email": email,
        "name": name or user.get("name"),
        "picture": picture or user.get("picture"),
        "role": user.get("role", "user"),
        "token": session_token  # Token for localStorage-based auth
    })
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7*24*60*60,
        path="/"
    )
    return response

@router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "phone": user.get("phone"),
        "picture": user.get("picture"),
        "role": user.get("role", "user"),
        "notification_settings": user.get("notification_settings", {
            "email_messages": True,
            "email_offers": True,
            "whatsapp_messages": True,
            "whatsapp_offers": True
        })
    }

@router.put("/profile")
async def update_profile(request: Request):
    """Update user profile including phone and notification settings"""
    user = await require_auth(request)
    body = await request.json()
    
    update_fields = {}
    
    if "name" in body:
        update_fields["name"] = body["name"]
    if "phone" in body:
        update_fields["phone"] = body["phone"]
    if "notification_settings" in body:
        update_fields["notification_settings"] = body["notification_settings"]
    
    if update_fields:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_fields}
        )
    
    return {"message": "Profil actualizat cu succes"}

@router.get("/token")
async def get_auth_token(request: Request):
    """Get JWT token for WebSocket authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    from jose import jwt
    SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
    ALGORITHM = "HS256"
    
    # Create a short-lived token for WebSocket
    token_data = {
        "user_id": user["user_id"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {"token": token}

@router.post("/logout")
async def logout(request: Request):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    return response

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    """Request password reset - sends email with reset link"""
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Dacă adresa de email există în baza noastră de date, vei primi un email cu instrucțiuni."}
    
    # Check if user registered with Google (no password)
    if user.get("password_hash") is None:
        return {"message": "Dacă adresa de email există în baza noastră de date, vei primi un email cu instrucțiuni."}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Store reset token
    await db.password_resets.delete_many({"email": data.email})  # Remove old tokens
    await db.password_resets.insert_one({
        "email": data.email,
        "token": reset_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send reset email
    reset_url = f"https://x67digital.com/auth?reset_token={reset_token}"
    asyncio.create_task(send_email_notification(
        data.email,
        "forgot_password",
        {
            "user_name": user.get("name", "User"),
            "reset_url": reset_url,
            "site_url": "https://x67digital.com"
        }
    ))
    
    if logger:
        logger.info(f"Password reset requested for {data.email}")
    return {"message": "Dacă adresa de email există în baza noastră de date, vei primi un email cu instrucțiuni."}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    """Reset password using token from email"""
    # Find valid reset token
    reset_record = await db.password_resets.find_one({"token": data.token}, {"_id": 0})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Link-ul de resetare este invalid sau a expirat.")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        await db.password_resets.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Link-ul de resetare a expirat. Te rugăm să soliciți unul nou.")
    
    # Validate password
    if len(data.new_password) < 5:
        raise HTTPException(status_code=400, detail="Parola trebuie să aibă cel puțin 5 caractere.")
    
    # Update password
    await db.users.update_one(
        {"email": reset_record["email"]},
        {"$set": {"password_hash": hash_password(data.new_password)}}
    )
    
    # Delete used token
    await db.password_resets.delete_one({"token": data.token})
    
    # Invalidate all sessions for this user
    user = await db.users.find_one({"email": reset_record["email"]}, {"_id": 0})
    if user:
        await db.user_sessions.delete_many({"user_id": user["user_id"]})
    
    if logger:
        logger.info(f"Password reset completed for {reset_record['email']}")
    return {"message": "Parola a fost schimbată cu succes. Te poți autentifica acum."}
