"""
Seller Dashboard / Stats Routes
"""
from fastapi import APIRouter, Request
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/seller", tags=["seller"])

# These will be set from server.py
db = None
require_auth = None
get_user_level = None

def init_dependencies(database, auth_func, level_func):
    global db, require_auth, get_user_level
    db = database
    require_auth = auth_func
    get_user_level = level_func

@router.get("/dashboard")
async def get_seller_dashboard(request: Request):
    """Comprehensive seller dashboard with stats"""
    user = await require_auth(request)
    
    # Get user's ads
    ads = await db.ads.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    active_ads = [a for a in ads if a.get("status") == "active"]
    
    # Calculate totals
    total_views = sum(a.get("views", 0) for a in ads)
    total_favorites = sum(a.get("favorites_count", 0) for a in ads)
    
    # Get conversation count
    total_conversations = await db.conversations.count_documents({
        "participants": user["user_id"]
    })
    
    # Get unread messages
    unread_messages = await db.messages.count_documents({
        "receiver_id": user["user_id"],
        "is_read": False
    })
    
    # Get offers stats
    pending_offers = await db.offers.count_documents({
        "seller_id": user["user_id"],
        "status": "pending"
    })
    
    accepted_offers = await db.offers.count_documents({
        "seller_id": user["user_id"],
        "status": "accepted"
    })
    
    # Get review stats
    avg_rating = user.get("avg_rating", 0)
    total_reviews = user.get("total_reviews", 0)
    
    # Recent activity (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_views = await db.ad_views.count_documents({
        "ad_id": {"$in": [a["ad_id"] for a in ads]},
        "timestamp": {"$gte": week_ago}
    }) if ads else 0
    
    # Top performing ads
    top_ads = sorted(active_ads, key=lambda x: x.get("views", 0), reverse=True)[:5]
    
    # Get loyalty info
    loyalty_points = user.get("loyalty_points", 0)
    loyalty_level = await get_user_level(loyalty_points)
    
    return {
        "summary": {
            "total_ads": len(ads),
            "active_ads": len(active_ads),
            "total_views": total_views,
            "total_favorites": total_favorites,
            "total_conversations": total_conversations,
            "unread_messages": unread_messages,
            "pending_offers": pending_offers,
            "accepted_offers": accepted_offers,
            "avg_rating": avg_rating,
            "total_reviews": total_reviews
        },
        "recent_activity": {
            "views_this_week": recent_views
        },
        "top_ads": top_ads,
        "loyalty": {
            "points": loyalty_points,
            "level": loyalty_level
        },
        "badges": user.get("badges", [])
    }

@router.get("/earnings")
async def get_seller_earnings(request: Request):
    """Get seller's earnings from sold items (if tracked)"""
    user = await require_auth(request)
    
    # Get completed transactions (accepted offers)
    completed = await db.offers.find(
        {"seller_id": user["user_id"], "status": "accepted"},
        {"_id": 0, "ad_title": 1, "offered_price": 1, "counter_price": 1, "responded_at": 1}
    ).sort([("responded_at", -1)]).limit(50).to_list(50)
    
    # Calculate totals
    total_earnings = sum(
        o.get("counter_price") or o.get("offered_price", 0) 
        for o in completed
    )
    
    return {
        "total_sales": len(completed),
        "total_earnings": total_earnings,
        "recent_sales": completed[:10]
    }
