# X67 Digital Media Groupe - PRD

## Original Problem Statement
Build a classified ads marketplace website (x67digital.com) with:
- Categories: Escorts (with boost/promote), Real Estate (apartments, houses, land), Cars (all brands/models), Jobs, Electronics, Fashion, Services, Animals
- All Romanian cities
- Photo uploads for ads
- Payment via Viva Wallet (2€ posting, 5€ promotion) - CURRENTLY DISABLED
- Escort boost feature (pay to appear first)
- Admin panel: users, ads approval, banners management
- Rotating banner system every 4-5 seconds
- Ultra modern dark design
- Email notifications via Resend

## User Personas
1. **Ad Poster** - Users who want to sell/rent products or services
2. **Ad Browser** - Users looking to buy/rent
3. **Admin** - Platform managers who approve ads and manage banners

## Core Requirements
- User authentication (JWT + Google OAuth)
- Ad creation with multi-step form and photo upload
- Category-based browsing with filters (city, subcategory, price, sort)
- Payment integration for ad posting (2€) and promotion (5€)
- Admin dashboard for content moderation
- Email notifications for user actions
- Responsive dark-themed UI

## Bug Fix (Feb 16, 2026) - Critical Production Fix
**Problem:** Site-ul live afișa pagină albă după push-ul anterior pe GitHub
**Cauză:** Biblioteca `emergentintegrations` a fost actualizată și funcția `chat()` a fost înlocuită cu clasa `LlmChat`
**Soluție:** 
- Actualizat importul de la `from emergentintegrations.llm.chat import chat, Message` la `from emergentintegrations.llm.chat import LlmChat, UserMessage`
- Actualizat endpoint-urile `/api/chatbot` și `/api/generate-description` pentru a folosi noua clasă `LlmChat`
**Status:** Codul a fost push-at pe GitHub (ambele repo-uri: Ultimadata și x67frontend)

## What's Been Implemented (Feb 16, 2026)

### Latest Update - 7 Major Features (Feb 16, 2026)
1. ✅ **Dark/Light Mode Toggle** - Buton soare/lună în header + meniu dropdown, preferință salvată în localStorage
2. ✅ **Dashboard Admin Avansat** - Statistici avansate cu:
   - Grafice trend 30 zile (anunțuri noi, utilizatori noi)
   - Distribuție pe categorii și orașe
   - Top 10 anunțuri după vizualizări
   - Rating platformă și total recenzii
3. ✅ **Export CSV** - Butoane "Export Utilizatori" și "Export Anunțuri" în admin
4. ✅ **Alerte de Preț** - Pagină dedicată `/price-alerts`:
   - Creează alertă cu categorie, oraș, preț maxim, cuvinte cheie
   - Toggle activare/dezactivare
   - "Vezi anunțuri potrivite" - afișează matches
5. ✅ **Chatbot AI Asistent** (GPT-5.2) - Widget floating în colț:
   - Conversație cu memorie (salvată în MongoDB)
   - Quick actions: "Cum postez un anunț?", "Categorii disponibile", "Alerte de preț"
   - Asistent în limba română pentru navigare platformă
6. ✅ **Descriere Generată AI** (GPT-5.2) - În formularul de creare anunț:
   - Buton "Generează cu AI" lângă câmpul descriere
   - Generează descriere profesională bazată pe titlu, categorie, oraș
7. ✅ **Chat în Timp Real** - Polling rapid (3 secunde) când o conversație e deschisă:
   - Notificări push pentru mesaje noi
   - Auto-refresh mesaje

### Previous - Reviews & Ratings System (Feb 16, 2026)
- ✅ **Seller Reviews** - Users can leave 1-5 star reviews with comments for sellers
- ✅ **Rating Display** - Average rating shown on:
  - Ad cards (star + rating number)
  - Ad detail page (next to seller name)
  - Seller profile page (full stats with distribution)
- ✅ **Seller Profile Page** (`/seller/:sellerId`) - Dedicated page showing:
  - Seller info and avatar
  - Member since date
  - "Vânzător de încredere" badge (if 10+ reviews with 4.5+ rating)
  - Rating distribution (5-star to 1-star bar chart)
  - All reviews with pagination
  - Active ads from seller
- ✅ **Review Form** - Interactive star selector with optional comment
- ✅ **Review Deletion** - Reviewers and admins can delete reviews
- ✅ **Auto-calculated Rating** - Average rating updates automatically on review add/delete

