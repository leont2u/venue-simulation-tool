import hashlib
import json
import mimetypes
import os
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen

from django.conf import settings


POLY_PIZZA_BASE_URL = "https://api.poly.pizza/v1.1"
CACHE_TTL_SECONDS = int(os.getenv("POLY_PIZZA_CACHE_TTL_SECONDS", str(60 * 60 * 24)))
CATEGORY_TO_VENUE_CATEGORY = {
    "Food & Drink": "Stage & Decor",
    "Clutter": "Stage & Decor",
    "Weapons": "Stage & Decor",
    "Transport": "Stage & Decor",
    "Furniture & Decor": "Tables",
    "Objects": "Stage & Decor",
    "Nature": "Stage & Decor",
    "Animals": "Stage & Decor",
    "Buildings": "Stage & Decor",
    "People & Characters": "Seating",
    "Scenes & Levels": "Stage & Decor",
    "Other": "Stage & Decor",
}
VENUE_SEARCH_TERMS = [
    "chair",
    "table",
    "desk",
    "podium",
    "stage",
    "screen",
    "speaker",
    "camera",
    "microphone",
    "light",
    "sofa",
    "plant",
    "bar",
    "counter",
    "bench",
    "sign",
]
VENUE_INCLUDE_TERMS = {
    "altar",
    "audio",
    "av",
    "bar",
    "bench",
    "booth",
    "camera",
    "chair",
    "counter",
    "curtain",
    "decor",
    "desk",
    "display",
    "door",
    "entrance",
    "furniture",
    "lamp",
    "light",
    "lighting",
    "lounge",
    "media",
    "microphone",
    "monitor",
    "plant",
    "podium",
    "projector",
    "screen",
    "seat",
    "sign",
    "sofa",
    "speaker",
    "stage",
    "stand",
    "table",
    "tv",
}
VENUE_EXCLUDE_TERMS = {
    "animal",
    "baby",
    "bath",
    "bathroom",
    "bed",
    "bedroom",
    "cat",
    "dog",
    "food",
    "fridge",
    "gun",
    "kitchen",
    "laundry",
    "shower",
    "sink",
    "toilet",
    "weapon",
    "washing",
}
MEDIA_TERMS = {
    "audio",
    "av",
    "camera",
    "display",
    "light",
    "lighting",
    "media",
    "microphone",
    "monitor",
    "projector",
    "screen",
    "speaker",
    "tv",
}
SEATING_TERMS = {"bench", "chair", "seat", "seating", "sofa", "stool"}
TABLE_TERMS = {"bar", "counter", "desk", "table"}


class PolyPizzaError(Exception):
    pass


def cache_root() -> Path:
    root = Path(settings.POLY_PIZZA_CACHE_DIR)
    root.mkdir(parents=True, exist_ok=True)
    (root / "responses").mkdir(exist_ok=True)
    (root / "models").mkdir(exist_ok=True)
    (root / "thumbnails").mkdir(exist_ok=True)
    (root / "metadata").mkdir(exist_ok=True)
    return root


def api_key() -> str:
    key = getattr(settings, "POLY_PIZZA_API_KEY", "").strip()
    if not key:
        raise PolyPizzaError("POLY_PIZZA_API_KEY is not configured on the backend.")
    return key


def _json_path(cache_key: str) -> Path:
    return cache_root() / "responses" / f"{cache_key}.json"


def _metadata_path(model_id: str) -> Path:
    return cache_root() / "metadata" / f"{model_id}.json"


