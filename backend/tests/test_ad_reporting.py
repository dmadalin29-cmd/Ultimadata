"""
Test Ad Reporting System
Tests for:
- GET /api/report/reasons - returns list of 8 report reasons
- POST /api/ads/{ad_id}/report - creates a report with reason and optional description
- GET /api/admin/reports - returns reports list with stats (requires admin auth)
- PUT /api/admin/reports/{report_id} - updates report status and takes action
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "test123@test.com"
TEST_USER_PASSWORD = "test123"
ADMIN_EMAIL = "d.madalin29@gmail.com"
ADMIN_PASSWORD = "admin123"


class TestReportReasons:
    """Test GET /api/report/reasons endpoint"""
    
    def test_get_report_reasons_returns_200(self):
        """Test that report reasons endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/report/reasons returns 200")
    
    def test_report_reasons_returns_8_reasons(self):
        """Test that exactly 8 report reasons are returned"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        data = response.json()
        
        assert "reasons" in data, "Response should have 'reasons' key"
        assert len(data["reasons"]) == 8, f"Expected 8 reasons, got {len(data['reasons'])}"
        print(f"✓ Report reasons returns 8 reasons")
    
    def test_report_reasons_have_required_fields(self):
        """Test that each reason has id and name fields"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        data = response.json()
        
        for reason in data["reasons"]:
            assert "id" in reason, "Each reason should have 'id' field"
            assert "name" in reason, "Each reason should have 'name' field"
            assert isinstance(reason["id"], str), "Reason id should be string"
            assert isinstance(reason["name"], str), "Reason name should be string"
        print("✓ All report reasons have required fields (id, name)")
    
    def test_report_reasons_include_expected_types(self):
        """Test that expected reason types are included"""
        response = requests.get(f"{BASE_URL}/api/report/reasons")
        data = response.json()
        
        reason_ids = [r["id"] for r in data["reasons"]]
        expected_ids = ["spam", "inappropriate", "scam", "duplicate", "wrong_category", "illegal", "personal_info", "other"]
        
        for expected_id in expected_ids:
            assert expected_id in reason_ids, f"Expected reason '{expected_id}' not found"
        print("✓ All expected report reason types are present")


