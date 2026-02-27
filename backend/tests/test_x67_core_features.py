"""
X67 Digital Media Groupe - Core Features Backend Tests
Tests: Categories, Ads, Auth, Cities endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCategories:
    """Test /api/categories endpoint"""
    
    def test_get_categories_returns_200(self):
        """GET /api/categories should return 200"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        print(f"✓ GET /api/categories returned {response.status_code}")
    
    def test_categories_returns_all_8_categories(self):
        """Should return all 8 main categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) == 8
        
        expected_ids = ["escorts", "real_estate", "cars", "jobs", "electronics", "fashion", "services", "animals"]
        actual_ids = [cat["id"] for cat in data]
        
        for cat_id in expected_ids:
            assert cat_id in actual_ids, f"Missing category: {cat_id}"
        
        print(f"✓ All 8 categories present: {actual_ids}")
    
    def test_categories_have_required_fields(self):
        """Each category should have id, name, icon, color, subcategories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        data = response.json()
        
        for cat in data:
            assert "id" in cat, f"Missing 'id' in category"
            assert "name" in cat, f"Missing 'name' in category {cat.get('id')}"
            assert "icon" in cat, f"Missing 'icon' in category {cat.get('id')}"
            assert "color" in cat, f"Missing 'color' in category {cat.get('id')}"
            assert "subcategories" in cat, f"Missing 'subcategories' in category {cat.get('id')}"
            assert isinstance(cat["subcategories"], list)
        
        print("✓ All categories have required fields")


class TestAds:
    """Test /api/ads endpoints"""
    
    def test_get_ads_returns_200(self):
        """GET /api/ads should return 200"""
        response = requests.get(f"{BASE_URL}/api/ads")
        assert response.status_code == 200
        print(f"✓ GET /api/ads returned {response.status_code}")
    
    def test_ads_response_structure(self):
        """Ads response should have ads, total, page, pages"""
        response = requests.get(f"{BASE_URL}/api/ads")
        data = response.json()
        
        assert "ads" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        assert isinstance(data["ads"], list)
        
        print(f"✓ Ads response structure correct: total={data['total']}, page={data['page']}")
    
    def test_ads_filter_by_category(self):
        """GET /api/ads?category_id=escorts should filter by category"""
        response = requests.get(f"{BASE_URL}/api/ads?category_id=escorts")
        assert response.status_code == 200
        data = response.json()
        
        # All returned ads should be in escorts category
        for ad in data.get("ads", []):
            assert ad.get("category_id") == "escorts", f"Ad {ad.get('ad_id')} not in escorts category"
        
        print(f"✓ Category filter works: {len(data.get('ads', []))} escorts ads")
    
    def test_ads_filter_by_city(self):
        """GET /api/ads?city_id=bucuresti should filter by city"""
        response = requests.get(f"{BASE_URL}/api/ads?city_id=bucuresti")
        assert response.status_code == 200
        data = response.json()
        
        print(f"✓ City filter works: {len(data.get('ads', []))} ads in București")


class TestAuth:
    """Test /api/auth endpoints"""
    
    def test_login_success(self):
        """POST /api/auth/login with valid credentials should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@x67digital.com", "password": "admin"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "user_id" in data
        assert "email" in data
        assert data["email"] == "admin@x67digital.com"
        assert "role" in data
        
        print(f"✓ Login successful: user_id={data['user_id']}, role={data['role']}")
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@email.com", "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected with 401")
    
    def test_login_missing_fields(self):
        """POST /api/auth/login without required fields should return 422"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@test.com"}  # Missing password
        )
        assert response.status_code == 422
        print("✓ Missing fields correctly rejected with 422")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ /api/auth/me correctly requires authentication")
    
    def test_forgot_password_endpoint(self):
        """POST /api/auth/forgot-password should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "test@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Forgot password endpoint works")


class TestCities:
    """Test /api/cities endpoint"""
    
    def test_get_cities_returns_200(self):
        """GET /api/cities should return 200"""
        response = requests.get(f"{BASE_URL}/api/cities")
        assert response.status_code == 200
        print(f"✓ GET /api/cities returned {response.status_code}")
    
    def test_cities_returns_list(self):
        """Cities should return a list of Romanian cities"""
        response = requests.get(f"{BASE_URL}/api/cities")
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check for major cities
        city_names = [city.get("name") for city in data]
        assert "București" in city_names, "București should be in cities list"
        
        print(f"✓ Cities endpoint returns {len(data)} cities")
    
    def test_cities_have_required_fields(self):
        """Each city should have id, name, county"""
        response = requests.get(f"{BASE_URL}/api/cities")
        data = response.json()
        
        for city in data[:5]:  # Check first 5
            assert "id" in city
            assert "name" in city
            assert "county" in city
        
        print("✓ Cities have required fields")


class TestHealthAndMisc:
    """Test miscellaneous endpoints"""
    
    def test_banners_endpoint(self):
        """GET /api/banners should return 200"""
        response = requests.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200
        print("✓ Banners endpoint works")
    
    def test_ads_search(self):
        """GET /api/ads with search param should return 200"""
        response = requests.get(f"{BASE_URL}/api/ads?search=test")
        assert response.status_code == 200
        print("✓ Ads search endpoint works")


class TestAdCreationAuth:
    """Test ad creation requires authentication"""
    
    def test_create_ad_without_auth_returns_401(self):
        """POST /api/ads without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/ads",
            json={
                "title": "Test Ad",
                "description": "Test description",
                "category_id": "electronics",
                "city_id": "bucuresti"
            }
        )
        assert response.status_code == 401
        print("✓ Ad creation correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
