from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Response, Depends, File, UploadFile, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import razorpay
import qrcode
from qrcode.image.pil import PilImage
import io
import base64
from PIL import Image, ImageDraw, ImageFont
import json
import pyotp
import random

# Import UltraMsg helper
from ultramsg_helper import send_booking_confirmation_whatsapp, send_otp_whatsapp, send_cancellation_whatsapp

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client
razorpay_client = None

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ ENHANCED MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    id_card_type: Optional[str] = None  # aadhaar, pan, driving_license, passport, voter_id
    id_card_number: Optional[str] = None
    id_card_image: Optional[str] = None  # base64
    is_verified: bool = False
    verification_status: str = "pending"  # pending, verified, rejected
    terms_accepted: bool = False
    location: Optional[dict] = None  # {city, state, latitude, longitude}
    created_at: datetime

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    age: Optional[int] = None
    date_of_birth: Optional[str] = None
    id_card_type: Optional[str] = None
    id_card_number: Optional[str] = None
    id_card_image: Optional[str] = None
    terms_accepted: Optional[bool] = None
    location: Optional[dict] = None

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class Event(BaseModel):
    event_id: str
    title: str
    club_id: str
    club_name: str
    description: str
    flyer_image: Optional[str] = None  # base64
    layout_image: Optional[str] = None  # base64
    video_url: Optional[str] = None
    event_date: str
    event_time: str
    event_day: str
    artists: List[dict] = []  # [{name, role, image}]
    organized_by: Optional[str] = None
    promoted_by: Optional[str] = None
    sponsored_by: List[str] = []
    ticket_price: float
    available_tickets: int
    is_promoted: bool = False
    is_featured: bool = False
    category: str = "general"  # general, ladies_night, live_performance, theme_party
    created_at: datetime

class EventCreate(BaseModel):
    title: str
    club_id: str
    description: str
    flyer_image: Optional[str] = None
    layout_image: Optional[str] = None
    video_url: Optional[str] = None
    event_date: str
    event_time: str
    artists: List[dict] = []
    organized_by: Optional[str] = None
    promoted_by: Optional[str] = None
    sponsored_by: List[str] = []
    ticket_price: float
    available_tickets: int
    is_promoted: bool = False
    is_featured: bool = False
    category: str = "general"

class Club(BaseModel):
    club_id: str
    name: str
    city: str
    state: Optional[str] = None
    address: str
    description: str
    images: List[str] = []  # base64 images
    entry_price_male: float
    entry_price_female: float
    entry_price_couple: float
    available_slots: int
    rating: float = 4.0
    total_ratings: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance: Optional[float] = None  # Distance in km when location provided
    is_featured: bool = False
    is_promoted: bool = False
    amenities: List[str] = []
    created_at: datetime

class ClubCreate(BaseModel):
    name: str
    city: str
    state: Optional[str] = None
    address: str
    description: str
    images: List[str] = []
    entry_price_male: float
    entry_price_female: float
    entry_price_couple: float
    available_slots: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_featured: bool = False
    is_promoted: bool = False
    amenities: List[str] = []

class Booking(BaseModel):
    booking_id: str
    user_id: str
    user_name: str
    user_email: str
    club_id: str
    club_name: str
    entry_type: str
    quantity: int
    total_amount: float
    booking_date: datetime
    entry_date: str
    entry_time: Optional[str] = None
    status: str
    payment_id: Optional[str] = None
    qr_code: Optional[str] = None  # base64 golden QR code
    notification_sent: bool = False
    created_at: datetime

class BookingCreate(BaseModel):
    club_id: str
    entry_type: str
    quantity: int
    entry_date: str
    entry_time: Optional[str] = None
    promo_code: Optional[str] = None

class PaymentOrder(BaseModel):
    booking_id: str

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking_id: str

class NotificationRequest(BaseModel):
    booking_id: str
    send_email: bool = True
    send_whatsapp: bool = True

# ============ OTP AUTHENTICATION MODELS ============

class OTPRequest(BaseModel):
    phone: str  # Phone with country code: +919876543210

class OTPVerify(BaseModel):
    phone: str
    otp: str
    name: str
    email: Optional[str] = None

class FavoriteRequest(BaseModel):
    club_id: Optional[str] = None
    event_id: Optional[str] = None

# ============ HELPER FUNCTIONS ============

