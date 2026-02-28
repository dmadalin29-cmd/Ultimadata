from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File, Form, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import requests
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import hmac
import base64
import httpx
import json
import asyncio
import resend
import cloudinary
import cloudinary.uploader
from emergentintegrations.llm.chat import LlmChat, UserMessage
from twilio.rest import Client as TwilioClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Cloudinary configuration
cloudinary.config(
    cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', 'dzrqifaet'),
    api_key=os.environ.get('CLOUDINARY_API_KEY', '862251514396123'),
    api_secret=os.environ.get('CLOUDINARY_API_SECRET', 'el-zk7aHbFaLc-CZSg_HfrVjpG0'),
    secure=True
)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Viva Wallet Configuration
VIVA_CLIENT_ID = os.environ.get('VIVA_CLIENT_ID', '')
VIVA_CLIENT_SECRET = os.environ.get('VIVA_CLIENT_SECRET', '')
VIVA_SOURCE_CODE = os.environ.get('VIVA_SOURCE_CODE', '9570')
VIVA_ENVIRONMENT = os.environ.get('VIVA_ENVIRONMENT', 'demo')

VIVA_API_BASE = "https://demo-api.vivapayments.com" if VIVA_ENVIRONMENT == "demo" else "https://api.vivapayments.com"
VIVA_ACCOUNTS_BASE = "https://demo-accounts.vivapayments.com" if VIVA_ENVIRONMENT == "demo" else "https://accounts.vivapayments.com"
VIVA_CHECKOUT_BASE = "https://demo.vivapayments.com" if VIVA_ENVIRONMENT == "demo" else "https://www.vivapayments.com"

# Resend Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
resend.api_key = RESEND_API_KEY

# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', 'whatsapp:+14155238886')

# Initialize Twilio client
twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

async def send_whatsapp_notification(to_phone: str, message: str):
    """Send WhatsApp notification via Twilio"""
    if not twilio_client or not to_phone:
        return False
    
    try:
        # Format phone number for WhatsApp
        phone = to_phone.replace(" ", "").replace("-", "")
        if not phone.startswith("+"):
            if phone.startswith("0"):
                phone = "+40" + phone[1:]  # Romanian format
            else:
                phone = "+" + phone
        
        whatsapp_to = f"whatsapp:{phone}"
        
        msg = twilio_client.messages.create(
            body=message,
            from_=TWILIO_WHATSAPP_FROM,
            to=whatsapp_to
        )
        logger.info(f"WhatsApp sent to {phone}: {msg.sid}")
        return True
    except Exception as e:
        logger.error(f"WhatsApp error: {str(e)}")
        return False

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="X67 Digital Media Groupe API")
api_router = APIRouter(prefix="/api")

# ===================== WEBSOCKET CONNECTION MANAGER =====================

class ConnectionManager:
    """Manages WebSocket connections for real-time chat"""
    def __init__(self):
        # Maps user_id to list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected: {user_id}")
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket disconnected: {user_id}")
    
    async def send_personal_message(self, message: dict, user_id: str):
        """Send message to specific user"""
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to {user_id}: {e}")
    
    async def broadcast_to_conversation(self, message: dict, user_ids: List[str]):
        """Send message to all users in a conversation"""
        for user_id in user_ids:
            await self.send_personal_message(message, user_id)
    
    def is_online(self, user_id: str) -> bool:
        """Check if user is online"""
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

ws_manager = ConnectionManager()

# ===================== MODELS =====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    phone: Optional[str] = None
    picture: Optional[str] = None
    role: str = "user"
    created_at: datetime

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class AdminChangePasswordRequest(BaseModel):
    new_password: str

class ReviewCreate(BaseModel):
    seller_id: str
    ad_id: Optional[str] = None
    rating: int  # 1-5
    comment: Optional[str] = None

class PriceAlertCreate(BaseModel):
    category_id: str
    city_id: Optional[str] = None
    max_price: float
    keywords: Optional[str] = None

class AdCreate(BaseModel):
    title: str
    description: str
    category_id: str
    subcategory_id: Optional[str] = None
    city_id: str
    price: Optional[float] = None
    price_type: str = "fixed"  # fixed, negotiable, free
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    details: Optional[Dict[str, Any]] = {}

class AdUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    price_type: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class PaymentCreate(BaseModel):
    ad_id: str
    payment_type: str  # post_ad, boost, promote
    customer_email: str
    customer_name: str

class BannerCreate(BaseModel):
    title: str
    image_url: str
    link_url: Optional[str] = None
    position: str = "homepage"  # homepage, sidebar, category
    is_active: bool = True
    order: int = 0

# ===================== HELPER FUNCTIONS =====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return str(uuid.uuid4())

# ===================== EMAIL TEMPLATES & FUNCTIONS =====================

