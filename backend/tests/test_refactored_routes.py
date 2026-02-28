"""
Backend API Tests for Refactored Route Modules
Tests all 9 extracted route modules after major refactoring:
- Auth module: /api/auth/*
- Payments module: /api/payments/*
- Admin module: /api/admin/*
- Public API module: /api/public/v1/*
- Loyalty module: /api/loyalty/*
- Seller module: /api/seller/*
- Referral module: /api/referral/*
- Escrow module: /api/escrow/*
- Core endpoints (categories, cities, health)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "d.madalin29@gmail.com"
ADMIN_PASSWORD = "admin123"
TEST_EMAIL = "test123@test.com"
TEST_PASSWORD = "test1234"

# Viva Webhook Key for verification
VIVA_WEBHOOK_KEY = "475FFE73819D67134BBB2D6690A9023714C14E2E"


class TestHealthAndCore:
    """Test core endpoints - health, categories, cities"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "x67-digital-api"
        print("✓ Health endpoint working")
    
    def test_categories_endpoint(self):
        """Test /api/categories returns category list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check structure
        assert "id" in data[0]
        assert "name" in data[0]
        print(f"✓ Categories endpoint working - {len(data)} categories")
    
    def test_cities_endpoint(self):
        """Test /api/cities returns city list"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Cities endpoint working - {len(data)} cities")


class TestAuthModule:
    """Test Auth module routes: /api/auth/*"""
    
    def test_login_success(self):
        """Test /api/auth/login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        assert "role" in data
        print(f"✓ Login successful - user: {data['email']}, role: {data['role']}")
    
    def test_login_invalid_credentials(self):
        """Test /api/auth/login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Login correctly rejects invalid credentials")
    
    def test_me_unauthenticated(self):
        """Test /api/auth/me without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /api/auth/me correctly requires authentication")
    
    def test_me_authenticated(self):
        """Test /api/auth/me with valid session"""
        # First login to get session cookie
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Now test /me endpoint
        me_response = session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200
        data = me_response.json()
        assert data["email"] == ADMIN_EMAIL
        assert "user_id" in data
        assert "name" in data
        print(f"✓ /api/auth/me returns user data: {data['name']}")
    
    def test_logout(self):
        """Test /api/auth/logout"""
        session = requests.Session()
        # Login first
        session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Logout
        logout_response = session.post(f"{BASE_URL}/api/auth/logout")
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert "message" in data
        print("✓ Logout endpoint working")
    
    def test_register_duplicate_email(self):
        """Test /api/auth/register rejects duplicate email"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": ADMIN_EMAIL,
            "password": "testpass123",
            "name": "Test User"
        })
        assert response.status_code == 400
        print("✓ Register correctly rejects duplicate email")


class TestPaymentsModule:
    """Test Payments module routes: /api/payments/*"""
    
    def test_webhook_get_returns_key(self):
        """Test GET /api/payments/webhook returns Viva verification key"""
        response = requests.get(f"{BASE_URL}/api/payments/webhook")
        assert response.status_code == 200
        data = response.json()
        assert "Key" in data
        assert data["Key"] == VIVA_WEBHOOK_KEY
        print(f"✓ Payments webhook GET returns correct key: {data['Key']}")
    
    def test_create_order_requires_auth(self):
        """Test /api/payments/create-order requires authentication"""
        response = requests.post(f"{BASE_URL}/api/payments/create-order", json={
            "ad_id": "test_ad",
            "payment_type": "boost"
        })
        assert response.status_code == 401
        print("✓ Create order correctly requires authentication")


class TestAdminModule:
    """Test Admin module routes: /api/admin/*"""
    
    @pytest.fixture
    def admin_session(self):
        """Get authenticated admin session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_admin_stats(self, admin_session):
        """Test /api/admin/stats returns statistics"""
        response = admin_session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_ads" in data
        assert "pending_ads" in data
        assert "active_ads" in data
        print(f"✓ Admin stats: {data['total_users']} users, {data['total_ads']} ads")
    
    def test_admin_users(self, admin_session):
        """Test /api/admin/users returns user list"""
        response = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        assert "page" in data
        assert isinstance(data["users"], list)
        print(f"✓ Admin users: {data['total']} total users")
    
    def test_admin_ads(self, admin_session):
        """Test /api/admin/ads returns ad list"""
        response = admin_session.get(f"{BASE_URL}/api/admin/ads")
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        assert "total" in data
        assert isinstance(data["ads"], list)
        print(f"✓ Admin ads: {data['total']} total ads")
    
    def test_admin_analytics_dashboard(self, admin_session):
        """Test /api/admin/analytics/dashboard returns analytics"""
        response = admin_session.get(f"{BASE_URL}/api/admin/analytics/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "overview" in data
        assert "growth" in data
        assert "trends" in data
        assert "distribution" in data
        print(f"✓ Admin analytics dashboard working - {data['overview']['total_users']} users")
    
    def test_admin_requires_auth(self):
        """Test admin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401
        print("✓ Admin endpoints correctly require authentication")