### Previous Update - PWA & Notifications System (Feb 16, 2026)
- ✅ **Progressive Web App (PWA)** - Site-ul poate fi instalat pe telefon ca aplicație nativă
- ✅ **Favicon Personalizat** - Logo X67 frumos cu gradient albastru-violet
- ✅ **Service Worker** - Pentru funcționalitate offline și push notifications
- ✅ **Push Notifications Native** - Notificări OS cu sunet pentru:
  - Mesaje noi primite
  - Anunțuri adăugate la favorite
  - Milestone-uri de vizualizări (100, 500, 1000)
  - Scăderi de preț la favorite
  - Anunț aprobat
  - (Admin) Anunțuri noi care necesită aprobare
  - (Admin) Utilizatori noi înregistrați
- ✅ **PWA Install Banner** - Banner frumos care apare automat pentru instalare
- ✅ **Badge cu Mesaje Necitite** - Animat în header și în titlul tab-ului
- ✅ **Manifest.json** - Pentru iOS/Android cu shortcuts și icoane

### Previous Update - 10 New Features (Feb 16, 2026)
1. ✅ **Forgot Password** - `/api/auth/forgot-password` sends reset email with token
2. ✅ **Reset Password** - `/api/auth/reset-password` validates token and updates password
3. ✅ **Admin Change User Password** - `/api/admin/users/{id}/password` allows admin to change any user's password
4. ✅ **Welcome Email** - Automatically sent to new users on registration
5. ✅ **Admin Email Notifications** - Emails sent to contact@x67digital.com when users register or post ads
6. ✅ **Scroll-to-Top** - ScrollToTop component scrolls page to top on navigation
7. ✅ **Auto-Approval Bot (FREE)** - All categories except "Escorts" are auto-approved (status='active')
8. ✅ **Escorts Manual Approval** - Escort ads require admin approval (status='pending')
9. ✅ **Updated Terms & Privacy** - Terms page clarifies Escorts = social companionship at events
10. ✅ **Escorts Clarification** - Blue info box explains Escorts category is for social events (meals, parties, galas)

### Backend (FastAPI + MongoDB)
- [x] User authentication (register, login, Google OAuth, logout)
- [x] **Password Reset Flow** - forgot-password, reset-password endpoints
- [x] Categories API with 8 main categories and extensive subcategories
- [x] Cities API with 41 Romanian cities
- [x] Car brands API with 20 brands and models
- [x] Motorcycle brands API with 15+ brands and models
- [x] Ads CRUD (create, read, update, delete)
- [x] **Auto-Approval Bot** - Non-escort ads are auto-approved
- [x] Ads filtering and search
- [x] Promoted/Boosted ads system
- [x] Payment integration with Viva Wallet (DISABLED - ads are FREE)
- [x] Image upload endpoint with /api/uploads prefix
- [x] Admin endpoints (users, ads approval, banners, **password change**)
- [x] Banner management system
- [x] Email notifications via Resend (welcome, ad approved, ad rejected, payment success, **password reset**, **admin notifications**)

### Frontend (React + TailwindCSS)
- [x] Homepage with banner carousel and category grid
- [x] Category page with filters (city, subcategory, price, sort)
- [x] Ad detail page with image gallery
- [x] Create ad multi-step form (FREE - no payment step)
- [x] User profile page
- [x] **Authentication pages** (login/register + Google + **Forgot Password** + **Reset Password**)
- [x] **Admin panel** (dashboard, users with **password change modal**, ads, banners)
- [x] **ScrollToTop** component for smooth navigation
- [x] Responsive design
- [x] Dark "Midnight & Neon" theme
- [x] Static pages: **Updated Terms** (/termeni-si-conditii), Privacy (/politica-confidentialitate), FAQ (/intrebari-frecvente)
- [x] **PWA Support** - Installable on mobile devices with custom favicon
- [x] **Push Notifications** - Native OS notifications with sound
- [x] **Offline Page** - Custom offline.html for when no connection
- [x] **Notification Context** - React context for managing notifications app-wide

### Email Notifications (Resend)
- [x] Welcome email on registration
- [x] Ad approved notification
- [x] Ad rejected notification
- [x] Payment confirmation email

### Categories & Subcategories (Complete)
1. **Escorte** - Dame, Domni, Trans, Masaj
2. **Imobiliare** - 16 subcategories (apartments 1-4+ rooms sale/rent, houses, land, commercial)
3. **Auto** - 20+ car brands with models
4. **Locuri de muncă** - 20+ job subcategories
5. **Electronice** - Phones, laptops, TVs, etc.
6. **Motociclete** - 15+ moto brands with models
7. **Servicii** - Various services
8. **Animale** - Dogs, cats, birds, etc.

## Prioritized Backlog

### P0 (Done)
- Core marketplace functionality ✅
- User authentication ✅
- Ad management ✅
- Admin panel ✅
- Email notifications ✅
- Static pages (Terms, Privacy, FAQ) ✅
- Categories and subcategories ✅
- **View statistics system** ✅ (Feb 11, 2026)
  - Auto-increment views on ad detail page
  - Display views on ad cards
  - Total views counter in user profile
