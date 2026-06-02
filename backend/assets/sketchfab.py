import hashlib
import json
import mimetypes
import os
import shutil
import time
import zipfile
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from django.conf import settings


SKETCHFAB_BASE_URL = "https://api.sketchfab.com/v3"
SKETCHFAB_CACHE_TTL_SECONDS = int(
    os.getenv("SKETCHFAB_CACHE_TTL_SECONDS", str(60 * 60 * 24))
)
SKETCHFAB_PREFERRED_QUERIES = {
    "wedding chair": {
        "type": "chair",
        "category": "Seating",
        "default_scale": [0.7, 0.7, 0.7],
        "bounding_box": {"width": 0.55, "depth": 0.55, "height": 0.9},
    },
    "round table": {
        "type": "round_table",
        "category": "Tables",
        "default_scale": [1.6, 0.75, 1.6],
        "bounding_box": {"width": 1.8, "depth": 1.8, "height": 0.75},
    },
    "banquet table": {
        "type": "rectangular_table",
        "category": "Tables",
        "default_scale": [1.8, 0.75, 0.8],
        "bounding_box": {"width": 1.8, "depth": 0.8, "height": 0.75},
    },
}

CURATED_SKETCHFAB_ASSETS = [
    # Seating
    {"uid": "bcf7e3a55c5e482c903abeeb1425d77c", "name": "Wedding Chair",         "type": "chair",        "category": "Seating",        "default_scale": [0.55, 0.9, 0.55], "bounding_box": {"width": 0.55, "depth": 0.55, "height": 0.9}},
    {"uid": "b3b1d1d338aa46ed9d480a613098e024", "name": "Round Table with Chairs","type": "round_table",  "category": "Tables",         "default_scale": [2.2, 1.2, 2.2],  "bounding_box": {"width": 2.2,  "depth": 2.2,  "height": 1.2}},
    {"uid": "ac92f6e97eaa43c4ad6cb8f7c65ac43f", "name": "Modern Sofa",            "type": "sofa",         "category": "Seating",        "default_scale": [2.0, 0.85, 0.9], "bounding_box": {"width": 2.0,  "depth": 0.9,  "height": 0.85}},
    # Stage & Decor
    {"uid": "78c700db0d9f4d7c800fb789dfa2e057", "name": "Bar Counter",            "type": "bar",          "category": "Stage & Decor",  "default_scale": [3.0, 1.1, 1.0],  "bounding_box": {"width": 3.0,  "depth": 1.0,  "height": 1.1}},
    {"uid": "452e159b00904ef8898fc1ea92dc8c95", "name": "Wedding Gate",           "type": "wedding_gate", "category": "Stage & Decor",  "default_scale": [3.0, 2.5, 0.5],  "bounding_box": {"width": 3.0,  "depth": 0.5,  "height": 2.5}},
    {"uid": "7191a1b935ac452987866573713e4da5", "name": "Plant",                  "type": "plant",        "category": "Stage & Decor",  "default_scale": [0.8, 1.2, 0.8],  "bounding_box": {"width": 0.8,  "depth": 0.8,  "height": 1.2}},
    {"uid": "7f6a04fb0a634814a5eaf1a14be44c7f", "name": "Debate Podium",         "type": "podium",       "category": "Stage & Decor",  "default_scale": [0.8, 1.2, 0.6],  "bounding_box": {"width": 0.8,  "depth": 0.6,  "height": 1.2}},
    {"uid": "e8ab5d21696b4926a38439f7bcf72d8d", "name": "Grand Piano",           "type": "piano",        "category": "Stage & Decor",  "default_scale": [2.0, 1.2, 1.4],  "bounding_box": {"width": 2.0,  "depth": 1.4,  "height": 1.2}},
    {"uid": "a0f1f71c128d4040bc6cb5c547f876b6", "name": "Mini Concert Stage",    "type": "stage",        "category": "Stage & Decor",  "default_scale": [5.0, 1.2, 4.0],  "bounding_box": {"width": 5.0,  "depth": 4.0,  "height": 1.2}},
    {"uid": "e5a3e5b47a024d0c83c367508629d660", "name": "Short Stage",           "type": "stage_small",  "category": "Stage & Decor",  "default_scale": [4.0, 0.8, 3.0],  "bounding_box": {"width": 4.0,  "depth": 3.0,  "height": 0.8}},
    # Media Equipment
    {"uid": "cc324baf6dc548de965c3a47b87f1e27", "name": "Camera with Tripod",    "type": "camera",       "category": "Media Equipment", "default_scale": [0.5, 1.5, 0.5],  "bounding_box": {"width": 0.5,  "depth": 0.5,  "height": 1.5}},
    {"uid": "cac0e255058348558715109b97697e07", "name": "Projector Screen",       "type": "screen",       "category": "Media Equipment", "default_scale": [3.0, 2.0, 0.1],  "bounding_box": {"width": 3.0,  "depth": 0.1,  "height": 2.0}},
    {"uid": "b378bde76fcf40cb9b26c75c583f4732", "name": "LCD TV",                "type": "tv",           "category": "Media Equipment", "default_scale": [1.2, 0.8, 0.15], "bounding_box": {"width": 1.2,  "depth": 0.15, "height": 0.8}},
    {"uid": "840a28089fcd4380ba1373f1fb2e24e6", "name": "LED Screen",            "type": "led_screen",   "category": "Media Equipment", "default_scale": [1.8, 1.1, 0.1],  "bounding_box": {"width": 1.8,  "depth": 0.1,  "height": 1.1}},
    # AV Gear
    {"uid": "134e0510d6494d58898bab6d3e07d111", "name": "Speaker Box on Stand",  "type": "speaker",      "category": "AV Gear",         "default_scale": [0.6, 1.8, 0.6],  "bounding_box": {"width": 0.6,  "depth": 0.6,  "height": 1.8}},
]

