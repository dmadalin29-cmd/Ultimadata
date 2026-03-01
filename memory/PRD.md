# X67 Digital Media Groupe - PRD

## Original Problem Statement
Build a classified ads marketplace website (x67digital.com) with:
- Categories: Escorts (with boost/promote), Real Estate, Cars, Jobs, Electronics, Fashion, Services, Animals
- All Romanian cities
- Photo uploads for ads
- Payment via Viva Wallet
- Admin panel: users, ads approval, banners management
- Ultra modern dark design
- Email notifications via Resend
- Multi-language support (Romanian + English)

## User Personas
1. **Ad Poster** - Users who want to sell/rent products or services
2. **Ad Browser** - Users looking to buy/rent
3. **Admin** - Platform managers who approve ads and manage banners

## Core Requirements
- User authentication (JWT + Google OAuth)
- Ad creation with multi-step form and photo upload
- Category-based browsing with filters
- Payment integration (Viva Wallet)
- Admin dashboard for content moderation
- Email notifications for user actions
- Responsive dark-themed UI
- Multi-language support (RO/EN)

---

## Latest Session Updates (Mar 1, 2026)

### ✅ Floating "Add Ad" Button (FAB) - COMPLETED
- Created responsive FAB component (`FloatingAddButton.jsx`)
- Features:
  - Centered at bottom of screen on mobile only (`sm:hidden`)
  - Dynamic positioning based on cookie/PWA banners
  - Hidden on specific pages (auth, create-ad, admin, messages, settings)
  - Beautiful glow effect with emerald-blue gradient
  - z-index 60 to stay above other elements
- **Tested on**: iPhone (375px), Android (412px), iPad (768px)

### ✅ Previous Session Updates (Feb 28, 2026)

### Multi-Language Feature - COMPLETED
- Fixed LanguageContext to use React state (no page reload)
- Language preference persisted in localStorage
- Translations added for all major components:
  - Header, Footer, HomePage, AuthPage, AdCard
- Support for date formatting with locale switching
- **Tested: 100% pass rate**

### Viva Wallet Webhook - CONFIGURED
- Webhook URL: `https://ultimadata-production.up.railway.app/api/payments/webhook`
- Verification Key: `475FFE73819D67134BBB2D6690A9023714C14E2E`
- Event: "Plată tranzacție creată" (Transaction Payment Created)

### Major Refactoring - COMPLETED
Extracted 9 route modules from monolithic server.py (2327 lines total):

| Module | Lines | Functionality |
|--------|-------|---------------|
| `admin.py` | 616 | Dashboard, users, ads, analytics, export, reports |
| `auth.py` | 400 | Authentication, register, login, Google OAuth |
| `content.py` | 257 | Blog/Forum/Stories |
| `payments.py` | 252 | Viva Wallet integration, webhooks |
| `public_api.py` | 225 | Public API (rate limited) |
| `escrow.py` | 182 | Secure payments |
| `loyalty.py` | 146 | Points and levels system |
| `seller.py` | 122 | Seller dashboard |
| `referral.py` | 104 | Referral program |

**Testing Results: 100% pass rate (30/30 backend tests, frontend OK)**

---

## Architecture

### Backend Structure
```
/app/backend/
├── server.py (6323 lines - main entry, includes modules)
├── routes/
│   ├── __init__.py
│   ├── admin.py (616)
│   ├── auth.py (400)
│   ├── content.py (257)
│   ├── payments.py (252)
│   ├── public_api.py (225)
│   ├── escrow.py (182)
│   ├── loyalty.py (146)
│   ├── seller.py (122)
│   └── referral.py (104)
├── models/
├── utils/
└── tests/
    └── test_refactored_routes.py
```

### Frontend Structure
```
/app/frontend/src/
├── components/
│   ├── ui/ (Shadcn components)
│   ├── Header.jsx
│   ├── Footer.jsx
│   └── AdCard.jsx
├── pages/
│   ├── HomePage.jsx
│   ├── AuthPage.jsx
│   ├── AdminPage.jsx
│   └── ...
├── i18n/
│   ├── LanguageContext.jsx
│   └── translations.js (200+ keys, RO/EN)
└── App.js
```

---

## Technical Stack
- **Backend**: FastAPI, Python 3.11
- **Frontend**: React 19, TailwindCSS, Shadcn UI
- **Database**: MongoDB Atlas
- **Payment**: Viva Wallet
- **Email**: Resend
- **Auth**: JWT + Emergent Google OAuth
- **Image Storage**: Cloudinary
- **Map**: Leaflet.js + OpenStreetMap
- **Charts**: Recharts

## Third-Party Integrations
| Service | Purpose | Status |
|---------|---------|--------|
| Viva Wallet | Payments | ✅ Configured with webhook |
| Cloudinary | Images/Videos | ✅ Active |
| Resend | Emails | ✅ Active |
| Emergent Google Auth | OAuth | ✅ Active |
| MongoDB Atlas | Database | ✅ Active |
| Twilio | WhatsApp | ✅ Active |
| Emergent Integrations | AI moderation | ✅ Active |
| Leaflet + OpenStreetMap | Maps | ✅ Active |
| Recharts | Charts | ✅ Active |

## Deployment
- **Frontend**: Hostinger (x67digital.com)
- **Backend**: Railway (ultimadata-production.up.railway.app)
- **Database**: MongoDB Atlas

