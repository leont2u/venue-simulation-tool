from pathlib import Path
from datetime import timedelta
import os


BASE_DIR = Path(__file__).resolve().parent.parent


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "true").lower() == "true"
ALLOWED_HOSTS = os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")

CORS_ALLOWED_ORIGINS = os.getenv(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://127.0.0.1:3000,http://localhost:3000",
).split(",")
CORS_ALLOW_CREDENTIALS = True

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "accounts",
    "ai_layout",
    "assets",
    "layout_imports",
    "projects",
    "community",
    "profiles",
    "notifications",
    "venue_cv",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
MEDIA_URL  = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
POLY_PIZZA_API_KEY = os.getenv("POLY_PIZZA_API_KEY", "")
_POLY_PIZZA_CACHE_DIR = Path(
    os.getenv(
        "POLY_PIZZA_CACHE_DIR",
        str(BASE_DIR / ".cache" / "poly_pizza"),
    )
)
POLY_PIZZA_CACHE_DIR = str(
    _POLY_PIZZA_CACHE_DIR
    if _POLY_PIZZA_CACHE_DIR.is_absolute()
    else BASE_DIR / _POLY_PIZZA_CACHE_DIR
)
SKETCHFAB_API_TOKEN = os.getenv("SKETCHFAB_API_TOKEN", "")
SKETCHFAB_DOWNLOAD_TOKEN = os.getenv("SKETCHFAB_DOWNLOAD_TOKEN", "")
_SKETCHFAB_CACHE_DIR = Path(
    os.getenv(
        "SKETCHFAB_CACHE_DIR",
        str(BASE_DIR / ".cache" / "sketchfab"),
    )
)
SKETCHFAB_CACHE_DIR = str(
    _SKETCHFAB_CACHE_DIR
    if _SKETCHFAB_CACHE_DIR.is_absolute()
    else BASE_DIR / _SKETCHFAB_CACHE_DIR
)
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ── Celery ────────────────────────────────────────────────────────────────────
CELERY_BROKER_URL         = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND     = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")
CELERY_ACCEPT_CONTENT     = ["json"]
CELERY_TASK_SERIALIZER    = "json"
CELERY_RESULT_SERIALIZER  = "json"
CELERY_TIMEZONE           = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_ACKS_LATE     = True

# Task routing — GPU workers for ML, LLM worker for Ollama, CPU for the rest
CELERY_TASK_ROUTES = {
    "venue_cv.tasks.object_detection.*":  {"queue": "gpu"},
    "venue_cv.tasks.segmentation.*":      {"queue": "gpu"},
    "venue_cv.tasks.depth_estimation.*":  {"queue": "gpu"},
    "venue_cv.tasks.room_layout.*":       {"queue": "gpu"},
    "venue_cv.tasks.sfm.*":               {"queue": "gpu"},
    "venue_cv.tasks.gaussian_splatting.*":{"queue": "gpu"},
    "venue_cv.tasks.preprocessing.*":     {"queue": "cpu"},
    "venue_cv.tasks.video_processing.*":  {"queue": "cpu"},
    "venue_cv.tasks.scene_graph.*":       {"queue": "cpu"},
    "venue_cv.tasks.asset_matching.*":    {"queue": "cpu"},
    "venue_cv.tasks.scene_generation.*":  {"queue": "cpu"},
    "venue_cv.tasks.llm_reasoning.*":     {"queue": "llm"},
}

# ── Ollama / LLM ──────────────────────────────────────────────────────────────
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "gemma3:latest")

# ── CV Pipeline storage limits ────────────────────────────────────────────────
CV_MAX_IMAGE_SIZE_MB = int(os.getenv("CV_MAX_IMAGE_SIZE_MB", "20"))
CV_MAX_VIDEO_SIZE_MB = int(os.getenv("CV_MAX_VIDEO_SIZE_MB", "500"))

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "accounts.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": False,
    "BLACKLIST_AFTER_ROTATION": False,
    "UPDATE_LAST_LOGIN": True,
}
