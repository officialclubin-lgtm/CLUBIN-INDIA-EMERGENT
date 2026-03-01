# CLUBIN INDIA - Customer App

A premium mobile application for discovering and booking nightclub entries in India. Built with Expo (React Native), FastAPI, and MongoDB.

## 🎯 Features

### Customer App Features
- **Google OAuth Authentication** - Seamless login with Emergent Auth
- **Club Discovery** - Browse clubs by city with search functionality
- **Club Details** - View prices, events, ratings, and descriptions
- **Booking System** - Book entry for Male/Female/Couple categories
- **Payment Integration** - Razorpay payment gateway (demo mode available)
- **QR Code Generation** - Unique QR codes for verified entry at clubs
- **Booking Management** - View all bookings, cancel if needed
- **User Profile** - Manage account and logout

## 🏗️ Tech Stack

### Frontend (Mobile App)
- **Expo & React Native** - Cross-platform mobile development
- **Expo Router** - File-based navigation
- **TypeScript** - Type-safe development
- **Axios** - API communication
- **AsyncStorage** - Local data persistence
- **React Native QR Code** - QR code display

### Backend (API Server)
- **FastAPI** - High-performance Python API framework
- **MongoDB** - NoSQL database with Motor async driver
- **Razorpay** - Payment processing
- **QRCode** - QR code generation
- **Emergent Auth** - OAuth integration
- **Pydantic** - Data validation

## 📱 App Structure

```
frontend/
├── app/
│   ├── (tabs)/           # Tab navigation screens
│   │   ├── home.tsx      # Discover clubs
│   │   ├── bookings.tsx  # My bookings
│   │   └── profile.tsx   # User profile
│   ├── club/[id].tsx     # Club detail & booking
│   ├── booking/[id].tsx  # Booking detail with QR
│   ├── login.tsx         # Login screen
│   └── index.tsx         # App entry point
├── contexts/
│   └── AuthContext.tsx   # Authentication state
└── app.json              # Expo configuration

backend/
└── server.py             # Complete API with all endpoints
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and Yarn
- Python 3.11+
- MongoDB running
- Expo Go app (for mobile testing)

### Installation

1. **Backend Setup**
```bash
cd /app/backend
pip install -r requirements.txt
```

2. **Frontend Setup**
```bash
cd /app/frontend
yarn install
```

3. **Environment Variables**

Backend (.env):
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
RAZORPAY_KEY_ID=your_key_here  # Optional - demo mode available
RAZORPAY_KEY_SECRET=your_secret_here
```

Frontend (.env):
```env
EXPO_PUBLIC_BACKEND_URL=https://clubin-preview.preview.emergentagent.com
```

### Running the App

1. **Start Backend**
```bash
sudo supervisorctl restart backend
```

2. **Start Frontend**
```bash
sudo supervisorctl restart expo
```

3. **Access the App**
- Web: Check logs for the preview URL
- Mobile: Scan QR code with Expo Go app

## 📊 Database Schema

### Collections

**users**
```json
{
  "user_id": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://...",
  "phone": "+91...",
  "created_at": "2025-02-17T..."
}
```

**clubs**
```json
{
  "club_id": "club_001",
  "name": "Skybar Lounge",
  "city": "Mumbai",
  "address": "Bandra West",
  "description": "Premium rooftop lounge...",
  "images": ["base64..."],
  "entry_price_male": 1500,
  "entry_price_female": 1000,
  "entry_price_couple": 2500,
  "events": [...],
  "available_slots": 200,
  "rating": 4.5,
  "created_at": "2025-02-17T..."
}
```

**bookings**
```json
{
  "booking_id": "booking_xyz789",
  "user_id": "user_abc123",
  "club_id": "club_001",
  "club_name": "Skybar Lounge",
  "entry_type": "couple",
  "quantity": 1,
  "total_amount": 2500,
  "entry_date": "2025-02-21",
  "status": "confirmed",
  "payment_id": "pay_...",
  "qr_code": "base64...",
  "created_at": "2025-02-17T..."
}
```

