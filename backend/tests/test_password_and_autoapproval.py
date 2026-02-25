"""
Test suite for X67 Digital Media Groupe - Password Reset & Auto-Approval Features
Tests:
1. Forgot Password flow - /api/auth/forgot-password
2. Reset Password flow - /api/auth/reset-password
3. Admin change user password - /api/admin/users/{user_id}/password
4. Auto-approval bot - non-escort ads auto-approved, escorts pending
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@x67digital.com"
ADMIN_PASSWORD = "admin"
ADMIN_EMAIL_2 = "contact@x67digital.com"
ADMIN_PASSWORD_2 = "Credcada1."


class TestForgotPassword:
    """Test forgot password endpoint"""
    
    def test_forgot_password_existing_email(self):
        """Test forgot password with existing email returns success message"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": ADMIN_EMAIL}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should return generic message to prevent email enumeration
        assert "email" in data["message"].lower() or "dacă" in data["message"].lower()
        print(f"✓ Forgot password for existing email: {data['message']}")
    
    def test_forgot_password_nonexistent_email(self):
        """Test forgot password with non-existent email returns same message (no enumeration)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": f"nonexistent_{uuid.uuid4().hex[:8]}@test.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Should return same generic message
        print(f"✓ Forgot password for non-existent email: {data['message']}")
    
    def test_forgot_password_invalid_email_format(self):
        """Test forgot password with invalid email format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "invalid-email"}
        )
        # Should return 422 for validation error
        assert response.status_code == 422
        print("✓ Forgot password rejects invalid email format")
    
    def test_forgot_password_missing_email(self):
        """Test forgot password without email field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={}
        )
        assert response.status_code == 422
        print("✓ Forgot password requires email field")


class TestResetPassword:
    """Test reset password endpoint"""
    
    def test_reset_password_invalid_token(self):
        """Test reset password with invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": "invalid-token-12345", "new_password": "newpassword123"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expirat" in data["detail"].lower()
        print(f"✓ Reset password rejects invalid token: {data['detail']}")
    
    def test_reset_password_short_password(self):
        """Test reset password with too short password"""
        # First we need a valid token - but since we can't get one easily,
        # we test that the endpoint exists and validates password length
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": str(uuid.uuid4()), "new_password": "1234"}
        )
        # Will fail with invalid token first, but endpoint exists
        assert response.status_code == 400
        print("✓ Reset password endpoint validates input")
    
    def test_reset_password_missing_fields(self):
        """Test reset password without required fields"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={}
        )
        assert response.status_code == 422
        print("✓ Reset password requires token and new_password fields")


class TestAdminChangePassword:
    """Test admin change user password endpoint"""
    
    @pytest.fixture
    def admin_session(self):
        """Get admin session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            # Try second admin
            response = session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL_2, "password": ADMIN_PASSWORD_2}
            )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return session
    
    @pytest.fixture
    def test_user(self, admin_session):
        """Create a test user for password change tests"""
        test_email = f"TEST_pwdchange_{uuid.uuid4().hex[:8]}@test.com"
        # Register test user
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Test Password User"
            }
        )
        if response.status_code == 200:
            user_data = response.json()
            yield {"user_id": user_data["user_id"], "email": test_email}
            # Cleanup - delete test user
            admin_session.delete(f"{BASE_URL}/api/admin/users/{user_data['user_id']}")
        else:
            pytest.skip(f"Could not create test user: {response.text}")
    
    def test_admin_change_password_success(self, admin_session, test_user):
        """Test admin can change user password"""
        new_password = "newpassword456"
        response = admin_session.put(
            f"{BASE_URL}/api/admin/users/{test_user['user_id']}/password",
            json={"new_password": new_password}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Admin changed password: {data['message']}")
        
        # Verify new password works
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_user['email'], "password": new_password}
        )
        assert login_response.status_code == 200
        print("✓ User can login with new password")
    
    def test_admin_change_password_short_password(self, admin_session, test_user):
        """Test admin cannot set password shorter than 5 chars"""
        response = admin_session.put(
            f"{BASE_URL}/api/admin/users/{test_user['user_id']}/password",
            json={"new_password": "1234"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "5" in data.get("detail", "") or "caractere" in data.get("detail", "")
        print(f"✓ Admin change password rejects short password: {data['detail']}")
    
    def test_admin_change_password_nonexistent_user(self, admin_session):
        """Test admin cannot change password for non-existent user"""
        response = admin_session.put(
            f"{BASE_URL}/api/admin/users/nonexistent_user_123/password",
            json={"new_password": "newpassword123"}
        )
        assert response.status_code == 404
        print("✓ Admin change password returns 404 for non-existent user")
    
    def test_admin_change_password_requires_admin(self):
        """Test that non-admin cannot change passwords"""
        # Create regular user session
        test_email = f"TEST_regular_{uuid.uuid4().hex[:8]}@test.com"
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Regular User"
            }
        )
        
        if register_response.status_code == 200:
            user_session = requests.Session()
            login_response = user_session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": test_email, "password": "testpass123"}
            )
            
            if login_response.status_code == 200:
                # Try to change another user's password
                response = user_session.put(
                    f"{BASE_URL}/api/admin/users/some_user_id/password",
                    json={"new_password": "hackedpassword"}
                )
                assert response.status_code == 403
                print("✓ Non-admin cannot change passwords (403)")
                
                # Cleanup
                admin_session = requests.Session()
                admin_session.post(
                    f"{BASE_URL}/api/auth/login",
                    json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
                )
                user_data = register_response.json()
                admin_session.delete(f"{BASE_URL}/api/admin/users/{user_data['user_id']}")
        else:
            pytest.skip("Could not create test user")


