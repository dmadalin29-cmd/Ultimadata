"""
Escrow / Secure Payment System Routes
"""
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone
import uuid
import json
import httpx

router = APIRouter(prefix="/escrow", tags=["escrow"])

# These will be set from server.py
db = None
require_auth = None
get_viva_access_token = None
VIVA_API_BASE = ""
VIVA_SOURCE_CODE = ""
VIVA_CHECKOUT_BASE = ""
logger = None

def init_dependencies(database, auth_func, viva_token_func, viva_api, viva_source, viva_checkout, log):
    global db, require_auth, get_viva_access_token, VIVA_API_BASE, VIVA_SOURCE_CODE, VIVA_CHECKOUT_BASE, logger
    db = database
    require_auth = auth_func
    get_viva_access_token = viva_token_func
    VIVA_API_BASE = viva_api
    VIVA_SOURCE_CODE = viva_source
    VIVA_CHECKOUT_BASE = viva_checkout
    logger = log

@router.post("/create")
async def create_escrow(request: Request):
    """Create escrow transaction for secure payment"""
    user = await require_auth(request)
    body = await request.json()
    
    ad_id = body.get("ad_id")
    amount = body.get("amount")
    
    # Verify ad exists
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    if ad["user_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Nu poți cumpăra propriul anunț")
    
    escrow_id = f"escrow_{uuid.uuid4().hex[:12]}"
    commission = int(amount * 0.03)  # 3% commission
    
    escrow_doc = {
        "escrow_id": escrow_id,
        "ad_id": ad_id,
        "ad_title": ad.get("title"),
        "buyer_id": user["user_id"],
        "buyer_name": user["name"],
        "seller_id": ad["user_id"],
        "amount": amount,
        "commission": commission,
        "total_amount": amount + commission,
        "status": "pending",  # pending, paid, delivered, completed, disputed, refunded
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.escrow_transactions.insert_one(escrow_doc)
    
    # Create Viva payment
    try:
        access_token = await get_viva_access_token()
        
        order_payload = {
            "amount": (amount + commission) * 100,  # Convert to cents
            "customerTrns": f"X67 Escrow - {ad.get('title', '')[:30]}",
            "customer": {
                "email": user["email"],
                "fullName": user["name"],
                "requestLang": "ro"
            },
            "sourceCode": VIVA_SOURCE_CODE,
            "merchantTrns": json.dumps({
                "escrow_id": escrow_id,
                "payment_type": "escrow"
            })
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{VIVA_API_BASE}/checkout/v2/orders",
                json=order_payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Payment service error")
            
            data = response.json()
        
        order_code = data.get("orderCode")
        
        await db.escrow_transactions.update_one(
            {"escrow_id": escrow_id},
            {"$set": {"order_code": order_code}}
        )
        
        return {
            "escrow_id": escrow_id,
            "checkout_url": f"{VIVA_CHECKOUT_BASE}/web/checkout?ref={order_code}&lang=ro",
            "amount": amount,
            "commission": commission,
            "total": amount + commission
        }
    except Exception as e:
        if logger:
            logger.error(f"Escrow payment error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payment service unavailable")

@router.get("/my-transactions")
async def get_my_escrow_transactions(request: Request):
    """Get user's escrow transactions (as buyer or seller)"""
    user = await require_auth(request)
    
    transactions = await db.escrow_transactions.find(
        {"$or": [{"buyer_id": user["user_id"]}, {"seller_id": user["user_id"]}]},
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(50)
    
    return {"transactions": transactions}

@router.post("/{escrow_id}/confirm-delivery")
async def confirm_escrow_delivery(escrow_id: str, request: Request):
    """Buyer confirms delivery - releases funds to seller"""
    user = await require_auth(request)
    
    escrow = await db.escrow_transactions.find_one({"escrow_id": escrow_id})
    if not escrow:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if escrow["buyer_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only buyer can confirm delivery")
    
    if escrow["status"] != "paid":
        raise HTTPException(status_code=400, detail="Invalid transaction status")
    
    await db.escrow_transactions.update_one(
        {"escrow_id": escrow_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # TODO: Transfer funds to seller via Viva Wallet payout
    
    return {"message": "Plata a fost eliberată către vânzător. Mulțumim!"}

@router.post("/{escrow_id}/dispute")
async def dispute_escrow(escrow_id: str, request: Request):
    """Open dispute for escrow transaction"""
    user = await require_auth(request)
    body = await request.json()
    
    escrow = await db.escrow_transactions.find_one({"escrow_id": escrow_id})
    if not escrow:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if escrow["buyer_id"] != user["user_id"] and escrow["seller_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.escrow_transactions.update_one(
        {"escrow_id": escrow_id},
        {"$set": {
            "status": "disputed",
            "dispute_reason": body.get("reason"),
            "disputed_by": user["user_id"],
            "disputed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Disputa a fost deschisă. Echipa noastră va analiza cazul."}