**user_sessions**
```json
{
  "user_id": "user_abc123",
  "session_token": "token_xyz...",
  "expires_at": "2025-02-24T...",
  "created_at": "2025-02-17T..."
}
```

## 🔐 API Endpoints

### Public Endpoints
- `GET /api/` - Health check
- `GET /api/clubs` - List clubs (with optional city filter)
- `GET /api/clubs/{club_id}` - Get club details
- `GET /api/cities` - Get available cities

### Authentication Endpoints
- `POST /api/auth/session` - Exchange session_id for session token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Protected Endpoints (Require Authorization header)
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - List user bookings
- `GET /api/bookings/{booking_id}` - Get booking details
- `POST /api/bookings/{booking_id}/cancel` - Cancel booking
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment & generate QR

## 💳 Payment Integration

The app supports **Razorpay** payment gateway:

### Production Setup
1. Get API keys from [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Add keys to backend `.env` file
3. Payment will automatically work in live mode

### Demo Mode
- If Razorpay keys are not configured, the app works in demo mode
- Payment verification is automatic for testing
- QR codes are still generated properly

## 📱 Mobile App Features

### Navigation
- **Bottom Tabs**: Discover, My Bookings, Profile
- **Stack Navigation**: Club details, Booking details
- **Deep Linking**: Support for auth redirects

### UI/UX Highlights
- Dark theme optimized for nightlife branding
- Pull-to-refresh on listing screens
- Smooth animations and transitions
- Touch-friendly 44pt minimum targets
- Safe area handling for notched devices
- Loading states and error handling

### Permissions Required
- **Camera**: For QR code scanning (future Partner App)
- **Storage**: Save booking confirmations
- **Location**: Find nearby clubs (optional)

## 🎨 Branding

### Colors
- Primary: `#8B5CF6` (Purple)
- Background: `#0A0A0A` (Near Black)
- Cards: `#1F1F1F` (Dark Gray)
- Text: `#FFFFFF` (White)
- Accent: `#EC4899` (Pink)

### Design System
- 8pt grid spacing
- Border radius: 12px (buttons), 16px (cards)
- Typography: System fonts (San Francisco on iOS, Roboto on Android)

## 🧪 Testing

Backend testing completed with 13/13 tests passing:
- ✅ Club listing and filtering
- ✅ Authentication flow
- ✅ Booking creation and cancellation
- ✅ Payment order creation
- ✅ Payment verification with QR generation
- ✅ Session management

## 📦 Sample Data

The app comes with 5 sample clubs:
1. **Skybar Lounge** - Mumbai (₹1000-2500)
2. **Prism Club** - Delhi (₹1200-3000)
3. **Kitty Su** - Bangalore (₹1000-2800)
4. **Privee** - Mumbai (₹1500-3500)
5. **AntiSocial** - Delhi (₹800-1800)

## 🔄 Future Enhancements

### Planned for Partner App
- QR code scanner for entry verification
- Dashboard for club owners
- Real-time entry tracking
- Revenue analytics
- Event management

### Customer App V2
- Push notifications for bookings
- Loyalty points system
- Social sharing of bookings
- Club reviews and ratings
- Image gallery for clubs
- GPS-based club discovery
- Promo code system
- Multiple payment methods

## 🐛 Known Issues

- Payment gateway requires Razorpay keys for production
- Club images are placeholders (need base64 upload feature)
- Push notifications not yet implemented

## 📝 License

MIT License - Feel free to use for your projects

## 👥 Support

For issues or questions:
- Check logs: `/var/log/supervisor/`
- Backend errors: Check FastAPI logs
- Frontend errors: Check Metro bundler console

## 🎉 Credits

Built with ❤️ using:
- Expo & React Native
- FastAPI
- MongoDB
- Razorpay
- Emergent Auth
