"""
Asset Matching Service.

Priority chain for each detected object class:
  1. Internal asset library  (poly-pizza://required/TYPE)
  2. Poly Pizza API search   (live search by class name)
  3. Sketchfab API search    (pinned + keyword search)
  4. Procedural primitive    (primitive://TYPE — always available)
"""
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

# Internal library: class_name → (source, asset_id, asset_url, [sx, sy, sz])
INTERNAL_ASSET_LIBRARY: dict[str, tuple[str, str, str, list[float]]] = {
    "chair":            ("internal", "chair",           "poly-pizza://required/chair",            [0.60, 0.60, 0.60]),
    "table":            ("internal", "rectangular_table","poly-pizza://required/rectangular_table",[1.80, 0.75, 0.80]),
    "sofa":             ("internal", "sofa",            "poly-pizza://required/sofa",             [1.80, 0.85, 0.85]),
    "stage":            ("internal", "stage",           "primitive://stage",                      [3.00, 0.50, 2.00]),
    "podium":           ("internal", "podium",          "poly-pizza://required/podium",           [0.50, 1.10, 0.40]),
    "chandelier":       ("internal", "chandelier",      "poly-pizza://required/chandelier",       [1.20, 0.80, 1.20]),
    "curtain":          ("internal", "curtain",         "primitive://curtain",                    [1.50, 2.80, 0.05]),
    "door":             ("internal", "door",            "primitive://door",                       [1.00, 2.10, 0.05]),
    "window":           ("internal", "window",          "primitive://window",                     [1.80, 1.40, 0.05]),
    "lighting fixture": ("internal", "spot_light",      "poly-pizza://required/spot_light",       [0.30, 0.40, 0.30]),
    "bar counter":      ("internal", "bar",             "poly-pizza://required/bar",              [2.00, 1.05, 0.60]),
    "dance floor":      ("internal", "dance_floor",     "primitive://dance_floor",                [5.00, 0.02, 5.00]),
    "projection screen":("internal", "projection_screen","primitive://projection_screen",         [3.00, 1.80, 0.05]),
    "speaker":          ("internal", "speaker",         "poly-pizza://required/speaker",          [0.40, 0.45, 0.40]),
    "column":           ("internal", "column",          "primitive://column",                     [0.40, 3.00, 0.40]),
    "plant":            ("internal", "plant",           "poly-pizza://required/plant",            [0.60, 1.20, 0.60]),
    "piano":            ("internal", "piano",           "poly-pizza://required/piano",            [1.50, 1.00, 0.60]),
    "fireplace":        ("internal", "fireplace",       "primitive://fireplace",                  [1.50, 1.20, 0.50]),
}


class AssetMatchingService:

    def match(self, class_name: str) -> dict:
        """
        Find the best 3D asset for a given detected class.

        Returns:
        {
          source:    str,
          asset_id:  str,
          asset_url: str,
          scale:     [float, float, float],
          confidence:float,
        }
        """
        # 1. Internal library
        if class_name in INTERNAL_ASSET_LIBRARY:
            source, asset_id, url, scale = INTERNAL_ASSET_LIBRARY[class_name]
            return {
                "source": source, "asset_id": asset_id,
                "asset_url": url, "scale": scale, "confidence": 1.0,
            }

        # 2. Poly Pizza live search
        pp_result = self._search_poly_pizza(class_name)
        if pp_result:
            return pp_result

        # 3. Sketchfab search
        sf_result = self._search_sketchfab(class_name)
        if sf_result:
            return sf_result

        # 4. Primitive fallback
        return {
            "source":    "primitive",
            "asset_id":  "box",
            "asset_url": "primitive://box",
            "scale":     [1.0, 1.0, 1.0],
            "confidence": 0.10,
        }

    def _search_poly_pizza(self, class_name: str) -> dict | None:
        api_key = getattr(settings, "POLY_PIZZA_API_KEY", "")
        if not api_key:
            return None
        try:
            import httpx
            resp = httpx.get(
                "https://api.poly.pizza/v1/search",
                params={"q": class_name, "limit": 1},
                headers={"x-auth-token": api_key},
                timeout=8.0,
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("body", {}).get("results", [])
            if not results:
                return None
            r = results[0]
            return {
                "source":    "poly-pizza",
                "asset_id":  str(r.get("ID", "")),
                "asset_url": r.get("Download", ""),
                "scale":     [1.0, 1.0, 1.0],
                "confidence": 0.70,
            }
        except Exception:
            logger.debug("Poly Pizza search failed for '%s'", class_name)
            return None

    def _search_sketchfab(self, class_name: str) -> dict | None:
        token = getattr(settings, "SKETCHFAB_API_TOKEN", "")
        if not token:
            return None
        try:
            import httpx
            resp = httpx.get(
                "https://api.sketchfab.com/v3/models",
                params={"q": class_name, "type": "models", "downloadable": True, "count": 1},
                headers={"Authorization": f"Token {token}"},
                timeout=8.0,
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
            if not results:
                return None
            r = results[0]
            return {
                "source":    "sketchfab",
                "asset_id":  r.get("uid", ""),
                "asset_url": f"sketchfab://{r.get('uid', '')}",
                "scale":     [1.0, 1.0, 1.0],
                "confidence": 0.60,
            }
        except Exception:
            logger.debug("Sketchfab search failed for '%s'", class_name)
            return None