---

## Test Reports
- `/app/test_reports/iteration_13.json` - Refactoring tests (100% pass)
- `/app/test_reports/iteration_12.json` - Multi-language tests (100% pass)
- `/app/backend/tests/test_refactored_routes.py` - 30 comprehensive tests

## Test Credentials
- **Admin**: d.madalin29@gmail.com / admin123
- **Test User**: test123@test.com / test1234

---

## API Endpoints Summary

### Auth (`/api/auth/`)
- POST `/register`, `/login`, `/logout`
- GET `/me`, `/token`
- POST `/google-session`, `/forgot-password`, `/reset-password`
- PUT `/profile`

### Payments (`/api/payments/`)
- POST `/create-order`
- GET/POST `/webhook`
- GET `/verify/{order_code}`

### Admin (`/api/admin/`)
- GET `/users`, `/ads`, `/stats`, `/reports`
- PUT `/users/{id}`, `/ads/{id}/status`, `/reports/{id}`
- DELETE `/users/{id}`, `/banners/{id}`
- GET `/analytics/dashboard`, `/export/users`, `/export/ads`
- GET/POST `/categories`, `/verification-requests`

### Public API (`/api/public/v1/`)
- GET `/status`, `/ads`, `/categories`, `/cities`, `/search`
- Rate limited: 100 requests/minute per IP

### Loyalty (`/api/loyalty/`)
- GET `/status`, `/leaderboard`
- POST `/claim-daily`

### Seller (`/api/seller/`)
- GET `/dashboard`, `/earnings`

### Referral (`/api/referral/`)
- GET `/code`, `/list`
- POST `/apply`

### Escrow (`/api/escrow/`)
- POST `/create`
- GET `/my-transactions`
- POST `/{id}/confirm-delivery`, `/{id}/dispute`

---

## Known Issues

### P0 - Critical (Production)
**Cross-domain authentication issue on x67digital.com**
- Users report being logged out when sending messages
- Cause: Cookie handling between Hostinger and Railway domains
- Preview environment works correctly
- **Recommendation**: Consider same-domain setup or investigate SameSite cookie policies

### Technical Debt
- Server.py still has duplicate code (can be removed after thorough testing)
- Server.py: 6323 lines (should be ~4000 after cleanup)

---

## Prioritized Backlog

### P0 (Critical)
- [ ] Fix production authentication (cross-domain cookies)

### P1 (High)
- [ ] Remove duplicate code from server.py
- [ ] Video Chat (WebRTC)
- [ ] Browser Push Notifications

### P2 (Medium)
- [ ] Verify PWA iPhone layout fix
- [ ] Add more languages (DE, FR, IT)
- [ ] Rich-text editor for Blog/Forum
- [ ] Public API documentation page (Swagger)

### P3 (Low)
- [ ] Auction system
- [ ] Advanced identity verification
- [ ] Mobile app

---

## Completed Features (All Sessions)

### Session 6 (Current)
- ✅ Multi-language system (RO/EN)
- ✅ Viva Wallet webhook configuration
- ✅ Major backend refactoring (9 modules)
- ✅ Comprehensive testing (30 tests)

### Session 5
- ✅ Interactive Map (Leaflet.js)
- ✅ Ad Reporting System
- ✅ Graphical Admin Dashboard (Recharts)
- ✅ Public API v1
- ✅ SEO Content Generation

### Session 4
- ✅ Paid Promotions System
- ✅ Premium Subscriptions
- ✅ Escrow Payment System
- ✅ AI Auto-moderation
- ✅ Video in Ads
- ✅ Blog & Stories
- ✅ Community Forum
- ✅ Banner Ads System

### Session 3
- ✅ Seller Dashboard
- ✅ Loyalty Program
- ✅ Referral System

### Session 2
- ✅ Cloudinary Integration
- ✅ Dark Theme
- ✅ PWA iOS Fixes
- ✅ CORS Configuration

### Session 1
- ✅ Core marketplace functionality
- ✅ Viva Wallet Top-Up
- ✅ Cookie Consent
- ✅ Image Lightbox
- ✅ View tracking
- ✅ PWA Install

---

## Database Collections
| Collection | Purpose |
|------------|---------|
| `users` | User accounts |
| `user_sessions` | Auth sessions |
| `ads` | Advertisements |
| `payments` | Payment records |
| `banners` | Homepage banners |
| `reviews` | Seller reviews |
| `reports` | Ad reports |
| `judete` | Romanian counties |
| `localitati` | Romanian localities |
| `blog_posts` | Blog articles |
| `forum_threads` | Forum discussions |
| `escrow_transactions` | Escrow payments |
| `premium_subscriptions` | Premium plans |
| `loyalty_points` | User loyalty |
| `referrals` | Referral codes |
| `identity_verifications` | ID verification requests |

---

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb+srv://...
DB_NAME=x67digital
VIVA_CLIENT_ID=...
VIVA_CLIENT_SECRET=...
VIVA_SOURCE_CODE=9750
VIVA_ENVIRONMENT=production
RESEND_API_KEY=...
SENDER_EMAIL=...
EMERGENT_LLM_KEY=...
CLOUDINARY_URL=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_FROM=...
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://ultimadata-production.up.railway.app
```

---

*Last updated: Feb 28, 2026*
