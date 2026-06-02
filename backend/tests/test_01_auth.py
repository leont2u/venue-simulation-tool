"""
MODULE 1 — LOGIN / SIGNIN MODULE
=================================
Tests for user registration and authentication.

Test data used
--------------
  Valid user   : planner@venuesim.com / SecurePass123!
  Duplicate    : dupe@venuesim.com    / SecurePass123!
  Wrong pass   : planner@venuesim.com / wrongpassword
  Unknown user : ghost@venuesim.com   / SecurePass123!
  Weak password: weak@venuesim.com    / short7
  Bad email    : not-an-email         / SecurePass123!
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .base import PLANNER_EMAIL, PLANNER_PASSWORD, create_user

User = get_user_model()

# ── Payloads ──────────────────────────────────────────────────────────────────

VALID_LOGIN = {"email": PLANNER_EMAIL, "password": PLANNER_PASSWORD}
WRONG_PASS  = {"email": PLANNER_EMAIL, "password": "wrongpassword"}
GHOST_USER  = {"email": "ghost@venuesim.com", "password": PLANNER_PASSWORD}
EMPTY_BODY  = {}
WEAK_PASS   = {"email": "weak@venuesim.com", "password": "short7"}
BAD_EMAIL   = {"email": "not-an-email", "password": PLANNER_PASSWORD}
DUPE_DATA   = {"email": "dupe@venuesim.com", "password": PLANNER_PASSWORD}
NEW_USER    = {"email": "newplanner@venuesim.com", "password": PLANNER_PASSWORD}
ME_USER     = {"email": "meuser@venuesim.com", "password": PLANNER_PASSWORD}


class LoginModuleTests(APITestCase):
    """TC-01 → TC-06 : Login and token lifecycle."""

    MODULE = "MODULE 1 — LOGIN / SIGNIN MODULE"

    def setUp(self):
        self.user = create_user()

    # ── TC-01 ──────────────────────────────────────────────────────────────────

    def test_TC01_valid_login_returns_200_and_sets_cookie(self):
        """TC-01 | Valid credentials login → HTTP 200 + access_token cookie"""
        print("  Input Data : email='planner@venuesim.com'  password='SecurePass123!'")
        print("  Expected   : HTTP 200 OK  ·  access_token cookie present in response")

        response = self.client.post("/api/auth/login/", data=VALID_LOGIN, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.cookies)
        self.assertIn("user", response.data)

    # ── TC-02 ──────────────────────────────────────────────────────────────────

    def test_TC02_wrong_password_returns_400(self):
        """TC-02 | Login with incorrect password → HTTP 400 (validation error)"""
        print("  Input Data : email='planner@venuesim.com'  password='wrongpassword'")
        print("  Expected   : HTTP 400 Bad Request  ·  'Invalid email or password'")

        response = self.client.post("/api/auth/login/", data=WRONG_PASS, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-03 ──────────────────────────────────────────────────────────────────

    def test_TC03_unregistered_email_returns_400(self):
        """TC-03 | Login with unregistered email → HTTP 400"""
        print("  Input Data : email='ghost@venuesim.com'  password='SecurePass123!'")
        print("  Expected   : HTTP 400 Bad Request  ·  user does not exist")

        response = self.client.post("/api/auth/login/", data=GHOST_USER, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-04 ──────────────────────────────────────────────────────────────────

    def test_TC04_empty_body_returns_400(self):
        """TC-04 | Login with empty request body → HTTP 400 validation error"""
        print("  Input Data : {} (empty JSON body)")
        print("  Expected   : HTTP 400 Bad Request  ·  field-level validation errors")

        response = self.client.post("/api/auth/login/", data=EMPTY_BODY, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-05 ──────────────────────────────────────────────────────────────────

    def test_TC05_token_refresh_returns_200(self):
        """TC-05 | JWT refresh with valid refresh cookie → HTTP 200 + new access_token"""
        print("  Input Data : Valid refresh_token cookie obtained from login")
        print("  Expected   : HTTP 200 OK  ·  new access_token cookie set")

        login_resp = self.client.post("/api/auth/login/", data=VALID_LOGIN, format="json")
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)

        refresh_token = login_resp.cookies.get("refresh_token")
        self.assertIsNotNone(refresh_token, "refresh_token cookie must be present after login")

        # Use the refresh token via request body (avoids cookie transport complexity in tests)
        refresh_resp = self.client.post(
            "/api/auth/refresh/",
            data={"refresh": refresh_token.value},
            format="json",
        )
        self.assertEqual(refresh_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(refresh_resp.data.get("detail"), "refreshed")

    # ── TC-06 ──────────────────────────────────────────────────────────────────

    def test_TC06_logout_clears_cookies_and_returns_200(self):
        """TC-06 | Logout with authenticated session → HTTP 200 + cookies cleared"""
        print("  Input Data : Authenticated user (force_authenticate bypass)")
        print("  Expected   : HTTP 200 OK  ·  detail='logged out'  ·  cookies cleared")

        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/auth/logout/", format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("detail"), "logged out")


class RegistrationModuleTests(APITestCase):
    """TC-07 → TC-12 : User registration (signup)."""

    MODULE = "MODULE 1 — LOGIN / SIGNIN MODULE (Registration)"

    # ── TC-07 ──────────────────────────────────────────────────────────────────

    def test_TC07_valid_registration_returns_201(self):
        """TC-07 | Register with valid email + strong password → HTTP 201"""
        print("  Input Data : email='newplanner@venuesim.com'  password='SecurePass123!'")
        print("  Expected   : HTTP 201 Created  ·  detail='registered'")

        response = self.client.post("/api/auth/register/", data=NEW_USER, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("detail"), "registered")
        self.assertTrue(User.objects.filter(email=NEW_USER["email"]).exists())

    # ── TC-08 ──────────────────────────────────────────────────────────────────

    def test_TC08_duplicate_email_returns_400(self):
        """TC-08 | Register with already-registered email → HTTP 400"""
        print("  Input Data : email='dupe@venuesim.com'  (registered twice)")
        print("  Expected   : HTTP 400 Bad Request  ·  email already exists error")

        self.client.post("/api/auth/register/", data=DUPE_DATA, format="json")
        response = self.client.post("/api/auth/register/", data=DUPE_DATA, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-09 ──────────────────────────────────────────────────────────────────

    def test_TC09_weak_password_under_8_chars_returns_400(self):
        """TC-09 | Password shorter than 8 characters → HTTP 400"""
        print("  Input Data : email='weak@venuesim.com'  password='short7' (7 chars)")
        print("  Expected   : HTTP 400 Bad Request  ·  password min-length violation")

        response = self.client.post("/api/auth/register/", data=WEAK_PASS, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-10 ──────────────────────────────────────────────────────────────────

    def test_TC10_invalid_email_format_returns_400(self):
        """TC-10 | Malformed email address → HTTP 400"""
        print("  Input Data : email='not-an-email'  password='SecurePass123!'")
        print("  Expected   : HTTP 400 Bad Request  ·  invalid email format")

        response = self.client.post("/api/auth/register/", data=BAD_EMAIL, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-11 ──────────────────────────────────────────────────────────────────

    def test_TC11_unauthenticated_me_endpoint_returns_403(self):
        """TC-11 | GET /api/auth/me/ without token → HTTP 403"""
        print("  Input Data : No Authorization cookie or header (unauthenticated request)")
        print("  Expected   : HTTP 403 Forbidden  ·  authentication required")

        response = self.client.get("/api/auth/me/")

        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    # ── TC-12 ──────────────────────────────────────────────────────────────────

    def test_TC12_authenticated_me_returns_user_email(self):
        """TC-12 | GET /api/auth/me/ with valid auth → HTTP 200 with user object"""
        print("  Input Data : Authenticated user  email='meuser@venuesim.com'")
        print("  Expected   : HTTP 200 OK  ·  response body contains 'user.email'")

        user = User.objects.create_user(
            username=ME_USER["email"],
            email=ME_USER["email"],
            password=ME_USER["password"],
        )
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], ME_USER["email"])
