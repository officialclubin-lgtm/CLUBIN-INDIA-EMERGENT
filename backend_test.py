#!/usr/bin/env python3
"""
CLUBIN INDIA Backend API Testing Suite
Tests all backend endpoints including auth, clubs, bookings, and payments
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import base64

# Configuration
BACKEND_URL = "https://nightlife-booking-2.preview.emergentagent.com/api"
SESSION_TOKEN = "test_session_1771356850073"  # From MongoDB setup
USER_ID = "user_1771356850073"

# Test data
TEST_BOOKING_DATA = {
    "club_id": "club_001",
    "entry_type": "couple",
    "quantity": 1,
    "entry_date": "2025-02-22"
}

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {SESSION_TOKEN}'
        })
        self.test_results = []
        self.booking_id = None
        self.order_id = None
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            if response.status_code == 200:
                data = response.json()
                if "CLUBIN INDIA API" in data.get("message", ""):
                    self.log_test("Root endpoint", True, "API is accessible")
                else:
                    self.log_test("Root endpoint", False, "Unexpected response message", data)
            else:
                self.log_test("Root endpoint", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Root endpoint", False, f"Connection error: {str(e)}")
    
    def test_get_clubs(self):
        """Test GET /clubs endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/clubs")
            if response.status_code == 200:
                clubs = response.json()
                if isinstance(clubs, list) and len(clubs) > 0:
                    club = clubs[0]
                    required_fields = ['club_id', 'name', 'city', 'entry_price_male', 'entry_price_female', 'entry_price_couple']
                    missing_fields = [field for field in required_fields if field not in club]
                    
                    if not missing_fields:
                        self.log_test("GET /clubs", True, f"Found {len(clubs)} clubs with all required fields")
                    else:
                        self.log_test("GET /clubs", False, f"Missing fields: {missing_fields}", club)
                else:
                    self.log_test("GET /clubs", False, "No clubs found or invalid response format", clubs)
            else:
                self.log_test("GET /clubs", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /clubs", False, f"Error: {str(e)}")
    
    def test_get_clubs_with_city_filter(self):
        """Test GET /clubs with city filter"""
        try:
            response = self.session.get(f"{BACKEND_URL}/clubs?city=Mumbai")
            if response.status_code == 200:
                clubs = response.json()
                if isinstance(clubs, list):
                    mumbai_clubs = [club for club in clubs if club.get('city') == 'Mumbai']
                    if len(mumbai_clubs) == len(clubs) and len(clubs) > 0:
                        self.log_test("GET /clubs?city=Mumbai", True, f"Found {len(clubs)} Mumbai clubs")
                    elif len(clubs) == 0:
                        self.log_test("GET /clubs?city=Mumbai", True, "No Mumbai clubs found (valid response)")
                    else:
                        self.log_test("GET /clubs?city=Mumbai", False, "Filter not working properly", clubs)
                else:
                    self.log_test("GET /clubs?city=Mumbai", False, "Invalid response format", clubs)
            else:
                self.log_test("GET /clubs?city=Mumbai", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /clubs?city=Mumbai", False, f"Error: {str(e)}")
    
    def test_get_specific_club(self):
        """Test GET /clubs/{club_id}"""
        try:
            response = self.session.get(f"{BACKEND_URL}/clubs/club_001")
            if response.status_code == 200:
                club = response.json()
                if club.get('club_id') == 'club_001' and club.get('name'):
                    self.log_test("GET /clubs/club_001", True, f"Retrieved club: {club.get('name')}")
                else:
                    self.log_test("GET /clubs/club_001", False, "Invalid club data", club)
            elif response.status_code == 404:
                self.log_test("GET /clubs/club_001", False, "Club not found", response.text)
            else:
                self.log_test("GET /clubs/club_001", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /clubs/club_001", False, f"Error: {str(e)}")
    
    def test_get_cities(self):
        """Test GET /cities endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/cities")
            if response.status_code == 200:
                data = response.json()
                if 'cities' in data and isinstance(data['cities'], list):
                    cities = data['cities']
                    if len(cities) > 0:
                        self.log_test("GET /cities", True, f"Found cities: {cities}")
                    else:
                        self.log_test("GET /cities", False, "No cities found", data)
                else:
                    self.log_test("GET /cities", False, "Invalid response format", data)
            else:
                self.log_test("GET /cities", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /cities", False, f"Error: {str(e)}")
    
    def test_auth_me(self):
        """Test GET /auth/me endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/auth/me")
            if response.status_code == 200:
                user = response.json()
                if user.get('user_id') == USER_ID and user.get('email'):
                    self.log_test("GET /auth/me", True, f"Authenticated as: {user.get('name')} ({user.get('email')})")
                else:
                    self.log_test("GET /auth/me", False, "Invalid user data", user)
            elif response.status_code == 401:
                self.log_test("GET /auth/me", False, "Authentication failed - invalid token", response.text)
            else:
                self.log_test("GET /auth/me", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /auth/me", False, f"Error: {str(e)}")
    
    def test_create_booking(self):
        """Test POST /bookings endpoint"""
        try:
            response = self.session.post(f"{BACKEND_URL}/bookings", json=TEST_BOOKING_DATA)
            if response.status_code == 200:
                booking = response.json()
                required_fields = ['booking_id', 'user_id', 'club_id', 'total_amount', 'status']
                missing_fields = [field for field in required_fields if field not in booking]
                
                if not missing_fields:
                    self.booking_id = booking['booking_id']
                    self.log_test("POST /bookings", True, 
                                f"Created booking {self.booking_id} for ₹{booking['total_amount']}")
                else:
                    self.log_test("POST /bookings", False, f"Missing fields: {missing_fields}", booking)
            elif response.status_code == 401:
                self.log_test("POST /bookings", False, "Authentication required", response.text)
            elif response.status_code == 404:
                self.log_test("POST /bookings", False, "Club not found", response.text)
            else:
                self.log_test("POST /bookings", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /bookings", False, f"Error: {str(e)}")
    
    def test_get_bookings(self):
        """Test GET /bookings endpoint"""
        try:
            response = self.session.get(f"{BACKEND_URL}/bookings")
            if response.status_code == 200:
                bookings = response.json()
                if isinstance(bookings, list):
                    if len(bookings) > 0:
                        booking = bookings[0]
                        if booking.get('user_id') == USER_ID:
                            self.log_test("GET /bookings", True, f"Found {len(bookings)} user bookings")
                        else:
                            self.log_test("GET /bookings", False, "Bookings don't belong to current user", bookings)
                    else:
                        self.log_test("GET /bookings", True, "No bookings found (valid for new user)")
                else:
                    self.log_test("GET /bookings", False, "Invalid response format", bookings)
            elif response.status_code == 401:
                self.log_test("GET /bookings", False, "Authentication required", response.text)
            else:
                self.log_test("GET /bookings", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /bookings", False, f"Error: {str(e)}")
    
    def test_get_specific_booking(self):
        """Test GET /bookings/{booking_id}"""
        if not self.booking_id:
            self.log_test("GET /bookings/{booking_id}", False, "No booking_id available from previous test")
            return
        
        try:
            response = self.session.get(f"{BACKEND_URL}/bookings/{self.booking_id}")
            if response.status_code == 200:
                booking = response.json()
                if booking.get('booking_id') == self.booking_id and booking.get('user_id') == USER_ID:
                    self.log_test("GET /bookings/{booking_id}", True, 
                                f"Retrieved booking for {booking.get('club_name')}")
                else:
                    self.log_test("GET /bookings/{booking_id}", False, "Invalid booking data", booking)
            elif response.status_code == 404:
                self.log_test("GET /bookings/{booking_id}", False, "Booking not found", response.text)
            elif response.status_code == 401:
                self.log_test("GET /bookings/{booking_id}", False, "Authentication required", response.text)
            else:
                self.log_test("GET /bookings/{booking_id}", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("GET /bookings/{booking_id}", False, f"Error: {str(e)}")
    
    def test_create_payment_order(self):
        """Test POST /payment/create-order"""
        if not self.booking_id:
            self.log_test("POST /payment/create-order", False, "No booking_id available from previous test")
            return
        
        try:
            payment_data = {"booking_id": self.booking_id}
            response = self.session.post(f"{BACKEND_URL}/payment/create-order", json=payment_data)
            if response.status_code == 200:
                order = response.json()
                required_fields = ['order_id', 'amount', 'currency', 'booking_id']
                missing_fields = [field for field in required_fields if field not in order]
                
                if not missing_fields:
                    self.order_id = order['order_id']
                    self.log_test("POST /payment/create-order", True, 
                                f"Created order {self.order_id} for ₹{order['amount']/100}")
                else:
                    self.log_test("POST /payment/create-order", False, f"Missing fields: {missing_fields}", order)
            elif response.status_code == 404:
                self.log_test("POST /payment/create-order", False, "Booking not found", response.text)
            elif response.status_code == 401:
                self.log_test("POST /payment/create-order", False, "Authentication required", response.text)
            else:
                self.log_test("POST /payment/create-order", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /payment/create-order", False, f"Error: {str(e)}")
    
    def test_verify_payment(self):
        """Test POST /payment/verify"""
        if not self.booking_id or not self.order_id:
            self.log_test("POST /payment/verify", False, "Missing booking_id or order_id from previous tests")
            return
        
        try:
            # Mock payment verification data
            verification_data = {
                "razorpay_order_id": self.order_id,
                "razorpay_payment_id": f"pay_mock_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "razorpay_signature": "mock_signature_for_testing",
                "booking_id": self.booking_id
            }
            
            response = self.session.post(f"{BACKEND_URL}/payment/verify", json=verification_data)
            if response.status_code == 200:
                result = response.json()
                if (result.get('booking_id') == self.booking_id and 
                    result.get('status') == 'confirmed' and 
                    result.get('qr_code')):
                    
                    # Validate QR code is base64
                    try:
                        qr_data = base64.b64decode(result['qr_code'])
                        self.log_test("POST /payment/verify", True, 
                                    f"Payment verified, booking confirmed with QR code ({len(qr_data)} bytes)")
                    except Exception:
                        self.log_test("POST /payment/verify", False, "Invalid QR code format", result)
                else:
                    self.log_test("POST /payment/verify", False, "Invalid verification response", result)
            elif response.status_code == 404:
                self.log_test("POST /payment/verify", False, "Booking not found", response.text)
            elif response.status_code == 401:
                self.log_test("POST /payment/verify", False, "Authentication required", response.text)
            else:
                self.log_test("POST /payment/verify", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /payment/verify", False, f"Error: {str(e)}")
    
    def test_cancel_booking(self):
        """Test POST /bookings/{booking_id}/cancel"""
        if not self.booking_id:
            self.log_test("POST /bookings/{booking_id}/cancel", False, "No booking_id available from previous test")
            return
        
        try:
            response = self.session.post(f"{BACKEND_URL}/bookings/{self.booking_id}/cancel")
            if response.status_code == 200:
                result = response.json()
                if "cancelled successfully" in result.get('message', '').lower():
                    self.log_test("POST /bookings/{booking_id}/cancel", True, "Booking cancelled successfully")
                else:
                    self.log_test("POST /bookings/{booking_id}/cancel", False, "Unexpected response", result)
            elif response.status_code == 400:
                # Check if already cancelled
                result = response.json()
                if "already cancelled" in result.get('detail', '').lower():
                    self.log_test("POST /bookings/{booking_id}/cancel", True, "Booking already cancelled (expected)")
                else:
                    self.log_test("POST /bookings/{booking_id}/cancel", False, "Bad request", result)
            elif response.status_code == 404:
                self.log_test("POST /bookings/{booking_id}/cancel", False, "Booking not found", response.text)
            elif response.status_code == 401:
                self.log_test("POST /bookings/{booking_id}/cancel", False, "Authentication required", response.text)
            else:
                self.log_test("POST /bookings/{booking_id}/cancel", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /bookings/{booking_id}/cancel", False, f"Error: {str(e)}")
    
    def test_logout(self):
        """Test POST /auth/logout"""
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/logout")
            if response.status_code == 200:
                result = response.json()
                if "logged out" in result.get('message', '').lower():
                    self.log_test("POST /auth/logout", True, "Logout successful")
                else:
                    self.log_test("POST /auth/logout", False, "Unexpected response", result)
            elif response.status_code == 401:
                self.log_test("POST /auth/logout", False, "Authentication required", response.text)
            else:
                self.log_test("POST /auth/logout", False, f"Status: {response.status_code}", response.text)
        except Exception as e:
            self.log_test("POST /auth/logout", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("CLUBIN INDIA Backend API Testing")
        print("=" * 60)
        print(f"Backend URL: {BACKEND_URL}")
        print(f"Session Token: {SESSION_TOKEN}")
        print(f"User ID: {USER_ID}")
        print("=" * 60)
        print()
        
        # Test sequence following the complete booking flow
        self.test_root_endpoint()
        
        # Club endpoints (no auth required)
        self.test_get_clubs()
        self.test_get_clubs_with_city_filter()
        self.test_get_specific_club()
        self.test_get_cities()
        
        # Auth endpoints
        self.test_auth_me()
        
        # Booking flow (requires auth)
        self.test_create_booking()
        self.test_get_bookings()
        self.test_get_specific_booking()
        
        # Payment flow (requires auth)
        self.test_create_payment_order()
        self.test_verify_payment()
        
        # Booking management
        self.test_cancel_booking()
        
        # Logout
        self.test_logout()
        
        # Summary
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"❌ {result['test']}: {result['details']}")
        
        print("=" * 60)
        
        return passed == total

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)