# Exact UID to use when resolving poly-pizza://required/{type} assets.
# These bypass search entirely — the exact model is fetched directly.
PINNED_ASSET_UIDS: dict[str, str] = {
    "chair":       "bcf7e3a55c5e482c903abeeb1425d77c",
    "round_table": "b3b1d1d338aa46ed9d480a613098e024",
    "sofa":        "ac92f6e97eaa43c4ad6cb8f7c65ac43f",
    "bar":         "78c700db0d9f4d7c800fb789dfa2e057",
    "wedding_gate":"452e159b00904ef8898fc1ea92dc8c95",
    "plant":       "7191a1b935ac452987866573713e4da5",
    "podium":      "7f6a04fb0a634814a5eaf1a14be44c7f",
    "piano":       "e8ab5d21696b4926a38439f7bcf72d8d",
    "stage":       "a0f1f71c128d4040bc6cb5c547f876b6",
    "stage_small": "e5a3e5b47a024d0c83c367508629d660",
    "camera":      "cc324baf6dc548de965c3a47b87f1e27",
    "screen":      "cac0e255058348558715109b97697e07",
    "tv":          "b378bde76fcf40cb9b26c75c583f4732",
    "led_screen":  "840a28089fcd4380ba1373f1fb2e24e6",
    "speaker":     "134e0510d6494d58898bab6d3e07d111",
}


class SketchfabError(Exception):
    pass


def cache_root() -> Path:
    root = Path(settings.SKETCHFAB_CACHE_DIR)
    root.mkdir(parents=True, exist_ok=True)
    (root / "responses").mkdir(exist_ok=True)
    (root / "downloads").mkdir(exist_ok=True)
    (root / "models").mkdir(exist_ok=True)
    (root / "thumbnails").mkdir(exist_ok=True)
    (root / "metadata").mkdir(exist_ok=True)
    return root


def api_token() -> str:
    token = getattr(settings, "SKETCHFAB_API_TOKEN", "").strip()
    if not token:
        raise SketchfabError("SKETCHFAB_API_TOKEN is not configured on the backend.")
    return token


def download_token() -> str:
    token = getattr(settings, "SKETCHFAB_DOWNLOAD_TOKEN", "").strip() or api_token()
    if not token:
        raise SketchfabError(
            "SKETCHFAB_DOWNLOAD_TOKEN is not configured on the backend."
        )
    return token


