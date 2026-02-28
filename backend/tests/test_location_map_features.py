"""
Test Location and Map Features for X67 Digital Media Groupe
Tests: /api/judete, /api/localitati, /api/localitati/autocomplete, /api/ads with location filters
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestJudeteEndpoint:
    """Tests for /api/judete - Romanian counties endpoint"""
    
    def test_get_judete_returns_200(self):
        """GET /api/judete should return 200"""
        response = requests.get(f"{BASE_URL}/api/judete")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/judete returns 200")
    
    def test_get_judete_returns_list(self):
        """GET /api/judete should return a list of counties"""
        response = requests.get(f"{BASE_URL}/api/judete")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one county"
        print(f"✓ GET /api/judete returns {len(data)} counties")
    
    def test_judete_have_required_fields(self):
        """Each county should have code, name, lat, lng fields"""
        response = requests.get(f"{BASE_URL}/api/judete")
        data = response.json()
        
        for judet in data[:5]:  # Check first 5
            assert "code" in judet, "County should have 'code' field"
            assert "name" in judet, "County should have 'name' field"
            assert "lat" in judet, "County should have 'lat' field"
            assert "lng" in judet, "County should have 'lng' field"
        
        print(f"✓ Counties have required fields (code, name, lat, lng)")
    
    def test_judete_count_is_42(self):
        """Romania has 42 counties (41 + București)"""
        response = requests.get(f"{BASE_URL}/api/judete")
        data = response.json()
        assert len(data) == 42, f"Expected 42 counties, got {len(data)}"
        print(f"✓ Correct number of counties: 42")


class TestLocalitatiEndpoint:
    """Tests for /api/localitati - Localities endpoint"""
    
    def test_get_localitati_returns_200(self):
        """GET /api/localitati should return 200"""
        response = requests.get(f"{BASE_URL}/api/localitati")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/localitati returns 200")
    
    def test_get_localitati_returns_list(self):
        """GET /api/localitati should return a list"""
        response = requests.get(f"{BASE_URL}/api/localitati")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/localitati returns {len(data)} localities")
    
    def test_localitati_filter_by_judet_code(self):
        """GET /api/localitati?judet_code=B should filter by București"""
        response = requests.get(f"{BASE_URL}/api/localitati?judet_code=B")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All results should have judet_code = B
        for loc in data:
            assert loc.get("judet_code") == "B", f"Expected judet_code 'B', got {loc.get('judet_code')}"
        
        print(f"✓ Filter by judet_code=B returns {len(data)} localities")
    
    def test_localitati_filter_by_cluj(self):
        """GET /api/localitati?judet_code=CJ should filter by Cluj"""
        response = requests.get(f"{BASE_URL}/api/localitati?judet_code=CJ")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Cluj should have localities"
        
        for loc in data:
            assert loc.get("judet_code") == "CJ", f"Expected judet_code 'CJ', got {loc.get('judet_code')}"
        
        print(f"✓ Filter by judet_code=CJ returns {len(data)} localities")
    
    def test_localitati_have_required_fields(self):
        """Each locality should have name, judet_code, lat, lng fields"""
        response = requests.get(f"{BASE_URL}/api/localitati?limit=10")
        data = response.json()
        
        for loc in data:
            assert "name" in loc, "Locality should have 'name' field"
            assert "judet_code" in loc, "Locality should have 'judet_code' field"
            assert "lat" in loc, "Locality should have 'lat' field"
            assert "lng" in loc, "Locality should have 'lng' field"
        
        print(f"✓ Localities have required fields (name, judet_code, lat, lng)")
    
    def test_localitati_search_filter(self):
        """GET /api/localitati?search=Bucur should search by name"""
        response = requests.get(f"{BASE_URL}/api/localitati?search=Bucur")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # At least one result should contain "Bucur" in name
        if len(data) > 0:
            found_match = any("bucur" in loc.get("name", "").lower() for loc in data)
            assert found_match, "Search results should contain 'Bucur' in name"
        
        print(f"✓ Search filter returns {len(data)} results for 'Bucur'")


class TestLocalitatiAutocomplete:
    """Tests for /api/localitati/autocomplete - Autocomplete endpoint"""
    
    def test_autocomplete_returns_200(self):
        """GET /api/localitati/autocomplete?q=Buc should return 200"""
        response = requests.get(f"{BASE_URL}/api/localitati/autocomplete?q=Buc")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/localitati/autocomplete returns 200")
    
    def test_autocomplete_returns_list(self):
        """Autocomplete should return a list"""
        response = requests.get(f"{BASE_URL}/api/localitati/autocomplete?q=Buc")
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Autocomplete returns {len(data)} results for 'Buc'")
    
    def test_autocomplete_includes_judet_name(self):
        """Autocomplete results should include judet_name"""
        response = requests.get(f"{BASE_URL}/api/localitati/autocomplete?q=Cluj")
        data = response.json()
        
        if len(data) > 0:
            for loc in data:
                assert "judet_name" in loc, "Result should have 'judet_name' field"
                assert "display" in loc, "Result should have 'display' field"
        
        print(f"✓ Autocomplete results include judet_name and display fields")
    
    def test_autocomplete_display_format(self):
        """Display field should be 'locality, county' format"""
        response = requests.get(f"{BASE_URL}/api/localitati/autocomplete?q=Cluj")
        data = response.json()
        
        if len(data) > 0:
            for loc in data:
                display = loc.get("display", "")
                assert "," in display, f"Display should contain comma: {display}"
        
        print(f"✓ Autocomplete display format is correct")
    
    def test_autocomplete_short_query_returns_empty(self):
        """Autocomplete with query < 2 chars should return empty list"""
        response = requests.get(f"{BASE_URL}/api/localitati/autocomplete?q=B")
        data = response.json()
        assert data == [], f"Expected empty list for short query, got {len(data)} results"
        print(f"✓ Short query (1 char) returns empty list")
    
    def test_autocomplete_limit_parameter(self):
        """Autocomplete should respect limit parameter"""
        response = requests.get(f"{BASE_URL}/api/localitati/autocomplete?q=Bu&limit=5")
        data = response.json()
        assert len(data) <= 5, f"Expected max 5 results, got {len(data)}"
        print(f"✓ Limit parameter works correctly")


class TestAdsWithLocationFilters:
    """Tests for /api/ads with location filters"""
    
    def test_ads_endpoint_returns_200(self):
        """GET /api/ads should return 200"""
        response = requests.get(f"{BASE_URL}/api/ads")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ GET /api/ads returns 200")
    
    def test_ads_with_has_location_filter(self):
        """GET /api/ads?has_location=true should filter ads with location"""
        response = requests.get(f"{BASE_URL}/api/ads?has_location=true")
        data = response.json()
        
        assert "ads" in data, "Response should have 'ads' field"
        ads = data["ads"]
        
        # All returned ads should have location_lat and location_lng
        for ad in ads:
            assert ad.get("location_lat") is not None, f"Ad {ad.get('ad_id')} should have location_lat"
            assert ad.get("location_lng") is not None, f"Ad {ad.get('ad_id')} should have location_lng"
        
        print(f"✓ has_location=true filter returns {len(ads)} ads with location data")
    
    def test_ads_with_judet_code_filter(self):
        """GET /api/ads?judet_code=B should filter by București"""
        response = requests.get(f"{BASE_URL}/api/ads?judet_code=B")
        data = response.json()
        
        assert "ads" in data, "Response should have 'ads' field"
        ads = data["ads"]
        
        # All returned ads should have judet_code = B
        for ad in ads:
            assert ad.get("judet_code") == "B", f"Expected judet_code 'B', got {ad.get('judet_code')}"
        
        print(f"✓ judet_code=B filter returns {len(ads)} ads")
    
    def test_ads_response_structure(self):
        """Ads response should have proper structure"""
        response = requests.get(f"{BASE_URL}/api/ads?has_location=true")
        data = response.json()
        
        assert "ads" in data, "Response should have 'ads' field"
        assert "total" in data, "Response should have 'total' field"
        assert "page" in data, "Response should have 'page' field"
        
        print(f"✓ Ads response has proper structure (ads, total, page)")
    
    def test_ads_with_location_have_coordinates(self):
        """Ads with location should have valid coordinates"""
        response = requests.get(f"{BASE_URL}/api/ads?has_location=true")
        data = response.json()
        ads = data.get("ads", [])
        
        for ad in ads:
            lat = ad.get("location_lat")
            lng = ad.get("location_lng")
            
            # Validate coordinates are within Romania bounds
            if lat is not None and lng is not None:
                assert 43.5 <= lat <= 48.5, f"Latitude {lat} out of Romania bounds"
                assert 20.0 <= lng <= 30.0, f"Longitude {lng} out of Romania bounds"
        
        print(f"✓ Ads have valid coordinates within Romania bounds")


class TestLocationDataIntegrity:
    """Tests for data integrity between judete and localitati"""
    
    def test_localitati_reference_valid_judete(self):
        """All localitati should reference valid judete codes"""
        # Get all judete codes
        judete_response = requests.get(f"{BASE_URL}/api/judete")
        judete = judete_response.json()
        valid_codes = {j["code"] for j in judete}
        
        # Get sample localitati
        localitati_response = requests.get(f"{BASE_URL}/api/localitati?limit=50")
        localitati = localitati_response.json()
        
        for loc in localitati:
            judet_code = loc.get("judet_code")
            assert judet_code in valid_codes, f"Invalid judet_code: {judet_code}"
        
        print(f"✓ All localitati reference valid judete codes")
    
    def test_bucuresti_has_sectors(self):
        """București should have sectors as localities"""
        response = requests.get(f"{BASE_URL}/api/localitati?judet_code=B")
        data = response.json()
        
        # Check for sector names
        sector_names = [loc["name"] for loc in data if "Sector" in loc.get("name", "")]
        assert len(sector_names) >= 1, "București should have sectors"
        
        print(f"✓ București has sectors: {sector_names[:3]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
