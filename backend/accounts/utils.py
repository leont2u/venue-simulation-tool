import os


ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"


def cookie_secure():
    return os.getenv("DJANGO_COOKIE_SECURE", "false").lower() == "true"


def apply_auth_cookies(response, access_token: str, refresh_token: str):
    secure = cookie_secure()

    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        httponly=True,
        secure=secure,
        samesite="Lax",
        max_age=60 * 30,
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        httponly=True,
        secure=secure,
        samesite="Lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


def clear_auth_cookies(response):
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/", samesite="Lax")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/", samesite="Lax")
