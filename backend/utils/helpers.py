# Helper utilities
import httpx
import logging
from datetime import datetime, timezone

from .config import (
    VIVA_CLIENT_ID, VIVA_CLIENT_SECRET, VIVA_API_BASE,
    RESEND_API_KEY
)

logger = logging.getLogger(__name__)


async def get_viva_access_token() -> str:
    """Get Viva Wallet access token"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{VIVA_API_BASE}/connect/token",
            data={
                "grant_type": "client_credentials"
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
            },
            auth=(VIVA_CLIENT_ID, VIVA_CLIENT_SECRET)
        )
        
        if response.status_code != 200:
            logger.error(f"Viva token error: {response.status_code} - {response.text}")
            raise Exception("Failed to get Viva access token")
        
        data = response.json()
        return data["access_token"]


async def send_email(to: str, subject: str, html: str):
    """Send email via Resend"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": "X67 Digital Media <noreply@x67digital.com>",
                    "to": [to],
                    "subject": subject,
                    "html": html
                }
            )
            
            if response.status_code not in [200, 201]:
                logger.error(f"Email send error: {response.text}")
            
            return response.status_code in [200, 201]
    except Exception as e:
        logger.error(f"Email error: {str(e)}")
        return False


def format_datetime(dt: datetime = None) -> str:
    """Format datetime to ISO string"""
    if dt is None:
        dt = datetime.now(timezone.utc)
    return dt.isoformat()
