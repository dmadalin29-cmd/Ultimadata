"""
Public API Routes - For third-party developers
Rate limited, no auth required
"""
from fastapi import APIRouter, Request, HTTPException
from typing import Optional
from collections import defaultdict
import time

router = APIRouter(prefix="/public/v1", tags=["public-api"])

# Rate limiter
rate_limit_store = defaultdict(list)
RATE_LIMIT = 100  # requests per minute
RATE_WINDOW = 60  # seconds

def check_rate_limit(client_ip: str) -> bool:
    """Check if client has exceeded rate limit"""
    now = time.time()
    # Clean old requests
    rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < RATE_WINDOW]
    # Check limit
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT:
        return False
    # Add current request
    rate_limit_store[client_ip].append(now)
    return True

# These will be set from server.py
db = None
CATEGORIES = []
ROMANIAN_CITIES = []

def init_dependencies(database, categories, cities):
    global db, CATEGORIES, ROMANIAN_CITIES
    db = database
    CATEGORIES = categories
    ROMANIAN_CITIES = cities

@router.get("/status")
async def public_api_status():
    """Public API health check"""
    return {
        "status": "ok",
        "version": "1.0",
        "rate_limit": f"{RATE_LIMIT} requests per minute",
        "endpoints": [
            "/api/public/v1/ads",
            "/api/public/v1/ads/{ad_id}",
            "/api/public/v1/categories",
            "/api/public/v1/cities",
            "/api/public/v1/search"
        ]
    }

@router.get("/ads")
async def public_get_ads(
    request: Request,
    category: Optional[str] = None,
    city: Optional[str] = None,
    judet: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 20
):
    """
    Public API - Get ads listing
    Rate limited: 100 requests/minute per IP
    """
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Max 100 requests per minute.")
    
    if limit > 50:
        limit = 50  # Max 50 per request
    
    query = {"status": "active"}
    
    if category:
        query["category_id"] = category
    if city:
        query["city_id"] = city
    if judet:
        query["judet_code"] = judet
    if min_price:
        query["price"] = {"$gte": min_price}
    if max_price:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    
    # Sort options
    sort_field = {"newest": ("created_at", -1), "oldest": ("created_at", 1), 
                  "price_asc": ("price", 1), "price_desc": ("price", -1)}
    sort_key, sort_dir = sort_field.get(sort, ("created_at", -1))
    
    skip = (page - 1) * limit
    total = await db.ads.count_documents(query)
    
    ads = await db.ads.find(query, {
        "_id": 0,
        "ad_id": 1,
        "title": 1,
        "description": 1,
        "category_id": 1,
        "city_id": 1,
        "judet_code": 1,
        "localitate": 1,
        "price": 1,
        "price_type": 1,
        "images": 1,
        "created_at": 1,
        "views": 1
    }).sort(sort_key, sort_dir).skip(skip).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "ads": ads,
            "pagination": {
                "total": total,
                "page": page,
                "limit": limit,
                "pages": (total + limit - 1) // limit
            }
        }
    }

@router.get("/ads/{ad_id}")
async def public_get_ad(ad_id: str, request: Request):
    """Public API - Get single ad details"""
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    ad = await db.ads.find_one(
        {"ad_id": ad_id, "status": "active"},
        {"_id": 0, "user_id": 0, "contact_email": 0}
    )
    
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return {"success": True, "data": ad}

@router.get("/categories")
async def public_get_categories(request: Request):
    """Public API - Get all categories"""
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    return {
        "success": True,
        "data": CATEGORIES
    }

@router.get("/cities")
async def public_get_cities(request: Request):
    """Public API - Get all cities"""
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    return {
        "success": True,
        "data": ROMANIAN_CITIES
    }

@router.get("/search")
async def public_search(
    request: Request,
    q: str,
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Public API - Search ads"""
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    if not q or len(q) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
    
    if limit > 50:
        limit = 50
    
    query = {
        "status": "active",
        "$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    }
    
    if category:
        query["category_id"] = category
    
    skip = (page - 1) * limit
    total = await db.ads.count_documents(query)
    
    ads = await db.ads.find(query, {
        "_id": 0,
        "ad_id": 1,
        "title": 1,
        "category_id": 1,
        "price": 1,
        "images": 1,
        "localitate": 1,
        "created_at": 1
    }).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "success": True,
        "data": {
            "query": q,
            "results": ads,
            "total": total,
            "page": page
        }
    }