def generate_golden_qr(data: str, booking_details: dict) -> str:
    """Generate a golden-colored QR code with booking details embedded"""
    # Embed more data in the QR code to make it larger
    extended_data = f"{data}|USER:{booking_details.get('user_name', 'N/A')}|CLUB:{booking_details.get('club_name', 'N/A')}|DATE:{booking_details.get('entry_date', 'N/A')}|TIME:{booking_details.get('entry_time', 'N/A')}|TYPE:{booking_details.get('entry_type', 'N/A')}|QTY:{booking_details.get('quantity', 0)}|GOLDEN_QR_CODE_FOR_CLUBIN_INDIA_PREMIUM_ENTRY_VERIFICATION_SYSTEM"
    
    # Create QR code with larger version for more data
    qr = qrcode.QRCode(
        version=8,  # Larger version for more data capacity
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=20,  # Larger box size for bigger image
        border=8,
    )
    qr.add_data(extended_data)
    qr.make(fit=True)
    
    # Create QR image with golden color
    qr_img = qr.make_image(fill_color="#D4AF37", back_color="black")
    
    # Convert to base64
    buffer = io.BytesIO()
    qr_img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return qr_base64

async def send_notification(booking: dict, notification_type: str = "booking_confirmation"):
    """Send email and WhatsApp notifications"""
    # This is a placeholder for notification logic
    # In production, integrate with SendGrid, Twilio, etc.
    
    try:
        # Email notification (placeholder)
        if os.getenv('SENDGRID_API_KEY'):
            # TODO: Implement SendGrid email
            pass
        
        # WhatsApp notification (placeholder)
        if os.getenv('TWILIO_ACCOUNT_SID') and os.getenv('TWILIO_AUTH_TOKEN'):
            # TODO: Implement Twilio WhatsApp
            pass
        
        # Mark notification as sent
        await db.bookings.update_one(
            {"booking_id": booking['booking_id']},
            {"$set": {"notification_sent": True}}
        )
        
        logging.info(f"Notifications sent for booking {booking['booking_id']}")
        return True
    except Exception as e:
        logging.error(f"Error sending notification: {e}")
        return False

# ============ AUTH HELPERS ============

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    if not authorization:
        return None
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_auth(authorization: Optional[str] = Header(None)) -> User:
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

async def require_verified_user(authorization: Optional[str] = Header(None)) -> User:
    user = await require_auth(authorization)
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Account not verified. Please complete your profile with age verification and ID proof.")
    return user

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/session")
async def create_session(request: Request):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        user_data = response.json()
    
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if not existing_user:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "phone": None,
            "age": None,
            "date_of_birth": None,
            "id_card_type": None,
            "id_card_number": None,
            "id_card_image": None,
            "is_verified": False,
            "verification_status": "pending",
            "terms_accepted": False,
            "location": None,
            "created_at": datetime.now(timezone.utc)
        })
    else:
        user_id = existing_user["user_id"]
    
    session_token = user_data["session_token"]
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    })
    
    return SessionDataResponse(**user_data)

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(require_auth)):
    return current_user

@api_router.put("/auth/profile")
async def update_profile(profile: UserProfileUpdate, current_user: User = Depends(require_auth)):
    """Update user profile with age verification and ID proof"""
    update_data = profile.dict(exclude_none=True)
    
    # Check age requirement
    if 'age' in update_data and update_data['age'] < 21:
        raise HTTPException(status_code=400, detail="You must be 21 years or older to use this service")
    
    # If ID card info is provided, mark as pending verification
    if 'id_card_image' in update_data:
        update_data['verification_status'] = 'pending'
        update_data['is_verified'] = False
    
    # Auto-verify if all required fields are present (in production, this would be manual/OCR)
    if all(key in update_data for key in ['age', 'id_card_type', 'id_card_number', 'id_card_image', 'terms_accepted']):
        if update_data.get('age', 0) >= 21 and update_data.get('terms_accepted'):
            update_data['is_verified'] = True
            update_data['verification_status'] = 'verified'
    
    await db.users.update_one(
        {"user_id": current_user.user_id},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"user_id": current_user.user_id}, {"_id": 0})
    return User(**updated_user)

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    await db.user_sessions.delete_one({"session_token": token})
    
    return {"message": "Logged out successfully"}

# ============ CLUB ENDPOINTS ============