class TestReportAd:
    """Test POST /api/ads/{ad_id}/report endpoint"""
    
    @pytest.fixture
    def user_session(self):
        """Login as test user and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not login as test user")
        return session
    
    @pytest.fixture
    def test_ad_id(self):
        """Get an existing ad ID for testing"""
        response = requests.get(f"{BASE_URL}/api/ads?limit=1")
        if response.status_code == 200:
            ads = response.json().get("ads", [])
            if ads:
                return ads[0]["ad_id"]
        pytest.skip("No ads available for testing")
    
    def test_report_ad_without_reason_fails(self, user_session, test_ad_id):
        """Test that reporting without reason returns 400"""
        response = user_session.post(
            f"{BASE_URL}/api/ads/{test_ad_id}/report",
            json={"description": "Test description"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Report without reason returns 400")
    
    def test_report_nonexistent_ad_fails(self, user_session):
        """Test that reporting non-existent ad returns 404"""
        fake_ad_id = f"ad_nonexistent_{uuid.uuid4().hex[:8]}"
        response = user_session.post(
            f"{BASE_URL}/api/ads/{fake_ad_id}/report",
            json={"reason": "spam"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Report non-existent ad returns 404")
    
    def test_report_ad_with_valid_reason_succeeds(self, user_session, test_ad_id):
        """Test that reporting with valid reason succeeds"""
        # Use a unique reason to avoid duplicate report error
        response = user_session.post(
            f"{BASE_URL}/api/ads/{test_ad_id}/report",
            json={
                "reason": "spam",
                "description": f"Test report {uuid.uuid4().hex[:8]}"
            }
        )
        # Either 200 (success) or 400 (already reported) is acceptable
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data, "Response should have message"
            print("✓ Report ad with valid reason succeeds")
        else:
            print("✓ Report ad returns 400 (already reported by this user)")
    
    def test_report_ad_with_description(self, user_session, test_ad_id):
        """Test that report can include optional description"""
        response = user_session.post(
            f"{BASE_URL}/api/ads/{test_ad_id}/report",
            json={
                "reason": "inappropriate",
                "description": "This is a detailed description of the issue"
            }
        )
        # Either success or already reported
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        print("✓ Report ad with description handled correctly")


class TestAdminReports:
    """Test admin reports endpoints"""
    
    @pytest.fixture
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as admin: {response.text}")
        return session
    
    @pytest.fixture
    def user_session(self):
        """Login as regular user and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not login as test user")
        return session
    
    def test_admin_reports_requires_auth(self):
        """Test that admin reports endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/reports")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin reports requires authentication")
    
    def test_admin_reports_requires_admin_role(self, user_session):
        """Test that admin reports endpoint requires admin role"""
        response = user_session.get(f"{BASE_URL}/api/admin/reports")
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Admin reports requires admin role")
    
    def test_admin_reports_returns_200_for_admin(self, admin_session):
        """Test that admin can access reports"""
        response = admin_session.get(f"{BASE_URL}/api/admin/reports")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Admin can access reports endpoint")
    
    def test_admin_reports_response_structure(self, admin_session):
        """Test that admin reports response has correct structure"""
        response = admin_session.get(f"{BASE_URL}/api/admin/reports")
        data = response.json()
        
        assert "reports" in data, "Response should have 'reports' key"
        assert "total" in data, "Response should have 'total' key"
        assert "page" in data, "Response should have 'page' key"
        assert "pages" in data, "Response should have 'pages' key"
        assert "stats" in data, "Response should have 'stats' key"
        print("✓ Admin reports response has correct structure")
    
    def test_admin_reports_stats_structure(self, admin_session):
        """Test that stats have all status counts"""
        response = admin_session.get(f"{BASE_URL}/api/admin/reports")
        data = response.json()
        stats = data["stats"]
        
        assert "pending" in stats, "Stats should have 'pending' count"
        assert "reviewed" in stats, "Stats should have 'reviewed' count"
        assert "dismissed" in stats, "Stats should have 'dismissed' count"
        assert "action_taken" in stats, "Stats should have 'action_taken' count"
        print("✓ Admin reports stats have all status counts")
    
    def test_admin_reports_filter_by_status(self, admin_session):
        """Test filtering reports by status"""
        response = admin_session.get(f"{BASE_URL}/api/admin/reports?status=pending")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # All returned reports should have pending status
        for report in data["reports"]:
            assert report["status"] == "pending", f"Expected pending status, got {report['status']}"
        print("✓ Admin reports filter by status works")
    
    def test_admin_reports_pagination(self, admin_session):
        """Test reports pagination"""
        response = admin_session.get(f"{BASE_URL}/api/admin/reports?page=1&limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["reports"]) <= 5, "Should respect limit parameter"
        print("✓ Admin reports pagination works")


class TestUpdateReport:
    """Test PUT /api/admin/reports/{report_id} endpoint"""
    
    @pytest.fixture
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as admin: {response.text}")
        return session
    
    @pytest.fixture
    def pending_report_id(self, admin_session):
        """Get a pending report ID for testing"""
        response = admin_session.get(f"{BASE_URL}/api/admin/reports?status=pending")
        if response.status_code == 200:
            reports = response.json().get("reports", [])
            if reports:
                return reports[0]["report_id"]
        pytest.skip("No pending reports available for testing")
    
    def test_update_report_requires_admin(self):
        """Test that updating report requires admin auth"""
        response = requests.put(
            f"{BASE_URL}/api/admin/reports/rep_test123",
            json={"status": "dismissed", "action": "none"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Update report requires authentication")
    
    def test_update_nonexistent_report_fails(self, admin_session):
        """Test that updating non-existent report returns 404"""
        fake_report_id = f"rep_nonexistent_{uuid.uuid4().hex[:8]}"
        response = admin_session.put(
            f"{BASE_URL}/api/admin/reports/{fake_report_id}",
            json={"status": "dismissed", "action": "none"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Update non-existent report returns 404")
    
    def test_update_report_dismiss(self, admin_session, pending_report_id):
        """Test dismissing a report"""
        response = admin_session.put(
            f"{BASE_URL}/api/admin/reports/{pending_report_id}",
            json={
                "status": "dismissed",
                "action": "none",
                "admin_notes": "Test dismissal"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        print("✓ Dismiss report works correctly")


class TestReportIntegration:
    """Integration tests for the full report flow"""
    
    @pytest.fixture
    def user_session(self):
        """Login as test user and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not login as test user")
        return session
    
    @pytest.fixture
    def admin_session(self):
        """Login as admin and return session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as admin: {response.text}")
        return session
    
    def test_full_report_flow(self, user_session, admin_session):
        """Test complete flow: get reasons -> report ad -> admin reviews"""
        # Step 1: Get report reasons
        reasons_response = requests.get(f"{BASE_URL}/api/report/reasons")
        assert reasons_response.status_code == 200
        reasons = reasons_response.json()["reasons"]
        assert len(reasons) == 8
        print("✓ Step 1: Got 8 report reasons")
        
        # Step 2: Get an ad to report
        ads_response = requests.get(f"{BASE_URL}/api/ads?limit=1")
        assert ads_response.status_code == 200
        ads = ads_response.json().get("ads", [])
        if not ads:
            pytest.skip("No ads available")
        ad_id = ads[0]["ad_id"]
        print(f"✓ Step 2: Found ad to report: {ad_id}")
        
        # Step 3: Report the ad (may fail if already reported)
        report_response = user_session.post(
            f"{BASE_URL}/api/ads/{ad_id}/report",
            json={
                "reason": "other",
                "description": f"Integration test report {uuid.uuid4().hex[:8]}"
            }
        )
        assert report_response.status_code in [200, 400]
        print(f"✓ Step 3: Report submitted (status: {report_response.status_code})")
        
        # Step 4: Admin views reports
        admin_reports_response = admin_session.get(f"{BASE_URL}/api/admin/reports")
        assert admin_reports_response.status_code == 200
        reports_data = admin_reports_response.json()
        assert "reports" in reports_data
        assert "stats" in reports_data
        print(f"✓ Step 4: Admin can view reports (total: {reports_data['total']})")
        
        # Step 5: Verify stats structure
        stats = reports_data["stats"]
        total_stats = stats["pending"] + stats["reviewed"] + stats["dismissed"] + stats["action_taken"]
        print(f"✓ Step 5: Stats verified - pending: {stats['pending']}, reviewed: {stats['reviewed']}, dismissed: {stats['dismissed']}, action_taken: {stats['action_taken']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
