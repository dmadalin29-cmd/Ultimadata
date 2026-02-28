"""
Admin Routes - Dashboard, Users, Ads, Analytics, Export
"""
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import asyncio

router = APIRouter(prefix="/admin", tags=["admin"])

# Dependencies - set from server.py
db = None
logger = None
require_admin = None
hash_password = None
send_email_notification = None
CATEGORIES = []
ROMANIAN_CITIES = []

def init_dependencies(database, log, admin_func, hash_pw_func, email_func, categories, cities):
    global db, logger, require_admin, hash_password, send_email_notification, CATEGORIES, ROMANIAN_CITIES
    db = database
    logger = log
    require_admin = admin_func
    hash_password = hash_pw_func
    send_email_notification = email_func
    CATEGORIES = categories
    ROMANIAN_CITIES = cities

# ===================== BANNERS =====================

@router.post("/banners")
async def create_banner(request: Request):
    await require_admin(request)
    body = await request.json()
    
    banner_id = f"banner_{uuid.uuid4().hex[:12]}"
    banner_doc = {
        "banner_id": banner_id,
        "title": body.get("title"),
        "media_url": body.get("media_url"),
        "media_type": body.get("media_type", "image"),
        "image_url": body.get("media_url"),  # Backwards compatibility
        "link_url": body.get("link_url"),
        "position": body.get("position", "homepage"),
        "is_active": body.get("is_active", True),
        "order": body.get("order", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.banners.insert_one(banner_doc)
    return {"banner_id": banner_id}

@router.put("/banners/{banner_id}")
async def update_banner(banner_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    
    update_fields = {}
    for field in ["title", "media_url", "media_type", "link_url", "position", "is_active", "order"]:
        if field in body:
            update_fields[field] = body[field]
    
    if "media_url" in update_fields:
        update_fields["image_url"] = update_fields["media_url"]
    
    await db.banners.update_one({"banner_id": banner_id}, {"$set": update_fields})
    return {"message": "Banner updated"}

@router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str, request: Request):
    await require_admin(request)
    await db.banners.delete_one({"banner_id": banner_id})
    return {"message": "Banner deleted"}

# ===================== USERS MANAGEMENT =====================

@router.get("/users")
async def admin_get_users(request: Request, page: int = 1, limit: int = 20):
    await require_admin(request)
    
    skip = (page - 1) * limit
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    
    return {
        "users": users,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.put("/users/{user_id}")
async def admin_update_user(user_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    
    update_fields = {}
    if "role" in body:
        update_fields["role"] = body["role"]
    if "name" in body:
        update_fields["name"] = body["name"]
    if "is_blocked" in body:
        update_fields["is_blocked"] = body["is_blocked"]
    
    await db.users.update_one({"user_id": user_id}, {"$set": update_fields})
    return {"message": "User updated"}

@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request):
    admin = await require_admin(request)
    
    if admin["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    await db.ads.delete_many({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.users.delete_one({"user_id": user_id})
    
    return {"message": "User and all associated data deleted"}

@router.put("/users/{user_id}/password")
async def admin_change_user_password(user_id: str, request: Request):
    """Admin endpoint to change a user's password"""
    await require_admin(request)
    body = await request.json()
    
    new_password = body.get("new_password")
    if not new_password or len(new_password) < 5:
        raise HTTPException(status_code=400, detail="Parola trebuie să aibă cel puțin 5 caractere")
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizatorul nu a fost găsit")
    
    if user.get("password_hash") is None:
        raise HTTPException(status_code=400, detail="Acest utilizator s-a înregistrat cu Google și nu are parolă")
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    
    await db.user_sessions.delete_many({"user_id": user_id})
    
    if logger:
        logger.info(f"Admin changed password for user {user_id}")
    return {"message": "Parola a fost schimbată cu succes"}

# ===================== ADS MANAGEMENT =====================

@router.get("/ads")
async def admin_get_ads(request: Request, status: Optional[str] = None, page: int = 1, limit: int = 20):
    await require_admin(request)
    
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    ads = await db.ads.find(query, {"_id": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.ads.count_documents(query)
    
    return {
        "ads": ads,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.put("/ads/{ad_id}/status")
async def admin_update_ad_status(ad_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    
    new_status = body.get("status")
    if new_status not in ["pending", "active", "rejected", "expired"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if ad:
        user = await db.users.find_one({"user_id": ad.get("user_id")}, {"_id": 0})
        
        if user and user.get("email") and send_email_notification:
            price_str = f"{ad.get('price')} €" if ad.get('price') else "Preț la cerere"
            email_data = {
                "user_name": user.get("name", "User"),
                "ad_title": ad.get("title", "Anunț"),
                "ad_price": price_str,
                "ad_id": ad_id,
                "site_url": "https://x67digital.com"
            }
            
            if new_status == "active":
                asyncio.create_task(send_email_notification(user["email"], "ad_approved", email_data))
            elif new_status == "rejected":
                asyncio.create_task(send_email_notification(user["email"], "ad_rejected", email_data))
    
    await db.ads.update_one(
        {"ad_id": ad_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Ad status updated to {new_status}"}

@router.get("/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    
    total_users = await db.users.count_documents({})
    total_ads = await db.ads.count_documents({})
    pending_ads = await db.ads.count_documents({"status": "pending"})
    active_ads = await db.ads.count_documents({"status": "active"})
    total_payments = await db.payments.count_documents({"status": "completed"})
    
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    revenue_result = await db.payments.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] / 100 if revenue_result else 0
    
    return {
        "total_users": total_users,
        "total_ads": total_ads,
        "pending_ads": pending_ads,
        "active_ads": active_ads,
        "total_payments": total_payments,
        "total_revenue": total_revenue
    }

# ===================== ANALYTICS & DASHBOARD =====================

@router.get("/analytics/dashboard")
async def admin_analytics_dashboard(request: Request):
    """Advanced analytics dashboard for admin"""
    await require_admin(request)
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Basic counts
    total_users = await db.users.count_documents({})
    total_ads = await db.ads.count_documents({})
    active_ads = await db.ads.count_documents({"status": "active"})
    pending_ads = await db.ads.count_documents({"status": "pending"})
    
    # New users today/week/month
    new_users_today = await db.users.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    new_users_week = await db.users.count_documents({"created_at": {"$gte": week_ago.isoformat()}})
    new_users_month = await db.users.count_documents({"created_at": {"$gte": month_ago.isoformat()}})
    
    # New ads today/week/month
    new_ads_today = await db.ads.count_documents({"created_at": {"$gte": today_start.isoformat()}})
    new_ads_week = await db.ads.count_documents({"created_at": {"$gte": week_ago.isoformat()}})
    new_ads_month = await db.ads.count_documents({"created_at": {"$gte": month_ago.isoformat()}})
    
    # Total views
    total_views_pipeline = [{"$group": {"_id": None, "total": {"$sum": "$views"}}}]
    views_result = await db.ads.aggregate(total_views_pipeline).to_list(1)
    total_views = views_result[0]["total"] if views_result else 0
    
    # Category distribution
    category_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$category_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    category_dist = await db.ads.aggregate(category_pipeline).to_list(20)
    category_distribution = []
    for item in category_dist:
        cat = next((c for c in CATEGORIES if c["id"] == item["_id"]), None)
        category_distribution.append({
            "category_id": item["_id"],
            "category_name": cat["name"] if cat else item["_id"],
            "category_color": cat["color"] if cat else "#3B82F6",
            "count": item["count"]
        })
    
    # City distribution (top 10)
    city_pipeline = [
        {"$match": {"status": "active"}},
        {"$group": {"_id": "$city_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    city_dist = await db.ads.aggregate(city_pipeline).to_list(10)
    city_distribution = []
    for item in city_dist:
        city = next((c for c in ROMANIAN_CITIES if c["id"] == item["_id"]), None)
        city_distribution.append({
            "city_id": item["_id"],
            "city_name": city["name"] if city else item["_id"],
            "count": item["count"]
        })
    
    # Daily new ads (last 30 days) - OPTIMIZED with aggregation
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    daily_ads_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$project": {"date": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_ads_result = await db.ads.aggregate(daily_ads_pipeline).to_list(31)
    daily_ads_map = {item["_id"]: item["count"] for item in daily_ads_result}
    
    daily_ads = []
    for i in range(30):
        day = now - timedelta(days=29-i)
        date_str = day.strftime("%Y-%m-%d")
        daily_ads.append({"date": date_str, "count": daily_ads_map.get(date_str, 0)})
    
    # Daily new users (last 30 days) - OPTIMIZED with aggregation
    daily_users_pipeline = [
        {"$match": {"created_at": {"$gte": thirty_days_ago}}},
        {"$project": {"date": {"$substr": ["$created_at", 0, 10]}}},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    daily_users_result = await db.users.aggregate(daily_users_pipeline).to_list(31)
    daily_users_map = {item["_id"]: item["count"] for item in daily_users_result}
    
    daily_users = []
    for i in range(30):
        day = now - timedelta(days=29-i)
        date_str = day.strftime("%Y-%m-%d")
        daily_users.append({"date": date_str, "count": daily_users_map.get(date_str, 0)})
    
    # Top ads by views
    top_ads = await db.ads.find(
        {"status": "active"},
        {"_id": 0, "ad_id": 1, "title": 1, "views": 1, "category_id": 1}
    ).sort([("views", -1)]).limit(10).to_list(10)
    
    # Reviews stats
    total_reviews = await db.reviews.count_documents({})
    avg_rating_pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$rating"}}}]
    avg_result = await db.reviews.aggregate(avg_rating_pipeline).to_list(1)
    avg_platform_rating = round(avg_result[0]["avg"], 2) if avg_result else 0
    
    return {
        "overview": {
            "total_users": total_users,
            "total_ads": total_ads,
            "active_ads": active_ads,
            "pending_ads": pending_ads,
            "total_views": total_views,
            "total_reviews": total_reviews,
            "avg_platform_rating": avg_platform_rating
        },
        "growth": {
            "users": {"today": new_users_today, "week": new_users_week, "month": new_users_month},
            "ads": {"today": new_ads_today, "week": new_ads_week, "month": new_ads_month}
        },
        "trends": {"daily_ads": daily_ads, "daily_users": daily_users},
        "distribution": {"categories": category_distribution, "cities": city_distribution},
        "top_ads": top_ads
    }

# ===================== EXPORT =====================

@router.get("/export/users")
async def admin_export_users(request: Request):
    """Export all users as CSV"""
    await require_admin(request)
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(None)
    
    csv_lines = ["user_id,email,name,phone,role,status,created_at,avg_rating,total_reviews"]
    for u in users:
        line = f"{u.get('user_id','')},{u.get('email','')},{u.get('name','').replace(',',';')},{u.get('phone','')},{u.get('role','user')},{u.get('status','active')},{u.get('created_at','')},{u.get('avg_rating',0)},{u.get('total_reviews',0)}"
        csv_lines.append(line)
    
    csv_content = "\n".join(csv_lines)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=users_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

@router.get("/export/ads")
async def admin_export_ads(request: Request, status: Optional[str] = None):
    """Export ads as CSV"""
    await require_admin(request)
    
    query = {}
    if status:
        query["status"] = status
    
    ads = await db.ads.find(query, {"_id": 0}).to_list(None)
    
    csv_lines = ["ad_id,user_id,title,category_id,city_id,price,status,views,created_at"]
    for ad in ads:
        title = ad.get('title', '').replace(',', ';').replace('\n', ' ')
        line = f"{ad.get('ad_id','')},{ad.get('user_id','')},{title},{ad.get('category_id','')},{ad.get('city_id','')},{ad.get('price','')},{ad.get('status','')},{ad.get('views',0)},{ad.get('created_at','')}"
        csv_lines.append(line)
    
    csv_content = "\n".join(csv_lines)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ads_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

# ===================== REPORTS =====================

@router.get("/reports")
async def admin_get_reports(request: Request, status: Optional[str] = None, page: int = 1, limit: int = 20):
    """Get ad reports for admin review"""
    await require_admin(request)
    
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    reports = await db.reports.find(query, {"_id": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.reports.count_documents(query)
    
    # Enrich with ad and user info
    enriched_reports = []
    for report in reports:
        ad = await db.ads.find_one({"ad_id": report.get("ad_id")}, {"_id": 0, "ad_id": 1, "title": 1, "images": 1})
        reporter = await db.users.find_one({"user_id": report.get("reporter_id")}, {"_id": 0, "name": 1, "email": 1})
        enriched_reports.append({
            **report,
            "ad": ad,
            "reporter": reporter
        })
    
    return {
        "reports": enriched_reports,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.put("/reports/{report_id}")
async def admin_update_report(report_id: str, request: Request):
    """Update report status and take action"""
    await require_admin(request)
    body = await request.json()
    
    new_status = body.get("status")
    admin_notes = body.get("admin_notes", "")
    action = body.get("action")  # 'delete_ad', 'warn_user', 'dismiss'
    
    if new_status not in ["pending", "reviewed", "resolved", "dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    report = await db.reports.find_one({"report_id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Take action if specified
    if action == "delete_ad" and report.get("ad_id"):
        await db.ads.update_one(
            {"ad_id": report["ad_id"]},
            {"$set": {"status": "rejected", "rejected_reason": "Reported by users"}}
        )
    
    await db.reports.update_one(
        {"report_id": report_id},
        {"$set": {
            "status": new_status,
            "admin_notes": admin_notes,
            "action_taken": action,
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Report updated to {new_status}"}

# ===================== CATEGORIES MANAGEMENT =====================

@router.get("/categories")
async def admin_get_categories(request: Request):
    await require_admin(request)
    return {"categories": CATEGORIES}

@router.post("/categories")
async def admin_create_category(request: Request):
    await require_admin(request)
    body = await request.json()
    
    new_category = {
        "id": body.get("id"),
        "name": body.get("name"),
        "icon": body.get("icon", "📦"),
        "color": body.get("color", "#3B82F6"),
        "description": body.get("description", "")
    }
    
    # Note: In production, this would need to update the CATEGORIES list and persist
    return {"message": "Category created", "category": new_category}

@router.put("/categories/{category_id}")
async def admin_update_category(category_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    
    # Find and update category
    for cat in CATEGORIES:
        if cat["id"] == category_id:
            if "name" in body:
                cat["name"] = body["name"]
            if "icon" in body:
                cat["icon"] = body["icon"]
            if "color" in body:
                cat["color"] = body["color"]
            return {"message": "Category updated"}
    
    raise HTTPException(status_code=404, detail="Category not found")

@router.delete("/categories/{category_id}")
async def admin_delete_category(category_id: str, request: Request):
    await require_admin(request)
    
    # Check if category has ads
    ads_count = await db.ads.count_documents({"category_id": category_id})
    if ads_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete category with {ads_count} ads")
    
    return {"message": "Category deleted"}

# ===================== VERIFICATION REQUESTS =====================

@router.get("/verification-requests")
async def admin_get_verification_requests(request: Request, status: Optional[str] = None):
    """Get identity verification requests"""
    await require_admin(request)
    
    query = {}
    if status:
        query["status"] = status
    
    requests_list = await db.identity_verifications.find(query, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    
    # Enrich with user info
    for req in requests_list:
        user = await db.users.find_one({"user_id": req.get("user_id")}, {"_id": 0, "name": 1, "email": 1})
        req["user"] = user
    
    return {"requests": requests_list}

@router.post("/verification-requests/{verification_id}/approve")
async def admin_approve_verification(verification_id: str, request: Request):
    """Approve identity verification"""
    await require_admin(request)
    
    verification = await db.identity_verifications.find_one({"verification_id": verification_id}, {"_id": 0})
    if not verification:
        raise HTTPException(status_code=404, detail="Verification request not found")
    
    await db.identity_verifications.update_one(
        {"verification_id": verification_id},
        {"$set": {
            "status": "approved",
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update user
    await db.users.update_one(
        {"user_id": verification["user_id"]},
        {"$set": {"is_verified": True}, "$addToSet": {"badges": "verified_identity"}}
    )
    
    return {"message": "Verification approved"}

@router.post("/verification-requests/{verification_id}/reject")
async def admin_reject_verification(verification_id: str, request: Request):
    """Reject identity verification"""
    await require_admin(request)
    body = await request.json()
    
    verification = await db.identity_verifications.find_one({"verification_id": verification_id}, {"_id": 0})
    if not verification:
        raise HTTPException(status_code=404, detail="Verification request not found")
    
    await db.identity_verifications.update_one(
        {"verification_id": verification_id},
        {"$set": {
            "status": "rejected",
            "rejection_reason": body.get("reason", ""),
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Verification rejected"}

# ===================== STORIES & FORUM =====================

@router.get("/stories")
async def admin_get_stories(request: Request):
    await require_admin(request)
    stories = await db.stories.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    return {"stories": stories}

@router.delete("/stories/{story_id}")
async def admin_delete_story(story_id: str, request: Request):
    await require_admin(request)
    await db.stories.delete_one({"story_id": story_id})
    return {"message": "Story deleted"}

@router.get("/forum/threads")
async def admin_get_forum_threads(request: Request):
    await require_admin(request)
    threads = await db.forum_threads.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    return {"threads": threads}

@router.put("/forum/threads/{thread_id}/pin")
async def admin_pin_thread(thread_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    
    await db.forum_threads.update_one(
        {"thread_id": thread_id},
        {"$set": {"is_pinned": body.get("is_pinned", True)}}
    )
    return {"message": "Thread pin status updated"}
