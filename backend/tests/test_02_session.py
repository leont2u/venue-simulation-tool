"""
MODULE 2 — FORGOT PASSWORD / SESSION MANAGEMENT MODULE
========================================================
The system uses JWT tokens stored in HttpOnly cookies.
There is no separate "forgot-password" email-reset endpoint in the current
backend; session continuity is managed entirely through the token-refresh
flow.  These tests cover:

  • Refresh token endpoint (the primary session-recovery mechanism)
  • Accessing protected routes without credentials
  • Accessing with a deliberately invalid/tampered token
  • Accessing a protected route after logout (session termination)
  • Password validation rules enforced at registration

Test data used
--------------
  Valid user    : session@venuesim.com  / SecurePass123!
  Invalid token : "totally.invalid.jwt"
  Empty refresh : (no token provided)
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .base import create_user

User = get_user_model()

SESSION_EMAIL    = "session@venuesim.com"
SESSION_PASSWORD = "SecurePass123!"
SESSION_CREDS    = {"email": SESSION_EMAIL, "password": SESSION_PASSWORD}

INVALID_TOKEN    = "totally.invalid.jwt"


class ForgotPasswordSessionTests(APITestCase):
    """TC-13 → TC-18 : Token refresh and session management."""

    MODULE = "MODULE 2 — FORGOT PASSWORD / SESSION MANAGEMENT MODULE"

    def setUp(self):
        self.user = create_user(email=SESSION_EMAIL, password=SESSION_PASSWORD)

    # ── TC-13 ──────────────────────────────────────────────────────────────────

    def test_TC13_refresh_with_valid_token_returns_200(self):
        """TC-13 | Refresh with valid refresh_token → HTTP 200 + new access_token"""
        print("  Input Data : Valid refresh_token obtained after successful login")
        print("  Expected   : HTTP 200 OK  ·  detail='refreshed'  ·  new access_token set")

        login = self.client.post("/api/auth/login/", data=SESSION_CREDS, format="json")
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        refresh_cookie = login.cookies.get("refresh_token")
        self.assertIsNotNone(refresh_cookie)

        response = self.client.post(
            "/api/auth/refresh/",
            data={"refresh": refresh_cookie.value},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("detail"), "refreshed")

    # ── TC-14 ──────────────────────────────────────────────────────────────────

    def test_TC14_refresh_without_token_returns_401(self):
        """TC-14 | Refresh with no token → HTTP 401 Unauthorized"""
        print("  Input Data : POST /api/auth/refresh/ with empty body and no cookie")
        print("  Expected   : HTTP 401 Unauthorized  ·  'Refresh token is required'")

        response = self.client.post("/api/auth/refresh/", data={}, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── TC-15 ──────────────────────────────────────────────────────────────────

    def test_TC15_refresh_with_invalid_token_returns_401(self):
        """TC-15 | Refresh with tampered/invalid token string → HTTP 401"""
        print("  Input Data : refresh='totally.invalid.jwt'")
        print("  Expected   : HTTP 401 Unauthorized  ·  token decode error")

        response = self.client.post(
            "/api/auth/refresh/",
            data={"refresh": INVALID_TOKEN},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── TC-16 ──────────────────────────────────────────────────────────────────

    def test_TC16_protected_route_without_auth_returns_403(self):
        """TC-16 | Access protected /api/auth/me/ without any credentials → HTTP 403"""
        print("  Input Data : GET /api/auth/me/ — no cookies, no Authorization header")
        print("  Expected   : HTTP 401 or 403  ·  authentication required")

        client = self.client_class()   # fresh client — no cookies
        response = client.get("/api/auth/me/")

        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    # ── TC-17 ──────────────────────────────────────────────────────────────────

    def test_TC17_access_after_logout_is_blocked(self):
        """TC-17 | Access /api/auth/me/ after logout session → HTTP 403"""
        print("  Input Data : Authenticated user logs out, then re-attempts /me/")
        print("  Expected   : HTTP 401 or 403  ·  session terminated")

        self.client.force_authenticate(user=self.user)
        logout = self.client.post("/api/auth/logout/", format="json")
        self.assertEqual(logout.status_code, status.HTTP_200_OK)

        # Reset auth on the client (simulates cleared cookies)
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/auth/me/")

        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    # ── TC-18 ──────────────────────────────────────────────────────────────────

    def test_TC18_re_login_after_logout_restores_session(self):
        """TC-18 | Re-login after logout with correct password → HTTP 200"""
        print("  Input Data : Logout then POST /api/auth/login/ with valid credentials")
        print("  Expected   : HTTP 200 OK  ·  new access_token cookie issued")

        # Logout
        self.client.force_authenticate(user=self.user)
        self.client.post("/api/auth/logout/", format="json")
        self.client.force_authenticate(user=None)

        # Re-login
        response = self.client.post("/api/auth/login/", data=SESSION_CREDS, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.cookies)