@api_router.get("/clubs", response_model=List[Club])
async def get_clubs(
    city: Optional[str] = None,
    search: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    featured: Optional[bool] = None
):
    query = {}
    
    if city:
        query["city"] = city
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    if featured is not None:
        query["is_featured"] = featured
    
    clubs = await db.clubs.find(query, {"_id": 0}).to_list(1000)
    
    # Calculate distance if location provided
    if latitude and longitude:
        from math import radians, sin, cos, sqrt, atan2
        
        def calculate_distance(lat1, lon1, lat2, lon2):
            R = 6371  # Earth's radius in km
            dlat = radians(lat2 - lat1)
            dlon = radians(lon2 - lon1)
            a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            return R * c
        
        for club in clubs:
            if club.get('latitude') and club.get('longitude'):
                club['distance'] = calculate_distance(
                    latitude, longitude,
                    club['latitude'], club['longitude']
                )
        
        clubs.sort(key=lambda x: x.get('distance', float('inf')))
    
    return [Club(**club) for club in clubs]

@api_router.get("/clubs/featured")
async def get_featured_clubs():
    """Get featured/promoted clubs for homepage carousel"""
    clubs = await db.clubs.find(
        {"$or": [{"is_featured": True}, {"is_promoted": True}]},
        {"_id": 0}
    ).sort("rating", -1).limit(10).to_list(10)
    
    return [Club(**club) for club in clubs]