def _cache_key(path: str, params: dict[str, str | int]) -> str:
    payload = json.dumps({"path": path, "params": params}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _read_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _write_json(path: Path, data) -> None:
    tmp = path.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
    tmp.replace(path)


def _is_fresh(path: Path) -> bool:
    return path.exists() and time.time() - path.stat().st_mtime < CACHE_TTL_SECONDS


def _request_json(path: str, params: dict[str, str | int] | None = None):
    params = params or {}
    key = _cache_key(path, params)
    response_path = _json_path(key)
    if _is_fresh(response_path):
        return _read_json(response_path), True

    query = f"?{urlencode(params)}" if params else ""
    request = Request(
        f"{POLY_PIZZA_BASE_URL}{path}{query}",
        headers={"x-auth-token": api_key(), "Accept": "application/json"},
    )

    try:
        with urlopen(request, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        message = error.read().decode("utf-8", errors="replace")
        raise PolyPizzaError(f"Poly Pizza returned {error.code}: {message}") from error
    except (URLError, TimeoutError) as error:
        raise PolyPizzaError(f"Could not reach Poly Pizza: {error}") from error

    _write_json(response_path, data)
    return data, False


def _save_model_metadata(model: dict) -> None:
    model_id = model.get("ID")
    if model_id:
        _write_json(_metadata_path(model_id), model)


def normalize_model(model: dict, request) -> dict:
    model_id = model.get("ID", "")
    creator = model.get("Creator") or {}
    category = venue_category_for_model(model)

    return {
        "id": f"poly-pizza-{model_id}",
        "type": f"poly_pizza_{model_id}",
        "name": model.get("Title") or "Poly Pizza Asset",
        "category": category,
        "thumbnail": request.build_absolute_uri(
            f"/api/assets/poly-pizza/thumbnails/{quote(model_id)}/"
        ),
        "modelUrl": request.build_absolute_uri(
            f"/api/assets/poly-pizza/models/{quote(model_id)}/"
        ),
        "defaultScale": [1, 1, 1],
        "boundingBox": {"width": 1, "depth": 1, "height": 1},
        "source": "Poly Pizza",
        "polyPizzaId": model_id,
        "polyPizzaUrl": f"https://poly.pizza/m/{model_id}",
        "attribution": model.get("Attribution", ""),
        "license": model.get("Licence", ""),
        "creator": creator.get("Username", ""),
        "triCount": model.get("Tri Count"),
        "animated": bool(model.get("Animated", False)),
        "tags": model.get("Tags") or [],
    }


def text_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    return str(value)


def model_text(model: dict) -> str:
    tags = model.get("Tags") or []
    if not isinstance(tags, list):
        tags = [tags]

    parts = [
        text_value(model.get("Title")),
        text_value(model.get("Description")),
        text_value(model.get("Category")),
        " ".join(text_value(tag) for tag in tags),
    ]
    return " ".join(parts).lower()


def is_venue_relevant(model: dict) -> bool:
    text = model_text(model)
    if any(term in text for term in VENUE_EXCLUDE_TERMS):
        return False
    return any(term in text for term in VENUE_INCLUDE_TERMS)


def venue_category_for_model(model: dict) -> str:
    text = model_text(model)
    if any(term in text for term in MEDIA_TERMS):
        return "Media Equipment"
    if any(term in text for term in SEATING_TERMS):
        return "Seating"
    if any(term in text for term in TABLE_TERMS):
        return "Tables"
    return CATEGORY_TO_VENUE_CATEGORY.get(model.get("Category", ""), "Stage & Decor")


def search_poly_pizza(path: str, params: dict[str, str | int]) -> tuple[list[dict], int, bool]:
    payload, cached = _request_json(path, params)
    models = payload.get("results") or payload.get("Models") or []
    return models, int(payload.get("total", len(models))), cached


def curated_models(page: int, limit: int, license_filter=None):
    per_term_limit = max(2, min(8, round(limit / 4)))
    search_terms = VENUE_SEARCH_TERMS[page % len(VENUE_SEARCH_TERMS) :] + VENUE_SEARCH_TERMS[: page % len(VENUE_SEARCH_TERMS)]
    models_by_id: dict[str, dict] = {}
    total = 0
    all_cached = True

    for term in search_terms:
        if len(models_by_id) >= limit:
            break

        params: dict[str, str | int] = {
            "Limit": per_term_limit,
            "Page": page // len(VENUE_SEARCH_TERMS),
        }
        if license_filter not in (None, ""):
            params["License"] = int(license_filter)

        models, result_total, cached = search_poly_pizza(f"/search/{quote(term)}", params)
        total += result_total
        all_cached = all_cached and cached

        for model in models:
            model_id = model.get("ID")
            if model_id and is_venue_relevant(model):
                models_by_id.setdefault(model_id, model)

    return list(models_by_id.values())[:limit], total, all_cached


def search_models(
    request,
    keyword: str = "",
    page: int = 0,
    limit: int = 32,
    category=None,
    license_filter=None,
    preset: str = "venue",
):
    params: dict[str, str | int] = {
        "Limit": min(max(limit, 1), 32),
        "Page": max(page, 0),
    }
    if category not in (None, ""):
        params["Category"] = int(category)
    if license_filter not in (None, ""):
        params["License"] = int(license_filter)

    if not keyword.strip() and preset == "venue":
        models, total, cached = curated_models(
            page=params["Page"],
            limit=params["Limit"],
            license_filter=license_filter,
        )
    elif keyword.strip():
        path = f"/search/{quote(keyword.strip())}"
        models, total, cached = search_poly_pizza(path, params)
    else:
        path = "/search"
        if "Category" not in params and "License" not in params:
            params["Category"] = 4
        models, total, cached = search_poly_pizza(path, params)

    models = [model for model in models if is_venue_relevant(model)]
    for model in models:
        _save_model_metadata(model)

    return {
        "total": total,
        "page": params["Page"],
        "limit": params["Limit"],
        "cached": cached,
        "results": [normalize_model(model, request) for model in models],
    }


def _download_file(url: str, destination: Path) -> None:
    request = Request(url, headers={"User-Agent": "venue-simulation-tool/1.0"})
    tmp = destination.with_suffix(".tmp")
    try:
        with urlopen(request, timeout=40) as response:
            with tmp.open("wb") as handle:
                while True:
                    chunk = response.read(1024 * 256)
                    if not chunk:
                        break
                    handle.write(chunk)
    except (HTTPError, URLError, TimeoutError) as error:
        if tmp.exists():
            tmp.unlink()
        raise PolyPizzaError(f"Could not download Poly Pizza asset: {error}") from error

    tmp.replace(destination)


def get_model_metadata(model_id: str) -> dict:
    metadata_path = _metadata_path(model_id)
    if _is_fresh(metadata_path):
        return _read_json(metadata_path)

    payload, _cached = _request_json(f"/model/{quote(model_id)}")
    _save_model_metadata(payload)
    return payload


def cached_model_file(model_id: str) -> tuple[Path, str]:
    model = get_model_metadata(model_id)
    download_url = model.get("Download")
    if not download_url:
        raise PolyPizzaError("Poly Pizza did not provide a download URL for this model.")

    destination = cache_root() / "models" / f"{model_id}.glb"
    if not destination.exists():
        _download_file(download_url, destination)

    return destination, "model/gltf-binary"


def cached_thumbnail_file(model_id: str) -> tuple[Path, str]:
    model = get_model_metadata(model_id)
    thumbnail_url = model.get("Thumbnail")
    if not thumbnail_url:
        raise PolyPizzaError("Poly Pizza did not provide a thumbnail URL for this model.")

    suffix = Path(thumbnail_url.split("?", 1)[0]).suffix or ".webp"
    destination = cache_root() / "thumbnails" / f"{model_id}{suffix}"
    if not destination.exists():
        _download_file(thumbnail_url, destination)

    content_type = mimetypes.guess_type(destination.name)[0] or "image/webp"
    return destination, content_type