class TestPublicAPIModule:
    """Test Public API module routes: /api/public/v1/*"""
    
    def test_public_status(self):
        """Test /api/public/v1/status returns API status"""
        response = requests.get(f"{BASE_URL}/api/public/v1/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "version" in data
        print(f"✓ Public API status: {data['status']}, version: {data['version']}")
    
    def test_public_ads(self):
        """Test /api/public/v1/ads returns public ads"""
        response = requests.get(f"{BASE_URL}/api/public/v1/ads")
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        assert "total" in data
        assert isinstance(data["ads"], list)
        print(f"✓ Public API ads: {data['total']} total ads")
    
    def test_public_categories(self):
        """Test /api/public/v1/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/public/v1/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Public API categories: {len(data)} categories")


class TestLoyaltyModule:
    """Test Loyalty module routes: /api/loyalty/*"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_loyalty_status(self, auth_session):
        """Test /api/loyalty/status returns user loyalty status"""
        response = auth_session.get(f"{BASE_URL}/api/loyalty/status")
        assert response.status_code == 200
        data = response.json()
        assert "points" in data or "level" in data or "status" in data
        print(f"✓ Loyalty status endpoint working")
    
    def test_loyalty_leaderboard(self, auth_session):
        """Test /api/loyalty/leaderboard returns leaderboard"""
        response = auth_session.get(f"{BASE_URL}/api/loyalty/leaderboard")
        assert response.status_code == 200
        data = response.json()
        # Should return list or object with leaderboard data
        print(f"✓ Loyalty leaderboard endpoint working")


class TestSellerModule:
    """Test Seller module routes: /api/seller/*"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_seller_dashboard(self, auth_session):
        """Test /api/seller/dashboard returns seller dashboard data"""
        response = auth_session.get(f"{BASE_URL}/api/seller/dashboard")
        assert response.status_code == 200
        data = response.json()
        # Should return dashboard data
        print(f"✓ Seller dashboard endpoint working")
    
    def test_seller_dashboard_requires_auth(self):
        """Test seller dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/seller/dashboard")
        assert response.status_code == 401
        print("✓ Seller dashboard correctly requires authentication")


class TestReferralModule:
    """Test Referral module routes: /api/referral/*"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_referral_code(self, auth_session):
        """Test /api/referral/code returns user's referral code"""
        response = auth_session.get(f"{BASE_URL}/api/referral/code")
        assert response.status_code == 200
        data = response.json()
        # Should return referral code data
        print(f"✓ Referral code endpoint working")
    
    def test_referral_code_requires_auth(self):
        """Test referral code requires authentication"""
        response = requests.get(f"{BASE_URL}/api/referral/code")
        assert response.status_code == 401
        print("✓ Referral code correctly requires authentication")


class TestEscrowModule:
    """Test Escrow module routes: /api/escrow/*"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return session
    
    def test_escrow_my_transactions(self, auth_session):
        """Test /api/escrow/my-transactions returns user's escrow transactions"""
        response = auth_session.get(f"{BASE_URL}/api/escrow/my-transactions")
        assert response.status_code == 200
        data = response.json()
        # Should return transactions list
        print(f"✓ Escrow my-transactions endpoint working")
    
    def test_escrow_requires_auth(self):
        """Test escrow endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/escrow/my-transactions")
        assert response.status_code == 401
        print("✓ Escrow endpoints correctly require authentication")


class TestAdsEndpoints:
    """Test Ads endpoints to verify they still work after refactoring"""
    
    def test_get_ads(self):
        """Test /api/ads returns ads list"""
        response = requests.get(f"{BASE_URL}/api/ads")
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        assert "total" in data
        print(f"✓ Ads endpoint working - {data['total']} total ads")
    
    def test_get_ads_with_filters(self):
        """Test /api/ads with category filter"""
        response = requests.get(f"{BASE_URL}/api/ads?category=cars")
        assert response.status_code == 200
        data = response.json()
        assert "ads" in data
        print(f"✓ Ads filtering working")


class TestBannersEndpoint:
    """Test banners endpoint"""
    
    def test_get_banners(self):
        """Test /api/banners returns banners"""
        response = requests.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Banners endpoint working - {len(data)} banners")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
