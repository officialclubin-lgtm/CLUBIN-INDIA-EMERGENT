# UltraMsg WhatsApp Integration Helper

import httpx
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

async def send_whatsapp_message(
    phone: str,
    message: str,
    image_url: Optional[str] = None
) -> bool:
    """
    Send WhatsApp message using UltraMsg API
    
    Args:
        phone: Phone number with country code (e.g., +919876543210)
        message: Text message to send
        image_url: Optional image URL to send
    
    Returns:
        bool: Success status
    """
    ultramsg_instance = os.getenv('ULTRAMSG_INSTANCE_ID')
    ultramsg_token = os.getenv('ULTRAMSG_TOKEN')
    
    if not ultramsg_instance or not ultramsg_token:
        logger.warning("UltraMsg credentials not configured. Message not sent.")
        return False
    
    # Clean phone number (remove + and spaces)
    phone = phone.replace('+', '').replace(' ', '').replace('-', '')
    
    try:
        url = f"https://api.ultramsg.com/{ultramsg_instance}/messages/chat"
        
        payload = {
            "token": ultramsg_token,
            "to": phone,
            "body": message,
        }
        
        if image_url:
            payload["image"] = image_url
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, data=payload)
            
            if response.status_code == 200:
                logger.info(f"WhatsApp message sent successfully to {phone}")
                return True
            else:
                logger.error(f"UltraMsg error: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {e}")
        return False


async def send_booking_confirmation_whatsapp(booking: dict, qr_image_url: Optional[str] = None) -> bool:
    """
    Send booking confirmation via WhatsApp
    
    Args:
        booking: Booking dictionary
        qr_image_url: Optional URL to QR code image
    
    Returns:
        bool: Success status
    """
    phone = booking.get('user_phone', '')
    if not phone:
        logger.warning(f"No phone number for booking {booking.get('booking_id')}")
        return False
    
    message = f"""🎉 *CLUBIN INDIA - Booking Confirmed* 🎉

✅ Your entry booking is confirmed!

📋 *Booking Details:*
🆔 Booking ID: {booking.get('booking_id')}
👤 Name: {booking.get('user_name')}
🏢 Club: {booking.get('club_name')}
📅 Date: {booking.get('entry_date')}
⏰ Time: {booking.get('entry_time', '09:00 PM')}
🎫 Entry: {booking.get('quantity')}x {booking.get('entry_type', '').title()}
💰 Amount: ₹{booking.get('total_amount')}

🎯 *Important:*
• Show your Golden QR code at the club entrance
• Carry your original ID proof
• Entry subject to club policies

📱 View your QR code in the app under "My Bookings"

Thank you for choosing CLUBIN INDIA! 🥂

_India's Premium Nightlife Booking Platform_
"""
    
    return await send_whatsapp_message(phone, message, qr_image_url)


async def send_otp_whatsapp(phone: str, otp: str) -> bool:
    """
    Send OTP via WhatsApp
    
    Args:
        phone: Phone number with country code
        otp: OTP code
    
    Returns:
        bool: Success status
    """
    message = f"""🔐 *CLUBIN INDIA - OTP Verification*

Your verification code is: *{otp}*

⚠️ Valid for 5 minutes only
🔒 Do not share this code with anyone

_India's Premium Nightlife Booking Platform_
"""
    
    return await send_whatsapp_message(phone, message)


async def send_cancellation_whatsapp(booking: dict) -> bool:
    """
    Send booking cancellation confirmation via WhatsApp
    
    Args:
        booking: Booking dictionary
    
    Returns:
        bool: Success status
    """
    phone = booking.get('user_phone', '')
    if not phone:
        return False
    
    message = f"""❌ *CLUBIN INDIA - Booking Cancelled*

Your booking has been cancelled successfully.

📋 *Cancelled Booking:*
🆔 Booking ID: {booking.get('booking_id')}
🏢 Club: {booking.get('club_name')}
📅 Date: {booking.get('entry_date')}
💰 Refund: ₹{booking.get('total_amount')}

💳 Refund will be processed within 5-7 business days

Need help? Contact our support team.

_India's Premium Nightlife Booking Platform_
"""
    
    return await send_whatsapp_message(phone, message)