def get_email_template(template_type: str, data: dict) -> tuple:
    """Returns (subject, html_content) for email template"""
    
    base_style = """
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #050505; color: #F8FAFC; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 32px; font-weight: bold; color: #3B82F6; }
        .content { background-color: #0A0A0A; border-radius: 16px; padding: 30px; border: 1px solid rgba(255,255,255,0.1); }
        .title { font-size: 24px; font-weight: bold; color: #fff; margin-bottom: 20px; }
        .text { color: #94A3B8; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
        .button { display: inline-block; background-color: #3B82F6; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 10px; }
        .footer { text-align: center; margin-top: 30px; color: #64748B; font-size: 12px; }
        .highlight { color: #3B82F6; font-weight: 600; }
        .success { color: #10B981; }
        .warning { color: #F59E0B; }
        .badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .badge-approved { background-color: rgba(16, 185, 129, 0.2); color: #10B981; }
        .badge-rejected { background-color: rgba(239, 68, 68, 0.2); color: #EF4444; }
        .badge-promoted { background-color: rgba(59, 130, 246, 0.2); color: #3B82F6; }
    </style>
    """
    
    if template_type == "welcome":
        subject = "Bine ai venit pe X67 Digital Media!"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">X67</div>
                    <p style="color: #64748B; margin: 0;">Digital Media Groupe</p>
                </div>
                <div class="content">
                    <h1 class="title">Bine ai venit, {data.get('name', 'User')}! 🎉</h1>
                    <p class="text">
                        Contul tău a fost creat cu succes pe <span class="highlight">X67 Digital Media</span>.
                    </p>
                    <p class="text">
                        Acum poți:
                    </p>
                    <ul class="text">
                        <li>Publica anunțuri în toate categoriile</li>
                        <li>Promova anunțurile pentru vizibilitate maximă</li>
                        <li>Contacta vânzătorii direct</li>
                    </ul>
                    <p class="text">
                        Publicarea unui anunț costă doar <span class="highlight">2€</span>!
                    </p>
                    <a href="{data.get('site_url', 'https://x67digital.com')}/create-ad" class="button">
                        Publică primul anunț
                    </a>
                </div>
                <div class="footer">
                    <p>© 2026 X67 Digital Media Groupe. Toate drepturile rezervate.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
    elif template_type == "ad_approved":
        subject = f"✅ Anunțul tău a fost aprobat - {data.get('ad_title', 'Anunț')}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">X67</div>
                    <p style="color: #64748B; margin: 0;">Digital Media Groupe</p>
                </div>
                <div class="content">
                    <h1 class="title">Anunțul tău a fost aprobat! ✅</h1>
                    <p class="text">
                        Bună, <span class="highlight">{data.get('user_name', 'User')}</span>!
                    </p>
                    <p class="text">
                        Anunțul tău <strong>"{data.get('ad_title', 'Anunț')}"</strong> a fost aprobat și este acum <span class="success">activ</span> pe platformă.
                    </p>
                    <div style="background-color: #121212; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <p style="color: #64748B; font-size: 14px; margin: 0 0 10px 0;">Detalii anunț:</p>
                        <p style="color: #fff; font-size: 16px; margin: 0;"><strong>{data.get('ad_title', 'Anunț')}</strong></p>
                        <p style="color: #3B82F6; font-size: 18px; margin: 10px 0 0 0;">{data.get('ad_price', 'Preț la cerere')}</p>
                    </div>
                    <p class="text">
                        Vrei să ajungi la mai mulți cumpărători? <span class="highlight">Promovează anunțul</span> pentru doar 5€ și apare pe prima pagină!
                    </p>
                    <a href="{data.get('site_url', 'https://x67digital.com')}/ad/{data.get('ad_id', '')}" class="button">
                        Vezi anunțul
                    </a>
                </div>
                <div class="footer">
                    <p>© 2026 X67 Digital Media Groupe. Toate drepturile rezervate.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
    elif template_type == "ad_rejected":
        subject = f"❌ Anunțul tău a fost respins - {data.get('ad_title', 'Anunț')}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">X67</div>
                    <p style="color: #64748B; margin: 0;">Digital Media Groupe</p>
                </div>
                <div class="content">
                    <h1 class="title">Anunțul tău a fost respins ❌</h1>
                    <p class="text">
                        Bună, <span class="highlight">{data.get('user_name', 'User')}</span>!
                    </p>
                    <p class="text">
                        Din păcate, anunțul tău <strong>"{data.get('ad_title', 'Anunț')}"</strong> nu a fost aprobat de echipa noastră.
                    </p>
                    <div style="background-color: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <p style="color: #EF4444; font-size: 14px; margin: 0;">
                            Motivul respingerii poate fi: conținut necorespunzător, informații incomplete sau încălcarea regulamentului platformei.
                        </p>
                    </div>
                    <p class="text">
                        Te rugăm să verifici regulamentul și să încerci din nou cu un anunț actualizat.
                    </p>
                    <a href="{data.get('site_url', 'https://x67digital.com')}/create-ad" class="button">
                        Creează un anunț nou
                    </a>
                </div>
                <div class="footer">
                    <p>© 2026 X67 Digital Media Groupe. Toate drepturile rezervate.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
    elif template_type == "views_milestone":
        milestone = data.get('milestone', 0)
        subject = f"🎉 Anunțul tău a atins {milestone} vizualizări!"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">X67</div>
                    <p style="color: #64748B; margin: 0;">Digital Media Groupe</p>
                </div>
                <div class="content">
                    <h1 class="title">Felicitări! 🎉</h1>
                    <p class="text">
                        Bună, <span class="highlight">{data.get('user_name', 'User')}</span>!
                    </p>
                    <p class="text">
                        Anunțul tău <strong>"{data.get('ad_title', 'Anunț')}"</strong> tocmai a atins un milestone important!
                    </p>
                    <div style="background-color: #121212; border-radius: 16px; padding: 30px; margin: 20px 0; text-align: center;">
                        <p style="font-size: 64px; margin: 0; color: #3B82F6;">👁️</p>
                        <p style="font-size: 48px; font-weight: bold; color: #fff; margin: 10px 0;">{milestone}</p>
                        <p style="color: #64748B; font-size: 18px; margin: 0;">vizualizări</p>
                    </div>
                    <p class="text">
                        Anunțul tău atrage atenția! Vrei să ajungi la și mai mulți cumpărători?
                    </p>
                    <p class="text">
                        <span class="highlight">Promovează anunțul</span> pentru doar 5€ și apare pe prima pagină!
                    </p>
                    <a href="{data.get('site_url', 'https://x67digital.com')}/ad/{data.get('ad_id', '')}" class="button">
                        Vezi anunțul
                    </a>
                </div>
                <div class="footer">
                    <p>© 2026 X67 Digital Media Groupe. Toate drepturile rezervate.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
    elif template_type == "payment_success":
        payment_type_labels = {
            "post_ad": "Publicare anunț",
            "boost": "Ridicare anunț",
            "promote": "Promovare anunț"
        }
        subject = f"💳 Plată confirmată - {payment_type_labels.get(data.get('payment_type', ''), 'Plată')}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">X67</div>
                    <p style="color: #64748B; margin: 0;">Digital Media Groupe</p>
                </div>
                <div class="content">
                    <h1 class="title">Plată confirmată! 💳</h1>
                    <p class="text">
                        Bună, <span class="highlight">{data.get('user_name', 'User')}</span>!
                    </p>
                    <p class="text">
                        Plata ta a fost procesată cu succes.
                    </p>
                    <div style="background-color: #121212; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <table style="width: 100%; color: #94A3B8;">
                            <tr>
                                <td style="padding: 8px 0;">Tip:</td>
                                <td style="text-align: right; color: #fff;">{payment_type_labels.get(data.get('payment_type', ''), 'Plată')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Sumă:</td>
                                <td style="text-align: right; color: #10B981; font-size: 18px; font-weight: bold;">{data.get('amount', '0')} €</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Anunț:</td>
                                <td style="text-align: right; color: #fff;">{data.get('ad_title', '-')}</td>
                            </tr>
                        </table>
                    </div>
                    <a href="{data.get('site_url', 'https://x67digital.com')}/ad/{data.get('ad_id', '')}" class="button">
                        Vezi anunțul
                    </a>
                </div>
                <div class="footer">
                    <p>© 2026 X67 Digital Media Groupe. Toate drepturile rezervate.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    elif template_type == "forgot_password":
        subject = "🔐 Resetare parolă - X67 Digital Media"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">X67</div>
                    <p style="color: #64748B; margin: 0;">Digital Media Groupe</p>
                </div>
                <div class="content">
                    <h1 class="title">Resetare parolă 🔐</h1>
                    <p class="text">
                        Bună, <span class="highlight">{data.get('user_name', 'User')}</span>!
                    </p>
                    <p class="text">
                        Ai solicitat resetarea parolei pentru contul tău X67 Digital Media. Folosește link-ul de mai jos pentru a seta o nouă parolă:
                    </p>
                    <a href="{data.get('reset_url', '')}" class="button">
                        Resetează parola
                    </a>
                    <p class="text" style="margin-top: 20px; font-size: 14px;">
                        Link-ul expiră în <strong>1 oră</strong>. Dacă nu ai solicitat resetarea parolei, ignoră acest email.
                    </p>
                </div>
                <div class="footer">
                    <p>© 2026 X67 Digital Media Groupe. Toate drepturile rezervate.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    elif template_type == "admin_new_registration":
        subject = f"📢 Utilizator nou înregistrat: {data.get('user_email', 'N/A')}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">X67</div>
                    <p style="color: #64748B; margin: 0;">Admin Notification</p>
                </div>
                <div class="content">
                    <h1 class="title">Utilizator Nou Înregistrat! 🎉</h1>
                    <div style="background-color: #121212; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <table style="width: 100%; color: #94A3B8;">
                            <tr>
                                <td style="padding: 8px 0;">Nume:</td>
                                <td style="text-align: right; color: #fff;">{data.get('user_name', 'N/A')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Email:</td>
                                <td style="text-align: right; color: #3B82F6;">{data.get('user_email', 'N/A')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Telefon:</td>
                                <td style="text-align: right; color: #fff;">{data.get('user_phone', '-')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Data:</td>
                                <td style="text-align: right; color: #fff;">{data.get('registered_at', 'N/A')}</td>
                            </tr>
                        </table>
                    </div>
                    <a href="{data.get('site_url', 'https://x67digital.com')}/admin/users" class="button">
                        Vezi în Admin
                    </a>
                </div>
                <div class="footer">
                    <p>© 2026 X67 Digital Media Groupe. Notificare automată pentru administratori.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    elif template_type == "admin_new_ad":
        subject = f"📢 Anunț nou postat: {data.get('ad_title', 'N/A')}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">X67</div>
                    <p style="color: #64748B; margin: 0;">Admin Notification</p>
                </div>
                <div class="content">
                    <h1 class="title">Anunț Nou Postat! 📝</h1>
                    <div style="background-color: #121212; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <table style="width: 100%; color: #94A3B8;">
                            <tr>
                                <td style="padding: 8px 0;">Titlu:</td>
                                <td style="text-align: right; color: #fff;">{data.get('ad_title', 'N/A')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Categorie:</td>
                                <td style="text-align: right; color: #3B82F6;">{data.get('category_name', 'N/A')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Preț:</td>
                                <td style="text-align: right; color: #10B981;">{data.get('ad_price', 'N/A')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Oraș:</td>
                                <td style="text-align: right; color: #fff;">{data.get('city_name', 'N/A')}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Utilizator:</td>
                                <td style="text-align: right; color: #fff;">{data.get('user_name', 'N/A')} ({data.get('user_email', 'N/A')})</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0;">Status:</td>
                                <td style="text-align: right; color: {('#F59E0B' if data.get('status') == 'pending' else '#10B981')};">{data.get('status', 'N/A').upper()}</td>
                            </tr>
                        </table>
                    </div>
                    <a href="{data.get('site_url', 'https://x67digital.com')}/admin/ads" class="button">
                        {('Aprobă în Admin' if data.get('status') == 'pending' else 'Vezi în Admin')}
                    </a>
                </div>
                <div class="footer">
                    <p>© 2026 X67 Digital Media Groupe. Notificare automată pentru administratori.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    else:
        subject = "Notificare X67 Digital Media"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>{base_style}</head>
        <body>
            <div class="container">
                <div class="content">
                    <p class="text">{data.get('message', 'Ai primit o notificare.')}</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    return subject, html

async def send_email_notification(to_email: str, template_type: str, data: dict):
    """Send email notification asynchronously"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return None
    
    try:
        subject, html_content = get_email_template(template_type, data)
        params = {
            "from": SENDER_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content
        }
        
        # Run sync SDK in thread to keep FastAPI non-blocking
        email = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to_email}: {template_type}")
        return email.get("id")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return None

async def get_current_user(request: Request) -> Optional[dict]:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    # Then check Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

async def require_auth(request: Request) -> dict:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request) -> dict:
    user = await require_auth(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ===================== VIVA WALLET =====================

async def get_viva_access_token() -> str:
    credentials = base64.b64encode(f"{VIVA_CLIENT_ID}:{VIVA_CLIENT_SECRET}".encode()).decode()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{VIVA_ACCOUNTS_BASE}/connect/token",
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {credentials}"
            },
            data={"grant_type": "client_credentials"}
        )
        if response.status_code != 200:
            logger.error(f"Viva token error: {response.text}")
            raise HTTPException(status_code=502, detail="Payment service unavailable")
        return response.json()["access_token"]

# ===================== AUTH ENDPOINTS =====================

@api_router.post("/auth/register")
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
    
    response = JSONResponse(content={
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "role": "user"
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

@api_router.post("/auth/login")
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
    
    response = JSONResponse(content={
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user")
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

@api_router.post("/auth/google-session")
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
    
    response = JSONResponse(content={
        "user_id": user["user_id"],
        "email": email,
        "name": name or user.get("name"),
        "picture": picture or user.get("picture"),
        "role": user.get("role", "user")
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

@api_router.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "service": "x67-digital-api"}

@api_router.get("/auth/me")
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

@api_router.put("/auth/profile")
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

@api_router.get("/auth/token")
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

@api_router.post("/auth/logout")
async def logout(request: Request):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    return response

# ===================== FORGOT/RESET PASSWORD =====================

@api_router.post("/auth/forgot-password")
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
    
    logger.info(f"Password reset requested for {data.email}")
    return {"message": "Dacă adresa de email există în baza noastră de date, vei primi un email cu instrucțiuni."}

@api_router.post("/auth/reset-password")
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
    
    logger.info(f"Password reset completed for {reset_record['email']}")
    return {"message": "Parola a fost schimbată cu succes. Te poți autentifica acum."}

# ===================== CATEGORIES =====================

CATEGORIES = [
    {"id": "escorts", "name": "Escorte", "icon": "heart", "color": "#D946EF", "subcategories": [
        {"id": "escorts_female", "name": "Dame"},
        {"id": "escorts_male", "name": "Domni"},
        {"id": "escorts_trans", "name": "Trans"},
        {"id": "escorts_massage", "name": "Masaj"}
    ]},
    {"id": "real_estate", "name": "Imobiliare", "icon": "home", "color": "#10B981", "subcategories": [
        {"id": "apartments_sale", "name": "Apartamente de vânzare"},
        {"id": "apartments_rent", "name": "Apartamente de închiriat"},
        {"id": "apt_1_room_sale", "name": "Garsoniere de vânzare"},
        {"id": "apt_1_room_rent", "name": "Garsoniere de închiriat"},
        {"id": "apt_2_rooms_sale", "name": "2 camere de vânzare"},
        {"id": "apt_2_rooms_rent", "name": "2 camere de închiriat"},
        {"id": "apt_3_rooms_sale", "name": "3 camere de vânzare"},
        {"id": "apt_3_rooms_rent", "name": "3 camere de închiriat"},
        {"id": "apt_4_rooms_sale", "name": "4+ camere de vânzare"},
        {"id": "apt_4_rooms_rent", "name": "4+ camere de închiriat"},
        {"id": "houses_sale", "name": "Case de vânzare"},
        {"id": "houses_rent", "name": "Case de închiriat"},
        {"id": "land", "name": "Terenuri"},
        {"id": "commercial", "name": "Spații comerciale"},
        {"id": "offices", "name": "Birouri"},
        {"id": "garages", "name": "Garaje / Parcări"}
    ]},
    {"id": "cars", "name": "Auto", "icon": "car", "color": "#3B82F6", "subcategories": [
        {"id": "cars_sale", "name": "Autoturisme"},
        {"id": "motorcycles", "name": "Motociclete"},
        {"id": "scooters", "name": "Scutere / ATV"},
        {"id": "trucks", "name": "Autoutilitare"},
        {"id": "buses", "name": "Autobuze / Microbuze"},
        {"id": "trailers", "name": "Rulote / Remorci"},
        {"id": "car_parts", "name": "Piese auto"},
        {"id": "wheels_tires", "name": "Jante / Anvelope"},
        {"id": "car_audio", "name": "Audio / Navigație"},
        {"id": "car_services", "name": "Service auto"}
    ]},
    {"id": "jobs", "name": "Locuri de muncă", "icon": "briefcase", "color": "#F59E0B", "subcategories": [
        {"id": "jobs_driver", "name": "Șofer / Curier / Livrator"},
        {"id": "jobs_it", "name": "IT / Programare / Web"},
        {"id": "jobs_sales", "name": "Vânzări / Marketing"},
        {"id": "jobs_finance", "name": "Contabilitate / Financiar"},
        {"id": "jobs_admin", "name": "Administrativ / Secretariat"},
        {"id": "jobs_hr", "name": "Resurse Umane"},
        {"id": "jobs_construction", "name": "Construcții / Instalații"},
        {"id": "jobs_production", "name": "Producție / Fabrică"},
        {"id": "jobs_horeca", "name": "HoReCa / Turism"},
        {"id": "jobs_medical", "name": "Medical / Farmacie"},
        {"id": "jobs_education", "name": "Educație / Training"},
        {"id": "jobs_beauty", "name": "Frumusețe / Fitness"},
        {"id": "jobs_security", "name": "Pază / Securitate"},
        {"id": "jobs_cleaning", "name": "Curățenie / Menaj"},
        {"id": "jobs_agriculture", "name": "Agricultură / Zootehnie"},
        {"id": "jobs_part_time", "name": "Part-time"},
        {"id": "jobs_remote", "name": "Remote / Work from home"},
        {"id": "jobs_freelance", "name": "Freelance"},
        {"id": "jobs_internship", "name": "Stagii / Internship"},
        {"id": "jobs_abroad", "name": "Muncă în străinătate"}
    ]},
    {"id": "electronics", "name": "Electronice", "icon": "smartphone", "color": "#8B5CF6", "subcategories": [
        {"id": "phones", "name": "Telefoane mobile"},
        {"id": "tablets", "name": "Tablete"},
        {"id": "laptops", "name": "Laptopuri"},
        {"id": "computers", "name": "Calculatoare / Desktop"},
        {"id": "monitors", "name": "Monitoare"},
        {"id": "printers", "name": "Imprimante / Scanere"},
        {"id": "gaming", "name": "Console / Gaming"},
        {"id": "tv", "name": "Televizoare"},
        {"id": "audio", "name": "Audio / Boxe / Căști"},
        {"id": "cameras", "name": "Camere foto / Video"},
        {"id": "smartwatch", "name": "Smartwatch / Wearables"},
        {"id": "accessories_elec", "name": "Accesorii electronice"}
    ]},
    {"id": "fashion", "name": "Modă", "icon": "shirt", "color": "#EC4899", "subcategories": [
        {"id": "women_clothing", "name": "Îmbrăcăminte femei"},
        {"id": "men_clothing", "name": "Îmbrăcăminte bărbați"},
        {"id": "kids_clothing", "name": "Îmbrăcăminte copii"},
        {"id": "shoes_women", "name": "Încălțăminte femei"},
        {"id": "shoes_men", "name": "Încălțăminte bărbați"},
        {"id": "shoes_kids", "name": "Încălțăminte copii"},
        {"id": "bags", "name": "Genți / Rucsacuri"},
        {"id": "watches", "name": "Ceasuri"},
        {"id": "jewelry", "name": "Bijuterii"},
        {"id": "accessories_fashion", "name": "Accesorii modă"}
    ]},
    {"id": "services", "name": "Servicii", "icon": "wrench", "color": "#06B6D4", "subcategories": [
        {"id": "construction", "name": "Construcții / Renovări"},
        {"id": "plumbing", "name": "Instalații sanitare"},
        {"id": "electrical", "name": "Electricieni"},
        {"id": "cleaning_service", "name": "Curățenie"},
        {"id": "moving", "name": "Mutări / Transport"},
        {"id": "auto_service", "name": "Service auto"},
        {"id": "it_services", "name": "IT / Web / Design"},
        {"id": "legal", "name": "Juridice / Consultanță"},
        {"id": "accounting", "name": "Contabilitate"},
        {"id": "events_service", "name": "Evenimente / Organizări"},
        {"id": "photo_video", "name": "Foto / Video"},
        {"id": "lessons", "name": "Meditații / Cursuri"},
        {"id": "beauty_service", "name": "Frumusețe / Coafură"},
        {"id": "health_service", "name": "Sănătate / Masaj"},
        {"id": "pet_service", "name": "Servicii animale"}
    ]},
    {"id": "animals", "name": "Animale", "icon": "dog", "color": "#84CC16", "subcategories": [
        {"id": "dogs", "name": "Câini"},
        {"id": "cats", "name": "Pisici"},
        {"id": "birds", "name": "Păsări"},
        {"id": "fish_aquarium", "name": "Pești / Acvarii"},
        {"id": "rodents", "name": "Rozătoare"},
        {"id": "reptiles", "name": "Reptile"},
        {"id": "horses", "name": "Cai"},
        {"id": "farm_animals", "name": "Animale de fermă"},
        {"id": "pet_food", "name": "Hrană animale"},
        {"id": "pet_accessories", "name": "Accesorii animale"}
    ]}
]

# Romanian cities
ROMANIAN_CITIES = [
    {"id": "bucuresti", "name": "București", "county": "București"},
    {"id": "cluj", "name": "Cluj-Napoca", "county": "Cluj"},
    {"id": "timisoara", "name": "Timișoara", "county": "Timiș"},
    {"id": "iasi", "name": "Iași", "county": "Iași"},
    {"id": "constanta", "name": "Constanța", "county": "Constanța"},
    {"id": "craiova", "name": "Craiova", "county": "Dolj"},
    {"id": "brasov", "name": "Brașov", "county": "Brașov"},
    {"id": "galati", "name": "Galați", "county": "Galați"},
    {"id": "ploiesti", "name": "Ploiești", "county": "Prahova"},
    {"id": "oradea", "name": "Oradea", "county": "Bihor"},
    {"id": "braila", "name": "Brăila", "county": "Brăila"},
    {"id": "arad", "name": "Arad", "county": "Arad"},
    {"id": "pitesti", "name": "Pitești", "county": "Argeș"},
    {"id": "sibiu", "name": "Sibiu", "county": "Sibiu"},
    {"id": "bacau", "name": "Bacău", "county": "Bacău"},
    {"id": "targu_mures", "name": "Târgu Mureș", "county": "Mureș"},
    {"id": "baia_mare", "name": "Baia Mare", "county": "Maramureș"},
    {"id": "buzau", "name": "Buzău", "county": "Buzău"},
    {"id": "botosani", "name": "Botoșani", "county": "Botoșani"},
    {"id": "satu_mare", "name": "Satu Mare", "county": "Satu Mare"},
    {"id": "ramnicu_valcea", "name": "Râmnicu Vâlcea", "county": "Vâlcea"},
    {"id": "drobeta", "name": "Drobeta-Turnu Severin", "county": "Mehedinți"},
    {"id": "suceava", "name": "Suceava", "county": "Suceava"},
    {"id": "piatra_neamt", "name": "Piatra Neamț", "county": "Neamț"},
    {"id": "targu_jiu", "name": "Târgu Jiu", "county": "Gorj"},
    {"id": "tulcea", "name": "Tulcea", "county": "Tulcea"},
    {"id": "resita", "name": "Reșița", "county": "Caraș-Severin"},
    {"id": "focsani", "name": "Focșani", "county": "Vrancea"},
    {"id": "bistrita", "name": "Bistrița", "county": "Bistrița-Năsăud"},
    {"id": "calarasi", "name": "Călărași", "county": "Călărași"},
    {"id": "giurgiu", "name": "Giurgiu", "county": "Giurgiu"},
    {"id": "alba_iulia", "name": "Alba Iulia", "county": "Alba"},
    {"id": "deva", "name": "Deva", "county": "Hunedoara"},
    {"id": "hunedoara", "name": "Hunedoara", "county": "Hunedoara"},
    {"id": "zalau", "name": "Zalău", "county": "Sălaj"},
    {"id": "sfantu_gheorghe", "name": "Sfântu Gheorghe", "county": "Covasna"},
    {"id": "vaslui", "name": "Vaslui", "county": "Vaslui"},
    {"id": "alexandria", "name": "Alexandria", "county": "Teleorman"},
    {"id": "targoviste", "name": "Târgoviște", "county": "Dâmbovița"},
    {"id": "slobozia", "name": "Slobozia", "county": "Ialomița"},
    {"id": "miercurea_ciuc", "name": "Miercurea Ciuc", "county": "Harghita"}
]

# Car brands and models
CAR_BRANDS = {
    "bmw": {"name": "BMW", "models": ["Seria 1", "Seria 2", "Seria 3", "Seria 4", "Seria 5", "Seria 7", "X1", "X3", "X5", "X6", "X7", "i3", "i4", "iX"]},
    "mercedes": {"name": "Mercedes-Benz", "models": ["Clasa A", "Clasa B", "Clasa C", "Clasa E", "Clasa S", "GLA", "GLB", "GLC", "GLE", "GLS", "EQC", "EQS"]},
    "audi": {"name": "Audi", "models": ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "e-tron"]},
    "volkswagen": {"name": "Volkswagen", "models": ["Polo", "Golf", "Passat", "Arteon", "T-Roc", "Tiguan", "Touareg", "ID.3", "ID.4"]},
    "toyota": {"name": "Toyota", "models": ["Yaris", "Corolla", "Camry", "RAV4", "Land Cruiser", "C-HR", "Prius", "Supra"]},
    "ford": {"name": "Ford", "models": ["Fiesta", "Focus", "Mondeo", "Puma", "Kuga", "Explorer", "Mustang", "Ranger"]},
    "opel": {"name": "Opel", "models": ["Corsa", "Astra", "Insignia", "Crossland", "Grandland", "Mokka"]},
    "renault": {"name": "Renault", "models": ["Clio", "Megane", "Talisman", "Captur", "Kadjar", "Koleos", "Zoe"]},
    "dacia": {"name": "Dacia", "models": ["Sandero", "Logan", "Duster", "Spring", "Jogger"]},
    "skoda": {"name": "Škoda", "models": ["Fabia", "Scala", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq", "Enyaq"]},
    "hyundai": {"name": "Hyundai", "models": ["i10", "i20", "i30", "Tucson", "Santa Fe", "Kona", "Ioniq"]},
    "kia": {"name": "Kia", "models": ["Picanto", "Rio", "Ceed", "Stonic", "Sportage", "Sorento", "EV6"]},
    "peugeot": {"name": "Peugeot", "models": ["208", "308", "508", "2008", "3008", "5008", "e-208"]},
    "fiat": {"name": "Fiat", "models": ["500", "Panda", "Tipo", "500X", "500L"]},
    "honda": {"name": "Honda", "models": ["Jazz", "Civic", "Accord", "HR-V", "CR-V", "e"]},
    "nissan": {"name": "Nissan", "models": ["Micra", "Juke", "Qashqai", "X-Trail", "Leaf", "Ariya"]},
    "mazda": {"name": "Mazda", "models": ["Mazda2", "Mazda3", "Mazda6", "CX-3", "CX-30", "CX-5", "MX-5"]},
    "volvo": {"name": "Volvo", "models": ["S60", "S90", "V60", "V90", "XC40", "XC60", "XC90"]},
    "porsche": {"name": "Porsche", "models": ["718", "911", "Taycan", "Panamera", "Macan", "Cayenne"]},
    "tesla": {"name": "Tesla", "models": ["Model 3", "Model S", "Model X", "Model Y"]}
}

# Motorcycle brands and models
MOTO_BRANDS = {
    "honda_moto": {"name": "Honda", "models": ["CBR600RR", "CBR1000RR", "CB650R", "CB500F", "Africa Twin", "Gold Wing", "Rebel 500", "Forza 350", "PCX125", "SH150"]},
    "yamaha": {"name": "Yamaha", "models": ["YZF-R1", "YZF-R6", "MT-09", "MT-07", "Tracer 900", "Tenere 700", "XMAX 300", "NMAX 125", "XSR700"]},
    "kawasaki": {"name": "Kawasaki", "models": ["Ninja ZX-10R", "Ninja 650", "Z900", "Z650", "Versys 650", "Vulcan S", "Z400"]},
    "suzuki_moto": {"name": "Suzuki", "models": ["GSX-R1000", "GSX-R750", "GSX-S750", "V-Strom 650", "SV650", "Burgman 400", "Hayabusa"]},
    "bmw_moto": {"name": "BMW", "models": ["S1000RR", "R1250GS", "F900R", "F850GS", "R nineT", "K1600GT", "C400X", "CE 04"]},
    "ducati": {"name": "Ducati", "models": ["Panigale V4", "Streetfighter V4", "Monster", "Multistrada", "Scrambler", "Diavel", "Hypermotard"]},
    "ktm": {"name": "KTM", "models": ["Duke 390", "Duke 690", "Duke 890", "RC 390", "Adventure 390", "Adventure 890", "Super Duke 1290"]},
    "harley": {"name": "Harley-Davidson", "models": ["Street Glide", "Road King", "Sportster S", "Fat Boy", "Iron 883", "Street Bob", "Pan America"]},
    "triumph": {"name": "Triumph", "models": ["Street Triple", "Speed Triple", "Tiger 900", "Bonneville T120", "Trident 660", "Rocket 3"]},
    "aprilia": {"name": "Aprilia", "models": ["RSV4", "Tuono V4", "RS 660", "Tuono 660", "SR GT", "SXR 160"]},
    "mv_agusta": {"name": "MV Agusta", "models": ["F3", "Brutale", "Dragster", "Superveloce", "Turismo Veloce"]},
    "vespa": {"name": "Vespa", "models": ["Primavera 125", "GTS 300", "Sprint 150", "Elettrica"]},
    "piaggio": {"name": "Piaggio", "models": ["Beverly 300", "MP3 500", "Medley 150", "Liberty 125"]},
    "kymco": {"name": "Kymco", "models": ["AK 550", "Downtown 350", "Agility 125", "Like 150"]},
    "sym": {"name": "SYM", "models": ["Maxsym 400", "Joymax Z", "Symphony 125", "Fiddle III"]}
}

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

@api_router.get("/cities")
async def get_cities():
    return ROMANIAN_CITIES

# ===================== LOCATION ENDPOINTS (JUDETE & LOCALITATI) =====================

@api_router.get("/judete")
async def get_judete():
    """Get all Romanian counties (județe)"""
    judete = await db.judete.find({}, {"_id": 0}).sort("name", 1).to_list(100)
    return judete

@api_router.get("/localitati")
async def get_localitati(judet_code: Optional[str] = None, search: Optional[str] = None, limit: int = 50):
    """Get localities, optionally filtered by county code or search term"""
    query = {}
    
    if judet_code:
        query["judet_code"] = judet_code.upper()
    
    if search:
        # Case-insensitive search on name or search_name
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"search_name": {"$regex": search.lower(), "$options": "i"}}
        ]
    
    localitati = await db.localitati.find(query, {"_id": 0}).sort("name", 1).limit(limit).to_list(limit)
    return localitati

@api_router.get("/localitati/autocomplete")
async def autocomplete_localitati(q: str, limit: int = 10):
    """Autocomplete search for localities - returns locality with county info"""
    if not q or len(q) < 2:
        return []
    
    # Search localities
    localitati = await db.localitati.find(
        {"$or": [
            {"name": {"$regex": f"^{q}", "$options": "i"}},
            {"search_name": {"$regex": f"^{q.lower()}"}}
        ]},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    # Enrich with county names
    results = []
    judete_cache = {}
    
    for loc in localitati:
        judet_code = loc.get("judet_code")
        if judet_code not in judete_cache:
            judet = await db.judete.find_one({"code": judet_code}, {"_id": 0})
            judete_cache[judet_code] = judet.get("name", "") if judet else ""
        
        results.append({
            **loc,
            "judet_name": judete_cache[judet_code],
            "display": f"{loc['name']}, {judete_cache[judet_code]}"
        })
    
    return results

@api_router.get("/car-brands")
async def get_car_brands():
    return CAR_BRANDS

@api_router.get("/moto-brands")
async def get_moto_brands():
    return MOTO_BRANDS

# ===================== ADS ENDPOINTS =====================

async def ai_verify_ad(title: str, description: str, category_id: str) -> dict:
    """Use AI to verify ad content for spam, inappropriate content, and quality"""
    try:
        llm_chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            model="gpt-4o-mini"
        )
        
        prompt = f"""Analizează următorul anunț și răspunde în format JSON:

Titlu: {title}
Descriere: {description}
Categorie: {category_id}

Verifică:
1. Este spam sau conținut duplicat/generic?
2. Conține informații false sau înșelătoare?
3. Conține limbaj nepotrivit sau ofensator?
4. Are calitate scăzută (text foarte scurt, fără sens)?
5. Conține date de contact în descriere (telefon, email, link-uri externe)?

Răspunde DOAR cu JSON în formatul:
{{
    "is_valid": true/false,
    "spam_score": 0-100,
    "quality_score": 0-100,
    "issues": ["problema1", "problema2"],
    "recommendation": "approve" sau "review" sau "reject",
    "reason": "explicație scurtă"
}}"""
        
        response = await llm_chat.send_async(prompt)
        response_text = response.content if hasattr(response, 'content') else str(response)
        
        # Parse JSON from response
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
            return result
        
        return {"is_valid": True, "recommendation": "approve", "spam_score": 0, "quality_score": 80}
    except Exception as e:
        logger.error(f"AI verification error: {str(e)}")
        # Default to approve if AI fails
        return {"is_valid": True, "recommendation": "approve", "spam_score": 0, "quality_score": 50, "ai_error": True}

@api_router.post("/ads")
async def create_ad(request: Request):
    user = await require_auth(request)
    body = await request.json()
    
    category_id = body.get("category_id")
    title = body.get("title", "")
    description = body.get("description", "")
    
    # AI Verification for spam and quality
    ai_result = await ai_verify_ad(title, description, category_id)
    
    # Auto-approval bot: All categories EXCEPT "escorts" are auto-approved
    # Escorts require manual admin approval
    # Also send to review if AI flags issues
    is_escort_category = category_id == "escorts"
    ai_needs_review = ai_result.get("recommendation") == "review" or ai_result.get("spam_score", 0) > 60
    ai_rejected = ai_result.get("recommendation") == "reject" or ai_result.get("spam_score", 0) > 85
    
    if ai_rejected:
        raise HTTPException(
            status_code=400, 
            detail=f"Anunțul nu poate fi publicat: {ai_result.get('reason', 'Conținut necorespunzător detectat')}"
        )
    
    initial_status = "pending" if (is_escort_category or ai_needs_review) else "active"
    
    ad_id = f"ad_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    ad_doc = {
        "ad_id": ad_id,
        "user_id": user["user_id"],
        "title": body.get("title"),
        "description": body.get("description"),
        "category_id": category_id,
        "subcategory_id": body.get("subcategory_id"),
        "city_id": body.get("city_id"),
        "judet_code": body.get("judet_code"),
        "localitate": body.get("localitate"),
        "location_lat": body.get("location_lat"),
        "location_lng": body.get("location_lng"),
        "price": body.get("price"),
        "price_type": body.get("price_type", "fixed"),
        "contact_phone": body.get("contact_phone"),
        "contact_email": body.get("contact_email", user["email"]),
        "images": body.get("images", []),
        "video": body.get("video"),  # Video URL from Cloudinary
        "details": body.get("details", {}),
        "status": initial_status,
        "is_boosted": False,
        "boost_expires_at": None,
        "is_promoted": False,
        "promote_expires_at": None,
        "views": 0,
        "is_paid": True,  # Free posting - mark as paid
        "auto_topup": True,  # Auto-topup enabled by default for all categories
        "topup_rank": now.timestamp() if initial_status == "active" else 0,
        "last_topup": now.isoformat() if initial_status == "active" else None,
        "ai_verification": ai_result,  # Store AI verification result
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.ads.insert_one(ad_doc)
    
    # Get category and city names for admin notification
    cat = next((c for c in CATEGORIES if c["id"] == category_id), None)
    category_name = cat["name"] if cat else category_id
    city = next((c for c in ROMANIAN_CITIES if c["id"] == body.get("city_id")), None)
    city_name = city["name"] if city else body.get("city_id")
    price_str = f"{body.get('price')} €" if body.get('price') else "Preț la cerere"
    
    # Send notification to admin about new ad
    asyncio.create_task(send_email_notification(
        "contact@x67digital.com",
        "admin_new_ad",
        {
            "ad_title": body.get("title"),
            "category_name": category_name,
            "ad_price": price_str,
            "city_name": city_name,
            "user_name": user.get("name", "User"),
            "user_email": user.get("email", "-"),
            "status": initial_status,
            "site_url": "https://x67digital.com"
        }
    ))
    
    if is_escort_category:
        return {"ad_id": ad_id, "status": "pending", "message": "Anunțul a fost creat și așteaptă aprobarea administratorului."}
    else:
        return {"ad_id": ad_id, "status": "active", "message": "Anunțul a fost publicat cu succes!"}

@api_router.get("/ads")
async def get_ads(
    category_id: Optional[str] = None,
    subcategory_id: Optional[str] = None,
    city_id: Optional[str] = None,
    judet_code: Optional[str] = None,
    localitate: Optional[str] = None,
    has_location: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 20
):
    query = {"status": "active"}
    
    if category_id and category_id != "all":
        query["category_id"] = category_id
    if subcategory_id:
        query["subcategory_id"] = subcategory_id
    if city_id:
        query["city_id"] = city_id
    if judet_code and judet_code != "all":
        query["judet_code"] = judet_code
    if localitate:
        query["localitate"] = localitate
    if has_location == "true":
        query["location_lat"] = {"$exists": True, "$ne": None}
        query["location_lng"] = {"$exists": True, "$ne": None}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if min_price is not None:
        query["price"] = query.get("price", {})
        query["price"]["$gte"] = min_price
    if max_price is not None:
        query["price"] = query.get("price", {})
        query["price"]["$lte"] = max_price
    
    # Sort options - topup_rank takes priority (most recent topup first)
    sort_options = {
        "newest": [("topup_rank", -1), ("created_at", -1)],
        "oldest": [("created_at", 1)],
        "price_low": [("topup_rank", -1), ("price", 1)],
        "price_high": [("topup_rank", -1), ("price", -1)],
        "boosted": [("topup_rank", -1), ("is_boosted", -1), ("boost_expires_at", -1), ("created_at", -1)]
    }
    
    sort_by = sort_options.get(sort, sort_options["newest"])
    
    # For escort category, show by topup_rank first
    if category_id == "escorts":
        sort_by = [("topup_rank", -1), ("is_boosted", -1)] + [s for s in sort_by if s[0] not in ["topup_rank", "is_boosted"]]
    
    skip = (page - 1) * limit
    
    ads = await db.ads.find(query, {"_id": 0}).sort(sort_by).skip(skip).limit(limit).to_list(limit)
    total = await db.ads.count_documents(query)
    
    # Enrich with category and city names, and seller rating
    user_ids = list(set(ad.get("user_id") for ad in ads if ad.get("user_id")))
    users_with_rating = {}
    if user_ids:
        users_cursor = db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "avg_rating": 1, "total_reviews": 1, "badges": 1}
        )
        async for u in users_cursor:
            users_with_rating[u["user_id"]] = u
    
    for ad in ads:
        cat = next((c for c in CATEGORIES if c["id"] == ad.get("category_id")), None)
        if cat:
            ad["category_name"] = cat["name"]
            ad["category_color"] = cat["color"]
            if ad.get("subcategory_id"):
                subcat = next((s for s in cat.get("subcategories", []) if s["id"] == ad["subcategory_id"]), None)
                if subcat:
                    ad["subcategory_name"] = subcat["name"]
        
        city = next((c for c in ROMANIAN_CITIES if c["id"] == ad.get("city_id")), None)
        if city:
            ad["city_name"] = city["name"]
        
        # Add seller rating and badges
        seller_info = users_with_rating.get(ad.get("user_id"))
        if seller_info:
            ad["user_rating"] = seller_info.get("avg_rating")
            ad["user_reviews"] = seller_info.get("total_reviews")
            ad["user_badges"] = seller_info.get("badges", [])
    
    return {
        "ads": ads,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/ads/promoted")
async def get_promoted_ads(limit: int = 10):
    """Get promoted ads for homepage"""
    query = {"status": "active", "is_promoted": True}
    ads = await db.ads.find(query, {"_id": 0}).sort([("promote_expires_at", -1)]).limit(limit).to_list(limit)
    
    # Enrich with category info
    for ad in ads:
        cat = next((c for c in CATEGORIES if c["id"] == ad.get("category_id")), None)
        if cat:
            ad["category_name"] = cat["name"]
            ad["category_color"] = cat["color"]
        city = next((c for c in ROMANIAN_CITIES if c["id"] == ad.get("city_id")), None)
        if city:
            ad["city_name"] = city["name"]
    
    return ads

# View milestones for notifications
VIEW_MILESTONES = [100, 500, 1000, 5000, 10000]

@api_router.get("/ads/{ad_id}")
async def get_ad(ad_id: str, request: Request):
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Get visitor IP for unique view tracking
    client_ip = request.client.host if request.client else None
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Check if this IP already viewed this ad today
    should_increment_views = False
    if client_ip:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        existing_view = await db.ad_views.find_one({
            "ad_id": ad_id,
            "ip": client_ip,
            "date": {"$gte": today_start.isoformat()}
        })
        
        if not existing_view:
            # New unique view - log it
            await db.ad_views.insert_one({
                "ad_id": ad_id,
                "ip": client_ip,
                "date": datetime.now(timezone.utc).isoformat()
            })
            should_increment_views = True
    
    # Get current views before increment
    old_views = ad.get("views", 0)
    
    # Only increment if unique view
    if should_increment_views:
        new_views = old_views + 1
        await db.ads.update_one({"ad_id": ad_id}, {"$inc": {"views": 1}})
        
        # Check for milestone notifications
        for milestone in VIEW_MILESTONES:
            if old_views < milestone <= new_views:
                # Get ad owner for notification
                owner = await db.users.find_one({"user_id": ad.get("user_id")}, {"_id": 0, "password_hash": 0})
                if owner and owner.get("email"):
                    asyncio.create_task(send_email_notification(
                        owner["email"],
                        "views_milestone",
                        {
                            "user_name": owner.get("name", "User"),
                            "ad_title": ad.get("title", "Anunț"),
                            "ad_id": ad_id,
                            "milestone": milestone,
                            "site_url": "https://x67digital.com"
                        }
                    ))
                    logger.info(f"Views milestone notification sent for ad {ad_id}: {milestone} views")
                break
    
    # Enrich with category and city
    cat = next((c for c in CATEGORIES if c["id"] == ad.get("category_id")), None)
    if cat:
        ad["category_name"] = cat["name"]
        ad["category_color"] = cat["color"]
        if ad.get("subcategory_id"):
            subcat = next((s for s in cat.get("subcategories", []) if s["id"] == ad["subcategory_id"]), None)
            if subcat:
                ad["subcategory_name"] = subcat["name"]
    
    city = next((c for c in ROMANIAN_CITIES if c["id"] == ad.get("city_id")), None)
    if city:
        ad["city_name"] = city["name"]
        ad["city_county"] = city["county"]
    
    # Get user info
    user = await db.users.find_one({"user_id": ad.get("user_id")}, {"_id": 0, "password_hash": 0})
    if user:
        ad["user_name"] = user.get("name")
        ad["user_picture"] = user.get("picture")
        ad["user_rating"] = user.get("avg_rating")
        ad["user_reviews"] = user.get("total_reviews")
    
    return ad

@api_router.put("/ads/{ad_id}")
async def update_ad(ad_id: str, request: Request):
    user = await require_auth(request)
    body = await request.json()
    
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if ad["user_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_fields = {}
    for field in ["title", "description", "price", "price_type", "contact_phone", "contact_email", "details", "images"]:
        if field in body:
            update_fields[field] = body[field]
    
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.ads.update_one({"ad_id": ad_id}, {"$set": update_fields})
    return {"message": "Ad updated"}

@api_router.delete("/ads/{ad_id}")
async def delete_ad(ad_id: str, request: Request):
    user = await require_auth(request)
    
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if ad["user_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.ads.delete_one({"ad_id": ad_id})
    return {"message": "Ad deleted"}

@api_router.get("/my-ads")
async def get_my_ads(request: Request, page: int = 1, limit: int = 20):
    user = await require_auth(request)
    
    query = {"user_id": user["user_id"]}
    skip = (page - 1) * limit
    
    ads = await db.ads.find(query, {"_id": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.ads.count_documents(query)
    
    return {
        "ads": ads,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

# ===================== PAYMENTS =====================

PAYMENT_AMOUNTS = {
    "post_ad": 0,           # GRATUIT - publicare anunț
    "boost": 1000,          # 10.00 RON for boost/topup (ridicare anunț escorte)
    "top_category": 1500,   # 15.00 RON/săptămână - TOP în categorie
    "homepage": 4000,       # 40.00 RON/săptămână - Featured pe homepage
    "premium_monthly": 9900 # 99.00 RON/lună - Abonament Vânzător Pro
}

# Premium subscription benefits
PREMIUM_BENEFITS = {
    "unlimited_ads": True,
    "priority_support": True,
    "advanced_stats": True,
    "no_waiting_topup": True,
    "verified_badge": True,
    "featured_profile": True
}

@api_router.post("/payments/create-order")
async def create_payment_order(request: Request):
    user = await require_auth(request)
    body = await request.json()
    
    ad_id = body.get("ad_id")
    payment_type = body.get("payment_type")  # post_ad, boost, promote
    
    if payment_type not in PAYMENT_AMOUNTS:
        raise HTTPException(status_code=400, detail="Invalid payment type")
    
    amount = PAYMENT_AMOUNTS[payment_type]
    
    # Get Viva access token
    try:
        access_token = await get_viva_access_token()
    except Exception as e:
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

@api_router.get("/payments/webhook")
async def payment_webhook_verify(request: Request):
    """Viva Wallet webhook URL verification"""
    # Return the verification key obtained from Viva API
    return {"Key": "475FFE73819D67134BBB2D6690A9023714C14E2E"}

@api_router.post("/payments/webhook")
async def payment_webhook(request: Request):
    """Handle Viva payment webhooks and verification"""
    body = await request.json()
    
    # Viva Wallet verification - they send {"Key": "xxx"} and expect the key back as JSON
    if "Key" in body and "EventData" not in body:
        verification_key = body.get("Key", "")
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
    
    logger.info(f"Payment webhook: order={order_code}, status={status_id}, type={payment_type}")
    
    if status_id == "F":  # Finished/Successful
        # Update payment record
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
                {"$set": {"is_paid": True, "status": "pending"}}  # pending for admin approval
            )
        elif payment_type == "boost":
            # For escorts TopUp paid - update topup_rank to push to top
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
            # TOP în categorie - 7 zile
            now = datetime.now(timezone.utc)
            await db.ads.update_one(
                {"ad_id": ad_id},
                {"$set": {
                    "is_boosted": True,
                    "boost_expires_at": (now + timedelta(days=7)).isoformat(),
                    "topup_rank": now.timestamp() + 1000000,  # Higher priority
                    "last_topup": now.isoformat(),
                    "boost_type": "top_category"
                }}
            )
        elif payment_type == "homepage":
            # Featured pe homepage - 7 zile
            await db.ads.update_one(
                {"ad_id": ad_id},
                {"$set": {
                    "is_promoted": True,
                    "promote_expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
                    "promote_type": "homepage"
                }}
            )
        elif payment_type == "premium_monthly":
            # Abonament Vânzător Pro - 30 zile
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
                # Add premium badge
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$addToSet": {"badges": "premium_seller"}}
                )
        
        # Send payment confirmation email
        if payment and ad_id:
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

@api_router.get("/payments/verify/{order_code}")
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

# ===================== PREMIUM SUBSCRIPTIONS =====================

@api_router.get("/premium/status")
async def get_premium_status(request: Request):
    """Get user's premium subscription status"""
    user = await require_auth(request)
    
    is_premium = user.get("is_premium", False)
    expires_at = user.get("premium_expires_at")
    
    # Check if expired
    if is_premium and expires_at:
        exp_date = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
        if exp_date < datetime.now(timezone.utc):
            is_premium = False
            # Update user
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {"is_premium": False}}
            )
    
    return {
        "is_premium": is_premium,
        "expires_at": expires_at if is_premium else None,
        "benefits": PREMIUM_BENEFITS if is_premium else {},
        "price": PAYMENT_AMOUNTS["premium_monthly"] / 100,
        "currency": "RON"
    }

@api_router.get("/premium/plans")
async def get_premium_plans():
    """Get available premium plans"""
    return {
        "plans": [
            {
                "id": "premium_monthly",
                "name": "Vânzător Pro",
                "price": 99,
                "currency": "RON",
                "period": "lună",
                "benefits": [
                    "Anunțuri nelimitate",
                    "Statistici avansate",
                    "Suport prioritar",
                    "TopUp fără așteptare",
                    "Badge Verificat",
                    "Profil evidențiat"
                ]
            }
        ]
    }

@api_router.post("/premium/subscribe")
async def subscribe_premium(request: Request):
    """Create premium subscription payment"""
    user = await require_auth(request)
    
    amount = PAYMENT_AMOUNTS["premium_monthly"]
    
    try:
        access_token = await get_viva_access_token()
    except Exception as e:
        logger.error(f"Viva token error: {e}")
        raise HTTPException(status_code=502, detail="Payment service unavailable")
    
    order_payload = {
        "amount": amount,
        "customerTrns": f"X67 - Abonament Vânzător Pro",
        "customer": {
            "email": user["email"],
            "fullName": user["name"],
            "requestLang": "ro"
        },
        "sourceCode": VIVA_SOURCE_CODE,
        "merchantTrns": json.dumps({
            "payment_type": "premium_monthly",
            "user_id": user["user_id"]
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
            logger.error(f"Viva order error: {response.text}")
            raise HTTPException(status_code=502, detail="Failed to create payment order")
        
        data = response.json()
    
    order_code = data.get("orderCode")
    
    payment_doc = {
        "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
        "order_code": order_code,
        "user_id": user["user_id"],
        "payment_type": "premium_monthly",
        "amount": amount,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    return {
        "order_code": order_code,
        "checkout_url": f"{VIVA_CHECKOUT_BASE}/web/checkout?ref={order_code}&lang=ro",
        "amount": amount / 100
    }

# ===================== PROMOTION SYSTEM =====================

@api_router.get("/promotions/options")
async def get_promotion_options():
    """Get available promotion options"""
    return {
        "options": [
            {
                "id": "top_category",
                "name": "TOP în Categorie",
                "description": "Anunțul tău apare primul în categorie timp de 7 zile",
                "price": 15,
                "currency": "RON",
                "duration_days": 7,
                "badge": "TOP"
            },
            {
                "id": "homepage",
                "name": "Featured pe Homepage",
                "description": "Anunțul tău apare pe pagina principală timp de 7 zile",
                "price": 40,
                "currency": "RON",
                "duration_days": 7,
                "badge": "PROMOVAT"
            }
        ]
    }

@api_router.post("/promotions/purchase")
async def purchase_promotion(request: Request):
    """Purchase a promotion for an ad"""
    user = await require_auth(request)
    body = await request.json()
    
    ad_id = body.get("ad_id")
    promotion_type = body.get("promotion_type")  # top_category or homepage
    
    if promotion_type not in ["top_category", "homepage"]:
        raise HTTPException(status_code=400, detail="Invalid promotion type")
    
    # Verify ad belongs to user
    ad = await db.ads.find_one({"ad_id": ad_id, "user_id": user["user_id"]}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found or not owned by you")
    
    amount = PAYMENT_AMOUNTS[promotion_type]
    
    try:
        access_token = await get_viva_access_token()
    except Exception as e:
        logger.error(f"Viva token error: {e}")
        raise HTTPException(status_code=502, detail="Payment service unavailable")
    
    promo_name = "TOP în Categorie" if promotion_type == "top_category" else "Featured pe Homepage"
    
    order_payload = {
        "amount": amount,
        "customerTrns": f"X67 - {promo_name} - {ad.get('title', '')[:30]}",
        "customer": {
            "email": user["email"],
            "fullName": user["name"],
            "requestLang": "ro"
        },
        "sourceCode": VIVA_SOURCE_CODE,
        "merchantTrns": json.dumps({
            "ad_id": ad_id,
            "payment_type": promotion_type,
            "user_id": user["user_id"]
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
            logger.error(f"Viva order error: {response.text}")
            raise HTTPException(status_code=502, detail="Failed to create payment order")
        
        data = response.json()
    
    order_code = data.get("orderCode")
    
    payment_doc = {
        "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
        "order_code": order_code,
        "ad_id": ad_id,
        "user_id": user["user_id"],
        "payment_type": promotion_type,
        "amount": amount,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    return {
        "order_code": order_code,
        "checkout_url": f"{VIVA_CHECKOUT_BASE}/web/checkout?ref={order_code}&lang=ro",
        "amount": amount / 100,
        "promotion_type": promotion_type
    }

# ===================== IMAGE UPLOAD =====================

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Allowed file types
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]
MAX_VIDEO_DURATION = 30  # seconds for ads
MAX_AD_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

@api_router.post("/upload")
async def upload_image(request: Request, file: UploadFile = File(...)):
    await require_auth(request)
    
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPG, PNG, WebP, GIF")
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 10MB)
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max: 10MB")
    
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            content,
            folder="x67digital/ads",
            resource_type="image",
            transformation=[
                {"quality": "auto:good"},
                {"fetch_format": "auto"}
            ]
        )
        
        # Return Cloudinary URL
        return {
            "url": result["secure_url"],
            "filename": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height")
        }
    except Exception as e:
        logger.error(f"Cloudinary upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error uploading image")

@api_router.post("/upload/video")
async def upload_ad_video(request: Request, file: UploadFile = File(...)):
    """Upload video for ads (max 30 seconds, 50MB)"""
    await require_auth(request)
    
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: MP4, WebM, MOV")
    
    content = await file.read()
    
    if len(content) > MAX_AD_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="Video too large. Max: 50MB")
    
    try:
        # Upload to Cloudinary with video processing
        result = cloudinary.uploader.upload(
            content,
            folder="x67digital/videos",
            resource_type="video",
            eager=[
                {"width": 720, "crop": "scale", "quality": "auto"},
                {"format": "mp4"}
            ],
            eager_async=True
        )
        
        # Get video duration
        duration = result.get("duration", 0)
        if duration > MAX_VIDEO_DURATION:
            # Delete the uploaded video
            cloudinary.uploader.destroy(result["public_id"], resource_type="video")
            raise HTTPException(status_code=400, detail=f"Video too long. Max: {MAX_VIDEO_DURATION} seconds")
        
        return {
            "url": result["secure_url"],
            "filename": result["public_id"],
            "duration": duration,
            "width": result.get("width"),
            "height": result.get("height"),
            "is_video": True
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Cloudinary video upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error uploading video")

@api_router.post("/upload/banner")
async def upload_banner_media(request: Request, file: UploadFile = File(...)):
    """Upload image or video for banners (admin only)"""
    await require_admin(request)
    
    all_allowed = ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES
    if file.content_type not in all_allowed:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: JPG, PNG, WebP, GIF, MP4, WebM")
    
    # Determine file type
    is_video = file.content_type in ALLOWED_VIDEO_TYPES
    
    # Read file content
    content = await file.read()
    
    # Check file size (max 50MB for videos, 10MB for images)
    max_size = 50 * 1024 * 1024 if is_video else 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max: {max_size // (1024*1024)}MB")
    
    try:
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            content,
            folder="x67digital/banners",
            resource_type="video" if is_video else "image",
            transformation=[
                {"quality": "auto:good"},
                {"fetch_format": "auto"}
            ] if not is_video else []
        )
        
        return {
            "url": result["secure_url"],
            "filename": result["public_id"],
            "is_video": is_video,
            "content_type": file.content_type
        }
    except Exception as e:
        logger.error(f"Cloudinary banner upload error: {str(e)}")
        raise HTTPException(status_code=500, detail="Error uploading banner")

# ===================== TOPUP / BOOST SYSTEM =====================

# Referral tracking
@api_router.post("/referral/track")
async def track_referral(request: Request):
    """Track referral when someone visits with ref code"""
    body = await request.json()
    ref_code = body.get("ref_code")
    
    if not ref_code:
        return {"tracked": False}
    
    # Find user with this referral code
    referrer = await db.users.find_one({"referral_code": ref_code}, {"_id": 0})
    if referrer:
        # Increment referral count
        await db.users.update_one(
            {"referral_code": ref_code},
            {"$inc": {"referral_count": 1}}
        )
        return {"tracked": True, "referrer_id": referrer["user_id"]}
    
    return {"tracked": False}

@api_router.get("/user/referral-code")
async def get_user_referral_code(request: Request):
    """Get or generate user's referral code"""
    user = await require_auth(request)
    
    # Check if user has a referral code
    if not user.get("referral_code"):
        ref_code = f"ref_{user['user_id'][-8:]}"
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"referral_code": ref_code, "referral_count": 0}}
        )
        return {"referral_code": ref_code, "referral_count": 0}
    
    return {
        "referral_code": user.get("referral_code"),
        "referral_count": user.get("referral_count", 0)
    }

@api_router.post("/ads/{ad_id}/topup")
async def topup_ad(ad_id: str, request: Request):
    """TopUp an ad to appear at the top of its category - FREE for non-escorts, PAID for escorts"""
    user = await require_auth(request)
    
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if ad["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your ad")
    if ad["status"] != "active":
        raise HTTPException(status_code=400, detail="Ad must be active to topup")
    
    # For ESCORTS category - require payment (10 RON)
    if ad.get("category_id") == "escorts":
        raise HTTPException(
            status_code=402, 
            detail="Pentru categoria Escorte, Top-Up costă 10 RON. Folosește plata cu cardul."
        )
    
    # For other categories - FREE with cooldown
    last_topup = ad.get("last_topup")
    if last_topup:
        last_topup_time = datetime.fromisoformat(last_topup) if isinstance(last_topup, str) else last_topup
        if last_topup_time.tzinfo is None:
            last_topup_time = last_topup_time.replace(tzinfo=timezone.utc)
        
        # Check if user has referrals (40 min cooldown) or not (60 min cooldown)
        referral_count = user.get("referral_count", 0)
        cooldown_minutes = 40 if referral_count > 0 else 60
        
        time_since_topup = (datetime.now(timezone.utc) - last_topup_time).total_seconds() / 60
        if time_since_topup < cooldown_minutes:
            remaining = int(cooldown_minutes - time_since_topup)
            raise HTTPException(
                status_code=400, 
                detail=f"Poți face TopUp din nou în {remaining} minute"
            )
    
    # Perform topup
    now = datetime.now(timezone.utc)
    await db.ads.update_one(
        {"ad_id": ad_id},
        {"$set": {
            "last_topup": now.isoformat(),
            "topup_rank": now.timestamp()  # Higher = more recent = appears first
        }}
    )
    
    return {"message": "TopUp successful", "next_topup_available_in": 40 if user.get("referral_count", 0) > 0 else 60}

@api_router.post("/ads/{ad_id}/auto-topup")
async def toggle_auto_topup(ad_id: str, request: Request):
    """Enable/disable auto-topup for an ad"""
    user = await require_auth(request)
    body = await request.json()
    
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if ad["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your ad")
    
    enabled = body.get("enabled", True)
    
    await db.ads.update_one(
        {"ad_id": ad_id},
        {"$set": {"auto_topup": enabled}}
    )
    
    return {"message": f"Auto-topup {'enabled' if enabled else 'disabled'}", "auto_topup": enabled}

@api_router.post("/ads/{ad_id}/topup-paid")
async def topup_ad_paid(ad_id: str, request: Request):
    """Paid TopUp for ESCORTS category - 10 RON via Viva Wallet, unlimited per day"""
    user = await require_auth(request)
    
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    if ad["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your ad")
    if ad["status"] != "active":
        raise HTTPException(status_code=400, detail="Ad must be active to topup")
    
    # Only for escorts category
    if ad.get("category_id") != "escorts":
        raise HTTPException(status_code=400, detail="Top-Up plătit este doar pentru categoria Escorte")
    
    # Create Viva Wallet payment order
    try:
        viva_client_id = os.environ.get("VIVA_CLIENT_ID")
        viva_client_secret = os.environ.get("VIVA_CLIENT_SECRET")
        viva_source_code = os.environ.get("VIVA_SOURCE_CODE", "9750")
        
        # Get access token
        auth_url = "https://accounts.vivapayments.com/connect/token"
        auth_response = requests.post(
            auth_url,
            data={
                "grant_type": "client_credentials",
                "client_id": viva_client_id,
                "client_secret": viva_client_secret
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if auth_response.status_code != 200:
            logger.error(f"Viva auth error: {auth_response.text}")
            raise HTTPException(status_code=500, detail="Eroare autentificare plată")
        
        access_token = auth_response.json().get("access_token")
        
        # Create payment order - 10 RON = 1000 bani
        order_url = "https://api.vivapayments.com/checkout/v2/orders"
        order_response = requests.post(
            order_url,
            json={
                "amount": 1000,  # 10.00 RON in bani (cents)
                "customerTrns": f"Top-Up anunț escorte: {ad.get('title', ad_id)[:50]}",
                "customer": {
                    "email": user.get("email"),
                    "fullName": user.get("name", "Client")
                },
                "paymentTimeout": 1800,
                "preauth": False,
                "allowRecurring": False,
                "sourceCode": viva_source_code,
                "merchantTrns": f"topup|{ad_id}|{user['user_id']}"
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
        )
        
        if order_response.status_code != 200:
            logger.error(f"Viva order error: {order_response.text}")
            raise HTTPException(status_code=500, detail="Eroare creare comandă plată")
        
        order_code = order_response.json().get("orderCode")
        
        # Store pending payment
        await db.payments.insert_one({
            "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
            "order_code": order_code,
            "user_id": user["user_id"],
            "ad_id": ad_id,
            "payment_type": "boost",
            "amount": 1000,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Return checkout URL
        checkout_url = f"https://www.vivapayments.com/web/checkout?ref={order_code}"
        
        return {
            "order_code": order_code,
            "checkout_url": checkout_url,
            "amount": 10.00,
            "currency": "RON"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TopUp payment error: {str(e)}")
        raise HTTPException(status_code=500, detail="Eroare la procesarea plății")

# ===================== BANNERS / ADS SYSTEM =====================

@api_router.get("/banners")
async def get_banners(position: str = "homepage"):
    query = {"is_active": True, "position": position}
    banners = await db.banners.find(query, {"_id": 0}).sort([("order", 1)]).to_list(100)
    return banners

@api_router.post("/admin/banners")
async def create_banner(request: Request):
    await require_admin(request)
    body = await request.json()
    
    banner_id = f"banner_{uuid.uuid4().hex[:12]}"
    banner_doc = {
        "banner_id": banner_id,
        "title": body.get("title"),
        "media_url": body.get("media_url"),  # Can be image or video
        "media_type": body.get("media_type", "image"),  # "image" or "video"
        "image_url": body.get("media_url"),  # Backwards compatibility
        "link_url": body.get("link_url"),
        "position": body.get("position", "homepage"),
        "is_active": body.get("is_active", True),
        "order": body.get("order", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.banners.insert_one(banner_doc)
    return {"banner_id": banner_id}

@api_router.put("/admin/banners/{banner_id}")
async def update_banner(banner_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    
    update_fields = {}
    for field in ["title", "media_url", "media_type", "link_url", "position", "is_active", "order"]:
        if field in body:
            update_fields[field] = body[field]
    
    # Keep image_url in sync with media_url for backwards compatibility
    if "media_url" in update_fields:
        update_fields["image_url"] = update_fields["media_url"]
    
    await db.banners.update_one({"banner_id": banner_id}, {"$set": update_fields})
    return {"message": "Banner updated"}

@api_router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, request: Request):
    await require_admin(request)
    await db.banners.delete_one({"banner_id": banner_id})
    return {"message": "Banner deleted"}

# ===================== ADMIN ENDPOINTS =====================

@api_router.get("/admin/users")
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

@api_router.put("/admin/users/{user_id}")
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

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request):
    admin = await require_admin(request)
    
    # Prevent self-deletion
    if admin["user_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Delete user's ads
    await db.ads.delete_many({"user_id": user_id})
    # Delete user's sessions
    await db.user_sessions.delete_many({"user_id": user_id})
    # Delete user
    await db.users.delete_one({"user_id": user_id})
    
    return {"message": "User and all associated data deleted"}

@api_router.put("/admin/users/{user_id}/password")
async def admin_change_user_password(user_id: str, request: Request):
    """Admin endpoint to change a user's password"""
    await require_admin(request)
    body = await request.json()
    
    new_password = body.get("new_password")
    if not new_password or len(new_password) < 5:
        raise HTTPException(status_code=400, detail="Parola trebuie să aibă cel puțin 5 caractere")
    
    # Check if user exists
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizatorul nu a fost găsit")
    
    # Check if user registered with Google (no password)
    if user.get("password_hash") is None:
        raise HTTPException(status_code=400, detail="Acest utilizator s-a înregistrat cu Google și nu are parolă")
    
    # Update password
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    
    # Invalidate all sessions for this user
    await db.user_sessions.delete_many({"user_id": user_id})
    
    logger.info(f"Admin changed password for user {user_id}")
    return {"message": "Parola a fost schimbată cu succes"}

@api_router.get("/users/{user_id}/public")
async def get_public_user_info(user_id: str):
    """Get public user information (name, picture) for chat"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "picture": 1, "user_id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ===================== ADMIN ANALYTICS & EXPORT =====================

@api_router.get("/admin/analytics/dashboard")
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
    
    # Daily new ads (last 30 days)
    daily_ads = []
    for i in range(30):
        day = now - timedelta(days=29-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await db.ads.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        daily_ads.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count
        })
    
    # Daily new users (last 30 days)
    daily_users = []
    for i in range(30):
        day = now - timedelta(days=29-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await db.users.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        daily_users.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count
        })
    
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
            "users": {
                "today": new_users_today,
                "week": new_users_week,
                "month": new_users_month
            },
            "ads": {
                "today": new_ads_today,
                "week": new_ads_week,
                "month": new_ads_month
            }
        },
        "trends": {
            "daily_ads": daily_ads,
            "daily_users": daily_users
        },
        "distribution": {
            "categories": category_distribution,
            "cities": city_distribution
        },
        "top_ads": top_ads
    }

@api_router.get("/admin/export/users")
async def admin_export_users(request: Request):
    """Export all users as CSV"""
    await require_admin(request)
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(None)
    
    # Build CSV
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

@api_router.get("/admin/export/ads")
async def admin_export_ads(request: Request, status: Optional[str] = None):
    """Export ads as CSV"""
    await require_admin(request)
    
    query = {}
    if status:
        query["status"] = status
    
    ads = await db.ads.find(query, {"_id": 0}).to_list(None)
    
    # Build CSV
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

@api_router.get("/admin/ads")
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

@api_router.put("/admin/ads/{ad_id}/status")
async def admin_update_ad_status(ad_id: str, request: Request):
    await require_admin(request)
    body = await request.json()
    
    new_status = body.get("status")
    if new_status not in ["pending", "active", "rejected", "expired"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Get ad and user info for email
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if ad:
        user = await db.users.find_one({"user_id": ad.get("user_id")}, {"_id": 0})
        
        # Send notification email based on status
        if user and user.get("email"):
            price_str = f"{ad.get('price')} €" if ad.get('price') else "Preț la cerere"
            email_data = {
                "user_name": user.get("name", "User"),
                "ad_title": ad.get("title", "Anunț"),
                "ad_price": price_str,
                "ad_id": ad_id,
                "site_url": "https://x67digital.com"
            }
            
            if new_status == "active":
                asyncio.create_task(send_email_notification(
                    user["email"],
                    "ad_approved",
                    email_data
                ))
            elif new_status == "rejected":
                asyncio.create_task(send_email_notification(
                    user["email"],
                    "ad_rejected",
                    email_data
                ))
    
    await db.ads.update_one(
        {"ad_id": ad_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Ad status updated to {new_status}"}

@api_router.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request)
    
    total_users = await db.users.count_documents({})
    total_ads = await db.ads.count_documents({})
    pending_ads = await db.ads.count_documents({"status": "pending"})
    active_ads = await db.ads.count_documents({"status": "active"})
    total_payments = await db.payments.count_documents({"status": "completed"})
    
    # Revenue calculation
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

# ===================== FAVORITES SYSTEM =====================

@api_router.post("/favorites/{ad_id}")
async def add_favorite(ad_id: str, request: Request):
    """Add an ad to user's favorites"""
    user = await require_auth(request)
    
    # Check if ad exists
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Check if already favorited
    existing = await db.favorites.find_one({"user_id": user["user_id"], "ad_id": ad_id})
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")
    
    favorite_doc = {
        "favorite_id": f"fav_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "ad_id": ad_id,
        "ad_price": ad.get("price"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.favorites.insert_one(favorite_doc)
    
    # Increment ad's favorite count
    await db.ads.update_one({"ad_id": ad_id}, {"$inc": {"favorites_count": 1}})
    
    return {"message": "Added to favorites", "favorite_id": favorite_doc["favorite_id"]}

@api_router.delete("/favorites/{ad_id}")
async def remove_favorite(ad_id: str, request: Request):
    """Remove an ad from user's favorites"""
    user = await require_auth(request)
    
    result = await db.favorites.delete_one({"user_id": user["user_id"], "ad_id": ad_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Favorite not found")
    
    # Decrement ad's favorite count
    await db.ads.update_one({"ad_id": ad_id}, {"$inc": {"favorites_count": -1}})
    
    return {"message": "Removed from favorites"}

@api_router.get("/favorites")
async def get_favorites(request: Request, page: int = 1, limit: int = 20):
    """Get user's favorite ads"""
    user = await require_auth(request)
    
    skip = (page - 1) * limit
    favorites = await db.favorites.find(
        {"user_id": user["user_id"]}, 
        {"_id": 0}
    ).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    
    # Get ad details for each favorite
    result = []
    for fav in favorites:
        ad = await db.ads.find_one({"ad_id": fav["ad_id"]}, {"_id": 0})
        if ad:
            # Check if price dropped
            price_dropped = fav.get("ad_price") and ad.get("price") and ad["price"] < fav["ad_price"]
            result.append({
                **ad,
                "favorited_at": fav["created_at"],
                "original_price": fav.get("ad_price"),
                "price_dropped": price_dropped
            })
    
    total = await db.favorites.count_documents({"user_id": user["user_id"]})

# ===================== SAVED SEARCHES / PRICE ALERTS =====================

class SavedSearchCreate(BaseModel):
    name: str
    category_id: Optional[str] = None
    subcategory_id: Optional[str] = None
    city_id: Optional[str] = None
    search_query: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    alert_frequency: str = "daily"  # daily, weekly, instant

@api_router.post("/saved-searches")
async def create_saved_search(data: SavedSearchCreate, request: Request):
    """Create a saved search with email alerts"""
    user = await require_auth(request)
    
    # Check limit (max 10 saved searches per user)
    count = await db.saved_searches.count_documents({"user_id": user["user_id"]})
    if count >= 10:
        raise HTTPException(status_code=400, detail="Ai atins limita de 10 căutări salvate")
    
    search_id = f"search_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    search_doc = {
        "search_id": search_id,
        "user_id": user["user_id"],
        "name": data.name,
        "category_id": data.category_id,
        "subcategory_id": data.subcategory_id,
        "city_id": data.city_id,
        "search_query": data.search_query,
        "min_price": data.min_price,
        "max_price": data.max_price,
        "alert_frequency": data.alert_frequency,
        "is_active": True,
        "last_checked": now,
        "last_notified": None,
        "new_ads_count": 0,
        "created_at": now
    }
    
    await db.saved_searches.insert_one(search_doc)
    
    return {"search_id": search_id, "message": "Căutarea a fost salvată cu succes!"}

@api_router.get("/saved-searches")
async def get_saved_searches(request: Request):
    """Get user's saved searches"""
    user = await require_auth(request)
    
    searches = await db.saved_searches.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(100)
    
    # Count new ads for each search
    for search in searches:
        query = {"status": "active"}
        if search.get("category_id"):
            query["category_id"] = search["category_id"]
        if search.get("subcategory_id"):
            query["subcategory_id"] = search["subcategory_id"]
        if search.get("city_id"):
            query["city_id"] = search["city_id"]
        if search.get("min_price"):
            query["price"] = {"$gte": search["min_price"]}
        if search.get("max_price"):
            if "price" in query:
                query["price"]["$lte"] = search["max_price"]
            else:
                query["price"] = {"$lte": search["max_price"]}
        if search.get("search_query"):
            query["$or"] = [
                {"title": {"$regex": search["search_query"], "$options": "i"}},
                {"description": {"$regex": search["search_query"], "$options": "i"}}
            ]
        
        # Count ads newer than last_checked
        if search.get("last_checked"):
            query["created_at"] = {"$gt": search["last_checked"]}
        
        new_count = await db.ads.count_documents(query)
        search["new_ads_count"] = new_count
    
    return {"saved_searches": searches}

@api_router.get("/saved-searches/{search_id}/results")
async def get_saved_search_results(search_id: str, request: Request, page: int = 1, limit: int = 20):
    """Get ads matching a saved search"""
    user = await require_auth(request)
    
    search = await db.saved_searches.find_one(
        {"search_id": search_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    # Build query
    query = {"status": "active"}
    if search.get("category_id"):
        query["category_id"] = search["category_id"]
    if search.get("subcategory_id"):
        query["subcategory_id"] = search["subcategory_id"]
    if search.get("city_id"):
        query["city_id"] = search["city_id"]
    if search.get("min_price"):
        query["price"] = {"$gte": search["min_price"]}
    if search.get("max_price"):
        if "price" in query:
            query["price"]["$lte"] = search["max_price"]
        else:
            query["price"] = {"$lte": search["max_price"]}
    if search.get("search_query"):
        query["$or"] = [
            {"title": {"$regex": search["search_query"], "$options": "i"}},
            {"description": {"$regex": search["search_query"], "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    ads = await db.ads.find(query, {"_id": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.ads.count_documents(query)
    
    # Update last_checked
    await db.saved_searches.update_one(
        {"search_id": search_id},
        {"$set": {"last_checked": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"ads": ads, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/saved-searches/{search_id}")
async def update_saved_search(search_id: str, request: Request):
    """Update a saved search"""
    user = await require_auth(request)
    body = await request.json()
    
    search = await db.saved_searches.find_one({"search_id": search_id, "user_id": user["user_id"]})
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    update_data = {}
    if "name" in body:
        update_data["name"] = body["name"]
    if "alert_frequency" in body:
        update_data["alert_frequency"] = body["alert_frequency"]
    if "is_active" in body:
        update_data["is_active"] = body["is_active"]
    
    if update_data:
        await db.saved_searches.update_one({"search_id": search_id}, {"$set": update_data})
    
    return {"message": "Căutarea a fost actualizată"}

@api_router.delete("/saved-searches/{search_id}")
async def delete_saved_search(search_id: str, request: Request):
    """Delete a saved search"""
    user = await require_auth(request)
    
    result = await db.saved_searches.delete_one({"search_id": search_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Saved search not found")
    
    return {"message": "Căutarea a fost ștearsă"}

# ===================== RECENTLY VIEWED & RECOMMENDATIONS =====================

@api_router.post("/ads/{ad_id}/view")
async def track_ad_view(ad_id: str, request: Request):
    """Track ad view for recommendations"""
    user = await get_current_user(request)
    if not user:
        return {"tracked": False}
    
    # Get ad details for categorization
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0, "category_id": 1, "subcategory_id": 1, "city_id": 1, "price": 1})
    if not ad:
        return {"tracked": False}
    
    # Add to viewed_ads collection
    view_doc = {
        "user_id": user["user_id"],
        "ad_id": ad_id,
        "category_id": ad.get("category_id"),
        "subcategory_id": ad.get("subcategory_id"),
        "city_id": ad.get("city_id"),
        "price": ad.get("price"),
        "viewed_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Upsert - update if exists, insert if not
    await db.viewed_ads.update_one(
        {"user_id": user["user_id"], "ad_id": ad_id},
        {"$set": view_doc},
        upsert=True
    )
    
    # Keep only last 100 viewed ads per user
    views_count = await db.viewed_ads.count_documents({"user_id": user["user_id"]})
    if views_count > 100:
        oldest = await db.viewed_ads.find(
            {"user_id": user["user_id"]}
        ).sort([("viewed_at", 1)]).limit(views_count - 100).to_list(views_count - 100)
        if oldest:
            oldest_ids = [v["ad_id"] for v in oldest]
            await db.viewed_ads.delete_many({"user_id": user["user_id"], "ad_id": {"$in": oldest_ids}})
    
    return {"tracked": True}

@api_router.get("/ads/recently-viewed")
async def get_recently_viewed(request: Request, limit: int = 10):
    """Get user's recently viewed ads"""
    user = await get_current_user(request)
    if not user:
        return {"ads": []}
    
    # Get viewed ad IDs
    viewed = await db.viewed_ads.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "ad_id": 1}
    ).sort([("viewed_at", -1)]).limit(limit).to_list(limit)
    
    ad_ids = [v["ad_id"] for v in viewed]
    if not ad_ids:
        return {"ads": []}
    
    # Get ad details
    ads = await db.ads.find(
        {"ad_id": {"$in": ad_ids}, "status": "active"},
        {"_id": 0}
    ).to_list(limit)
    
    # Sort by original view order
    ads_dict = {ad["ad_id"]: ad for ad in ads}
    sorted_ads = [ads_dict[aid] for aid in ad_ids if aid in ads_dict]
    
    return {"ads": sorted_ads}

@api_router.get("/ads/recommendations")
async def get_recommendations(request: Request, limit: int = 12):
    """Get personalized ad recommendations based on viewing history"""
    user = await get_current_user(request)
    
    if not user:
        # Return popular ads for non-logged users
        popular = await db.ads.find(
            {"status": "active"},
            {"_id": 0}
        ).sort([("views", -1)]).limit(limit).to_list(limit)
        return {"ads": popular, "type": "popular"}
    
    # Analyze user's viewing patterns
    views = await db.viewed_ads.find(
        {"user_id": user["user_id"]}
    ).sort([("viewed_at", -1)]).limit(50).to_list(50)
    
    if not views:
        # Return popular ads if no history
        popular = await db.ads.find(
            {"status": "active"},
            {"_id": 0}
        ).sort([("views", -1)]).limit(limit).to_list(limit)
        return {"ads": popular, "type": "popular"}
    
    # Calculate preferences
    category_counts = {}
    city_counts = {}
    price_sum = 0
    price_count = 0
    viewed_ad_ids = set()
    
    for v in views:
        viewed_ad_ids.add(v["ad_id"])
        if v.get("category_id"):
            category_counts[v["category_id"]] = category_counts.get(v["category_id"], 0) + 1
        if v.get("city_id"):
            city_counts[v["city_id"]] = city_counts.get(v["city_id"], 0) + 1
        if v.get("price"):
            price_sum += v["price"]
            price_count += 1
    
    # Get top categories and cities
    top_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    top_cities = sorted(city_counts.items(), key=lambda x: x[1], reverse=True)[:3]
    avg_price = price_sum / price_count if price_count > 0 else None
    
    # Build recommendation query
    query = {
        "status": "active",
        "ad_id": {"$nin": list(viewed_ad_ids)}  # Exclude already viewed
    }
    
    # Prefer user's top categories
    if top_categories:
        query["category_id"] = {"$in": [c[0] for c in top_categories]}
    
    # Get recommendations
    recommendations = await db.ads.find(
        query,
        {"_id": 0}
    ).sort([("created_at", -1), ("views", -1)]).limit(limit).to_list(limit)
    
    # If not enough, add popular ads
    if len(recommendations) < limit:
        remaining = limit - len(recommendations)
        existing_ids = [r["ad_id"] for r in recommendations] + list(viewed_ad_ids)
        more_ads = await db.ads.find(
            {"status": "active", "ad_id": {"$nin": existing_ids}},
            {"_id": 0}
        ).sort([("views", -1)]).limit(remaining).to_list(remaining)
        recommendations.extend(more_ads)
    
    return {
        "ads": recommendations,
        "type": "personalized",
        "preferences": {
            "top_categories": [c[0] for c in top_categories],
            "top_cities": [c[0] for c in top_cities],
            "avg_price_range": avg_price
        }
    }

@api_router.get("/ads/{ad_id}/similar")
async def get_similar_ads(ad_id: str, limit: int = 6):
    """Get similar ads based on category, price, and location"""
    ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    # Build similarity query
    query = {
        "status": "active",
        "ad_id": {"$ne": ad_id},
        "category_id": ad.get("category_id")
    }
    
    # Add price range if available (±30%)
    if ad.get("price"):
        min_price = ad["price"] * 0.7
        max_price = ad["price"] * 1.3
        query["price"] = {"$gte": min_price, "$lte": max_price}
    
    # First try same city
    city_query = {**query, "city_id": ad.get("city_id")} if ad.get("city_id") else query
    similar = await db.ads.find(city_query, {"_id": 0}).limit(limit).to_list(limit)
    
    # If not enough, expand search
    if len(similar) < limit:
        remaining = limit - len(similar)
        existing_ids = [s["ad_id"] for s in similar]
        expanded_query = {**query, "ad_id": {"$nin": existing_ids + [ad_id]}}
        more = await db.ads.find(expanded_query, {"_id": 0}).limit(remaining).to_list(remaining)
        similar.extend(more)
    
    return {"ads": similar}

# ===================== AD COMPARISON =====================

@api_router.post("/compare/add")
async def add_to_comparison(request: Request):
    """Add an ad to comparison list (stored in user session)"""
    user = await get_current_user(request)
    body = await request.json()
    ad_id = body.get("ad_id")
    
    if not ad_id:
        raise HTTPException(status_code=400, detail="ad_id required")
    
    # Get or create comparison list
    user_id = user["user_id"] if user else request.client.host
    
    comparison = await db.comparisons.find_one({"user_id": user_id})
    if not comparison:
        comparison = {
            "user_id": user_id,
            "ad_ids": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    
    # Max 4 ads to compare
    if ad_id not in comparison["ad_ids"]:
        if len(comparison["ad_ids"]) >= 4:
            raise HTTPException(status_code=400, detail="Poți compara maxim 4 anunțuri")
        comparison["ad_ids"].append(ad_id)
    
    await db.comparisons.update_one(
        {"user_id": user_id},
        {"$set": comparison},
        upsert=True
    )
    
    return {"ad_ids": comparison["ad_ids"], "count": len(comparison["ad_ids"])}

@api_router.delete("/compare/remove/{ad_id}")
async def remove_from_comparison(ad_id: str, request: Request):
    """Remove an ad from comparison list"""
    user = await get_current_user(request)
    user_id = user["user_id"] if user else request.client.host
    
    comparison = await db.comparisons.find_one({"user_id": user_id})
    if comparison and ad_id in comparison.get("ad_ids", []):
        comparison["ad_ids"].remove(ad_id)
        await db.comparisons.update_one(
            {"user_id": user_id},
            {"$set": {"ad_ids": comparison["ad_ids"]}}
        )
    
    return {"ad_ids": comparison.get("ad_ids", []) if comparison else [], "count": len(comparison.get("ad_ids", [])) if comparison else 0}

@api_router.get("/compare")
async def get_comparison(request: Request):
    """Get comparison list with full ad details"""
    user = await get_current_user(request)
    user_id = user["user_id"] if user else request.client.host
    
    comparison = await db.comparisons.find_one({"user_id": user_id})
    if not comparison or not comparison.get("ad_ids"):
        return {"ads": [], "count": 0}
    
    # Get full ad details
    ads = await db.ads.find(
        {"ad_id": {"$in": comparison["ad_ids"]}},
        {"_id": 0}
    ).to_list(4)
    
    # Sort by original order
    ads_dict = {ad["ad_id"]: ad for ad in ads}
    sorted_ads = [ads_dict[aid] for aid in comparison["ad_ids"] if aid in ads_dict]
    
    return {"ads": sorted_ads, "count": len(sorted_ads)}

@api_router.delete("/compare/clear")
async def clear_comparison(request: Request):
    """Clear comparison list"""
    user = await get_current_user(request)
    user_id = user["user_id"] if user else request.client.host
    
    await db.comparisons.delete_one({"user_id": user_id})
    return {"message": "Comparison cleared"}

# ===================== PRICE NEGOTIATION / OFFERS =====================

class OfferCreate(BaseModel):
    ad_id: str
    offered_price: float
    message: Optional[str] = None

@api_router.post("/offers")
async def create_offer(data: OfferCreate, request: Request):
    """Create a price offer on an ad"""
    user = await require_auth(request)
    
    # Get ad details
    ad = await db.ads.find_one({"ad_id": data.ad_id}, {"_id": 0})
    if not ad:
        raise HTTPException(status_code=404, detail="Anunțul nu a fost găsit")
    
    if ad["status"] != "active":
        raise HTTPException(status_code=400, detail="Anunțul nu mai este activ")
    
    if ad["user_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Nu poți face oferte pe propriile anunțuri")
    
    # Check for existing pending offer
    existing = await db.offers.find_one({
        "ad_id": data.ad_id,
        "buyer_id": user["user_id"],
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ai deja o ofertă în așteptare pentru acest anunț")
    
    offer_id = f"offer_{uuid.uuid4().hex[:12]}"
    offer_doc = {
        "offer_id": offer_id,
        "ad_id": data.ad_id,
        "ad_title": ad.get("title"),
        "ad_price": ad.get("price"),
        "buyer_id": user["user_id"],
        "buyer_name": user.get("name"),
        "seller_id": ad["user_id"],
        "offered_price": data.offered_price,
        "message": data.message,
        "status": "pending",  # pending, accepted, rejected, countered, expired
        "counter_price": None,
        "counter_message": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "responded_at": None,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    }
    
    await db.offers.insert_one(offer_doc)
    
    # Notify seller via WebSocket if online
    await ws_manager.send_personal_message({
        "type": "new_offer",
        "offer": {
            "offer_id": offer_id,
            "ad_title": ad.get("title"),
            "offered_price": data.offered_price,
            "buyer_name": user.get("name")
        }
    }, ad["user_id"])
    
    # Send WhatsApp notification to seller
    seller = await db.users.find_one({"user_id": ad["user_id"]}, {"_id": 0, "phone": 1, "name": 1, "notification_settings": 1})
    if seller and seller.get("phone"):
        notif_settings = seller.get("notification_settings", {})
        if notif_settings.get("whatsapp_offers", True):
            whatsapp_msg = f"💰 Ofertă nouă pe X67!\n\n{user.get('name')} îți oferă {data.offered_price}€ pentru \"{ad.get('title', 'anunțul tău')[:30]}\"\n\nPreț cerut: {ad.get('price')}€\n\n👉 Răspunde pe x67digital.com/offers"
            asyncio.create_task(send_whatsapp_notification(seller["phone"], whatsapp_msg))
    
    return {"offer_id": offer_id, "message": "Oferta a fost trimisă!"}

@api_router.get("/offers/sent")
async def get_sent_offers(request: Request, status: str = "all"):
    """Get offers sent by current user"""
    user = await require_auth(request)
    
    query = {"buyer_id": user["user_id"]}
    if status != "all":
        query["status"] = status
    
    offers = await db.offers.find(query, {"_id": 0}).sort([("created_at", -1)]).to_list(50)
    return {"offers": offers}

@api_router.get("/offers/received")
async def get_received_offers(request: Request, status: str = "all"):
    """Get offers received on user's ads"""
    user = await require_auth(request)
    
    query = {"seller_id": user["user_id"]}
    if status != "all":
        query["status"] = status
    
    offers = await db.offers.find(query, {"_id": 0}).sort([("created_at", -1)]).to_list(50)
    return {"offers": offers}

@api_router.post("/offers/{offer_id}/accept")
async def accept_offer(offer_id: str, request: Request):
    """Accept a price offer"""
    user = await require_auth(request)
    
    offer = await db.offers.find_one({"offer_id": offer_id, "seller_id": user["user_id"]})
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nu a fost găsită")
    
    if offer["status"] != "pending":
        raise HTTPException(status_code=400, detail="Oferta nu mai poate fi acceptată")
    
    # Update offer
    await db.offers.update_one(
        {"offer_id": offer_id},
        {"$set": {
            "status": "accepted",
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify buyer
    await ws_manager.send_personal_message({
        "type": "offer_accepted",
        "offer_id": offer_id,
        "ad_title": offer.get("ad_title"),
        "accepted_price": offer["offered_price"]
    }, offer["buyer_id"])
    
    # Create or get conversation for further communication
    return {"message": "Oferta a fost acceptată!", "accepted_price": offer["offered_price"]}

@api_router.post("/offers/{offer_id}/reject")
async def reject_offer(offer_id: str, request: Request):
    """Reject a price offer"""
    user = await require_auth(request)
    
    offer = await db.offers.find_one({"offer_id": offer_id, "seller_id": user["user_id"]})
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nu a fost găsită")
    
    if offer["status"] != "pending":
        raise HTTPException(status_code=400, detail="Oferta nu mai poate fi respinsă")
    
    await db.offers.update_one(
        {"offer_id": offer_id},
        {"$set": {
            "status": "rejected",
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify buyer
    await ws_manager.send_personal_message({
        "type": "offer_rejected",
        "offer_id": offer_id,
        "ad_title": offer.get("ad_title")
    }, offer["buyer_id"])
    
    return {"message": "Oferta a fost respinsă"}

@api_router.post("/offers/{offer_id}/counter")
async def counter_offer(offer_id: str, request: Request):
    """Make a counter offer"""
    user = await require_auth(request)
    body = await request.json()
    
    counter_price = body.get("counter_price")
    counter_message = body.get("message")
    
    if not counter_price:
        raise HTTPException(status_code=400, detail="Prețul contra-ofertei este obligatoriu")
    
    offer = await db.offers.find_one({"offer_id": offer_id, "seller_id": user["user_id"]})
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nu a fost găsită")
    
    if offer["status"] != "pending":
        raise HTTPException(status_code=400, detail="Nu mai poți face contra-ofertă")
    
    await db.offers.update_one(
        {"offer_id": offer_id},
        {"$set": {
            "status": "countered",
            "counter_price": counter_price,
            "counter_message": counter_message,
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify buyer
    await ws_manager.send_personal_message({
        "type": "counter_offer",
        "offer_id": offer_id,
        "ad_title": offer.get("ad_title"),
        "counter_price": counter_price
    }, offer["buyer_id"])
    
    return {"message": "Contra-oferta a fost trimisă!", "counter_price": counter_price}

@api_router.post("/offers/{offer_id}/accept-counter")
async def accept_counter_offer(offer_id: str, request: Request):
    """Buyer accepts a counter offer"""
    user = await require_auth(request)
    
    offer = await db.offers.find_one({"offer_id": offer_id, "buyer_id": user["user_id"]})
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nu a fost găsită")
    
    if offer["status"] != "countered":
        raise HTTPException(status_code=400, detail="Nu există contra-ofertă de acceptat")
    
    await db.offers.update_one(
        {"offer_id": offer_id},
        {"$set": {
            "status": "accepted",
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Notify seller
    await ws_manager.send_personal_message({
        "type": "counter_accepted",
        "offer_id": offer_id,
        "ad_title": offer.get("ad_title"),
        "final_price": offer["counter_price"]
    }, offer["seller_id"])
    
    return {"message": "Ai acceptat contra-oferta!", "final_price": offer["counter_price"]}

@api_router.get("/favorites/check/{ad_id}")
async def check_favorite(ad_id: str, request: Request):
    """Check if an ad is in user's favorites"""
    user = await require_auth(request)
    
    favorite = await db.favorites.find_one({"user_id": user["user_id"], "ad_id": ad_id})
    return {"is_favorite": favorite is not None}

# ===================== MESSAGING SYSTEM =====================

@api_router.post("/messages")
async def send_message(request: Request):
    """Send a message to another user about an ad"""
    user = await require_auth(request)
    body = await request.json()
    
    ad_id = body.get("ad_id")
    receiver_id = body.get("receiver_id")
    content = body.get("content")
    
    if not all([ad_id, receiver_id, content]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Get or create conversation
    conversation = await db.conversations.find_one({
        "ad_id": ad_id,
        "$or": [
            {"participants": [user["user_id"], receiver_id]},
            {"participants": [receiver_id, user["user_id"]]}
        ]
    })
    
    if not conversation:
        conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
        ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0, "title": 1, "images": 1, "price": 1})
        # Safely get first image or None
        ad_images = ad.get("images", []) if ad else []
        ad_image = ad_images[0] if ad_images else None
        conversation = {
            "conversation_id": conversation_id,
            "ad_id": ad_id,
            "ad_title": ad.get("title") if ad else "Anunț",
            "ad_image": ad_image,
            "ad_price": ad.get("price") if ad else None,
            "participants": [user["user_id"], receiver_id],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(conversation)
    else:
        conversation_id = conversation["conversation_id"]
    
    # Create message
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()
    message_doc = {
        "message_id": message_id,
        "conversation_id": conversation_id,
        "sender_id": user["user_id"],
        "receiver_id": receiver_id,
        "content": content,
        "is_read": False,
        "created_at": created_at
    }
    
    await db.messages.insert_one(message_doc)
    
    # Update conversation's last message time
    await db.conversations.update_one(
        {"conversation_id": conversation_id},
        {"$set": {
            "last_message": content[:50] + "..." if len(content) > 50 else content,
            "last_message_at": created_at,
            "updated_at": created_at
        }}
    )
    
    # Send real-time notification via WebSocket
    sender_info = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "name": 1, "picture": 1})
    ws_message = {
        "type": "new_message",
        "message": {
            "message_id": message_id,
            "conversation_id": conversation_id,
            "sender_id": user["user_id"],
            "sender_name": sender_info.get("name", "Utilizator") if sender_info else "Utilizator",
            "sender_picture": sender_info.get("picture") if sender_info else None,
            "content": content,
            "created_at": created_at,
            "ad_id": ad_id
        }
    }
    
    # Send to receiver if online
    await ws_manager.send_personal_message(ws_message, receiver_id)
    # Also send to sender (for multi-device sync)
    await ws_manager.send_personal_message(ws_message, user["user_id"])
    
    # Send WhatsApp notification to receiver
    receiver = await db.users.find_one({"user_id": receiver_id}, {"_id": 0, "phone": 1, "name": 1, "notification_settings": 1})
    if receiver and receiver.get("phone"):
        notif_settings = receiver.get("notification_settings", {})
        if notif_settings.get("whatsapp_messages", True):
            ad = await db.ads.find_one({"ad_id": ad_id}, {"_id": 0, "title": 1})
            ad_title = ad.get("title", "anunțul tău")[:30] if ad else "anunțul tău"
            whatsapp_msg = f"📩 Mesaj nou pe X67!\n\nDe la: {user['name']}\nAnunț: {ad_title}\n\n\"{content[:100]}{'...' if len(content) > 100 else ''}\"\n\n👉 Răspunde pe x67digital.com"
            asyncio.create_task(send_whatsapp_notification(receiver["phone"], whatsapp_msg))
    
    return {"message_id": message_id, "conversation_id": conversation_id}

@api_router.get("/conversations")
async def get_conversations(request: Request):
    """Get all conversations for the current user"""
    user = await require_auth(request)
    
    conversations = await db.conversations.find(
        {"participants": user["user_id"]},
        {"_id": 0}
    ).sort([("updated_at", -1)]).to_list(100)
    
    # Enrich with other participant info and unread count
    result = []
    for conv in conversations:
        other_user_id = [p for p in conv["participants"] if p != user["user_id"]][0]
        other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0, "name": 1, "picture": 1})
        
        unread_count = await db.messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "receiver_id": user["user_id"],
            "is_read": False
        })
        
        result.append({
            **conv,
            "other_user": other_user,
            "unread_count": unread_count
        })
    
    return {"conversations": result}

@api_router.get("/conversations/{conversation_id}")
async def get_conversation_messages(conversation_id: str, request: Request, page: int = 1, limit: int = 50):
    """Get messages in a conversation"""
    user = await require_auth(request)
    
    # Verify user is participant
    conversation = await db.conversations.find_one(
        {"conversation_id": conversation_id, "participants": user["user_id"]},
        {"_id": 0}
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Mark messages as read
    await db.messages.update_many(
        {"conversation_id": conversation_id, "receiver_id": user["user_id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    # Get messages
    skip = (page - 1) * limit
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    
    # Get participant info
    other_user_id = [p for p in conversation["participants"] if p != user["user_id"]][0]
    other_user = await db.users.find_one({"user_id": other_user_id}, {"_id": 0, "name": 1, "picture": 1, "user_id": 1})
    
    return {
        "conversation": conversation,
        "other_user": other_user,
        "messages": list(reversed(messages)),  # Oldest first for display
        "page": page
    }

@api_router.get("/messages/unread-count")
async def get_unread_count(request: Request):
    """Get total unread messages count"""
    user = await require_auth(request)
    
    count = await db.messages.count_documents({
        "receiver_id": user["user_id"],
        "is_read": False
    })
    
    return {"unread_count": count}

@api_router.get("/users/{user_id}/online-status")
async def get_user_online_status(user_id: str):
    """Check if a user is currently online"""
    return {"user_id": user_id, "is_online": ws_manager.is_online(user_id)}

# WebSocket endpoint for real-time chat
@app.websocket("/ws/chat/{user_id}")
async def websocket_chat(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time messaging"""
    # Verify token from query params
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    
    # Validate the token by decoding it
    try:
        from passlib.context import CryptContext
        from jose import JWTError, jwt
        
        SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
        ALGORITHM = "HS256"
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        token_user_id = payload.get("user_id")
        
        if token_user_id != user_id:
            await websocket.close(code=4003, reason="Token mismatch")
            return
    except JWTError:
        await websocket.close(code=4002, reason="Invalid token")
        return
    
    await ws_manager.connect(websocket, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif data.get("type") == "typing":
                # Notify receiver that user is typing
                conversation_id = data.get("conversation_id")
                if conversation_id:
                    conv = await db.conversations.find_one({"conversation_id": conversation_id})
                    if conv:
                        other_user = [p for p in conv["participants"] if p != user_id][0]
                        await ws_manager.send_personal_message({
                            "type": "typing",
                            "conversation_id": conversation_id,
                            "user_id": user_id
                        }, other_user)
            
            elif data.get("type") == "read":
                # Mark messages as read
                conversation_id = data.get("conversation_id")
                if conversation_id:
                    await db.messages.update_many(
                        {"conversation_id": conversation_id, "receiver_id": user_id, "is_read": False},
                        {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    # Notify sender that messages were read
                    conv = await db.conversations.find_one({"conversation_id": conversation_id})
                    if conv:
                        other_user = [p for p in conv["participants"] if p != user_id][0]
                        await ws_manager.send_personal_message({
                            "type": "messages_read",
                            "conversation_id": conversation_id,
                            "reader_id": user_id
                        }, other_user)
                        
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for {user_id}: {str(e)}")
        ws_manager.disconnect(websocket, user_id)

# ===================== AI CHATBOT ASSISTANT =====================

CHATBOT_SYSTEM_PROMPT = """Tu ești un asistent virtual pentru X67 Digital Media Groupe, o platformă de anunțuri gratuite din România.

Responsabilitățile tale:
1. Ajuți utilizatorii să găsească anunțuri potrivite (auto, imobiliare, locuri de muncă, electronice, etc.)
2. Explici cum funcționează platforma (cum să postezi anunț, TopUp, favorite, mesagerie)
3. Răspunzi la întrebări despre categorii și subcategorii disponibile
4. Oferi sfaturi pentru vânzători (cum să facă anunțuri atractive)
5. Asistență generală cu navigarea pe site

Categoriile disponibile pe platformă:
- Escorte (servicii de însoțire la evenimente sociale)
- Imobiliare (apartamente, case, terenuri, birouri)
- Auto (mașini, piese, servicii auto)
- Moto (motociclete, scutere, ATV-uri)
- Locuri de Muncă (joburi full-time, part-time, remote)
- Electronice & IT (telefoane, laptopuri, gaming)
- Servicii (meșteri, transport, curățenie)
- Animale (câini, pisici, păsări, accesorii)

Când utilizatorul caută ceva specific, sugerează-i să folosească:
- Filtrele de categorie și subcategorie
- Filtrele de oraș
- Căutarea cu cuvinte cheie
- Alertele de preț (pentru a fi notificat când apar anunțuri potrivite)

Răspunde întotdeauna în limba română, într-un mod prietenos și profesionist. Fii concis dar informativ."""

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

@api_router.post("/chatbot")
async def chatbot_respond(data: ChatMessage, request: Request):
    """AI Chatbot assistant for helping users"""
    
    session_id = data.session_id or str(uuid.uuid4())
    
    # Get conversation history from session
    history = await db.chat_sessions.find_one({"session_id": session_id})
    
    # Build initial messages from history for context
    initial_messages = []
    if history and history.get("messages"):
        for msg in history["messages"][-10:]:  # Last 10 messages for context
            initial_messages.append({"role": msg["role"], "content": msg["content"]})
    
    try:
        llm_key = os.environ.get("EMERGENT_LLM_KEY")
        
        # Initialize LlmChat with session and system message
        llm_chat = LlmChat(
            api_key=llm_key,
            session_id=session_id,
            system_message=CHATBOT_SYSTEM_PROMPT,
            initial_messages=initial_messages
        ).with_model("openai", "gpt-5.2")
        
        # Create user message and send
        user_message = UserMessage(text=data.message)
        assistant_message = await llm_chat.send_message(user_message)
        
        # Save to session in MongoDB
        if history:
            await db.chat_sessions.update_one(
                {"session_id": session_id},
                {
                    "$push": {
                        "messages": {
                            "$each": [
                                {"role": "user", "content": data.message, "timestamp": datetime.now(timezone.utc).isoformat()},
                                {"role": "assistant", "content": assistant_message, "timestamp": datetime.now(timezone.utc).isoformat()}
                            ]
                        }
                    },
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
        else:
            await db.chat_sessions.insert_one({
                "session_id": session_id,
                "messages": [
                    {"role": "user", "content": data.message, "timestamp": datetime.now(timezone.utc).isoformat()},
                    {"role": "assistant", "content": assistant_message, "timestamp": datetime.now(timezone.utc).isoformat()}
                ],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
        
        return {
            "response": assistant_message,
            "session_id": session_id
        }
        
    except Exception as e:
        logger.error(f"Chatbot error: {str(e)}")
        return {
            "response": "Îmi pare rău, am întâmpinat o eroare. Te rog să încerci din nou.",
            "session_id": session_id
        }

class GenerateDescriptionRequest(BaseModel):
    title: str
    category: Optional[str] = None
    city: Optional[str] = None
    price: Optional[float] = None
    details: Optional[Dict[str, Any]] = {}

@api_router.post("/generate-description")
async def generate_ad_description(data: GenerateDescriptionRequest, request: Request):
    """Generate ad description using AI"""
    await require_auth(request)
    
    # Build context from details
    details_text = ""
    if data.details:
        details_list = [f"{k}: {v}" for k, v in data.details.items() if v]
        details_text = ", ".join(details_list)
    
    price_text = f"{data.price} €" if data.price else "preț la cerere"
    
    prompt = f"""Generează o descriere atractivă și profesională pentru un anunț cu următoarele informații:

Titlu: {data.title}
Categorie: {data.category or 'nedefinită'}
Oraș: {data.city or 'România'}
Preț: {price_text}
{f'Detalii suplimentare: {details_text}' if details_text else ''}

Reguli:
- Descrierea trebuie să fie în limba română
- Folosește un ton profesional dar prietenos
- Include beneficiile principale și caracteristicile importante
- Fii specific și convingător
- Lungime: 150-300 de cuvinte
- Nu include prețul în descriere (este afișat separat)
- Nu include informații de contact

Scrie doar descrierea, fără titlu sau alte adăugiri."""

    try:
        llm_key = os.environ.get("EMERGENT_LLM_KEY")
        
        # Initialize LlmChat for description generation
        llm_chat = LlmChat(
            api_key=llm_key,
            session_id=f"desc_{uuid.uuid4().hex[:8]}",
            system_message="Ești un expert în copywriting pentru anunțuri de vânzare. Generezi descrieri atractive, profesionale și convingătoare în limba română."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=prompt)
        response = await llm_chat.send_message(user_message)
        
        return {"description": response.strip()}
        
    except Exception as e:
        logger.error(f"AI description error: {str(e)}")
        raise HTTPException(status_code=500, detail="Eroare la generarea descrierii")

# ===================== PRICE ALERTS SYSTEM =====================

@api_router.post("/price-alerts")
async def create_price_alert(data: PriceAlertCreate, request: Request):
    """Create a price alert for user"""
    user = await require_auth(request)
    
    alert_id = f"alert_{uuid.uuid4().hex[:12]}"
    alert_doc = {
        "alert_id": alert_id,
        "user_id": user["user_id"],
        "category_id": data.category_id,
        "city_id": data.city_id,
        "max_price": data.max_price,
        "keywords": data.keywords,
        "is_active": True,
        "matches_count": 0,
        "last_notified": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.price_alerts.insert_one(alert_doc)
    return {"alert_id": alert_id, "message": "Alerta a fost creată cu succes!"}

@api_router.get("/price-alerts")
async def get_user_price_alerts(request: Request):
    """Get all price alerts for current user"""
    user = await require_auth(request)
    
    alerts = await db.price_alerts.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(50)
    
    # Enrich with category names
    for alert in alerts:
        cat = next((c for c in CATEGORIES if c["id"] == alert.get("category_id")), None)
        if cat:
            alert["category_name"] = cat["name"]
            alert["category_color"] = cat["color"]
        if alert.get("city_id"):
            city = next((c for c in ROMANIAN_CITIES if c["id"] == alert["city_id"]), None)
            if city:
                alert["city_name"] = city["name"]
    
    return {"alerts": alerts}

@api_router.delete("/price-alerts/{alert_id}")
async def delete_price_alert(alert_id: str, request: Request):
    """Delete a price alert"""
    user = await require_auth(request)
    
    result = await db.price_alerts.delete_one({
        "alert_id": alert_id,
        "user_id": user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Alerta nu a fost găsită")
    
    return {"message": "Alerta a fost ștearsă"}

@api_router.put("/price-alerts/{alert_id}/toggle")
async def toggle_price_alert(alert_id: str, request: Request):
    """Toggle price alert active status"""
    user = await require_auth(request)
    
    alert = await db.price_alerts.find_one({
        "alert_id": alert_id,
        "user_id": user["user_id"]
    })
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta nu a fost găsită")
    
    new_status = not alert.get("is_active", True)
    await db.price_alerts.update_one(
        {"alert_id": alert_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"is_active": new_status}

@api_router.get("/price-alerts/check-matches/{alert_id}")
async def check_alert_matches(alert_id: str, request: Request):
    """Check matching ads for a price alert"""
    user = await require_auth(request)
    
    alert = await db.price_alerts.find_one({
        "alert_id": alert_id,
        "user_id": user["user_id"]
    }, {"_id": 0})
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta nu a fost găsită")
    
    # Build query
    query = {
        "status": "active",
        "category_id": alert["category_id"],
        "price": {"$lte": alert["max_price"], "$gt": 0}
    }
    
    if alert.get("city_id"):
        query["city_id"] = alert["city_id"]
    
    # Search with keywords if provided
    if alert.get("keywords"):
        query["$or"] = [
            {"title": {"$regex": alert["keywords"], "$options": "i"}},
            {"description": {"$regex": alert["keywords"], "$options": "i"}}
        ]
    
    ads = await db.ads.find(query, {"_id": 0}).sort([("created_at", -1)]).limit(20).to_list(20)
    
    # Enrich ads
    for ad in ads:
        cat = next((c for c in CATEGORIES if c["id"] == ad.get("category_id")), None)
        if cat:
            ad["category_name"] = cat["name"]
        city = next((c for c in ROMANIAN_CITIES if c["id"] == ad.get("city_id")), None)
        if city:
            ad["city_name"] = city["name"]
    
    return {"matches": ads, "count": len(ads)}

# ===================== REVIEWS & RATINGS SYSTEM =====================

@api_router.post("/reviews")
async def create_review(data: ReviewCreate, request: Request):
    """Create a review for a seller"""
    user = await require_auth(request)
    
    # Validate rating
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating-ul trebuie să fie între 1 și 5")
    
    # Can't review yourself
    if data.seller_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Nu poți lăsa o recenzie pentru tine însuți")
    
    # Check if seller exists
    seller = await db.users.find_one({"user_id": data.seller_id}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Vânzătorul nu a fost găsit")
    
    # Check if user already reviewed this seller (optional: allow one review per ad)
    existing_review = await db.reviews.find_one({
        "reviewer_id": user["user_id"],
        "seller_id": data.seller_id,
        "ad_id": data.ad_id
    })
    
    if existing_review:
        raise HTTPException(status_code=400, detail="Ai lăsat deja o recenzie pentru acest vânzător")
    
    review_id = f"rev_{uuid.uuid4().hex[:12]}"
    review_doc = {
        "review_id": review_id,
        "reviewer_id": user["user_id"],
        "reviewer_name": user.get("name", "Anonim"),
        "reviewer_picture": user.get("picture"),
        "seller_id": data.seller_id,
        "ad_id": data.ad_id,
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update seller's average rating
    await update_seller_rating(data.seller_id)
    
    return {"review_id": review_id, "message": "Recenzia a fost adăugată cu succes!"}

async def update_seller_rating(seller_id: str):
    """Recalculate and update seller's average rating"""
    pipeline = [
        {"$match": {"seller_id": seller_id}},
        {"$group": {
            "_id": "$seller_id",
            "avg_rating": {"$avg": "$rating"},
            "total_reviews": {"$sum": 1}
        }}
    ]
    
    result = await db.reviews.aggregate(pipeline).to_list(1)
    
    if result:
        await db.users.update_one(
            {"user_id": seller_id},
            {"$set": {
                "avg_rating": round(result[0]["avg_rating"], 1),
                "total_reviews": result[0]["total_reviews"]
            }}
        )

@api_router.get("/reviews/seller/{seller_id}")
async def get_seller_reviews(seller_id: str, page: int = 1, limit: int = 10):
    """Get all reviews for a seller"""
    skip = (page - 1) * limit
    
    # Get seller info with rating
    seller = await db.users.find_one(
        {"user_id": seller_id}, 
        {"_id": 0, "password_hash": 0}
    )
    
    if not seller:
        raise HTTPException(status_code=404, detail="Vânzătorul nu a fost găsit")
    
    # Get reviews
    reviews = await db.reviews.find(
        {"seller_id": seller_id},
        {"_id": 0}
    ).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    
    total = await db.reviews.count_documents({"seller_id": seller_id})
    
    return {
        "seller": {
            "user_id": seller["user_id"],
            "name": seller.get("name"),
            "picture": seller.get("picture"),
            "avg_rating": seller.get("avg_rating", 0),
            "total_reviews": seller.get("total_reviews", 0),
            "member_since": seller.get("created_at")
        },
        "reviews": reviews,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/reviews/user/{user_id}/stats")
async def get_user_review_stats(user_id: str):
    """Get review statistics for a user (seller)"""
    # Get rating distribution
    pipeline = [
        {"$match": {"seller_id": user_id}},
        {"$group": {
            "_id": "$rating",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": -1}}
    ]
    
    distribution = await db.reviews.aggregate(pipeline).to_list(5)
    
    # Format distribution
    rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for item in distribution:
        rating_dist[item["_id"]] = item["count"]
    
    # Get overall stats
    seller = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "avg_rating": 1, "total_reviews": 1}
    )
    
    return {
        "avg_rating": seller.get("avg_rating", 0) if seller else 0,
        "total_reviews": seller.get("total_reviews", 0) if seller else 0,
        "distribution": rating_dist
    }

# ===================== BADGES & VERIFICATION SYSTEM =====================

# Badge types and their criteria
BADGE_CRITERIA = {
    "verified_identity": {"type": "manual", "description": "Identitate verificată cu act"},
    "top_seller": {"type": "auto", "min_rating": 4.5, "min_reviews": 10, "description": "Rating 4.5+ cu 10+ recenzii"},
    "fast_responder": {"type": "auto", "avg_response_hours": 2, "description": "Răspunde în medie în 2 ore"},
    "trusted_seller": {"type": "auto", "min_rating": 4.0, "min_reviews": 5, "description": "Rating 4.0+ cu 5+ recenzii"},
    "new_seller": {"type": "auto", "max_days": 30, "description": "Vânzător nou pe platformă"},
    "power_seller": {"type": "auto", "min_ads": 20, "min_rating": 4.0, "description": "20+ anunțuri și rating 4.0+"},
    "premium_member": {"type": "manual", "description": "Membru premium activ"}
}

async def calculate_user_badges(user_id: str):
    """Calculate and update badges for a user"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return []
    
    badges = user.get("badges", [])
    manual_badges = [b for b in badges if BADGE_CRITERIA.get(b, {}).get("type") == "manual"]
    
    new_badges = list(manual_badges)  # Keep manual badges
    
    # Check auto badges
    avg_rating = user.get("avg_rating", 0)
    total_reviews = user.get("total_reviews", 0)
    
    # Count user's ads
    total_ads = await db.ads.count_documents({"user_id": user_id, "status": "active"})
    
    # Calculate account age
    created_at = user.get("created_at")
    if created_at:
        try:
            created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            days_since_joined = (datetime.now(timezone.utc) - created_date).days
        except:
            days_since_joined = 999
    else:
        days_since_joined = 999
    
    # Top Seller
    if avg_rating >= 4.5 and total_reviews >= 10:
        new_badges.append("top_seller")
    
    # Trusted Seller
    if avg_rating >= 4.0 and total_reviews >= 5:
        new_badges.append("trusted_seller")
    
    # Power Seller
    if total_ads >= 20 and avg_rating >= 4.0:
        new_badges.append("power_seller")
    
    # New Seller
    if days_since_joined <= 30:
        new_badges.append("new_seller")
    
    # Remove duplicates
    new_badges = list(set(new_badges))
    
    # Update user badges
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"badges": new_badges}}
    )
    
    return new_badges

@api_router.get("/users/{user_id}/badges")
async def get_user_badges(user_id: str):
    """Get badges for a user"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "badges": 1})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    badges = user.get("badges", [])
    
    # Return badges with descriptions
    badge_details = []
    for badge in badges:
        if badge in BADGE_CRITERIA:
            badge_details.append({
                "id": badge,
                "name": badge.replace("_", " ").title(),
                "description": BADGE_CRITERIA[badge]["description"],
                "type": BADGE_CRITERIA[badge]["type"]
            })
    
    return {"badges": badge_details}

@api_router.post("/users/{user_id}/recalculate-badges")
async def recalculate_badges(user_id: str, request: Request):
    """Recalculate badges for a user (admin only or self)"""
    current_user = await get_current_user(request)
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if current_user["user_id"] != user_id and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    badges = await calculate_user_badges(user_id)
    return {"badges": badges, "message": "Badges recalculated"}

# ===================== IDENTITY VERIFICATION =====================

class VerificationRequest(BaseModel):
    document_type: str  # "id_card", "passport", "driving_license"
    document_number: str
    document_image_url: str
    selfie_url: Optional[str] = None

@api_router.post("/verification/request")
async def request_verification(data: VerificationRequest, request: Request):
    """Submit identity verification request"""
    user = await require_auth(request)
    
    # Check if already verified
    if "verified_identity" in user.get("badges", []):
        raise HTTPException(status_code=400, detail="Identitatea ta este deja verificată")
    
    # Check for pending request
    pending = await db.verification_requests.find_one({
        "user_id": user["user_id"],
        "status": "pending"
    })
    if pending:
        raise HTTPException(status_code=400, detail="Ai deja o cerere de verificare în așteptare")
    
    verification_id = f"ver_{uuid.uuid4().hex[:12]}"
    verification_doc = {
        "verification_id": verification_id,
        "user_id": user["user_id"],
        "user_email": user["email"],
        "user_name": user.get("name"),
        "document_type": data.document_type,
        "document_number": data.document_number[-4:],  # Store only last 4 chars for privacy
        "document_image_url": data.document_image_url,
        "selfie_url": data.selfie_url,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None,
        "reviewed_by": None,
        "rejection_reason": None
    }
    
    await db.verification_requests.insert_one(verification_doc)
    
    return {
        "verification_id": verification_id,
        "message": "Cererea de verificare a fost trimisă. Vei primi un email când va fi procesată."
    }

@api_router.get("/verification/status")
async def get_verification_status(request: Request):
    """Get current user's verification status"""
    user = await require_auth(request)
    
    is_verified = "verified_identity" in user.get("badges", [])
    
    pending_request = await db.verification_requests.find_one(
        {"user_id": user["user_id"], "status": "pending"},
        {"_id": 0, "verification_id": 1, "created_at": 1, "document_type": 1}
    )
    
    last_rejection = await db.verification_requests.find_one(
        {"user_id": user["user_id"], "status": "rejected"},
        {"_id": 0, "rejection_reason": 1, "reviewed_at": 1}
    )
    
    return {
        "is_verified": is_verified,
        "pending_request": pending_request,
        "last_rejection": last_rejection
    }

@api_router.get("/admin/verification-requests")
async def get_verification_requests(request: Request, status: str = "pending", page: int = 1, limit: int = 20):
    """Get verification requests (admin only)"""
    await require_admin(request)
    
    query = {}
    if status != "all":
        query["status"] = status
    
    skip = (page - 1) * limit
    requests = await db.verification_requests.find(
        query,
        {"_id": 0}
    ).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    
    total = await db.verification_requests.count_documents(query)
    
    return {
        "requests": requests,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.post("/admin/verification-requests/{verification_id}/approve")
async def approve_verification(verification_id: str, request: Request):
    """Approve a verification request (admin only)"""
    admin = await require_admin(request)
    
    ver_request = await db.verification_requests.find_one({"verification_id": verification_id})
    if not ver_request:
        raise HTTPException(status_code=404, detail="Verification request not found")
    
    if ver_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Update request
    await db.verification_requests.update_one(
        {"verification_id": verification_id},
        {"$set": {
            "status": "approved",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin["user_id"]
        }}
    )
    
    # Add verified badge to user
    await db.users.update_one(
        {"user_id": ver_request["user_id"]},
        {"$addToSet": {"badges": "verified_identity"}}
    )
    
    # Send email notification
    try:
        user = await db.users.find_one({"user_id": ver_request["user_id"]})
        if user and user.get("email"):
            await send_notification_email(
                user["email"],
                "Identitatea ta a fost verificată! ✅",
                f"""
                <h2>Felicitări, {user.get('name', 'Utilizator')}!</h2>
                <p>Identitatea ta a fost verificată cu succes pe X67 Digital Media.</p>
                <p>Acum ai badge-ul <strong>"Identitate Verificată"</strong> care va apărea pe profilul tău și pe toate anunțurile tale.</p>
                <p>Acest badge crește încrederea cumpărătorilor și îți poate aduce mai multe contactări!</p>
                """
            )
    except Exception as e:
        logger.error(f"Error sending verification email: {e}")
    
    return {"message": "Verification approved"}

@api_router.post("/admin/verification-requests/{verification_id}/reject")
async def reject_verification(verification_id: str, request: Request):
    """Reject a verification request (admin only)"""
    admin = await require_admin(request)
    body = await request.json()
    
    rejection_reason = body.get("reason", "Documentele nu au putut fi verificate")
    
    ver_request = await db.verification_requests.find_one({"verification_id": verification_id})
    if not ver_request:
        raise HTTPException(status_code=404, detail="Verification request not found")
    
    if ver_request["status"] != "pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Update request
    await db.verification_requests.update_one(
        {"verification_id": verification_id},
        {"$set": {
            "status": "rejected",
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": admin["user_id"],
            "rejection_reason": rejection_reason
        }}
    )
    
    # Send email notification
    try:
        user = await db.users.find_one({"user_id": ver_request["user_id"]})
        if user and user.get("email"):
            await send_notification_email(
                user["email"],
                "Cerere de verificare respinsă",
                f"""
                <h2>Salut, {user.get('name', 'Utilizator')}</h2>
                <p>Din păcate, cererea ta de verificare a identității a fost respinsă.</p>
                <p><strong>Motivul:</strong> {rejection_reason}</p>
                <p>Poți trimite o nouă cerere cu documente corecte.</p>
                """
            )
    except Exception as e:
        logger.error(f"Error sending rejection email: {e}")
    
    return {"message": "Verification rejected"}

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, request: Request):
    """Delete a review (only by reviewer or admin)"""
    user = await require_auth(request)
    
    review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Recenzia nu a fost găsită")
    
    # Only reviewer or admin can delete
    if review["reviewer_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să ștergi această recenzie")
    
    seller_id = review["seller_id"]
    await db.reviews.delete_one({"review_id": review_id})
    
    # Update seller's rating
    await update_seller_rating(seller_id)
    
    return {"message": "Recenzia a fost ștearsă"}

# ===================== USER ANALYTICS / DASHBOARD =====================

@api_router.get("/analytics/overview")
async def get_analytics_overview(request: Request):
    """Get analytics overview for user's ads"""
    user = await require_auth(request)
    
    # Get user's ads
    ads = await db.ads.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(100)
    
    total_ads = len(ads)
    active_ads = len([a for a in ads if a.get("status") == "active"])
    total_views = sum(a.get("views", 0) for a in ads)
    total_favorites = sum(a.get("favorites_count", 0) for a in ads)
    
    # Get messages count
    total_messages = await db.messages.count_documents({"receiver_id": user["user_id"]})
    
    return {
        "total_ads": total_ads,
        "active_ads": active_ads,
        "total_views": total_views,
        "total_favorites": total_favorites,
        "total_messages": total_messages
    }

@api_router.get("/analytics/views")
async def get_views_analytics(request: Request, days: int = 30):
    """Get views analytics over time"""
    user = await require_auth(request)
    
    # Get user's ads with views
    ads = await db.ads.find(
        {"user_id": user["user_id"]},
        {"_id": 0, "ad_id": 1, "title": 1, "views": 1, "created_at": 1}
    ).to_list(100)
    
    # Sort by views to get top ads
    top_ads = sorted(ads, key=lambda x: x.get("views", 0), reverse=True)[:5]
    
    # Get view events from the last N days (simplified - using ad creation dates)
    # In production, you'd track individual view events
    _ = datetime.now(timezone.utc) - timedelta(days=days)  # Reference date for future use
    
    # Generate daily view estimates based on ad age and total views
    daily_views = []
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days-i-1)).strftime("%Y-%m-%d")
        # Estimate daily views (simplified)
        views_estimate = sum(a.get("views", 0) for a in ads) // max(days, 1)
        daily_views.append({"date": date, "views": views_estimate + (i * 2)})  # Slight growth trend
    
    return {
        "top_ads": top_ads,
        "daily_views": daily_views,
        "total_views": sum(a.get("views", 0) for a in ads)
    }

@api_router.get("/analytics/ads-performance")
async def get_ads_performance(request: Request):
    """Get performance metrics for each ad"""
    user = await require_auth(request)
    
    ads = await db.ads.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    performance = []
    for ad in ads:
        # Get conversation count for this ad
        conv_count = await db.conversations.count_documents({
            "ad_id": ad["ad_id"],
            "participants": user["user_id"]
        })
        
        performance.append({
            "ad_id": ad["ad_id"],
            "title": ad.get("title"),
            "status": ad.get("status"),
            "views": ad.get("views", 0),
            "favorites": ad.get("favorites_count", 0),
            "conversations": conv_count,
            "created_at": ad.get("created_at"),
            "last_topup": ad.get("last_topup")
        })
    
    # Sort by views
    performance.sort(key=lambda x: x["views"], reverse=True)
    
    return {"ads": performance}

# ===================== LOYALTY PROGRAM / POINTS SYSTEM =====================

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

@api_router.get("/loyalty/status")
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

@api_router.get("/loyalty/leaderboard")
async def get_loyalty_leaderboard(limit: int = 20):
    """Get top users by loyalty points"""
    top_users = await db.users.find(
        {"loyalty_points": {"$gt": 0}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "loyalty_points": 1, "loyalty_level_name": 1}
    ).sort([("loyalty_points", -1)]).limit(limit).to_list(limit)
    
    return {"leaderboard": top_users}

@api_router.post("/loyalty/claim-daily")
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

# ===================== REFERRAL SYSTEM =====================

@api_router.get("/referral/code")
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

@api_router.get("/referral/list")
async def get_referral_list(request: Request):
    """Get list of users referred by current user"""
    user = await require_auth(request)
    
    referrals = await db.users.find(
        {"referred_by": user["user_id"]},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "created_at": 1}
    ).sort([("created_at", -1)]).limit(50).to_list(50)
    
    return {"referrals": referrals}

@api_router.post("/referral/apply")
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
    await add_points(referrer["user_id"], "referral_signup", f"Utilizator nou: {user.get('name', 'Unknown')}")
    
    return {"message": "Cod de referral aplicat cu succes!"}

# ===================== SELLER DASHBOARD / STATS =====================

@api_router.get("/seller/dashboard")
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

@api_router.get("/seller/earnings")
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

# ===================== ADMIN CATEGORIES MANAGEMENT =====================

@api_router.get("/admin/categories")
async def admin_get_categories(request: Request):
    """Get all categories from database (admin)"""
    await require_admin(request)
    categories = await db.managed_categories.find({}, {"_id": 0}).to_list(100)
    return {"categories": categories}

@api_router.post("/admin/categories")
async def admin_create_category(request: Request):
    """Create a new category"""
    await require_admin(request)
    body = await request.json()
    
    category_id = body.get("id") or f"cat_{uuid.uuid4().hex[:8]}"
    category_doc = {
        "id": category_id,
        "name": body.get("name"),
        "icon": body.get("icon", "folder"),
        "color": body.get("color", "from-blue-600 to-blue-700"),
        "subcategories": body.get("subcategories", []),
        "is_active": body.get("is_active", True),
        "order": body.get("order", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.managed_categories.insert_one(category_doc)
    return {"category_id": category_id}

@api_router.put("/admin/categories/{category_id}")
async def admin_update_category(category_id: str, request: Request):
    """Update a category"""
    await require_admin(request)
    body = await request.json()
    
    update_fields = {}
    for field in ["name", "icon", "color", "subcategories", "is_active", "order"]:
        if field in body:
            update_fields[field] = body[field]
    
    await db.managed_categories.update_one({"id": category_id}, {"$set": update_fields})
    return {"message": "Category updated"}

@api_router.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, request: Request):
    """Delete a category"""
    await require_admin(request)
    
    # Check if any ads use this category
    ads_count = await db.ads.count_documents({"category_id": category_id})
    if ads_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {ads_count} ads use this category")
    
    await db.managed_categories.delete_one({"id": category_id})
    return {"message": "Category deleted"}

@api_router.get("/admin/cities")
async def admin_get_cities(request: Request):
    """Get all cities from database (admin)"""
    await require_admin(request)
    cities = await db.managed_cities.find({}, {"_id": 0}).to_list(100)
    return {"cities": cities}

@api_router.post("/admin/cities")
async def admin_create_city(request: Request):
    """Create a new city"""
    await require_admin(request)
    body = await request.json()
    
    city_id = body.get("id") or body.get("name", "").lower().replace(" ", "_")
    city_doc = {
        "id": city_id,
        "name": body.get("name"),
        "region": body.get("region", ""),
        "is_active": body.get("is_active", True),
        "order": body.get("order", 0)
    }
    
    await db.managed_cities.insert_one(city_doc)
    return {"city_id": city_id}

@api_router.put("/admin/cities/{city_id}")
async def admin_update_city(city_id: str, request: Request):
    """Update a city"""
    await require_admin(request)
    body = await request.json()
    
    update_fields = {}
    for field in ["name", "region", "is_active", "order"]:
        if field in body:
            update_fields[field] = body[field]
    
    await db.managed_cities.update_one({"id": city_id}, {"$set": update_fields})
    return {"message": "City updated"}

@api_router.delete("/admin/cities/{city_id}")
async def admin_delete_city(city_id: str, request: Request):
    """Delete a city"""
    await require_admin(request)
    
    ads_count = await db.ads.count_documents({"city_id": city_id})
    if ads_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete: {ads_count} ads use this city")
    
    await db.managed_cities.delete_one({"id": city_id})
    return {"message": "City deleted"}

# ===================== BLOG / GUIDES SYSTEM =====================

@api_router.get("/blog/posts")
async def get_blog_posts(
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):
    """Get blog posts / guides"""
    query = {"status": "published"}
    if category:
        query["category"] = category
    
    skip = (page - 1) * limit
    posts = await db.blog_posts.find(query, {"_id": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.blog_posts.count_documents(query)
    
    return {"posts": posts, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/blog/posts/{post_id}")
async def get_blog_post(post_id: str):
    """Get single blog post"""
    post = await db.blog_posts.find_one({"post_id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Increment views
    await db.blog_posts.update_one({"post_id": post_id}, {"$inc": {"views": 1}})
    
    return post

@api_router.post("/blog/posts")
async def create_blog_post(request: Request):
    """Create blog post (admin only)"""
    user = await require_admin(request)
    body = await request.json()
    
    post_id = f"post_{uuid.uuid4().hex[:12]}"
    
    post_doc = {
        "post_id": post_id,
        "title": body.get("title"),
        "slug": body.get("slug") or body.get("title", "").lower().replace(" ", "-")[:50],
        "content": body.get("content"),
        "excerpt": body.get("excerpt") or body.get("content", "")[:200],
        "category": body.get("category", "general"),  # guides, tips, news
        "cover_image": body.get("cover_image"),
        "author_id": user["user_id"],
        "author_name": user["name"],
        "status": body.get("status", "published"),
        "views": 0,
        "tags": body.get("tags", []),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.blog_posts.insert_one(post_doc)
    return {"post_id": post_id, "message": "Post created successfully"}

@api_router.put("/blog/posts/{post_id}")
async def update_blog_post(post_id: str, request: Request):
    """Update blog post (admin only)"""
    await require_admin(request)
    body = await request.json()
    
    update_fields = {k: v for k, v in body.items() if k in ["title", "content", "excerpt", "category", "cover_image", "status", "tags"]}
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.blog_posts.update_one({"post_id": post_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post updated"}

@api_router.delete("/blog/posts/{post_id}")
async def delete_blog_post(post_id: str, request: Request):
    """Delete blog post (admin only)"""
    await require_admin(request)
    await db.blog_posts.delete_one({"post_id": post_id})
    return {"message": "Post deleted"}

@api_router.get("/blog/categories")
async def get_blog_categories():
    """Get blog categories"""
    return {
        "categories": [
            {"id": "guides", "name": "Ghiduri", "icon": "📚"},
            {"id": "tips", "name": "Sfaturi", "icon": "💡"},
            {"id": "news", "name": "Noutăți", "icon": "📰"},
            {"id": "success", "name": "Povești de Succes", "icon": "🏆"}
        ]
    }

# ===================== SUCCESS STORIES =====================

@api_router.get("/stories")
async def get_success_stories(page: int = 1, limit: int = 10):
    """Get success stories"""
    query = {"status": "approved"}
    skip = (page - 1) * limit
    
    stories = await db.success_stories.find(query, {"_id": 0}).sort([("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.success_stories.count_documents(query)
    
    return {"stories": stories, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/stories/{story_id}")
async def get_success_story(story_id: str):
    """Get single success story"""
    story = await db.success_stories.find_one({"story_id": story_id}, {"_id": 0})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story

@api_router.post("/stories")
async def create_success_story(request: Request):
    """Submit a success story"""
    user = await require_auth(request)
    body = await request.json()
    
    story_id = f"story_{uuid.uuid4().hex[:12]}"
    
    story_doc = {
        "story_id": story_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture"),
        "title": body.get("title"),
        "content": body.get("content"),
        "category": body.get("category"),  # auto, imobiliare, etc.
        "sold_item": body.get("sold_item"),
        "sold_price": body.get("sold_price"),
        "days_to_sell": body.get("days_to_sell"),
        "images": body.get("images", []),
        "status": "pending",  # pending, approved, rejected
        "likes": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.success_stories.insert_one(story_doc)
    return {"story_id": story_id, "message": "Povestea ta a fost trimisă și așteaptă aprobarea."}

@api_router.post("/stories/{story_id}/like")
async def like_story(story_id: str, request: Request):
    """Like a success story"""
    user = await require_auth(request)
    
    # Check if already liked
    existing = await db.story_likes.find_one({"story_id": story_id, "user_id": user["user_id"]})
    if existing:
        # Unlike
        await db.story_likes.delete_one({"story_id": story_id, "user_id": user["user_id"]})
        await db.success_stories.update_one({"story_id": story_id}, {"$inc": {"likes": -1}})
        return {"liked": False}
    else:
        # Like
        await db.story_likes.insert_one({
            "story_id": story_id,
            "user_id": user["user_id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.success_stories.update_one({"story_id": story_id}, {"$inc": {"likes": 1}})
        return {"liked": True}

@api_router.put("/stories/{story_id}/status")
async def update_story_status(story_id: str, request: Request):
    """Approve/reject story (admin only)"""
    await require_admin(request)
    body = await request.json()
    
    status = body.get("status")  # approved, rejected
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    await db.success_stories.update_one({"story_id": story_id}, {"$set": {"status": status}})
    return {"message": f"Story {status}"}

@api_router.get("/admin/stories")
async def get_admin_stories(request: Request, status: Optional[str] = None):
    """Get all stories for admin moderation"""
    await require_admin(request)
    
    query = {}
    if status:
        query["status"] = status
    
    stories = await db.success_stories.find(query, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    return {"stories": stories}

@api_router.delete("/admin/stories/{story_id}")
async def delete_story(story_id: str, request: Request):
    """Delete a story (admin only)"""
    await require_admin(request)
    await db.success_stories.delete_one({"story_id": story_id})
    return {"message": "Story deleted"}

@api_router.get("/admin/forum/threads")
async def get_admin_forum_threads(request: Request):
    """Get all forum threads for admin"""
    await require_admin(request)
    
    threads = await db.forum_threads.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    return {"threads": threads}

@api_router.put("/admin/forum/threads/{thread_id}/pin")
async def pin_forum_thread(thread_id: str, request: Request):
    """Pin/unpin a forum thread (admin only)"""
    await require_admin(request)
    body = await request.json()
    
    is_pinned = body.get("is_pinned", False)
    await db.forum_threads.update_one(
        {"thread_id": thread_id},
        {"$set": {"is_pinned": is_pinned}}
    )
    return {"message": "Thread updated"}

# ===================== COMMUNITY FORUM =====================

@api_router.get("/forum/categories")
async def get_forum_categories():
    """Get forum categories"""
    return {
        "categories": [
            {"id": "general", "name": "Discuții Generale", "icon": "💬", "description": "Orice subiect legat de vânzări și cumpărări"},
            {"id": "auto", "name": "Auto & Moto", "icon": "🚗", "description": "Discuții despre mașini și motociclete"},
            {"id": "imobiliare", "name": "Imobiliare", "icon": "🏠", "description": "Sfaturi pentru vânzare/cumpărare proprietăți"},
            {"id": "electronice", "name": "Electronice", "icon": "📱", "description": "Gadgeturi și tehnologie"},
            {"id": "tips", "name": "Sfaturi & Trucuri", "icon": "💡", "description": "Cum să vinzi mai rapid"},
            {"id": "support", "name": "Suport", "icon": "🆘", "description": "Întrebări despre platformă"}
        ]
    }

@api_router.get("/forum/threads")
async def get_forum_threads(
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Get forum threads"""
    query = {"status": "active"}
    if category:
        query["category"] = category
    
    skip = (page - 1) * limit
    threads = await db.forum_threads.find(query, {"_id": 0}).sort([("is_pinned", -1), ("last_reply_at", -1)]).skip(skip).limit(limit).to_list(limit)
    total = await db.forum_threads.count_documents(query)
    
    return {"threads": threads, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/forum/threads/{thread_id}")
async def get_forum_thread(thread_id: str):
    """Get forum thread with replies"""
    thread = await db.forum_threads.find_one({"thread_id": thread_id}, {"_id": 0})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    # Increment views
    await db.forum_threads.update_one({"thread_id": thread_id}, {"$inc": {"views": 1}})
    
    # Get replies
    replies = await db.forum_replies.find({"thread_id": thread_id}, {"_id": 0}).sort([("created_at", 1)]).to_list(100)
    
    thread["replies"] = replies
    return thread

@api_router.post("/forum/threads")
async def create_forum_thread(request: Request):
    """Create forum thread"""
    user = await require_auth(request)
    body = await request.json()
    
    thread_id = f"thread_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    thread_doc = {
        "thread_id": thread_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture"),
        "title": body.get("title"),
        "content": body.get("content"),
        "category": body.get("category", "general"),
        "status": "active",
        "is_pinned": False,
        "views": 0,
        "reply_count": 0,
        "last_reply_at": now,
        "created_at": now
    }
    
    await db.forum_threads.insert_one(thread_doc)
    return {"thread_id": thread_id, "message": "Thread created"}

@api_router.post("/forum/threads/{thread_id}/reply")
async def reply_to_thread(thread_id: str, request: Request):
    """Reply to forum thread"""
    user = await require_auth(request)
    body = await request.json()
    
    # Check thread exists
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    reply_id = f"reply_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    
    reply_doc = {
        "reply_id": reply_id,
        "thread_id": thread_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_picture": user.get("picture"),
        "content": body.get("content"),
        "likes": 0,
        "created_at": now
    }
    
    await db.forum_replies.insert_one(reply_doc)
    
    # Update thread
    await db.forum_threads.update_one(
        {"thread_id": thread_id},
        {"$inc": {"reply_count": 1}, "$set": {"last_reply_at": now}}
    )
    
    return {"reply_id": reply_id, "message": "Reply posted"}

@api_router.delete("/forum/threads/{thread_id}")
async def delete_forum_thread(thread_id: str, request: Request):
    """Delete forum thread (owner or admin)"""
    user = await require_auth(request)
    
    thread = await db.forum_threads.find_one({"thread_id": thread_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if thread["user_id"] != user["user_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.forum_threads.delete_one({"thread_id": thread_id})
    await db.forum_replies.delete_many({"thread_id": thread_id})
    
    return {"message": "Thread deleted"}

# ===================== EXTERNAL AD BANNERS =====================

@api_router.get("/ad-banners")
async def get_ad_banners(position: Optional[str] = None):
    """Get external advertisement banners"""
    query = {"status": "active"}
    if position:
        query["position"] = position
    
    now = datetime.now(timezone.utc)
    query["$or"] = [
        {"expires_at": None},
        {"expires_at": {"$gt": now.isoformat()}}
    ]
    
    banners = await db.ad_banners.find(query, {"_id": 0}).to_list(50)
    
    # Track impressions
    for banner in banners:
        await db.ad_banners.update_one(
            {"banner_id": banner["banner_id"]},
            {"$inc": {"impressions": 1}}
        )
    
    return {"banners": banners}

@api_router.post("/ad-banners/{banner_id}/click")
async def track_banner_click(banner_id: str):
    """Track banner click"""
    await db.ad_banners.update_one(
        {"banner_id": banner_id},
        {"$inc": {"clicks": 1}}
    )
    return {"tracked": True}

@api_router.post("/ad-banners")
async def create_ad_banner(request: Request):
    """Create ad banner (admin only)"""
    await require_admin(request)
    body = await request.json()
    
    banner_id = f"adbanner_{uuid.uuid4().hex[:12]}"
    
    banner_doc = {
        "banner_id": banner_id,
        "title": body.get("title"),
        "image_url": body.get("image_url"),
        "link_url": body.get("link_url"),
        "position": body.get("position", "sidebar"),  # sidebar, header, footer, between_ads
        "advertiser": body.get("advertiser"),
        "price_per_month": body.get("price_per_month", 0),
        "status": body.get("status", "active"),
        "impressions": 0,
        "clicks": 0,
        "starts_at": body.get("starts_at", datetime.now(timezone.utc).isoformat()),
        "expires_at": body.get("expires_at"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ad_banners.insert_one(banner_doc)
    return {"banner_id": banner_id, "message": "Ad banner created"}

@api_router.get("/ad-banners/admin")
async def get_all_ad_banners(request: Request):
    """Get all ad banners for admin"""
    await require_admin(request)
    banners = await db.ad_banners.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    return {"banners": banners}

@api_router.put("/ad-banners/{banner_id}")
async def update_ad_banner(banner_id: str, request: Request):
    """Update ad banner (admin only)"""
    await require_admin(request)
    body = await request.json()
    
    update_fields = {k: v for k, v in body.items() if k in ["title", "image_url", "link_url", "position", "advertiser", "price_per_month", "status", "expires_at"]}
    
    await db.ad_banners.update_one({"banner_id": banner_id}, {"$set": update_fields})
    return {"message": "Ad banner updated"}

@api_router.delete("/ad-banners/{banner_id}")
async def delete_ad_banner(banner_id: str, request: Request):
    """Delete ad banner (admin only)"""
    await require_admin(request)
    await db.ad_banners.delete_one({"banner_id": banner_id})
    return {"message": "Ad banner deleted"}

# ===================== ESCROW / SECURE PAYMENT SYSTEM =====================

@api_router.post("/escrow/create")
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
        logger.error(f"Escrow payment error: {str(e)}")
        raise HTTPException(status_code=502, detail="Payment service unavailable")

@api_router.get("/escrow/my-transactions")
async def get_my_escrow_transactions(request: Request):
    """Get user's escrow transactions (as buyer or seller)"""
    user = await require_auth(request)
    
    transactions = await db.escrow_transactions.find(
        {"$or": [{"buyer_id": user["user_id"]}, {"seller_id": user["user_id"]}]},
        {"_id": 0}
    ).sort([("created_at", -1)]).to_list(50)
    
    return {"transactions": transactions}

@api_router.post("/escrow/{escrow_id}/confirm-delivery")
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

@api_router.post("/escrow/{escrow_id}/dispute")
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

# ===================== AD REPORTING SYSTEM =====================

REPORT_REASONS = [
    {"id": "spam", "name": "Spam sau conținut fals"},
    {"id": "inappropriate", "name": "Conținut inadecvat sau ofensator"},
    {"id": "scam", "name": "Tentativă de înșelăciune"},
    {"id": "duplicate", "name": "Anunț duplicat"},
    {"id": "wrong_category", "name": "Categorie greșită"},
    {"id": "illegal", "name": "Activitate ilegală"},
    {"id": "personal_info", "name": "Date personale expuse"},
    {"id": "other", "name": "Altul"}
]

@api_router.get("/report/reasons")
async def get_report_reasons():
    """Get list of report reasons"""
    return {"reasons": REPORT_REASONS}

@api_router.post("/ads/{ad_id}/report")
async def report_ad(ad_id: str, request: Request):
    """Report an ad for review"""
    body = await request.json()
    
    reason = body.get("reason")
    description = body.get("description", "")
    
    if not reason:
        raise HTTPException(status_code=400, detail="Motivul raportului este obligatoriu")
    
    # Verify ad exists
    ad = await db.ads.find_one({"ad_id": ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail="Anunțul nu a fost găsit")
    
    # Check if user is logged in (optional - can report anonymously)
    reporter_id = None
    try:
        user = await require_auth(request)
        reporter_id = user["user_id"]
        
        # Check if user already reported this ad
        existing = await db.reports.find_one({
            "ad_id": ad_id,
            "reporter_id": reporter_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="Ai raportat deja acest anunț")
    except HTTPException as e:
        if e.status_code != 401:
            raise e
    
    report_id = f"rep_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    report_doc = {
        "report_id": report_id,
        "ad_id": ad_id,
        "ad_title": ad.get("title"),
        "ad_owner_id": ad.get("user_id"),
        "reporter_id": reporter_id,
        "reason": reason,
        "reason_label": next((r["name"] for r in REPORT_REASONS if r["id"] == reason), reason),
        "description": description,
        "status": "pending",  # pending, reviewed, dismissed, action_taken
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.reports.insert_one(report_doc)
    
    # Increment report count on ad
    await db.ads.update_one(
        {"ad_id": ad_id},
        {"$inc": {"report_count": 1}}
    )
    
    # If ad has too many reports, auto-suspend for review
    updated_ad = await db.ads.find_one({"ad_id": ad_id})
    if updated_ad.get("report_count", 0) >= 5 and updated_ad.get("status") == "active":
        await db.ads.update_one(
            {"ad_id": ad_id},
            {"$set": {"status": "reported", "auto_suspended": True}}
        )
        # Send email to ad owner
        try:
            await send_email(
                to=updated_ad.get("contact_email") or "",
                subject="Anunțul tău a fost suspendat pentru verificare",
                html=f"""
                <h2>Anunțul tău a fost suspendat temporar</h2>
                <p>Anunțul <strong>{updated_ad['title']}</strong> a primit mai multe raportări și a fost suspendat automat pentru verificare.</p>
                <p>Echipa noastră va analiza cazul și vei fi notificat în cel mai scurt timp.</p>
                """
            )
        except:
            pass
    
    return {"message": "Mulțumim pentru raportare! Echipa noastră va verifica anunțul."}

@api_router.get("/admin/reports")
async def get_reports(
    request: Request,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Get reports for admin review"""
    user = await require_auth(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status and status != "all":
        query["status"] = status
    
    skip = (page - 1) * limit
    
    reports = await db.reports.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reports.count_documents(query)
    
    # Get stats
    stats = {
        "pending": await db.reports.count_documents({"status": "pending"}),
        "reviewed": await db.reports.count_documents({"status": "reviewed"}),
        "dismissed": await db.reports.count_documents({"status": "dismissed"}),
        "action_taken": await db.reports.count_documents({"status": "action_taken"})
    }
    
    return {
        "reports": reports,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "stats": stats
    }

@api_router.put("/admin/reports/{report_id}")
async def update_report(report_id: str, request: Request):
    """Update report status and take action"""
    user = await require_auth(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    body = await request.json()
    new_status = body.get("status")
    action = body.get("action")  # none, warn, suspend, delete
    admin_notes = body.get("admin_notes", "")
    
    report = await db.reports.find_one({"report_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Raportul nu a fost găsit")
    
    now = datetime.now(timezone.utc)
    
    # Update report
    await db.reports.update_one(
        {"report_id": report_id},
        {"$set": {
            "status": new_status,
            "action": action,
            "admin_notes": admin_notes,
            "reviewed_by": user["user_id"],
            "reviewed_at": now.isoformat(),
            "updated_at": now.isoformat()
        }}
    )
    
    # Take action on the ad
    ad_id = report["ad_id"]
    
    if action == "warn":
        # Send warning to ad owner
        ad = await db.ads.find_one({"ad_id": ad_id})
        if ad:
            try:
                await send_email(
                    to=ad.get("contact_email") or "",
                    subject="Avertisment - Anunțul tău a fost raportat",
                    html=f"""
                    <h2>Avertisment pentru anunțul: {ad['title']}</h2>
                    <p>Anunțul tău a primit o raportare validă. Te rugăm să te asiguri că respectă regulamentul platformei.</p>
                    <p>Motiv: {report['reason_label']}</p>
                    """
                )
            except:
                pass
                
    elif action == "suspend":
        # Suspend the ad
        await db.ads.update_one(
            {"ad_id": ad_id},
            {"$set": {"status": "suspended", "suspended_reason": f"Raportare: {report['reason_label']}"}}
        )
        
    elif action == "delete":
        # Delete the ad
        await db.ads.delete_one({"ad_id": ad_id})
    
    # If ad was auto-suspended and action is dismiss, reactivate it
    if action == "none" and new_status == "dismissed":
        ad = await db.ads.find_one({"ad_id": ad_id})
        if ad and ad.get("auto_suspended"):
            await db.ads.update_one(
                {"ad_id": ad_id},
                {"$set": {"status": "active", "auto_suspended": False}}
            )
    
    return {"message": "Raportul a fost actualizat"}

# ===================== PUBLIC API =====================
# API endpoints for third-party developers (no auth required, rate limited)

from collections import defaultdict
import time

# Simple rate limiter
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

@api_router.get("/public/v1/status")
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

@api_router.get("/public/v1/ads")
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

@api_router.get("/public/v1/ads/{ad_id}")
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

@api_router.get("/public/v1/categories")
async def public_get_categories(request: Request):
    """Public API - Get all categories"""
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    return {
        "success": True,
        "data": CATEGORIES
    }

@api_router.get("/public/v1/cities")
async def public_get_cities(request: Request):
    """Public API - Get all cities"""
    client_ip = request.client.host
    if not check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    return {
        "success": True,
        "data": ROMANIAN_CITIES
    }

@api_router.get("/public/v1/search")
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

# ===================== STATIC FILES =====================

from fastapi.staticfiles import StaticFiles

# Import route modules
from routes import loyalty_router, referral_router, escrow_router, public_api_router, seller_router, auth_router, payments_router
from routes.loyalty import init_db as init_loyalty_db, init_auth as init_loyalty_auth
from routes.referral import init_db as init_referral_db, init_auth as init_referral_auth, init_add_points
from routes.escrow import init_dependencies as init_escrow_deps
from routes.public_api import init_dependencies as init_public_api_deps
from routes.seller import init_dependencies as init_seller_deps
from routes.auth import init_dependencies as init_auth_deps
from routes.payments import init_dependencies as init_payments_deps

# Initialize route module dependencies
init_loyalty_db(db)
init_loyalty_auth(require_auth)
init_referral_db(db)
init_referral_auth(require_auth)
init_add_points(add_points)
init_escrow_deps(db, require_auth, get_viva_access_token, VIVA_API_BASE, VIVA_SOURCE_CODE, VIVA_CHECKOUT_BASE, logger)
init_public_api_deps(db, CATEGORIES, ROMANIAN_CITIES)
init_seller_deps(db, require_auth, get_user_level)
init_auth_deps(db, logger, hash_password, generate_token, get_current_user, require_auth, send_email_notification)
init_payments_deps(db, logger, require_auth, get_viva_access_token, send_email_notification, VIVA_API_BASE, VIVA_SOURCE_CODE, VIVA_CHECKOUT_BASE)

# Include modular routers
app.include_router(loyalty_router, prefix="/api")
app.include_router(referral_router, prefix="/api")
app.include_router(escrow_router, prefix="/api")
app.include_router(public_api_router, prefix="/api")
app.include_router(seller_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(payments_router, prefix="/api")

# Include main router
app.include_router(api_router)

# Mount uploads directory under /api/uploads for proper routing through ingress
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# CORS - specific origins for credentials support
ALLOWED_ORIGINS = [
    "https://x67digital.com",
    "https://www.x67digital.com",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://classifieds-hub-53.preview.emergentagent.com"
]

# Cache middleware for static data
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class CacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        
        # Add cache headers for public API and static data
        path = request.url.path
        if path.startswith("/api/public/") or path.startswith("/api/categories") or path.startswith("/api/cities") or path.startswith("/api/judete"):
            response.headers["Cache-Control"] = "public, max-age=3600"  # 1 hour cache
        elif path.startswith("/api/ads") and request.method == "GET":
            response.headers["Cache-Control"] = "public, max-age=60"  # 1 minute cache for ads
        
        return response

app.add_middleware(CacheMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
