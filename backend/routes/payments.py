"""
Payments Routes - Viva Wallet Integration
"""
from fastapi import APIRouter, Request, HTTPException
from datetime import datetime, timezone, timedelta
import uuid
import json
import httpx
import asyncio

router = APIRouter(prefix="/payments", tags=["payments"])

# Configuration
PAYMENT_AMOUNTS = {
    "post_ad": 0,           # GRATUIT - publicare anunț
    "boost": 1000,          # 10.00 RON for boost/topup
    "top_category": 1500,   # 15.00 RON/săptămână
    "homepage": 4000,       # 40.00 RON/săptămână
    "premium_monthly": 9900 # 99.00 RON/lună
}

# Dependencies - set from server.py
db = None
logger = None
require_auth = None
get_viva_access_token = None
send_email_notification = None
VIVA_API_BASE = ""
VIVA_SOURCE_CODE = ""
VIVA_CHECKOUT_BASE = ""
VIVA_WEBHOOK_KEY = "475FFE73819D67134BBB2D6690A9023714C14E2E"

def init_dependencies(database, log, auth_func, viva_token_func, email_func, viva_api, viva_source, viva_checkout):
    global db, logger, require_auth, get_viva_access_token, send_email_notification
    global VIVA_API_BASE, VIVA_SOURCE_CODE, VIVA_CHECKOUT_BASE
    db = database
    logger = log
    require_auth = auth_func
    get_viva_access_token = viva_token_func
    send_email_notification = email_func
    VIVA_API_BASE = viva_api
    VIVA_SOURCE_CODE = viva_source
    VIVA_CHECKOUT_BASE = viva_checkout

@router.post("/create-order")
async def create_payment_order(request: Request):
    user = await require_auth(request)
    body = await request.json()
    
    ad_id = body.get("ad_id")
    payment_type = body.get("payment_type")
    
    if payment_type not in PAYMENT_AMOUNTS:
        raise HTTPException(status_code=400, detail="Invalid payment type")
    
    amount = PAYMENT_AMOUNTS[payment_type]
    
    # Get Viva access token
    try:
        access_token = await get_viva_access_token()
    except Exception as e:
        if logger:
            logger.error(f"Viva token error: {e}")
        raise HTTPException(status_code=502, detail="Payment service unavailable")
    
    # Create payment order
    order_payload = {
        "amount": amount,
        "customerTrns": f"X67 - {payment_type} - {ad_id}",
        "customer": {
            "email": user["email"],
            "fullName": user["name"],
            "requestLang": "ro"
        },
        "sourceCode": VIVA_SOURCE_CODE,
        "merchantTrns": json.dumps({"ad_id": ad_id, "payment_type": payment_type, "user_id": user["user_id"]})
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
            if logger:
                logger.error(f"Viva order error: {response.text}")
            raise HTTPException(status_code=502, detail="Failed to create payment order")
        
        data = response.json()
    
    order_code = data.get("orderCode")
    
    # Store payment record
    payment_doc = {
        "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
        "order_code": order_code,
        "ad_id": ad_id,
        "user_id": user["user_id"],
        "payment_type": payment_type,
        "amount": amount,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    checkout_url = f"{VIVA_CHECKOUT_BASE}/web/checkout?ref={order_code}&lang=ro"
    
    return {
        "order_code": order_code,
        "checkout_url": checkout_url,
        "amount": amount / 100
    }

@router.get("/webhook")
async def payment_webhook_verify(request: Request):
    """Viva Wallet webhook URL verification"""
    return {"Key": VIVA_WEBHOOK_KEY}

@router.post("/webhook")
async def payment_webhook(request: Request):
    """Handle Viva payment webhooks and verification"""
    body = await request.json()
    
    # Viva Wallet verification
    if "Key" in body and "EventData" not in body:
        verification_key = body.get("Key", "")
        if logger:
            logger.info(f"Viva webhook POST verification request, Key: {verification_key}")
        return {"Key": verification_key}
    
    event_data = body.get("EventData", {})
    transaction_id = event_data.get("TransactionId")
    order_code = event_data.get("OrderCode")
    status_id = event_data.get("StatusId")
    merchant_trns = event_data.get("MerchantTrns", "{}")
    
    try:
        trns_data = json.loads(merchant_trns)
    except json.JSONDecodeError:
        trns_data = {}
    
    ad_id = trns_data.get("ad_id")
    payment_type = trns_data.get("payment_type")
    
    if logger:
        logger.info(f"Payment webhook: order={order_code}, status={status_id}, type={payment_type}")
    
    if status_id == "F":  # Finished/Successful
        payment = await db.payments.find_one({"order_code": order_code}, {"_id": 0})
        
        await db.payments.update_one(
            {"order_code": order_code},
            {"$set": {
                "status": "completed",
                "transaction_id": transaction_id,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update ad based on payment type
        if payment_type == "post_ad":
            await db.ads.update_one(
                {"ad_id": ad_id},
                {"$set": {"is_paid": True, "status": "pending"}}
            )
        elif payment_type == "boost":
            now = datetime.now(timezone.utc)
            await db.ads.update_one(
                {"ad_id": ad_id},
                {"$set": {
                    "is_boosted": True,
                    "boost_expires_at": (now + timedelta(days=1)).isoformat(),
                    "topup_rank": now.timestamp(),
                    "last_topup": now.isoformat()
                }}
            )
        elif payment_type == "top_category":
            now = datetime.now(timezone.utc)
            await db.ads.update_one(
                {"ad_id": ad_id},
                {"$set": {
                    "is_boosted": True,
                    "boost_expires_at": (now + timedelta(days=7)).isoformat(),
                    "topup_rank": now.timestamp() + 1000000,
                    "last_topup": now.isoformat(),
                    "boost_type": "top_category"
                }}
            )
        elif payment_type == "homepage":
            await db.ads.update_one(
                {"ad_id": ad_id},
                {"$set": {
                    "is_promoted": True,
                    "promote_expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                    "promote_type": "homepage"
                }}
            )
        elif payment_type == "premium_monthly":
            user_id = trns_data.get("user_id")
            if user_id:
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "is_premium": True,
                        "premium_expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                        "premium_started_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$addToSet": {"badges": "premium_seller"}}
                )
        
        # Send payment confirmation email
        if payment and ad_id and send_email_notification:
            ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
            user = await db.users.find_one({"user_id": payment.get("user_id")}, {"_id": 0})
            
            if user and user.get("email"):
                amount_eur = payment.get("amount", 0) / 100
                asyncio.create_task(send_email_notification(
                    user["email"],
                    "payment_success",
                    {
                        "user_name": user.get("name", "User"),
                        "payment_type": payment_type,
                        "amount": f"{amount_eur:.2f}",
                        "ad_title": ad.get("title", "Anunț") if ad else "Anunț",
                        "ad_id": ad_id,
                        "site_url": "https://x67digital.com"
                    }
                ))
    
    return {"status": "received"}

@router.get("/verify/{order_code}")
async def verify_payment(order_code: int, request: Request):
    payment = await db.payments.find_one({"order_code": order_code}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return {
        "order_code": order_code,
        "status": payment.get("status"),
        "payment_type": payment.get("payment_type"),
        "ad_id": payment.get("ad_id")
    }