def _cache_key(path: str, params: dict[str, str | int]) -> str:
    payload = json.dumps({"path": path, "params": params}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _json_path(cache_key: str) -> Path:
    return cache_root() / "responses" / f"{cache_key}.json"


def _metadata_path(model_id: str) -> Path:
    return cache_root() / "metadata" / f"{model_id}.json"


def _model_dir(model_id: str) -> Path:
    return cache_root() / "models" / model_id


def _thumbnail_path(model_id: str, source_url: str) -> Path:
    extension = Path(source_url.split("?")[0]).suffix or ".jpg"
    return cache_root() / "thumbnails" / f"{model_id}{extension}"


def _download_path(model_id: str, extension: str) -> Path:
    return cache_root() / "downloads" / f"{model_id}{extension}"


def _read_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _write_json(path: Path, data) -> None:
    tmp = path.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
    tmp.replace(path)


def _is_fresh(path: Path) -> bool:
    return path.exists() and time.time() - path.stat().st_mtime < SKETCHFAB_CACHE_TTL_SECONDS


def _request_json(
    path: str,
    params: dict[str, str | int] | None = None,
    *,
    token: str | None = None,
    cacheable: bool = True,
):
    params = params or {}
    cache_key = _cache_key(path, params)
    response_path = _json_path(cache_key)
    if cacheable and _is_fresh(response_path):
        return _read_json(response_path), True

    query = f"?{urlencode(params)}" if params else ""
    request = Request(
        f"{SKETCHFAB_BASE_URL}{path}{query}",
        headers={
            "Authorization": f"Token {token or api_token()}",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        message = error.read().decode("utf-8", errors="replace")
        raise SketchfabError(f"Sketchfab returned {error.code}: {message}") from error
    except (URLError, TimeoutError) as error:
        raise SketchfabError(f"Could not reach Sketchfab: {error}") from error

    if cacheable:
        _write_json(response_path, data)
    return data, False


def _download_file(url: str, destination: Path, *, token: str | None = None) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    headers = {"Accept": "*/*"}
    if token:
        headers["Authorization"] = f"Token {token}"
    request = Request(url, headers=headers)
    tmp = destination.with_suffix(destination.suffix + ".tmp")
    try:
        with urlopen(request, timeout=60) as response, tmp.open("wb") as handle:
            while True:
                chunk = response.read(1024 * 128)
                if not chunk:
                    break
                handle.write(chunk)
    except HTTPError as error:
        message = error.read().decode("utf-8", errors="replace")
        raise SketchfabError(
            f"Sketchfab download failed with {error.code}: {message}"
        ) from error
    except (URLError, TimeoutError) as error:
        raise SketchfabError(f"Could not download Sketchfab asset: {error}") from error
    tmp.replace(destination)


def _query_profile(keyword: str) -> dict:
    normalized = keyword.strip().lower()
    return SKETCHFAB_PREFERRED_QUERIES.get(
        normalized,
        {
            "type": "chair",
            "category": "Stage & Decor",
            "default_scale": [1, 1, 1],
            "bounding_box": {"width": 1, "depth": 1, "height": 1},
        },
    )


def _pick_thumbnail(images: list[dict]) -> str:
    if not images:
        return ""
    ranked = sorted(
        images,
        key=lambda image: (image.get("width", 0) * image.get("height", 0), image.get("width", 0)),
        reverse=True,
    )
    return ranked[0].get("url", "")


def _scene_filename_for_archive(archive_format: str) -> str:
    return "scene.glb" if archive_format == "glb" else "scene.gltf"


def _download_info_for_model(model_id: str) -> dict:
    info, _ = _request_json(
        f"/models/{quote(model_id)}/download",
        token=download_token(),
        cacheable=False,
    )
    if not isinstance(info, dict):
        raise SketchfabError("Sketchfab returned an invalid download payload.")
    return info


def _pick_download_archive(download_info: dict) -> tuple[str, dict]:
    for archive_format in ("gltf", "glb"):
        candidate = download_info.get(archive_format)
        if isinstance(candidate, dict) and candidate.get("url"):
            return archive_format, candidate
    raise SketchfabError("Sketchfab did not provide a downloadable GLTF or GLB archive.")


def _load_model_metadata(model_id: str) -> dict:
    path = _metadata_path(model_id)
    if not path.exists():
        raise SketchfabError("Sketchfab metadata is missing for the requested model.")
    return _read_json(path)


def normalize_model(model: dict, detail: dict, keyword: str, request) -> dict:
    model_id = model.get("uid") or detail.get("uid")
    if not model_id:
        raise SketchfabError("Sketchfab did not provide a model uid.")

    thumbnail_url = _pick_thumbnail(detail.get("thumbnails", {}).get("images", []))
    profile = _query_profile(keyword)
    model_url = request.build_absolute_uri(
        f"/api/assets/sketchfab/models/{quote(model_id)}/scene"
    )

    return {
        "id": f"sketchfab-{model_id}",
        "type": profile["type"],
        "name": detail.get("name") or model.get("name") or "Sketchfab Asset",
        "category": profile["category"],
        "thumbnail": request.build_absolute_uri(
            f"/api/assets/sketchfab/thumbnails/{quote(model_id)}/"
        )
        if thumbnail_url
        else "",
        "modelUrl": model_url,
        "defaultScale": profile["default_scale"],
        "boundingBox": profile["bounding_box"],
        "source": "Sketchfab",
        "sourceId": model_id,
        "sourceUrl": detail.get("viewerUrl") or f"https://sketchfab.com/3d-models/{model_id}",
        "sketchfabUid": model_id,
        "sketchfabUrl": detail.get("viewerUrl") or f"https://sketchfab.com/3d-models/{model_id}",
        "license": detail.get("license", {}).get("label", ""),
        "creator": detail.get("user", {}).get("displayName", ""),
        "attribution": detail.get("description", ""),
        "animated": bool(detail.get("animationCount", 0)),
        "tags": [tag.get("name", "") for tag in detail.get("tags", []) if tag.get("name")],
        "downloadable": True,
        "thumbnailUrl": thumbnail_url,
        "query": keyword,
    }


def search_models(request, keyword: str, page: int = 0, limit: int = 12) -> dict:
    query = keyword.strip()
    if not query:
        return {"total": 0, "page": page, "limit": limit, "cached": True, "results": []}

    search_payload, cached = _request_json(
        "/search",
        {
            "type": "models",
            "q": query,
            "downloadable": "true",
            "count": max(1, min(limit, 24)),
        },
    )
    raw_results = search_payload.get("results") or []
    normalized = []

    for result in raw_results[: max(1, min(limit, 12))]:
        model_id = result.get("uid")
        if not model_id:
            continue
        detail, _ = _request_json(f"/models/{quote(model_id)}")
        if detail.get("isDownloadable") is False:
            continue
        try:
            asset = normalize_model(result, detail, query, request)
        except SketchfabError:
            continue
        normalized.append(asset)
        _write_json(_metadata_path(model_id), asset)

    return {
        "total": len(normalized),
        "page": page,
        "limit": limit,
        "cached": cached,
        "results": normalized,
    }


def _ensure_model_cached(model_id: str) -> dict:
    # Auto-bootstrap metadata from Sketchfab API if we've never seen this UID before.
    meta_path = _metadata_path(model_id)
    if not meta_path.exists():
        detail, _ = _request_json(f"/models/{quote(model_id)}")
        curated = next((c for c in CURATED_SKETCHFAB_ASSETS if c["uid"] == model_id), None)
        if curated:
            minimal = {
                "id": f"sketchfab-{model_id}",
                "sourceId": model_id,
                "sketchfabUid": model_id,
                "name": curated["name"],
                "type": curated["type"],
                "category": curated["category"],
                "defaultScale": curated["default_scale"],
                "boundingBox": curated["bounding_box"],
                "thumbnailUrl": _pick_thumbnail(detail.get("thumbnails", {}).get("images", [])),
                "source": "Sketchfab",
                "creator": detail.get("user", {}).get("displayName", ""),
                "license": detail.get("license", {}).get("label", ""),
            }
        else:
            minimal = {
                "id": f"sketchfab-{model_id}",
                "sourceId": model_id,
                "sketchfabUid": model_id,
                "name": detail.get("name", model_id),
                "thumbnailUrl": _pick_thumbnail(detail.get("thumbnails", {}).get("images", [])),
                "source": "Sketchfab",
                "creator": detail.get("user", {}).get("displayName", ""),
                "license": detail.get("license", {}).get("label", ""),
            }
        _write_json(meta_path, minimal)

    metadata = _load_model_metadata(model_id)
    model_dir = _model_dir(model_id)
    scene_filename = metadata.get("sceneFilename", "")
    scene_path = model_dir / scene_filename if scene_filename else None
    if scene_path and scene_path.exists():
        return metadata

    download_info = _download_info_for_model(model_id)
    archive_format, archive = _pick_download_archive(download_info)
    archive_url = archive.get("url")
    if not archive_url:
        raise SketchfabError("Sketchfab did not provide a temporary download URL.")

    if archive_format == "glb":
        destination = model_dir / "scene.glb"
        destination.parent.mkdir(parents=True, exist_ok=True)
        _download_file(archive_url, destination)
        metadata["sceneFilename"] = "scene.glb"
        metadata["archiveFormat"] = "glb"
        _write_json(_metadata_path(model_id), metadata)
        return metadata

    archive_path = _download_path(model_id, ".zip")
    _download_file(archive_url, archive_path)
    model_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path, "r") as handle:
        handle.extractall(model_dir)

    scene_file = next(model_dir.rglob("*.gltf"), None)
    if scene_file is None:
        raise SketchfabError("Sketchfab archive did not contain a GLTF scene.")

    scene_root = scene_file.parent
    if scene_root != model_dir:
        for child in scene_root.iterdir():
            destination = model_dir / child.name
            if child.is_dir():
                shutil.copytree(child, destination, dirs_exist_ok=True)
            else:
                shutil.copy2(child, destination)
        scene_file = model_dir / scene_file.name

    normalized_scene = model_dir / "scene.gltf"
    if scene_file != normalized_scene:
        shutil.copy2(scene_file, normalized_scene)

    metadata["sceneFilename"] = "scene.gltf"
    metadata["archiveFormat"] = "gltf"
    _write_json(_metadata_path(model_id), metadata)
    return metadata


def cached_model_file(model_id: str, file_path: str) -> tuple[Path, str]:
    metadata = _ensure_model_cached(model_id)
    root = _model_dir(model_id).resolve()
    resolved_path = metadata.get("sceneFilename", "scene.gltf") if file_path == "scene" else file_path
    requested = (root / resolved_path).resolve()
    if root not in requested.parents and requested != root:
        raise SketchfabError("Invalid Sketchfab asset path.")
    if not requested.exists() or not requested.is_file():
        scene_name = metadata.get("sceneFilename", "")
        if scene_name and file_path == scene_name:
            raise SketchfabError("Sketchfab scene file is missing from the local cache.")
        raise SketchfabError("Requested Sketchfab asset file was not found.")
    content_type = mimetypes.guess_type(requested.name)[0] or "application/octet-stream"
    return requested, content_type


def cached_thumbnail_file(model_id: str) -> tuple[Path, str]:
    metadata = _load_model_metadata(model_id)
    thumbnail_url = metadata.get("thumbnailUrl", "")
    if not thumbnail_url:
        raise SketchfabError("Sketchfab did not provide a thumbnail for this model.")
    destination = _thumbnail_path(model_id, thumbnail_url)
    if not destination.exists():
        _download_file(thumbnail_url, destination)
    content_type = mimetypes.guess_type(destination.name)[0] or "image/jpeg"
    return destination, content_type


def normalize_curated_model(detail: dict, curated: dict, request) -> dict:
    model_id = detail.get("uid") or curated["uid"]
    thumbnail_url = _pick_thumbnail(detail.get("thumbnails", {}).get("images", []))
    model_url = request.build_absolute_uri(
        f"/api/assets/sketchfab/models/{quote(model_id)}/scene"
    )
    return {
        "id": f"sketchfab-{model_id}",
        "type": curated["type"],
        "name": curated["name"],
        "category": curated["category"],
        "thumbnail": request.build_absolute_uri(
            f"/api/assets/sketchfab/thumbnails/{quote(model_id)}/"
        ) if thumbnail_url else "",
        "modelUrl": model_url,
        "defaultScale": curated["default_scale"],
        "boundingBox": curated["bounding_box"],
        "source": "Sketchfab",
        "sourceId": model_id,
        "sourceUrl": detail.get("viewerUrl") or f"https://sketchfab.com/3d-models/{model_id}",
        "sketchfabUid": model_id,
        "sketchfabUrl": detail.get("viewerUrl") or f"https://sketchfab.com/3d-models/{model_id}",
        "license": detail.get("license", {}).get("label", ""),
        "creator": detail.get("user", {}).get("displayName", ""),
        "attribution": detail.get("description", ""),
        "animated": bool(detail.get("animationCount", 0)),
        "tags": [tag.get("name", "") for tag in detail.get("tags", []) if tag.get("name")],
        "downloadable": bool(detail.get("isDownloadable", True)),
        "thumbnailUrl": thumbnail_url,
        "curated": True,
    }


def _fallback_curated_asset(curated: dict, request) -> dict:
    model_id = curated["uid"]
    return {
        "id": f"sketchfab-{model_id}",
        "type": curated["type"],
        "name": curated["name"],
        "category": curated["category"],
        "thumbnail": "",
        "modelUrl": request.build_absolute_uri(
            f"/api/assets/sketchfab/models/{quote(model_id)}/scene"
        ),
        "defaultScale": curated["default_scale"],
        "boundingBox": curated["bounding_box"],
        "source": "Sketchfab",
        "sourceId": model_id,
        "sketchfabUid": model_id,
        "sketchfabUrl": f"https://sketchfab.com/3d-models/{model_id}",
        "curated": True,
    }


def get_pinned_models(request) -> dict:
    """
    Return AssetDefinitions for every PINNED_ASSET_UIDS entry.
    The frontend uses this to skip Sketchfab search and load exact models.
    """
    results = []
    curated_by_uid = {c["uid"]: c for c in CURATED_SKETCHFAB_ASSETS}
    for asset_type, model_id in PINNED_ASSET_UIDS.items():
        curated = curated_by_uid.get(model_id)
        try:
            detail, _ = _request_json(f"/models/{quote(model_id)}")
            thumbnail_url = _pick_thumbnail(detail.get("thumbnails", {}).get("images", []))
            model_url = request.build_absolute_uri(
                f"/api/assets/sketchfab/models/{quote(model_id)}/scene"
            )
            asset = {
                "id":           f"sketchfab-{model_id}",
                "type":         curated["type"] if curated else asset_type,
                "pinnedType":   asset_type,
                "name":         curated["name"] if curated else detail.get("name", asset_type),
                "category":     curated["category"] if curated else "Stage & Decor",
                "thumbnail":    request.build_absolute_uri(
                    f"/api/assets/sketchfab/thumbnails/{quote(model_id)}/"
                ) if thumbnail_url else "",
                "modelUrl":     model_url,
                "defaultScale": curated["default_scale"] if curated else [1, 1, 1],
                "boundingBox":  curated["bounding_box"]  if curated else {"width": 1, "depth": 1, "height": 1},
                "source":       "Sketchfab",
                "sourceId":     model_id,
                "sketchfabUid": model_id,
                "sketchfabUrl": detail.get("viewerUrl") or f"https://sketchfab.com/3d-models/{model_id}",
                "license":      detail.get("license", {}).get("label", ""),
                "creator":      detail.get("user", {}).get("displayName", ""),
                "thumbnailUrl": thumbnail_url,
                "pinned":       True,
            }
            # Cache metadata so _ensure_model_cached can download on demand
            _write_json(_metadata_path(model_id), asset)
            results.append(asset)
        except SketchfabError:
            # Return minimal fallback so frontend still gets the modelUrl
            if curated:
                results.append({
                    "id":           f"sketchfab-{model_id}",
                    "type":         curated["type"],
                    "pinnedType":   asset_type,
                    "name":         curated["name"],
                    "category":     curated["category"],
                    "thumbnail":    "",
                    "modelUrl":     request.build_absolute_uri(
                        f"/api/assets/sketchfab/models/{quote(model_id)}/scene"
                    ),
                    "defaultScale": curated["default_scale"],
                    "boundingBox":  curated["bounding_box"],
                    "source":       "Sketchfab",
                    "sourceId":     model_id,
                    "sketchfabUid": model_id,
                    "pinned":       True,
                })
    return {"total": len(results), "results": results}


def get_curated_models(request) -> dict:
    results = []
    for curated in CURATED_SKETCHFAB_ASSETS:
        model_id = curated["uid"]
        try:
            detail, _ = _request_json(f"/models/{quote(model_id)}")
            asset = normalize_curated_model(detail, curated, request)
            _write_json(_metadata_path(model_id), asset)
            results.append(asset)
        except SketchfabError:
            results.append(_fallback_curated_asset(curated, request))
    return {"total": len(results), "results": results}
