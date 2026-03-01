# CLUBIN INDIA - Product Requirements Document

## Problem Statement
Build a comprehensive mobile application platform called "CLUBIN INDIA" (inspired by TicketWings.in). The platform consists of:
- **Customer App** - For users to discover clubs, events, and book entries
- **Partner App** - For club owners to manage events and verify entries (Future)
- **Admin Panel** - For platform administration (Future)

## Theme & Branding
- **Colors**: Premium Black (#000000) & Gold (#D4AF37)
- **Logo**: CLUBIN INDIA custom logo
- **Target Market**: India (21+ nightlife audience)

## Architecture
- **Frontend**: Expo/React Native (Expo Router, TypeScript)
- **Backend**: FastAPI (Python) with MongoDB
- **Auth**: Firebase Phone Authentication (OTP via SMS)
- **Payments**: Razorpay (keys to be added)
- **Deployment**: Vercel-ready configuration

## What's Been Implemented

### Backend (FastAPI)
- [x] User management (CRUD, profile update, ID verification)
- [x] Firebase Authentication - token verification endpoint (`/api/auth/firebase/verify`)
- [x] Legacy OTP auth endpoints (still available as fallback)
- [x] Club CRUD endpoints with location-based sorting
- [x] Event CRUD endpoints with featured/promoted filtering
- [x] Booking system with Golden QR code generation
- [x] Payment order creation (Razorpay - demo mode)
- [x] Notification system (WhatsApp via UltraMsg - needs keys)
- [x] Session management with JWT-like tokens

### Frontend (Expo)
- [x] Black & Gold theme across all screens
- [x] Login screen with Firebase Phone Auth integration
- [x] OTP verification flow (phone → OTP → name → home)
- [x] Home screen with featured carousels, search, city filter
- [x] Club detail screen
- [x] Event detail screen
- [x] Booking screen with QR code display
- [x] Profile screen with verification badge
- [x] Complete Profile screen (ID verification, age check)
- [x] Tab navigation (Discover, Bookings, Profile)

### Deployment
- [x] `vercel.json` configuration
- [x] `DEPLOY.md` deployment guide
- [x] Build scripts in package.json

## Pending / In-Progress
- [ ] Razorpay payment integration (needs API keys from user)
- [ ] WhatsApp notifications (needs UltraMsg keys or removed in favor of Firebase)
- [ ] Multiple ticket categories (GA, VIP, Table)
- [ ] Guest details for multi-ticket bookings
- [ ] Favorites system (heart icon on clubs/events)

## Future Tasks (P2)
- [ ] Partner App (event management, QR scanner)
- [ ] Admin Panel (user management, analytics)
- [ ] Push notifications
- [ ] Email notifications (SendGrid)

## Key Environment Variables
### Backend (.env)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `FIREBASE_PROJECT_ID` - Firebase project ID for token verification
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` - Payment keys (optional)

### Frontend (.env)
- `EXPO_PUBLIC_BACKEND_URL` - Backend API URL

### Firebase Config (hardcoded in frontend/lib/firebase.ts)
- API Key: AIzaSyDAttaEeoCcT2xRR1-P811AqTphpp7jgY4
- Auth Domain: clubin-india-3d02c.firebaseapp.com
- Project ID: clubin-india-3d02c

## DB Collections
- `users` - User profiles with verification fields
- `user_sessions` - Session tokens
- `otp_codes` - OTP storage (legacy)
- `clubs` - Club listings
- `events` - Event listings
- `bookings` - Booking records with QR codes
