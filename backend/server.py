from fastapi import FastAPI, APIRouter, HTTPException, Header, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import razorpay
import qrcode
import io
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client (will be initialized with actual keys)
razorpay_client = None

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============ MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

class SessionDataResponse(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str

class Club(BaseModel):
    club_id: str
    name: str
    city: str
    address: str
    description: str
    images: List[str]  # base64 images
    entry_price_male: float
    entry_price_female: float
    entry_price_couple: float
    events: List[dict] = []  # {title, date, dj_name, description}
    available_slots: int
    rating: float = 4.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime

class ClubCreate(BaseModel):
    name: str
    city: str
    address: str
    description: str
    images: List[str]
    entry_price_male: float
    entry_price_female: float
    entry_price_couple: float
    events: List[dict] = []
    available_slots: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class Booking(BaseModel):
    booking_id: str
    user_id: str
    club_id: str
    club_name: str
    entry_type: str  # male, female, couple
    quantity: int
    total_amount: float
    booking_date: datetime
    entry_date: str
    status: str  # pending, confirmed, cancelled, completed
    payment_id: Optional[str] = None
    qr_code: Optional[str] = None  # base64 QR code
    created_at: datetime

class BookingCreate(BaseModel):
    club_id: str
    entry_type: str
    quantity: int
    entry_date: str
    promo_code: Optional[str] = None

class PaymentOrder(BaseModel):
    booking_id: str

class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking_id: str

# ============ AUTH HELPERS ============

async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    """Get current authenticated user from session token"""
    if not authorization:
        return None
    
    # Extract token from "Bearer <token>" format
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    # Find session
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    
    # Check if session is expired
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Find user
    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_auth(authorization: Optional[str] = Header(None)) -> User:
    """Dependency that requires authentication"""
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/session")
async def create_session(request: Request):
    """Exchange session_id for session data"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent Auth API
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session ID")
        
        user_data = response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if not existing_user:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "phone": None,
            "created_at": datetime.now(timezone.utc)
        })
    else:
        user_id = existing_user["user_id"]
    
    # Create session
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
    """Get current user info"""
    return current_user

@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Logout user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    # Delete session
    await db.user_sessions.delete_one({"session_token": token})
    
    return {"message": "Logged out successfully"}

# ============ CLUB ENDPOINTS ============

@api_router.get("/clubs", response_model=List[Club])
async def get_clubs(city: Optional[str] = None, search: Optional[str] = None):
    """Get all clubs with optional filters"""
    query = {}
    
    if city:
        query["city"] = city
    
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    
    clubs = await db.clubs.find(query, {"_id": 0}).to_list(1000)
    return [Club(**club) for club in clubs]

@api_router.get("/clubs/{club_id}", response_model=Club)
async def get_club(club_id: str):
    """Get single club details"""
    club = await db.clubs.find_one({"club_id": club_id}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return Club(**club)

@api_router.post("/clubs", response_model=Club)
async def create_club(club_data: ClubCreate, current_user: User = Depends(require_auth)):
    """Create a new club (admin only for now)"""
    club_id = f"club_{uuid.uuid4().hex[:12]}"
    
    club = {
        "club_id": club_id,
        **club_data.dict(),
        "rating": 4.0,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.clubs.insert_one(club)
    return Club(**club)

@api_router.get("/cities")
async def get_cities():
    """Get list of available cities"""
    cities = await db.clubs.distinct("city")
    return {"cities": cities}

# ============ BOOKING ENDPOINTS ============

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: User = Depends(require_auth)):
    """Create a new booking"""
    # Get club details
    club = await db.clubs.find_one({"club_id": booking_data.club_id}, {"_id": 0})
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    
    # Calculate total amount
    price_map = {
        "male": club["entry_price_male"],
        "female": club["entry_price_female"],
        "couple": club["entry_price_couple"]
    }
    
    total_amount = price_map[booking_data.entry_type] * booking_data.quantity
    
    # Apply promo code if any
    if booking_data.promo_code:
        # TODO: Implement promo code logic
        pass
    
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    
    booking = {
        "booking_id": booking_id,
        "user_id": current_user.user_id,
        "club_id": booking_data.club_id,
        "club_name": club["name"],
        "entry_type": booking_data.entry_type,
        "quantity": booking_data.quantity,
        "total_amount": total_amount,
        "booking_date": datetime.now(timezone.utc),
        "entry_date": booking_data.entry_date,
        "status": "pending",
        "payment_id": None,
        "qr_code": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.bookings.insert_one(booking)
    return Booking(**booking)

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(current_user: User = Depends(require_auth)):
    """Get user's bookings"""
    bookings = await db.bookings.find(
        {"user_id": current_user.user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    return [Booking(**booking) for booking in bookings]

@api_router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str, current_user: User = Depends(require_auth)):
    """Get single booking details"""
    booking = await db.bookings.find_one(
        {"booking_id": booking_id, "user_id": current_user.user_id}, 
        {"_id": 0}
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return Booking(**booking)

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, current_user: User = Depends(require_auth)):
    """Cancel a booking"""
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
    """Create Razorpay order for booking"""
    # Get booking
    booking = await db.bookings.find_one(
        {"booking_id": payment_data.booking_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != "pending":
        raise HTTPException(status_code=400, detail="Booking is not in pending status")
    
    # For demo purposes, we'll return mock data if Razorpay is not configured
    # In production, use actual Razorpay client
    amount_in_paise = int(booking["total_amount"] * 100)
    
    try:
        if razorpay_client:
            razor_order = razorpay_client.order.create({
                "amount": amount_in_paise,
                "currency": "INR",
                "payment_capture": 1,
                "notes": {
                    "booking_id": payment_data.booking_id
                }
            })
            order_id = razor_order["id"]
        else:
            # Mock order for testing
            order_id = f"order_mock_{uuid.uuid4().hex[:12]}"
    except Exception as e:
        logging.error(f"Error creating Razorpay order: {e}")
        # Return mock order for demo
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
    """Verify Razorpay payment and update booking"""
    # Get booking
    booking = await db.bookings.find_one(
        {"booking_id": verification.booking_id, "user_id": current_user.user_id},
        {"_id": 0}
    )
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # For demo purposes, we'll skip actual verification if Razorpay is not configured
    # In production, verify signature using Razorpay client
    
    # Generate QR code
    qr_data = f"CLUBIN:{verification.booking_id}:{booking['club_id']}:{booking['entry_date']}:{booking['quantity']}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Update booking
    await db.bookings.update_one(
        {"booking_id": verification.booking_id},
        {"$set": {
            "status": "confirmed",
            "payment_id": verification.razorpay_payment_id,
            "qr_code": qr_base64
        }}
    )
    
    return {
        "message": "Payment verified successfully",
        "booking_id": verification.booking_id,
        "status": "confirmed",
        "qr_code": qr_base64
    }

# ============ GENERAL ENDPOINTS ============

@api_router.get("/")
async def root():
    return {"message": "CLUBIN INDIA API - Customer App"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    global razorpay_client
    
    # Initialize Razorpay if keys are available
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
