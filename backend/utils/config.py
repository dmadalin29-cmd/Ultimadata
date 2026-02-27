# Database connection and configuration
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "x67digital")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "ek-oBMCCbHLvAu4CVLcWXvqM7DLwAu2JQWz8OJnmwGmRtU3uQ4F")

# Viva Wallet Config
VIVA_CLIENT_ID = os.environ.get("VIVA_CLIENT_ID", "5fxtt6sh96b9274ddfp7d283fcascy4rvi3zto8w3z3y5.apps.vivapayments.com")
VIVA_CLIENT_SECRET = os.environ.get("VIVA_CLIENT_SECRET", "b0vS5ShW2f291U56WAV859M7RW2wQT")
VIVA_SOURCE_CODE = os.environ.get("VIVA_SOURCE_CODE", "9750")
VIVA_API_BASE = "https://api.vivapayments.com"
VIVA_CHECKOUT_BASE = "https://www.vivapayments.com"

# Resend Config
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "re_haEunm2h_LxmJFHx89i2dp6Ubh6Aeqoyt")

# Cloudinary Config
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL")

# Payment amounts in cents
PAYMENT_AMOUNTS = {
    "post_ad": 0,
    "boost": 1000,
    "top_category": 1500,
    "homepage": 4000,
    "premium_monthly": 9900
}

PREMIUM_BENEFITS = {
    "unlimited_ads": True,
    "priority_support": True,
    "advanced_stats": True,
    "no_waiting_topup": True,
    "verified_badge": True,
    "featured_profile": True
}

# JWT Config
JWT_SECRET = os.environ.get("JWT_SECRET", "x67-super-secret-jwt-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 168

# File upload config
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
MAX_VIDEO_DURATION = 30
MAX_AD_VIDEO_SIZE = 50 * 1024 * 1024
