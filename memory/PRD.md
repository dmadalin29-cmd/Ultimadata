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
- Payment integration (currently FREE)
- Admin dashboard for content moderation
- Email notifications for user actions
- Responsive dark-themed UI
- Multi-language support (RO/EN)

---

## Latest Updates (Feb 28, 2026)

### SESSION 6 - Multi-Language Feature Completion:

**🌍 Multi-Language System - COMPLETED:**
- Fixed LanguageContext to NOT use window.location.reload()
- Language changes now happen dynamically via React state
- Language preference persisted in localStorage (key: `x67_language`)
- Translations added for all major components:
  - Header.jsx - navigation, menus, search placeholder
  - Footer.jsx - links, description, copyright
  - HomePage.jsx - all sections translated
  - AuthPage.jsx - login/register forms
  - AdCard.jsx - price labels, badges
- Support for date formatting (date-fns locale switching)
- **Tested: 100% pass rate**

**Files Updated:**
- `frontend/src/i18n/LanguageContext.jsx` - removed page reload hack
- `frontend/src/i18n/translations.js` - expanded with 200+ translation keys
- `frontend/src/components/Header.jsx` - added t() for all text
- `frontend/src/components/Footer.jsx` - added t() for all text
- `frontend/src/pages/HomePage.jsx` - added t() for all sections
- `frontend/src/pages/AuthPage.jsx` - added t() for all forms
- `frontend/src/components/AdCard.jsx` - added t() for badges/prices

---

## Previous Sessions Summary

### SESSION 5 Features (Completed):
- Interactive Map (Leaflet.js + OpenStreetMap)
- Ad Reporting System
- Graphical Admin Dashboard (Recharts)
- Public API v1
- SEO Content Generation
- Performance Optimizations

### SESSION 4 Features (Completed):
- Paid Promotions System
- Premium Subscriptions
- Escrow Payment System
- AI Auto-moderation
- Video in Ads
- Blog & Stories
- Community Forum
- Banner Ads System

### SESSION 3 Features (Completed):
- Seller Dashboard
- Loyalty Program
- Referral System

### SESSION 2 Features (Completed):
- Cloudinary Integration
- Dark Theme
- PWA iOS Fixes
- CORS Configuration

### SESSION 1 Features (Completed):
- Core marketplace functionality
- Viva Wallet Top-Up
- Cookie Consent
- Image Lightbox
- View tracking
- PWA Install

---

## Known Issues

### P0 - CRITICAL (Production Only)
**Authentication issue on production (x67digital.com)**
- Users report being logged out when sending messages
- Cookie cross-domain issue between Hostinger (frontend) and Railway (backend)
- Preview environment works correctly
- **Root cause:** Cross-domain cookie handling in browser
- **Recommended fix:** Configure backend cookies with proper domain settings or move to same-domain setup

### P1 - Urgent
**Backend Refactoring Needed**
- `server.py` has grown to 6278+ lines
- Needs to be split into separate route files
- Follow `REFACTORING_GUIDE.md`

---

## Technical Stack
- **Backend**: FastAPI, MongoDB, Python 3.11
- **Frontend**: React 19, TailwindCSS, Shadcn UI
- **Database**: MongoDB Atlas
- **Payment**: Viva Wallet (disabled - ads are FREE)
- **Email**: Resend
- **Auth**: JWT + Emergent Google OAuth
- **Image Storage**: Cloudinary
- **Map**: Leaflet.js + OpenStreetMap
- **Charts**: Recharts

## Third-Party Integrations
- Viva Wallet (payments)
- Cloudinary (images/videos)
- Resend (emails)
- Emergent Google Auth
- MongoDB Atlas
- Twilio (WhatsApp notifications)
- Emergent Integrations (AI moderation)
- Leaflet + OpenStreetMap (maps)
- Recharts (charts)

## Environment Variables
```
# Backend
MONGO_URL, DB_NAME, VIVA_*, RESEND_API_KEY, SENDER_EMAIL
EMERGENT_LLM_KEY, CLOUDINARY_URL, TWILIO_*

# Frontend
REACT_APP_BACKEND_URL
```

## Test Credentials
- **Admin**: d.madalin29@gmail.com / admin123
- **Test User**: test123@test.com / test1234

## Test Reports
- `/app/test_reports/iteration_12.json` - Multi-language tests (100% pass)
- `/app/test_reports/iteration_11.json` - Map & Reports tests
- `/app/test_reports/iteration_10.json` - Previous tests

---

## Prioritized Backlog

### P0 (Critical)
- [ ] Fix production authentication (cross-domain cookies)

### P1 (High)
- [ ] Refactor server.py into separate route files
- [ ] Video Chat (WebRTC)
- [ ] Browser Push Notifications (free alternative)

### P2 (Medium)
- [ ] Verify PWA iPhone layout fix
- [ ] Add more languages support
- [ ] Rich-text editor for Blog/Forum
- [ ] Public API documentation page

### P3 (Low)
- [ ] Auction system
- [ ] Advanced identity verification
- [ ] Mobile app

---

## API Endpoints Summary

### Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`
- POST `/api/auth/logout`
- POST `/api/auth/google-session`
- POST `/api/auth/forgot-password`
- POST `/api/auth/reset-password`

### Ads
- GET/POST `/api/ads`
- GET/PUT/DELETE `/api/ads/{ad_id}`
- GET `/api/ads/promoted`
- POST `/api/ads/{ad_id}/topup`

### Public API
- GET `/api/public/v1/status`
- GET `/api/public/v1/ads`
- GET `/api/public/v1/categories`
- GET `/api/public/v1/cities`
- GET `/api/public/v1/search`

### Admin
- GET `/api/admin/users`
- GET `/api/admin/reports`
- PUT `/api/admin/reports/{id}`
- GET `/api/admin/stats`

### Location
- GET `/api/judete`
- GET `/api/localitati`

### Messages
- GET/POST `/api/messages`
- GET `/api/messages/unread-count`

---

## Database Collections
- `users` - User accounts
- `user_sessions` - Auth sessions
- `ads` - All advertisements
- `payments` - Payment records
- `banners` - Homepage banners
- `reviews` - Seller reviews
- `reports` - Ad reports
- `judete` - Romanian counties
- `localitati` - Romanian localities
- `blog_posts` - Blog articles
- `forum_threads` - Forum discussions
- `escrow_transactions` - Escrow payments
- `premium_subscriptions` - Premium plans
- `loyalty_points` - User loyalty
- `referrals` - Referral codes