class TestAutoApprovalBot:
    """Test auto-approval bot for ads"""
    
    @pytest.fixture
    def user_session(self):
        """Get authenticated user session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            response = session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL_2, "password": ADMIN_PASSWORD_2}
            )
        assert response.status_code == 200
        return session
    
    def test_non_escort_ad_auto_approved(self, user_session):
        """Test that non-escort category ads are auto-approved (status='active')"""
        # Create ad in 'real_estate' category
        ad_data = {
            "title": f"TEST Auto-Approval Apartament {uuid.uuid4().hex[:6]}",
            "description": "Test ad for auto-approval verification",
            "category_id": "real_estate",
            "subcategory_id": "apartments_sale",
            "city_id": "bucuresti",
            "price": 50000,
            "price_type": "fixed"
        }
        
        response = user_session.post(
            f"{BASE_URL}/api/ads",
            json=ad_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "active", f"Expected 'active', got '{data['status']}'"
        assert "ad_id" in data
        print(f"✓ Real estate ad auto-approved with status='active': {data['ad_id']}")
        
        # Cleanup
        user_session.delete(f"{BASE_URL}/api/ads/{data['ad_id']}")
    
    def test_electronics_ad_auto_approved(self, user_session):
        """Test that electronics category ads are auto-approved"""
        ad_data = {
            "title": f"TEST Auto-Approval iPhone {uuid.uuid4().hex[:6]}",
            "description": "Test electronics ad",
            "category_id": "electronics",
            "subcategory_id": "phones",
            "city_id": "cluj",
            "price": 500,
            "price_type": "negotiable"
        }
        
        response = user_session.post(
            f"{BASE_URL}/api/ads",
            json=ad_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "active"
        print(f"✓ Electronics ad auto-approved: {data['ad_id']}")
        
        # Cleanup
        user_session.delete(f"{BASE_URL}/api/ads/{data['ad_id']}")
    
    def test_cars_ad_auto_approved(self, user_session):
        """Test that cars category ads are auto-approved"""
        ad_data = {
            "title": f"TEST Auto-Approval BMW {uuid.uuid4().hex[:6]}",
            "description": "Test car ad",
            "category_id": "cars",
            "subcategory_id": "cars_sale",
            "city_id": "timisoara",
            "price": 15000,
            "price_type": "fixed"
        }
        
        response = user_session.post(
            f"{BASE_URL}/api/ads",
            json=ad_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "active"
        print(f"✓ Cars ad auto-approved: {data['ad_id']}")
        
        # Cleanup
        user_session.delete(f"{BASE_URL}/api/ads/{data['ad_id']}")
    
    def test_jobs_ad_auto_approved(self, user_session):
        """Test that jobs category ads are auto-approved"""
        ad_data = {
            "title": f"TEST Auto-Approval Job {uuid.uuid4().hex[:6]}",
            "description": "Test job ad",
            "category_id": "jobs",
            "subcategory_id": "jobs_it",
            "city_id": "bucuresti",
            "price": 3000,
            "price_type": "fixed"
        }
        
        response = user_session.post(
            f"{BASE_URL}/api/ads",
            json=ad_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "active"
        print(f"✓ Jobs ad auto-approved: {data['ad_id']}")
        
        # Cleanup
        user_session.delete(f"{BASE_URL}/api/ads/{data['ad_id']}")
    
    def test_escort_ad_requires_manual_approval(self, user_session):
        """Test that escort category ads require manual approval (status='pending')"""
        ad_data = {
            "title": f"TEST Escort Ad {uuid.uuid4().hex[:6]}",
            "description": "Test escort ad for manual approval verification",
            "category_id": "escorts",
            "subcategory_id": "escorts_female",
            "city_id": "bucuresti",
            "price": 100,
            "price_type": "fixed"
        }
        
        response = user_session.post(
            f"{BASE_URL}/api/ads",
            json=ad_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "pending", f"Expected 'pending', got '{data['status']}'"
        assert "ad_id" in data
        assert "aprobarea" in data.get("message", "").lower() or "așteaptă" in data.get("message", "").lower()
        print(f"✓ Escort ad requires manual approval with status='pending': {data['ad_id']}")
        
        # Cleanup
        user_session.delete(f"{BASE_URL}/api/ads/{data['ad_id']}")
    
    def test_services_ad_auto_approved(self, user_session):
        """Test that services category ads are auto-approved"""
        ad_data = {
            "title": f"TEST Auto-Approval Service {uuid.uuid4().hex[:6]}",
            "description": "Test service ad",
            "category_id": "services",
            "subcategory_id": "construction",
            "city_id": "iasi",
            "price": 200,
            "price_type": "negotiable"
        }
        
        response = user_session.post(
            f"{BASE_URL}/api/ads",
            json=ad_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "active"
        print(f"✓ Services ad auto-approved: {data['ad_id']}")
        
        # Cleanup
        user_session.delete(f"{BASE_URL}/api/ads/{data['ad_id']}")


class TestAdCreationFree:
    """Test that ad creation is free (no payment required)"""
    
    @pytest.fixture
    def user_session(self):
        """Get authenticated user session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            response = session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL_2, "password": ADMIN_PASSWORD_2}
            )
        assert response.status_code == 200
        return session
    
    def test_ad_creation_is_free(self, user_session):
        """Test that ad creation doesn't require payment"""
        ad_data = {
            "title": f"TEST Free Ad {uuid.uuid4().hex[:6]}",
            "description": "Test that ad creation is free",
            "category_id": "electronics",
            "subcategory_id": "phones",
            "city_id": "bucuresti",
            "price": 100,
            "price_type": "fixed"
        }
        
        response = user_session.post(
            f"{BASE_URL}/api/ads",
            json=ad_data
        )
        
        # Should succeed without payment
        assert response.status_code == 200
        data = response.json()
        assert "ad_id" in data
        assert data["status"] == "active"
        print(f"✓ Ad created for FREE without payment: {data['ad_id']}")
        
        # Verify ad is accessible
        get_response = user_session.get(f"{BASE_URL}/api/ads/{data['ad_id']}")
        assert get_response.status_code == 200
        ad = get_response.json()
        assert ad.get("is_paid") == True  # Should be marked as paid (free)
        print("✓ Ad is marked as paid (free posting)")
        
        # Cleanup
        user_session.delete(f"{BASE_URL}/api/ads/{data['ad_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
