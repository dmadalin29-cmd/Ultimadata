"""
Loyalty Program & Points System Routes
"""
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/loyalty", tags=["loyalty"])

# Points configuration
POINTS_CONFIG = {
    "ad_posted": 10,
    "ad_sold": 50,
    "review_left": 5,
    "review_received_5star": 20,
    "referral_signup": 100,
    "referral_ad_posted": 50,
    "daily_login": 2,
    "profile_completed": 25,
    "identity_verified": 100,
    "first_ad": 50
}

# Level thresholds
LOYALTY_LEVELS = [
    {"level": 1, "name": "Bronze", "min_points": 0, "color": "#CD7F32", "benefits": ["Badge Bronze"]},
    {"level": 2, "name": "Silver", "min_points": 200, "color": "#C0C0C0", "benefits": ["Badge Silver", "1 TopUp gratuit/lună"]},
    {"level": 3, "name": "Gold", "min_points": 500, "color": "#FFD700", "benefits": ["Badge Gold", "3 TopUp-uri gratuite/lună", "Prioritate în listări"]},
    {"level": 4, "name": "Platinum", "min_points": 1000, "color": "#E5E4E2", "benefits": ["Badge Platinum", "TopUp-uri nelimitate", "Suport prioritar", "Badge exclusiv"]}
]

# Database reference - will be set from server.py
db = None

def init_db(database):
    global db
    db = database

async def get_user_level(points: int):
    """Get loyalty level based on points"""
    current_level = LOYALTY_LEVELS[0]
    for level in LOYALTY_LEVELS:
        if points >= level["min_points"]:
            current_level = level
    return current_level

async def add_points(user_id: str, action: str, description: str = None):
    """Add points to a user for an action"""
    points = POINTS_CONFIG.get(action, 0)
    if points == 0:
        return None
    
    # Create points transaction
    transaction = {
        "transaction_id": f"pts_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "action": action,
        "points": points,
        "description": description or action.replace("_", " ").title(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.points_transactions.insert_one(transaction)
    
    # Update user's total points
    await db.users.update_one(
        {"user_id": user_id},
        {"$inc": {"loyalty_points": points}}
    )
    
    # Recalculate level
    user = await db.users.find_one({"user_id": user_id})
    new_total = user.get("loyalty_points", 0)
    new_level = await get_user_level(new_total)
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"loyalty_level": new_level["level"], "loyalty_level_name": new_level["name"]}}
    )
    
    return {"points_earned": points, "new_total": new_total, "level": new_level}

# Auth helper - will be set from server.py
require_auth = None

def init_auth(auth_func):
    global require_auth
    require_auth = auth_func

@router.get("/status")
async def get_loyalty_status(request: Request):
    """Get current user's loyalty status"""
    user = await require_auth(request)
    
    points = user.get("loyalty_points", 0)
    current_level = await get_user_level(points)
    
    # Find next level
    next_level = None
    for level in LOYALTY_LEVELS:
        if level["min_points"] > points:
            next_level = level
            break
    
    # Get recent transactions
    transactions = await db.points_transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort([("created_at", -1)]).limit(20).to_list(20)
    
    return {
        "points": points,
        "level": current_level,
        "next_level": next_level,
        "points_to_next": next_level["min_points"] - points if next_level else 0,
        "recent_transactions": transactions,
        "all_levels": LOYALTY_LEVELS
    }

@router.get("/leaderboard")
async def get_loyalty_leaderboard(limit: int = 20):
    """Get top users by loyalty points"""
    top_users = await db.users.find(
        {"loyalty_points": {"$gt": 0}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "loyalty_points": 1, "loyalty_level_name": 1}
    ).sort([("loyalty_points", -1)]).limit(limit).to_list(limit)
    
    return {"leaderboard": top_users}

@router.post("/claim-daily")
async def claim_daily_points(request: Request):
    """Claim daily login points"""
    user = await require_auth(request)
    
    # Check if already claimed today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.points_transactions.find_one({
        "user_id": user["user_id"],
        "action": "daily_login",
        "created_at": {"$regex": f"^{today}"}
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Ai revendicat deja punctele de astăzi")
    
    result = await add_points(user["user_id"], "daily_login", "Login zilnic")
    return result
