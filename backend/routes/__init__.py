"""
Routes Package
All API route modules for X67 Digital
"""
from .loyalty import router as loyalty_router
from .referral import router as referral_router
from .escrow import router as escrow_router
from .public_api import router as public_api_router
from .seller import router as seller_router
from .auth import router as auth_router
from .payments import router as payments_router

__all__ = [
    'loyalty_router',
    'referral_router', 
    'escrow_router',
    'public_api_router',
    'seller_router',
    'auth_router',
    'payments_router'
]
