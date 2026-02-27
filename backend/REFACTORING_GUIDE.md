# Server.py Refactoring Guide

## Current Structure (5640+ lines)
The main server.py file contains all API endpoints. Below is the structure for future refactoring.

## Recommended Module Structure

```
backend/
├── server.py          # Main app entry point (reduced)
├── routes/
│   ├── __init__.py
│   ├── auth.py        # Authentication endpoints (/auth/*)
│   ├── ads.py         # Ad CRUD operations (/ads/*)
│   ├── users.py       # User management (/users/*)
│   ├── payments.py    # Viva Wallet integration (/payments/*, /viva/*)
│   ├── chat.py        # Messaging & WebSocket (/conversations/*, /ws/*)
│   ├── admin.py       # Admin panel endpoints (/admin/*)
│   ├── content.py     # Blog, Forum, Stories (/blog/*, /forum/*, /stories/*)
│   ├── loyalty.py     # Loyalty & Referral (/loyalty/*, /referral/*)
│   ├── premium.py     # Premium & Promotions (/premium/*, /promotions/*)
│   └── escrow.py      # Escrow transactions (/escrow/*)
├── models/
│   ├── __init__.py
│   ├── user.py        # User Pydantic models
│   ├── ad.py          # Ad Pydantic models
│   └── payment.py     # Payment Pydantic models
└── utils/
    ├── __init__.py
    ├── config.py      # Configuration & constants
    ├── auth.py        # Authentication helpers
    ├── helpers.py     # General utilities
    └── email.py       # Email templates & sending
```

## Section Locations in server.py (Line Numbers)

| Section | Start Line | Description |
|---------|------------|-------------|
| Imports & Config | 1-200 | Dependencies, DB, Viva config |
| Pydantic Models | 150-220 | Data models |
| Email Templates | 220-600 | HTML email templates |
| Helper Functions | 600-670 | Password hashing, tokens |
| AUTH Endpoints | 670-1000 | Register, login, Google OAuth |
| CATEGORIES | 1000-1200 | Category management |
| ADS Endpoints | 1200-1600 | Ad CRUD, AI verification |
| PAYMENTS | 1600-1950 | Viva Wallet integration |
| PREMIUM | 1750-1950 | Premium subscriptions |
| PROMOTIONS | 1950-2100 | Ad promotion system |
| UPLOAD | 2100-2300 | Image & video upload |
| BANNERS | 2400-2500 | Banner management |
| ADMIN | 2500-2900 | Admin panel endpoints |
| FAVORITES | 2900-3050 | Favorites system |
| SAVED SEARCHES | 3050-3250 | Price alerts |
| RECOMMENDATIONS | 3250-3350 | AI recommendations |
| COMPARISON | 3350-3550 | Ad comparison |
| OFFERS | 3550-3800 | Price negotiation |
| MESSAGING | 3800-4000 | Chat & WebSocket |
| AI CHATBOT | 4000-4100 | AI assistant |
| PRICE ALERTS | 4100-4250 | Alert system |
| REVIEWS | 4250-4350 | Review system |
| BADGES | 4350-4450 | Badge management |
| VERIFICATION | 4450-4650 | Identity verification |
| ANALYTICS | 4650-4750 | User analytics |
| LOYALTY | 4750-4900 | Points & levels |
| REFERRAL | 4900-5050 | Referral program |
| SELLER DASHBOARD | 5050-5150 | Seller stats |
| CATEGORIES MGMT | 5150-5300 | Category CRUD |
| BLOG/FORUM/STORIES | 5300-5550 | Community content |
| ESCROW | 5550-5620 | Secure payments |
| STATIC & CORS | 5620-5640 | Static files, middleware |

## Migration Steps

1. Create route module with APIRouter
2. Move endpoints from server.py to new module
3. Import and include router in server.py
4. Test thoroughly before each migration
5. Repeat for each section

## Files Already Created

- `/app/backend/utils/config.py` - Configuration & constants
- `/app/backend/utils/auth.py` - Auth helper functions
- `/app/backend/utils/helpers.py` - Utility functions
- `/app/backend/routes/content.py` - Blog, Forum, Stories (ready to use)

## Priority Order for Refactoring

1. **Content (Blog/Forum/Stories)** - New features, easy to extract
2. **Loyalty/Referral** - Self-contained system
3. **Premium/Promotions** - Payment-related but isolated
4. **Escrow** - New feature, well-defined
5. **Chat/Messaging** - Depends on WebSocket
6. **Auth** - Core functionality, careful migration
7. **Ads** - Largest section, most dependencies
8. **Admin** - Many dependencies on other modules
# Deploy trigger Fri Feb 27 22:17:50 UTC 2026
