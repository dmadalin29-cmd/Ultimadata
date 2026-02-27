"""
Test Phase 4 Features: Seller Dashboard, Loyalty Program, Referral System
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Test credentials
ADMIN_EMAIL = "admin@x67digital.com"
ADMIN_PASSWORD = "admin"


class TestPhase4APIs:
    """Test Phase 4 API endpoints: Seller Dashboard, Loyalty, Referral"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session cookie
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        self.user = login_response.json()
        print(f"Logged in as: {self.user.get('name', 'Unknown')}")
    
    # ==================== SELLER DASHBOARD TESTS ====================
    
    def test_seller_dashboard_returns_200(self):
        """Test /api/seller/dashboard returns 200 for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/seller/dashboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Seller dashboard returns 200")
    
    def test_seller_dashboard_has_summary(self):
        """Test seller dashboard contains summary with required fields"""
        response = self.session.get(f"{BASE_URL}/api/seller/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data, "Response missing 'summary' field"
        
        summary = data["summary"]
        required_fields = [
            "total_ads", "active_ads", "total_views", "total_favorites",
            "total_conversations", "unread_messages", "pending_offers",
            "accepted_offers", "avg_rating", "total_reviews"
        ]
        
        for field in required_fields:
            assert field in summary, f"Summary missing '{field}' field"
        
        print(f"✓ Seller dashboard summary has all required fields")
        print(f"  - Total ads: {summary['total_ads']}")
        print(f"  - Active ads: {summary['active_ads']}")
        print(f"  - Total views: {summary['total_views']}")
    
    def test_seller_dashboard_has_recent_activity(self):
        """Test seller dashboard contains recent_activity"""
        response = self.session.get(f"{BASE_URL}/api/seller/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "recent_activity" in data, "Response missing 'recent_activity' field"
        assert "views_this_week" in data["recent_activity"], "recent_activity missing 'views_this_week'"
        print(f"✓ Seller dashboard has recent_activity (views_this_week: {data['recent_activity']['views_this_week']})")
    
    def test_seller_dashboard_has_top_ads(self):
        """Test seller dashboard contains top_ads array"""
        response = self.session.get(f"{BASE_URL}/api/seller/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "top_ads" in data, "Response missing 'top_ads' field"
        assert isinstance(data["top_ads"], list), "top_ads should be a list"
        print(f"✓ Seller dashboard has top_ads (count: {len(data['top_ads'])})")
    
    def test_seller_dashboard_has_loyalty_info(self):
        """Test seller dashboard contains loyalty information"""
        response = self.session.get(f"{BASE_URL}/api/seller/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "loyalty" in data, "Response missing 'loyalty' field"
        
        loyalty = data["loyalty"]
        assert "points" in loyalty, "loyalty missing 'points'"
        assert "level" in loyalty, "loyalty missing 'level'"
        
        level = loyalty["level"]
        assert "name" in level, "level missing 'name'"
        assert "color" in level, "level missing 'color'"
        
        print(f"✓ Seller dashboard has loyalty info (points: {loyalty['points']}, level: {level['name']})")
    
    def test_seller_dashboard_requires_auth(self):
        """Test seller dashboard requires authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/seller/dashboard")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Seller dashboard correctly requires authentication")
    
    # ==================== LOYALTY TESTS ====================
    
    def test_loyalty_status_returns_200(self):
        """Test /api/loyalty/status returns 200 for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/loyalty/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Loyalty status returns 200")
    
    def test_loyalty_status_has_required_fields(self):
        """Test loyalty status contains all required fields"""
        response = self.session.get(f"{BASE_URL}/api/loyalty/status")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["points", "level", "next_level", "points_to_next", "recent_transactions", "all_levels"]
        
        for field in required_fields:
            assert field in data, f"Response missing '{field}' field"
        
        # Validate level structure
        level = data["level"]
        assert "level" in level, "level missing 'level' number"
        assert "name" in level, "level missing 'name'"
        assert "min_points" in level, "level missing 'min_points'"
        assert "color" in level, "level missing 'color'"
        assert "benefits" in level, "level missing 'benefits'"
        
        print(f"✓ Loyalty status has all required fields")
        print(f"  - Points: {data['points']}")
        print(f"  - Level: {level['name']} (Level {level['level']})")
        print(f"  - Points to next: {data['points_to_next']}")
    
    def test_loyalty_status_all_levels_structure(self):
        """Test all_levels contains proper level definitions"""
        response = self.session.get(f"{BASE_URL}/api/loyalty/status")
        assert response.status_code == 200
        
        data = response.json()
        all_levels = data["all_levels"]
        
        assert len(all_levels) >= 4, f"Expected at least 4 levels, got {len(all_levels)}"
        
        # Check level names
        level_names = [l["name"] for l in all_levels]
        expected_names = ["Bronze", "Silver", "Gold", "Platinum"]
        for name in expected_names:
            assert name in level_names, f"Missing level: {name}"
        
        print(f"✓ All levels present: {level_names}")
    
    def test_loyalty_leaderboard_returns_200(self):
        """Test /api/loyalty/leaderboard returns 200"""
        response = self.session.get(f"{BASE_URL}/api/loyalty/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Response missing 'leaderboard' field"
        assert isinstance(data["leaderboard"], list), "leaderboard should be a list"
        
        print(f"✓ Loyalty leaderboard returns 200 (users: {len(data['leaderboard'])})")
    
    def test_loyalty_claim_daily_endpoint_exists(self):
        """Test /api/loyalty/claim-daily endpoint exists"""
        response = self.session.post(f"{BASE_URL}/api/loyalty/claim-daily")
        # Should return 200 (success) or 400 (already claimed today)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            assert "points_earned" in data, "Response missing 'points_earned'"
            assert "new_total" in data, "Response missing 'new_total'"
            print(f"✓ Daily points claimed: +{data['points_earned']} (total: {data['new_total']})")
        else:
            print(f"✓ Daily points already claimed today (expected behavior)")
    
    def test_loyalty_status_requires_auth(self):
        """Test loyalty status requires authentication"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/loyalty/status")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Loyalty status correctly requires authentication")
    
    # ==================== REFERRAL TESTS ====================
    
    def test_referral_code_returns_200(self):
        """Test /api/referral/code returns 200 for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/referral/code")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Referral code returns 200")
    
    def test_referral_code_has_required_fields(self):
        """Test referral code response contains all required fields"""
        response = self.session.get(f"{BASE_URL}/api/referral/code")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["referral_code", "referral_link", "total_referrals", "points_earned"]
        
        for field in required_fields:
            assert field in data, f"Response missing '{field}' field"
        
        # Validate referral code format (should start with X67)
        assert data["referral_code"].startswith("X67"), f"Referral code should start with X67, got: {data['referral_code']}"
        
        # Validate referral link contains the code
        assert data["referral_code"] in data["referral_link"], "Referral link should contain the referral code"
        
        print(f"✓ Referral code has all required fields")
        print(f"  - Code: {data['referral_code']}")
        print(f"  - Link: {data['referral_link']}")
        print(f"  - Total referrals: {data['total_referrals']}")
        print(f"  - Points earned: {data['points_earned']}")
    
    def test_referral_list_returns_200(self):
        """Test /api/referral/list returns 200 for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/referral/list")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "referrals" in data, "Response missing 'referrals' field"
        assert isinstance(data["referrals"], list), "referrals should be a list"
        
        print(f"✓ Referral list returns 200 (referred users: {len(data['referrals'])})")
    
    def test_referral_code_requires_auth(self):
        """Test referral code requires authentication"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/referral/code")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Referral code correctly requires authentication")
    
    def test_referral_list_requires_auth(self):
        """Test referral list requires authentication"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/referral/list")
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("✓ Referral list correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