- **Views milestone notifications** ✅ (Feb 11, 2026)
  - Email notifications at 100, 500, 1000, 5000, 10000 views
- **TopUp System (FREE)** ✅ (Feb 11, 2026)
  - TopUp button raises ad to top of category
  - Auto-TopUp: automatic every hour
  - Referral system: share link = TopUp every 40 min (vs 60)
- **Admin Enhancements** ✅ (Feb 11, 2026)
  - Block/unblock users with status display
  - Delete users with all associated data
  - Banner upload with files (images/videos max 15 sec)
- **Terms Page Updated** ✅ (Feb 11, 2026)
  - Updated for FREE posting, TopUp info

### P1 (Next)
- Re-enable Viva Wallet payment system when user decides
- Implement "Boost Ad" feature (ad appears at top of category for paid)
- Implement "Promote Ad" feature (ad featured on homepage for paid)

### P2 (Completed from Backlog - Feb 11, 2026)
- **Favorites System** ✅
  - Add/remove ads to favorites
  - Price drop detection and badge
  - Favorites page with saved ads
- **Messaging System** ✅
  - Send messages between users about ads
  - Conversations list with unread count
  - Real-time chat interface
  - Unread badge in header
- **Dashboard/Analytics** ✅
  - Overview stats (ads, views, favorites, messages)
  - Views chart (last 30 days bar chart)
  - Top ads by views
  - Per-ad performance table
- **Admin Categories/Cities Management** ✅
  - CRUD endpoints for managed_categories collection
  - CRUD endpoints for managed_cities collection

### P3 (Backlog)
- Mobile app
- Analytics dashboard
- SEO optimization
- Multi-language support

## Technical Stack
- **Backend**: FastAPI, MongoDB, Python 3.9+
- **Frontend**: React 19, TailwindCSS, Shadcn UI
- **Payment**: Viva Wallet (production credentials, currently disabled)
- **Email**: Resend (sandbox mode)
- **Auth**: JWT + Emergent Google OAuth
- **Image Storage**: Local /app/uploads directory

## Environment Variables
```
# Backend (.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
VIVA_CLIENT_ID=...
VIVA_CLIENT_SECRET=...
VIVA_SOURCE_CODE=9750
VIVA_ENVIRONMENT=production
RESEND_API_KEY=re_...
SENDER_EMAIL=onboarding@resend.dev

# Frontend (.env)
REACT_APP_BACKEND_URL=https://digitalbazar-4.preview.emergentagent.com
```

## API Endpoints
- `/api/auth/*` - Authentication (register, login, logout, google-session)
- `/api/categories` - Categories list with subcategories
- `/api/cities` - Romanian cities
- `/api/car-brands` - Car brands/models
- `/api/motorcycle-brands` - Motorcycle brands/models
- `/api/ads` - Ads CRUD and search
- `/api/ads/promoted` - Promoted ads for homepage
- `/api/upload` - Image upload (returns /api/uploads/filename)
- `/api/uploads/{filename}` - Static file serving
- `/api/payments/*` - Viva Wallet integration (disabled)
- `/api/admin/*` - Admin operations
- `/api/banners` - Banner management

## Database Collections
- `users` - User accounts
- `user_sessions` - Auth sessions
- `ads` - All advertisements
- `payments` - Payment records
- `banners` - Homepage banners

## Test Credentials
- **Admin 1**: admin@x67digital.com / admin
- **Admin 2**: contact@x67digital.com / Credcada1.

## Testing Status (Feb 16, 2026)
- Backend: 100% (18/18 tests passed for password reset and auto-approval)
- Frontend: 100% (all UI flows verified)
- Test report: /app/test_reports/iteration_7.json

## Critical Notes
1. **Payments DISABLED**: Ad posting is FREE. Viva Wallet code exists but payment step is bypassed.
2. **Resend Sandbox**: Emails only work to verified sender email. Verify domain x67digital.com for production.
3. **Image URLs**: Use /api/uploads prefix for Kubernetes ingress routing.
4. **Auto-Approval Bot**: All ads except "escorts" category are auto-approved. Escorts require manual admin approval.
5. **Password Reset**: Tokens expire after 1 hour. All user sessions are invalidated after password change.

## New API Endpoints (Feb 16, 2026)
- `/api/auth/forgot-password` - POST - Request password reset email
- `/api/auth/reset-password` - POST - Reset password with token
- `/api/admin/users/{user_id}/password` - PUT - Admin change user password
- `/api/reviews` - POST - Create a review for a seller
- `/api/reviews/seller/{seller_id}` - GET - Get all reviews for a seller (with pagination)
- `/api/reviews/user/{user_id}/stats` - GET - Get rating statistics and distribution
- `/api/reviews/{review_id}` - DELETE - Delete a review
