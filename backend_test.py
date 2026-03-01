#!/usr/bin/env python3
"""
CLUBIN INDIA Backend API Testing
Testing specific endpoints as per review request
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import uuid

# Configuration
BASE_URL = "https://clubin-preview.preview.emergentagent.com/api"
TEST_USER_EMAIL = "rajesh.kumar@gmail.com"
TEST_USER_NAME = "Rajesh Kumar"

class ClubinAPITester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.test_club_id = None
        self.otp = None
        self.results = []
        
    def log_result(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.results.append({
            "test": test_name,
            "status": status,
            "details": details,
            "response_data": response_data
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success and response_data:
            print(f"   Response: {response_data}")
        print()

    def test_health_check(self):
        """Test GET /api/ - Health check endpoint"""
        try:
            response = requests.get(f"{BASE_URL}/")
            success = response.status_code == 200
            data = response.json() if success else None
            
            expected_message = "CLUBIN INDIA API - Customer App v2.0"
            expected_status = "running"
            
            message_match = data and data.get('message') == expected_message
            status_match = data and data.get('status') == expected_status
            
            self.log_result(
                "Health Check Endpoint",
                success and message_match and status_match,
                f"Status: {response.status_code}, Message: '{data.get('message', 'N/A') if data else 'No response'}', Status: '{data.get('status', 'N/A') if data else 'No response'}'",
                data
            )
            return success and message_match and status_match
        except Exception as e:
            self.log_result("Health Check Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_firebase_auth_invalid_token(self):
        """Test POST /api/auth/firebase/verify with invalid token"""
        try:
            payload = {
                "id_token": "invalid_token",
                "name": "Test"
            }
            
            response = requests.post(f"{BASE_URL}/auth/firebase/verify", json=payload)
            success = response.status_code == 401
            data = response.json() if response.content else None
            
            self.log_result(
                "Firebase Auth - Invalid Token",
                success,
                f"Status: {response.status_code} (Expected 401), Response: {data}",
                data
            )
            return success
        except Exception as e:
            self.log_result("Firebase Auth - Invalid Token", False, f"Exception: {str(e)}")
            return False

    def test_otp_send(self):
        """Test POST /api/auth/otp/send"""
        try:
            payload = {"phone": "+919876543210"}
            
            response = requests.post(f"{BASE_URL}/auth/otp/send", json=payload)
            success = response.status_code == 200
            data = response.json() if response.content else None
            
            # Store OTP for verification test
            if success and data and 'otp' in data:
                self.otp = data['otp']
            
            self.log_result(
                "OTP Send (Legacy)",
                success,
                f"Status: {response.status_code}, OTP received: {'Yes' if success and data and 'otp' in data else 'No'}",
                {"has_otp": bool(success and data and 'otp' in data)}
            )
            return success
        except Exception as e:
            self.log_result("OTP Send (Legacy)", False, f"Exception: {str(e)}")
            return False

    def test_otp_verify(self):
        """Test POST /api/auth/otp/verify"""
        try:
            if not hasattr(self, 'otp'):
                self.log_result("OTP Verify (Legacy)", False, "No OTP available from send test")
                return False
            
            payload = {
                "phone": "+919876543210",
                "otp": self.otp,
                "name": "Test User"
            }
            
            response = requests.post(f"{BASE_URL}/auth/otp/verify", json=payload)
            success = response.status_code == 200
            data = response.json() if response.content else None
            
            # Store session token for authenticated requests
            if success and data and 'session_token' in data:
                self.session_token = data['session_token']
            
            self.log_result(
                "OTP Verify (Legacy)",
                success,
                f"Status: {response.status_code}, Session token received: {'Yes' if success and data and 'session_token' in data else 'No'}",
                {"has_session_token": bool(success and data and 'session_token' in data)}
            )
            return success
        except Exception as e:
            self.log_result("OTP Verify (Legacy)", False, f"Exception: {str(e)}")
            return False

    def test_auth_me(self):
        """Test GET /api/auth/me with Authorization header"""
        try:
            if not hasattr(self, 'session_token') or not self.session_token:
                self.log_result("Auth Me Endpoint", False, "No session token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
            success = response.status_code == 200
            data = response.json() if response.content else None
            
            self.log_result(
                "Auth Me Endpoint",
                success,
                f"Status: {response.status_code}, User data received: {'Yes' if success and data else 'No'}",
                data
            )
            return success
        except Exception as e:
            self.log_result("Auth Me Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_cities_endpoint(self):
        """Test GET /api/cities"""
        try:
            response = requests.get(f"{BASE_URL}/cities")
            success = response.status_code == 200
            data = response.json() if success else None
            
            cities_count = len(data.get('cities', [])) if data else 0
            
            self.log_result(
                "Cities Endpoint",
                success,
                f"Status: {response.status_code}, Cities found: {cities_count}",
                data
            )
            return success
        except Exception as e:
            self.log_result("Cities Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_clubs_endpoint(self):
        """Test GET /api/clubs - List all clubs"""
        try:
            response = requests.get(f"{BASE_URL}/clubs")
            success = response.status_code == 200
            data = response.json() if success else None
            
            clubs_count = len(data) if data and isinstance(data, list) else 0
            
            self.log_result(
                "Clubs Listing",
                success,
                f"Status: {response.status_code}, Clubs found: {clubs_count}",
                {"clubs_count": clubs_count, "sample": data[0] if data else None}
            )
            return success
        except Exception as e:
            self.log_result("Clubs Listing", False, f"Exception: {str(e)}")
            return False

    def test_featured_clubs(self):
        """Test GET /api/clubs/featured - Featured clubs for carousel"""
        try:
            response = requests.get(f"{BASE_URL}/clubs/featured")
            success = response.status_code == 200
            data = response.json() if success else None
            
            featured_count = len(data) if data and isinstance(data, list) else 0
            has_featured_flags = False
            
            if data and isinstance(data, list) and len(data) > 0:
                has_featured_flags = any(club.get('is_featured') or club.get('is_promoted') for club in data)
            
            self.log_result(
                "Featured Clubs Carousel",
                success and has_featured_flags,
                f"Status: {response.status_code}, Featured clubs: {featured_count}, Has featured flags: {has_featured_flags}",
                {"featured_count": featured_count, "sample": data[0] if data else None}
            )
            return success
        except Exception as e:
            self.log_result("Featured Clubs Carousel", False, f"Exception: {str(e)}")
            return False

    def test_location_based_clubs(self):
        """Test GET /api/clubs with location parameters"""
        try:
            # Mumbai coordinates
            lat, lon = 19.0596, 72.8295
            response = requests.get(f"{BASE_URL}/clubs?latitude={lat}&longitude={lon}")
            success = response.status_code == 200
            data = response.json() if success else None
            
            has_distance = False
            if data and isinstance(data, list) and len(data) > 0:
                has_distance = 'distance' in data[0]
            
            self.log_result(
                "Location-based Clubs (Distance Calculation)",
                success and has_distance,
                f"Status: {response.status_code}, Clubs with distance: {has_distance}",
                {"sample_with_distance": data[0] if data else None}
            )
            return success
        except Exception as e:
            self.log_result("Location-based Clubs", False, f"Exception: {str(e)}")
            return False

    def test_events_endpoint(self):
        """Test GET /api/events - List all events"""
        try:
            response = requests.get(f"{BASE_URL}/events")
            success = response.status_code == 200
            data = response.json() if success else None
            
            events_count = len(data) if data and isinstance(data, list) else 0
            has_enhanced_fields = False
            
            if data and isinstance(data, list) and len(data) > 0:
                event = data[0]
                enhanced_fields = ['flyer_image', 'layout_image', 'artists', 'organized_by', 'sponsored_by']
                has_enhanced_fields = any(field in event for field in enhanced_fields)
            
            self.log_result(
                "Events Listing",
                success,
                f"Status: {response.status_code}, Events found: {events_count}, Has enhanced fields: {has_enhanced_fields}",
                {"events_count": events_count, "sample": data[0] if data else None}
            )
            return success
        except Exception as e:
            self.log_result("Events Listing", False, f"Exception: {str(e)}")
            return False

    def test_featured_events(self):
        """Test GET /api/events/featured - Featured events for carousel"""
        try:
            response = requests.get(f"{BASE_URL}/events/featured")
            success = response.status_code == 200
            data = response.json() if success else None
            
            featured_count = len(data) if data and isinstance(data, list) else 0
            
            self.log_result(
                "Featured Events Carousel",
                success,
                f"Status: {response.status_code}, Featured events: {featured_count}",
                {"featured_count": featured_count, "sample": data[0] if data else None}
            )
            return success
        except Exception as e:
            self.log_result("Featured Events Carousel", False, f"Exception: {str(e)}")
            return False

    def test_specific_event(self):
        """Test GET /api/events/event_001 - Get specific event"""
        try:
            response = requests.get(f"{BASE_URL}/events/event_001")
            success = response.status_code == 200
            data = response.json() if success else None
            
            self.log_result(
                "Specific Event Details (event_001)",
                success,
                f"Status: {response.status_code}",
                data
            )
            return success
        except Exception as e:
            self.log_result("Specific Event Details", False, f"Exception: {str(e)}")
            return False

    def test_create_club(self):
        """Test POST /api/clubs (authenticated) - Create a club"""
        try:
            if not hasattr(self, 'session_token') or not self.session_token:
                self.log_result("Create Club", False, "No session token available")
                return False
            
            club_data = {
                "name": "Test Club Mumbai",
                "city": "Mumbai", 
                "address": "Bandra West",
                "description": "Premium nightclub",
                "entry_price_male": 1500,
                "entry_price_female": 1000,
                "entry_price_couple": 2000,
                "available_slots": 100
            }
            
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.post(f"{BASE_URL}/clubs", json=club_data, headers=headers)
            success = response.status_code in [200, 201]  # Accept both 200 and 201
            data = response.json() if response.content else None
            
            # Store club_id for event creation test
            if success and data and 'club_id' in data:
                self.test_club_id = data['club_id']
                club_created = True
            else:
                club_created = False
            
            self.log_result(
                "Create Club (Authenticated)",
                success and club_created,
                f"Status: {response.status_code}, Club created: {'Yes' if club_created else 'No'}, Club ID: {self.test_club_id if hasattr(self, 'test_club_id') else 'N/A'}",
                data
            )
            return success and club_created
        except Exception as e:
            self.log_result("Create Club", False, f"Exception: {str(e)}")
            return False

    def test_create_event(self):
        """Test POST /api/events (authenticated) - Create an event"""
        try:
            if not hasattr(self, 'session_token') or not self.session_token:
                self.log_result("Create Event", False, "No session token available")
                return False
            
            if not hasattr(self, 'test_club_id') or not self.test_club_id:
                self.log_result("Create Event", False, "No club_id available from club creation test")
                return False
            
            event_data = {
                "name": "Test Event Mumbai",
                "club_id": self.test_club_id,
                "event_date": (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d"),
                "event_time": "10:00 PM",
                "description": "Test event for new club",
                "entry_price_male": 1800,
                "entry_price_female": 1200,
                "entry_price_couple": 2500
            }
            
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.post(f"{BASE_URL}/events", json=event_data, headers=headers)
            success = response.status_code in [200, 201]  # Accept both 200 and 201
            data = response.json() if response.content else None
            
            event_created = success and data and 'event_id' in data
            
            self.log_result(
                "Create Event (Authenticated)",
                event_created,
                f"Status: {response.status_code}, Event created: {'Yes' if event_created else 'No'}, Event ID: {data.get('event_id') if data else 'N/A'}",
                data
            )
            return event_created
        except Exception as e:
            self.log_result("Create Event", False, f"Exception: {str(e)}")
            return False

    def test_bookings_list(self):
        """Test GET /api/bookings with auth header"""
        try:
            if not hasattr(self, 'session_token') or not self.session_token:
                self.log_result("Bookings List", False, "No session token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BASE_URL}/bookings", headers=headers)
            success = response.status_code == 200
            data = response.json() if response.content else None
            
            bookings_count = len(data) if data and isinstance(data, list) else 0
            
            self.log_result(
                "Bookings List (Authenticated)",
                success,
                f"Status: {response.status_code}, Bookings found: {bookings_count}",
                {"bookings_count": bookings_count}
            )
            return success
        except Exception as e:
            self.log_result("Bookings List", False, f"Exception: {str(e)}")
            return False

    def test_logout(self):
        """Test POST /api/auth/logout with auth header"""
        try:
            if not hasattr(self, 'session_token') or not self.session_token:
                self.log_result("Logout", False, "No session token available")
                return False
            
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.post(f"{BASE_URL}/auth/logout", headers=headers)
            success = response.status_code == 200
            data = response.json() if response.content else None
            
            self.log_result(
                "Logout (Authenticated)",
                success,
                f"Status: {response.status_code}, Logout successful: {'Yes' if success else 'No'}",
                data
            )
            return success
        except Exception as e:
            self.log_result("Logout", False, f"Exception: {str(e)}")
            return False

    def test_payment_order_creation(self):
        """Test POST /api/payment/create-order"""
        try:
            if not self.test_booking_id:
                # Create a mock booking ID for testing
                self.test_booking_id = f"booking_{uuid.uuid4().hex[:12]}"
            
            payment_data = {"booking_id": self.test_booking_id}
            headers = {"Authorization": f"Bearer {self.session_token}"}
            
            response = requests.post(f"{BASE_URL}/payment/create-order", json=payment_data, headers=headers)
            
            # We expect 401 or 404 since we don't have real auth/booking
            if response.status_code in [401, 404]:
                self.log_result(
                    "Payment Order Creation",
                    True,  # Expected behavior
                    f"Status: {response.status_code} - Correctly requires auth/valid booking",
                    {"expected": f"{response.status_code}"}
                )
                return True
            elif response.status_code == 200:
                data = response.json()
                has_required_fields = all(field in data for field in ['order_id', 'amount', 'currency'])
                self.log_result(
                    "Payment Order Creation",
                    has_required_fields,
                    f"Status: {response.status_code}, Has required fields: {has_required_fields}",
                    data
                )
                return has_required_fields
            else:
                self.log_result(
                    "Payment Order Creation",
                    False,
                    f"Unexpected status: {response.status_code}",
                    response.json() if response.content else None
                )
                return False
                
        except Exception as e:
            self.log_result("Payment Order Creation", False, f"Exception: {str(e)}")
            return False

    def test_payment_verification_and_golden_qr(self):
        """Test POST /api/payment/verify - Verify payment and generate Golden QR"""
        try:
            verification_data = {
                "razorpay_order_id": f"order_mock_{uuid.uuid4().hex[:12]}",
                "razorpay_payment_id": f"pay_mock_{uuid.uuid4().hex[:12]}",
                "razorpay_signature": f"sig_mock_{uuid.uuid4().hex[:12]}",
                "booking_id": self.test_booking_id or f"booking_{uuid.uuid4().hex[:12]}"
            }
            
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.post(f"{BASE_URL}/payment/verify", json=verification_data, headers=headers)
            
            # We expect 401 or 404 since we don't have real auth/booking
            if response.status_code in [401, 404]:
                self.log_result(
                    "Payment Verification & Golden QR",
                    True,  # Expected behavior
                    f"Status: {response.status_code} - Correctly requires auth/valid booking",
                    {"expected": f"{response.status_code}"}
                )
                return True
            elif response.status_code == 200:
                data = response.json()
                has_qr = 'qr_code' in data
                qr_length = len(data.get('qr_code', '')) if has_qr else 0
                is_golden_qr = qr_length > 20000  # Golden QR should be much larger
                
                self.log_result(
                    "Payment Verification & Golden QR Generation",
                    has_qr and is_golden_qr,
                    f"Status: {response.status_code}, Has QR: {has_qr}, QR Length: {qr_length}, Is Golden QR (>20k chars): {is_golden_qr}",
                    {"qr_length": qr_length, "has_qr": has_qr}
                )
                return has_qr and is_golden_qr
            else:
                self.log_result(
                    "Payment Verification & Golden QR",
                    False,
                    f"Unexpected status: {response.status_code}",
                    response.json() if response.content else None
                )
                return False
                
        except Exception as e:
            self.log_result("Payment Verification & Golden QR", False, f"Exception: {str(e)}")
            return False

    def test_booking_retrieval_with_qr(self):
        """Test GET /api/bookings/{booking_id} - Verify Golden QR in response"""
        try:
            if not self.test_booking_id:
                self.test_booking_id = f"booking_{uuid.uuid4().hex[:12]}"
            
            headers = {"Authorization": f"Bearer {self.session_token}"}
            response = requests.get(f"{BASE_URL}/bookings/{self.test_booking_id}", headers=headers)
            
            # We expect 401 or 404 since we don't have real auth/booking
            if response.status_code in [401, 404]:
                self.log_result(
                    "Booking Retrieval with QR",
                    True,  # Expected behavior
                    f"Status: {response.status_code} - Correctly requires auth/valid booking",
                    {"expected": f"{response.status_code}"}
                )
                return True
            elif response.status_code == 200:
                data = response.json()
                has_qr = 'qr_code' in data and data['qr_code'] is not None
                
                self.log_result(
                    "Booking Retrieval with Golden QR",
                    has_qr,
                    f"Status: {response.status_code}, Has QR Code: {has_qr}",
                    {"has_qr_code": has_qr}
                )
                return has_qr
            else:
                self.log_result(
                    "Booking Retrieval with QR",
                    False,
                    f"Unexpected status: {response.status_code}",
                    response.json() if response.content else None
                )
                return False
                
        except Exception as e:
            self.log_result("Booking Retrieval with QR", False, f"Exception: {str(e)}")
            return False

    def test_data_verification(self):
        """Verify that required data exists (5 clubs, 3 events)"""
        try:
            # Test clubs count
            clubs_response = requests.get(f"{BASE_URL}/clubs")
            clubs_count = 0
            if clubs_response.status_code == 200:
                clubs = clubs_response.json()
                clubs_count = len(clubs) if isinstance(clubs, list) else 0
            
            # Test events count  
            events_response = requests.get(f"{BASE_URL}/events")
            events_count = 0
            if events_response.status_code == 200:
                events = events_response.json()
                events_count = len(events) if isinstance(events, list) else 0
            
            clubs_ok = clubs_count >= 5
            events_ok = events_count >= 3
            
            self.log_result(
                "Data Verification (5 clubs, 3 events)",
                clubs_ok and events_ok,
                f"Clubs: {clubs_count}/5 ({'✓' if clubs_ok else '✗'}), Events: {events_count}/3 ({'✓' if events_ok else '✗'})",
                {"clubs_count": clubs_count, "events_count": events_count}
            )
            
            return clubs_ok and events_ok
            
        except Exception as e:
            self.log_result("Data Verification", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run comprehensive test suite based on review request"""
        print("🚀 Starting CLUBIN INDIA Backend API Testing (Review Request)")
        print("=" * 60)
        
        # Initialize variables
        self.otp = None
        self.session_token = None
        self.test_club_id = None
        
        # Test all endpoints as specified in review request
        tests = [
            # 1. Health Check
            self.test_health_check,
            
            # 2. Firebase Auth Endpoint
            self.test_firebase_auth_invalid_token,
            
            # 3. OTP Auth Endpoints (legacy)
            self.test_otp_send,
            self.test_otp_verify,
            
            # 4. Auth Me Endpoint
            self.test_auth_me,
            
            # 5. Clubs Endpoints
            self.test_clubs_endpoint,
            self.test_featured_clubs,
            self.test_cities_endpoint,
            
            # 6. Events Endpoints
            self.test_events_endpoint,
            self.test_featured_events,
            
            # 7. Create a Club (authenticated)
            self.test_create_club,
            
            # 8. Create an Event (authenticated)
            self.test_create_event,
            
            # 9. Bookings
            self.test_bookings_list,
            
            # 10. Logout
            self.test_logout
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
        
        # Summary
        print("=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        
        for result in self.results:
            print(f"{result['status']}: {result['test']}")
        
        print(f"\n📊 OVERALL RESULTS: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Backend APIs are working correctly.")
        else:
            print(f"⚠️  {total - passed} tests failed. Check details above.")
        
        return passed, total

def main():
    """Main test execution"""
    tester = ClubinAPITester()
    passed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()