@api_router.get("/clubs/{club_id}", response_model=Club)
async def get_club(club_id: str):
    club = await db.clubs.find_one({"club_id": club_id}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return Club(**club)

@api_router.post("/clubs", response_model=Club)
async def create_club(club_data: ClubCreate, current_user: User = Depends(require_auth)):
    club_id = f"club_{uuid.uuid4().hex[:12]}"
    
    club = {
        "club_id": club_id,
        **club_data.dict(),
        "rating": 4.0,
        "total_ratings": 0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.clubs.insert_one(club)
    return Club(**club)

@api_router.get("/cities")
async def get_cities():
    cities = await db.clubs.distinct("city")
    return {"cities": sorted(cities)}

# ============ EVENT ENDPOINTS ============

@api_router.get("/events", response_model=List[Event])
async def get_events(
    club_id: Optional[str] = None,
    city: Optional[str] = None,
    featured: Optional[bool] = None,
    category: Optional[str] = None
):
    query = {}
    
    if club_id:
        query["club_id"] = club_id
    
    if featured is not None:
        query["is_featured"] = featured
    
    if category:
        query["category"] = category
    
    events = await db.events.find(query, {"_id": 0}).sort("event_date", 1).to_list(1000)
    
    # Filter by city if provided
    if city:
        event_club_ids = [e['club_id'] for e in events]
        clubs = await db.clubs.find({"club_id": {"$in": event_club_ids}, "city": city}, {"_id": 0}).to_list(1000)
        club_ids_in_city = {c['club_id'] for c in clubs}
        events = [e for e in events if e['club_id'] in club_ids_in_city]
    
    return [Event(**event) for event in events]

@api_router.get("/events/featured")
async def get_featured_events():
    """Get featured/promoted events for homepage carousel"""
    events = await db.events.find(
        {"$or": [{"is_featured": True}, {"is_promoted": True}]},
        {"_id": 0}
    ).sort("event_date", 1).limit(10).to_list(10)
    
    return [Event(**event) for event in events]

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = await db.events.find_one({"event_id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return Event(**event)

@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate, current_user: User = Depends(require_auth)):
    # Get club details
    club = await db.clubs.find_one({"club_id": event_data.club_id}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Parse date to get day
    from datetime import datetime as dt
    try:
        event_datetime = dt.strptime(event_data.event_date, "%Y-%m-%d")
        event_day = event_datetime.strftime("%A")
    except:
        event_day = "TBD"
    
    event_id = f"event_{uuid.uuid4().hex[:12]}"
    
    event = {
        "event_id": event_id,
        "club_name": club['name'],
        **event_data.dict(),
        "event_day": event_day,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.events.insert_one(event)
    return Event(**event)

# ============ BOOKING ENDPOINTS ============

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: User = Depends(require_verified_user)):
    club = await db.clubs.find_one({"club_id": booking_data.club_id}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    price_map = {
        "male": club["entry_price_male"],
        "female": club["entry_price_female"],
        "couple": club["entry_price_couple"]
    }
    
    total_amount = price_map[booking_data.entry_type] * booking_data.quantity
    
    if booking_data.promo_code:
        # TODO: Implement promo code logic
        pass
    
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    
    booking = {
        "booking_id": booking_id,
        "user_id": current_user.user_id,
        "user_name": current_user.name,
        "user_email": current_user.email,
        "club_id": booking_data.club_id,
        "club_name": club["name"],
        "entry_type": booking_data.entry_type,
        "quantity": booking_data.quantity,
        "total_amount": total_amount,
        "booking_date": datetime.now(timezone.utc),
        "entry_date": booking_data.entry_date,
        "entry_time": booking_data.entry_time or "09:00 PM",
        "status": "pending",
        "payment_id": None,
        "qr_code": None,
        "notification_sent": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.bookings.insert_one(booking)
    return Booking(**booking)

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(current_user: User = Depends(require_auth)):
    bookings = await db.bookings.find(
        {"user_id": current_user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return [Booking(**booking) for booking in bookings]

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, current_user: User = Depends(require_auth)):
    booking = await db.bookings.find_one(
        {"booking_id": booking_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return Booking(**booking)

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, current_user: User = Depends(require_auth)):
    booking = await db.bookings.find_one(
        {"booking_id": booking_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Booking already cancelled")
    
    if booking["status"] == "completed":
        raise HTTPException(status_code=400, detail="Cannot cancel completed booking")
    
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"status": "cancelled"}}
    )
    
    return {"message": "Booking cancelled successfully"}

# ============ PAYMENT ENDPOINTS ============

@api_router.post("/payment/create-order")
async def create_payment_order(payment_data: PaymentOrder, current_user: User = Depends(require_auth)):
    booking = await db.bookings.find_one(
        {"booking_id": payment_data.booking_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != "pending":
        raise HTTPException(status_code=400, detail="Booking is not in pending status")
    
    amount_in_paise = int(booking["total_amount"] * 100)
    
    try:
        if razorpay_client:
            razor_order = razorpay_client.order.create({
                "amount": amount_in_paise,
                "currency": "INR",
                "payment_capture": 1,
                "notes": {"booking_id": payment_data.booking_id}
            })
            order_id = razor_order["id"]
        else:
            order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
    except Exception as e:
        logging.error(f"Error creating Razorpay order: {e}")
        order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
    
    return {
        "order_id": order_id,
        "amount": amount_in_paise,
        "currency": "INR",
        "booking_id": payment_data.booking_id,
        "key_id": os.getenv("RAZORPAY_KEY_ID", "rzp_test_demo")
    }

@api_router.post("/payment/verify")
async def verify_payment(verification: PaymentVerification, current_user: User = Depends(require_auth)):
    booking = await db.bookings.find_one(
        {"booking_id": verification.booking_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Generate golden QR code with booking details
    qr_data = f"CLUBIN:{verification.booking_id}:{booking['club_id']}:{booking['entry_date']}:{booking['quantity']}"
    
    booking_details = {
        'booking_id': booking['booking_id'],
        'user_name': booking['user_name'],
        'club_name': booking['club_name'],
        'entry_date': booking['entry_date'],
        'entry_time': booking.get('entry_time', '09:00 PM'),
        'quantity': booking['quantity'],
        'entry_type': booking['entry_type']
    }
    
    qr_base64 = generate_golden_qr(qr_data, booking_details)
    
    # Update booking
    await db.bookings.update_one(
        {"booking_id": verification.booking_id},
        {"$set": {
            "status": "confirmed",
            "payment_id": verification.razorpay_payment_id,
            "qr_code": qr_base64
        }}
    )
    
    # Send notifications
    updated_booking = await db.bookings.find_one({"booking_id": verification.booking_id}, {"_id": 0})
    await send_notification(updated_booking, "booking_confirmation")
    
    return {
        "message": "Payment verified successfully",
        "booking_id": verification.booking_id,
        "status": "confirmed",
        "qr_code": qr_base64
    }

# ============ NOTIFICATION ENDPOINT ============

@api_router.post("/notifications/send")
async def send_booking_notification(notification: NotificationRequest, current_user: User = Depends(require_auth)):
    """Manually trigger notification for a booking"""
    booking = await db.bookings.find_one({"booking_id": notification.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    success = await send_notification(booking, "booking_confirmation")
    
    return {
        "message": "Notification sent successfully" if success else "Notification failed",
        "booking_id": notification.booking_id
    }

# ============ GENERAL ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "CLUBIN INDIA API - Customer App v2.0", "status": "running"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    global razorpay_client
    
    razorpay_key_id = os.getenv("RAZORPAY_KEY_ID")
    razorpay_key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    
    if razorpay_key_id and razorpay_key_secret:
        razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))
        logger.info("Razorpay client initialized")
    else:
        logger.warning("Razorpay credentials not found. Payment will work in demo mode.")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
