"""
Referral System Routes
"""
from fastapi import APIRouter, Request, HTTPException

router = APIRouter(prefix="/referral", tags=["referral"])

# Database reference - will be set from server.py
db = None

def init_db(database):
    global db
    db = database

# Auth helper and add_points - will be set from server.py
require_auth = None
add_points = None

def init_auth(auth_func):
    global require_auth
    require_auth = auth_func

def init_add_points(points_func):
    global add_points
    add_points = points_func

@router.get("/code")
async def get_referral_code(request: Request):
    """Get or create user's referral code"""
    user = await require_auth(request)
    
    # Check if user has a referral code
    referral_code = user.get("referral_code")
    if not referral_code:
        # Generate unique code
        referral_code = f"X67{user['user_id'][-6:].upper()}"
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"referral_code": referral_code}}
        )
    
    # Get referral stats
    referrals = await db.users.count_documents({"referred_by": user["user_id"]})
    referral_points = await db.points_transactions.aggregate([
        {"$match": {"user_id": user["user_id"], "action": {"$regex": "^referral"}}},
        {"$group": {"_id": None, "total": {"$sum": "$points"}}}
    ]).to_list(1)
    
    total_referral_points = referral_points[0]["total"] if referral_points else 0
    
    return {
        "referral_code": referral_code,
        "referral_link": f"https://x67digital.com/auth?ref={referral_code}",
        "total_referrals": referrals,
        "points_earned": total_referral_points
    }

@router.get("/list")
async def get_referral_list(request: Request):
    """Get list of users referred by current user"""
    user = await require_auth(request)
    
    referrals = await db.users.find(
        {"referred_by": user["user_id"]},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "created_at": 1}
    ).sort([("created_at", -1)]).limit(50).to_list(50)
    
    return {"referrals": referrals}

@router.post("/apply")
async def apply_referral_code(request: Request):
    """Apply a referral code during registration"""
    body = await request.json()
    referral_code = body.get("referral_code")
    user_id = body.get("user_id")
    
    if not referral_code or not user_id:
        raise HTTPException(status_code=400, detail="Missing referral_code or user_id")
    
    # Find referrer
    referrer = await db.users.find_one({"referral_code": referral_code})
    if not referrer:
        raise HTTPException(status_code=404, detail="Codul de referral nu este valid")
    
    # Check if user already has a referrer
    user = await db.users.find_one({"user_id": user_id})
    if user and user.get("referred_by"):
        raise HTTPException(status_code=400, detail="Ai aplicat deja un cod de referral")
    
    # Can't refer yourself
    if referrer["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Nu poți folosi propriul cod de referral")
    
    # Apply referral
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"referred_by": referrer["user_id"], "referred_by_code": referral_code}}
    )
    
    # Give points to referrer
    if add_points:
        await add_points(referrer["user_id"], "referral_signup", f"Utilizator nou: {user.get('name', 'Unknown')}")
    
    return {"message": "Cod de referral aplicat cu succes!"}
