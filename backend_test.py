import requests
import sys
import json
from datetime import datetime

class X67MarketplaceAPITester:
    def __init__(self, base_url="https://local-classifieds-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (expected {expected_status})"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_categories_api(self):
        """Test categories endpoint"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "/api/categories",
            200
        )
        
        if success:
            categories = response
            if isinstance(categories, list) and len(categories) > 0:
                # Check if categories have required fields
                first_cat = categories[0]
                required_fields = ['id', 'name', 'icon', 'color', 'subcategories']
                has_all_fields = all(field in first_cat for field in required_fields)
                
                self.log_test(
                    "Categories Structure Validation", 
                    has_all_fields,
                    f"Found {len(categories)} categories, has required fields: {has_all_fields}"
                )
                
                # Check for specific categories
                category_ids = [cat['id'] for cat in categories]
                expected_categories = ['escorts', 'real_estate', 'cars', 'jobs', 'electronics', 'fashion', 'services', 'animals']
                has_expected = all(cat_id in category_ids for cat_id in expected_categories)
                
                self.log_test(
                    "Expected Categories Present",
                    has_expected,
                    f"Expected categories found: {has_expected}"
                )
            else:
                self.log_test("Categories Data Validation", False, "No categories returned or invalid format")

    def test_cities_api(self):
        """Test Romanian cities endpoint"""
        success, response = self.run_test(
            "Get Romanian Cities",
            "GET",
            "/api/cities",
            200
        )
        
        if success:
            cities = response
            if isinstance(cities, list) and len(cities) > 0:
                # Check structure
                first_city = cities[0]
                required_fields = ['id', 'name', 'county']
                has_all_fields = all(field in first_city for field in required_fields)
                
                self.log_test(
                    "Cities Structure Validation",
                    has_all_fields,
                    f"Found {len(cities)} cities, has required fields: {has_all_fields}"
                )
                
                # Check for major Romanian cities
                city_names = [city['name'] for city in cities]
                expected_cities = ['București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța']
                has_major_cities = all(city in city_names for city in expected_cities)
                
                self.log_test(
                    "Major Romanian Cities Present",
                    has_major_cities,
                    f"Major cities found: {has_major_cities}"
                )
            else:
                self.log_test("Cities Data Validation", False, "No cities returned or invalid format")

    def test_car_brands_api(self):
        """Test car brands endpoint"""
        success, response = self.run_test(
            "Get Car Brands",
            "GET",
            "/api/car-brands",
            200
        )
        
        if success:
            brands = response
            if isinstance(brands, dict) and len(brands) > 0:
                # Check structure
                first_brand_key = list(brands.keys())[0]
                first_brand = brands[first_brand_key]
                has_structure = 'name' in first_brand and 'models' in first_brand
                
                self.log_test(
                    "Car Brands Structure Validation",
                    has_structure,
                    f"Found {len(brands)} brands, has required structure: {has_structure}"
                )
                
                # Check for popular brands
                expected_brands = ['bmw', 'mercedes', 'audi', 'volkswagen', 'toyota', 'dacia']
                has_popular_brands = all(brand in brands for brand in expected_brands)
                
                self.log_test(
                    "Popular Car Brands Present",
                    has_popular_brands,
                    f"Popular brands found: {has_popular_brands}"
                )
            else:
                self.log_test("Car Brands Data Validation", False, "No brands returned or invalid format")

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "email": f"test_user_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test User",
            "phone": "+40123456789"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/api/auth/register",
            200,
            data=test_user_data
        )
        
        if success:
            # Check response structure
            required_fields = ['user_id', 'email', 'name', 'role']
            has_all_fields = all(field in response for field in required_fields)
            
            self.log_test(
                "Registration Response Validation",
                has_all_fields,
                f"Response has required fields: {has_all_fields}"
            )
            
            # Store user token for later tests
            if 'user_id' in response:
                self.user_token = response.get('user_id')  # In real app, this would be a JWT token
        
        return success

    def test_user_login(self):
        """Test user login with valid credentials"""
        # First register a user
        test_user_data = {
            "email": f"login_test_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Login Test User"
        }
        
        # Register user first
        reg_success, reg_response = self.run_test(
            "Pre-Login User Registration",
            "POST",
            "/api/auth/register",
            200,
            data=test_user_data
        )
        
        if reg_success:
            # Now test login
            login_data = {
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
            
            success, response = self.run_test(
                "User Login",
                "POST",
                "/api/auth/login",
                200,
                data=login_data
            )
            
            if success:
                required_fields = ['user_id', 'email', 'name', 'role']
                has_all_fields = all(field in response for field in required_fields)
                
                self.log_test(
                    "Login Response Validation",
                    has_all_fields,
                    f"Login response has required fields: {has_all_fields}"
                )

    def test_admin_login(self):
        """Test admin login"""
        admin_data = {
            "email": "admin@x67digital.com",
            "password": "admin"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "/api/auth/login",
            200,
            data=admin_data
        )
        
        if success:
            # Check if user has admin role
            is_admin = response.get('role') == 'admin'
            self.log_test(
                "Admin Role Validation",
                is_admin,
                f"User role: {response.get('role')}"
            )
            
            if is_admin:
                self.admin_token = response.get('user_id')  # Store for admin tests

    def test_protected_routes(self):
        """Test that protected routes require authentication"""
        protected_endpoints = [
            "/api/auth/me",
            "/api/my-ads",
            "/api/admin/users",
            "/api/admin/stats"
        ]
        
        for endpoint in protected_endpoints:
            success, _ = self.run_test(
                f"Protected Route: {endpoint}",
                "GET",
                endpoint,
                401  # Should return 401 Unauthorized
            )

    def test_ads_endpoints(self):
        """Test ads-related endpoints"""
        # Test get ads (public endpoint)
        success, response = self.run_test(
            "Get Ads (Public)",
            "GET",
            "/api/ads?limit=5",
            200
        )
        
        if success:
            # Check response structure
            required_fields = ['ads', 'total', 'page', 'pages']
            has_structure = all(field in response for field in required_fields)
            
            self.log_test(
                "Ads Response Structure",
                has_structure,
                f"Response has required pagination fields: {has_structure}"
            )
        
        # Test promoted ads
        success, response = self.run_test(
            "Get Promoted Ads",
            "GET",
            "/api/ads/promoted?limit=5",
            200
        )

    def test_banners_endpoint(self):
        """Test banners endpoint"""
        success, response = self.run_test(
            "Get Homepage Banners",
            "GET",
            "/api/banners?position=homepage",
            200
        )
        
        if success and isinstance(response, list):
            self.log_test(
                "Banners Response Validation",
                True,
                f"Found {len(response)} banners"
            )

    def test_payment_endpoints(self):
        """Test payment-related endpoints (without actual payment)"""
        # This should fail without authentication
        payment_data = {
            "ad_id": "test_ad_123",
            "payment_type": "post_ad"
        }
        
        success, _ = self.run_test(
            "Create Payment Order (Unauthenticated)",
            "POST",
            "/api/payments/create-order",
            401,  # Should require auth
            data=payment_data
        )

    def test_email_integration_features(self):
        """Test new Resend email integration features"""
        print("\n📧 Testing Email Integration Features")
        
        # First, create a test user and ad for email testing
        test_user_data = {
            "email": f"email_test_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Email Test User",
            "phone": "+40123456789"
        }
        
        # Register user (should trigger welcome email attempt)
        reg_success, reg_response = self.run_test(
            "User Registration (Email Trigger Test)",
            "POST",
            "/api/auth/register",
            200,
            data=test_user_data
        )
        
        if reg_success:
            user_id = reg_response.get('user_id')
            
            # Login as the user to create an ad
            login_data = {
                "email": test_user_data["email"],
                "password": test_user_data["password"]
            }
            
            login_success, login_response = self.run_test(
                "User Login for Ad Creation",
                "POST",
                "/api/auth/login",
                200,
                data=login_data
            )
            
            if login_success:
                # Create an ad
                ad_data = {
                    "title": "Test Ad for Email Notifications",
                    "description": "This is a test ad to verify email notifications work",
                    "category_id": "cars",
                    "subcategory_id": "cars_sale",
                    "city_id": "bucuresti",
                    "price": 15000,
                    "price_type": "fixed",
                    "contact_phone": "+40123456789",
                    "contact_email": test_user_data["email"]
                }
                
                ad_success, ad_response = self.run_test(
                    "Create Ad for Email Testing",
                    "POST",
                    "/api/ads",
                    200,
                    data=ad_data
                )
                
                if ad_success:
                    ad_id = ad_response.get('ad_id')
                    
                    # Now test admin approval (should trigger email)
                    admin_login_data = {
                        "email": "admin@x67digital.com",
                        "password": "admin"
                    }
                    
                    admin_login_success, _ = self.run_test(
                        "Admin Login for Ad Approval",
                        "POST",
                        "/api/auth/login",
                        200,
                        data=admin_login_data
                    )
                    
                    if admin_login_success:
                        # Test ad approval (should trigger approved email)
                        approval_data = {"status": "active"}
                        
                        approve_success, _ = self.run_test(
                            "Admin Approve Ad (Email Trigger)",
                            "PUT",
                            f"/api/admin/ads/{ad_id}/status",
                            200,
                            data=approval_data
                        )
                        
                        # Test ad rejection (should trigger rejected email)
                        rejection_data = {"status": "rejected"}
                        
                        reject_success, _ = self.run_test(
                            "Admin Reject Ad (Email Trigger)",
                            "PUT",
                            f"/api/admin/ads/{ad_id}/status",
                            200,
                            data=rejection_data
                        )
                        
                        # Verify the ad status was updated
                        if approve_success and reject_success:
                            self.log_test(
                                "Email Integration - Admin Ad Status Updates",
                                True,
                                "Ad approval/rejection endpoints work (emails attempted)"
                            )

    def test_admin_functionality(self):
        """Test admin-specific functionality"""
        print("\n👑 Testing Admin Functionality")
        
        # Login as admin
        admin_data = {
            "email": "admin@x67digital.com",
            "password": "admin"
        }
        
        admin_success, admin_response = self.run_test(
            "Admin Login for Admin Tests",
            "POST",
            "/api/auth/login",
            200,
            data=admin_data
        )
        
        if admin_success:
            # Test admin stats
            stats_success, stats_response = self.run_test(
                "Admin Stats Endpoint",
                "GET",
                "/api/admin/stats",
                200
            )
            
            if stats_success:
                required_stats = ['total_users', 'total_ads', 'pending_ads', 'active_ads', 'total_payments', 'total_revenue']
                has_all_stats = all(stat in stats_response for stat in required_stats)
                
                self.log_test(
                    "Admin Stats Structure",
                    has_all_stats,
                    f"Stats response has all required fields: {has_all_stats}"
                )
            
            # Test admin users endpoint
            users_success, users_response = self.run_test(
                "Admin Users Endpoint",
                "GET",
                "/api/admin/users?limit=5",
                200
            )
            
            if users_success:
                required_fields = ['users', 'total', 'page', 'pages']
                has_structure = all(field in users_response for field in required_fields)
                
                self.log_test(
                    "Admin Users Response Structure",
                    has_structure,
                    f"Users response has pagination structure: {has_structure}"
                )
            
            # Test admin ads endpoint
            ads_success, ads_response = self.run_test(
                "Admin Ads Endpoint",
                "GET",
                "/api/admin/ads?limit=5",
                200
            )
            
            if ads_success:
                required_fields = ['ads', 'total', 'page', 'pages']
                has_structure = all(field in ads_response for field in required_fields)
                
                self.log_test(
                    "Admin Ads Response Structure",
                    has_structure,
                    f"Admin ads response has pagination structure: {has_structure}"
                )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting X67 Digital Media Groupe API Tests")
        print("=" * 60)
        
        # Basic API endpoints
        self.test_categories_api()
        self.test_cities_api()
        self.test_car_brands_api()
        
        # Authentication tests
        self.test_user_registration()
        self.test_user_login()
        self.test_admin_login()
        
        # Protected routes (Note: These may pass due to session persistence)
        self.test_protected_routes()
        
        # Content endpoints
        self.test_ads_endpoints()
        self.test_banners_endpoint()
        
        # Payment endpoints
        self.test_payment_endpoints()
        
        # NEW: Email integration tests
        self.test_email_integration_features()
        
        # NEW: Admin functionality tests
        self.test_admin_functionality()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            
            # Print failed tests
            failed_tests = [test for test in self.test_results if not test['success']]
            if failed_tests:
                print("\n❌ Failed Tests:")
                for test in failed_tests:
                    print(f"  - {test['test']}: {test['details']}")
            
            return 1

def main():
    tester = X67MarketplaceAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())