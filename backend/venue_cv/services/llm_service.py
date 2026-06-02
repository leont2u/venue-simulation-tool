import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False

REASONING_PROMPT = """You are an expert venue layout analyst with deep knowledge of event planning.

You will receive a JSON scene graph extracted from a venue photograph via computer vision.

Your task is to enrich it with semantic understanding. Return ONLY valid JSON — no explanation,
no markdown fences, no extra text whatsoever.

Input scene graph:
{scene_graph_json}

Analyse the detected objects, clusters, and lighting. Then return this exact JSON schema:

{{
  "venue_type": "<one of: conference_room | ballroom | banquet_hall | theater | auditorium | wedding_venue | boardroom | classroom | exhibition_hall | church | restaurant | hotel_lobby>",
  "event_setup_style": "<one of: u_shape | classroom | theater | banquet | boardroom | cocktail | hollow_square | cabaret | exhibition | auditorium | scattered>",
  "capacity_estimate": <integer — realistic seated capacity based on visible furniture>,
  "detected_features": ["<feature_1>", "<feature_2>", ...],
  "llm_corrections": ["<correction applied to fix impossible geometry>", ...],
  "confidence_notes": "<one sentence about your confidence and any uncertainty>"
}}

Rules:
- Infer venue_type from the combination of furniture, lighting, and room geometry.
- capacity_estimate: count chairs from the objects list plus an estimate for hidden chairs.
- detected_features: list up to 8 notable observed features (e.g. "u_shape_table_arrangement").
- llm_corrections: list only corrections you actually applied (can be empty list).
- If room dimensions seem impossible (e.g. width > 50m or < 2m), note it in confidence_notes.
"""


class LLMReasoningService:

    def __init__(self):
        self.base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self.model    = getattr(settings, "OLLAMA_MODEL", "gemma3:12b")

    def reason(self, scene_graph: dict) -> dict:
        """
        Call Gemma 3 via Ollama and return structured JSON.
        Falls back to a rule-based estimate if Ollama is unavailable.
        """
        if not HTTPX_AVAILABLE:
            return self._rule_based_fallback(scene_graph)

        prompt = REASONING_PROMPT.format(
            scene_graph_json=json.dumps(scene_graph, indent=2)
        )

        try:
            response = httpx.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=120.0,
            )
            response.raise_for_status()
            raw = response.json().get("response", "").strip()
            return self._parse_llm_response(raw, scene_graph)
        except Exception:
            logger.exception("LLM reasoning failed — using rule-based fallback")
            return self._rule_based_fallback(scene_graph)

    def _parse_llm_response(self, raw: str, scene_graph: dict) -> dict:
        # Strip any accidental markdown fences
        if "```" in raw:
            parts = raw.split("```")
            for part in parts:
                stripped = part.strip()
                if stripped.startswith("{"):
                    raw = stripped
                    break
            else:
                raw = parts[1] if len(parts) > 1 else raw
            if raw.startswith("json"):
                raw = raw[4:].strip()

        try:
            result = json.loads(raw)
            # Validate required keys
            for key in ("venue_type", "event_setup_style", "capacity_estimate",
                        "detected_features", "llm_corrections", "confidence_notes"):
                if key not in result:
                    result[key] = self._default_value(key)
            return result
        except json.JSONDecodeError:
            logger.warning("LLM returned invalid JSON — using rule-based fallback")
            return self._rule_based_fallback(scene_graph)

    def _rule_based_fallback(self, scene_graph: dict) -> dict:
        """Deterministic rule-based venue classification when LLM unavailable."""
        objects    = scene_graph.get("objects", [])
        clusters   = scene_graph.get("clusters", [])
        class_set  = {o["type"] for o in objects}

        chair_count = sum(1 for o in objects if o["type"] == "chair")
        has_stage   = "stage" in class_set
        has_chandelier = "chandelier" in class_set
        has_curtains   = "curtain" in class_set
        has_screen     = "projection screen" in class_set

        # Infer venue type
        if has_chandelier and has_curtains and chair_count > 30:
            venue_type = "ballroom"
        elif has_stage and has_screen:
            venue_type = "conference_room"
        elif has_stage and chair_count > 50:
            venue_type = "theater"
        elif "sofa" in class_set:
            venue_type = "hotel_lobby"
        else:
            venue_type = "conference_room"

        # Infer layout style from clusters
        arrangements = [c.get("arrangement") for c in clusters]
        if "u_shape" in arrangements:
            layout_style = "u_shape"
        elif "classroom" in arrangements:
            layout_style = "classroom"
        elif "theater" in arrangements or (has_stage and chair_count > 40):
            layout_style = "theater"
        elif "boardroom" in arrangements:
            layout_style = "boardroom"
        else:
            layout_style = "scattered"

        features = []
        if has_stage:          features.append("stage_present")
        if has_chandelier:     features.append("chandelier_lighting")
        if has_curtains:       features.append("curtains_or_drapes")
        if has_screen:         features.append("projection_screen")
        if chair_count > 20:   features.append("large_seating_capacity")

        return {
            "venue_type":          venue_type,
            "event_setup_style":   layout_style,
            "capacity_estimate":   max(chair_count, 10),
            "detected_features":   features,
            "llm_corrections":     [],
            "confidence_notes":    "Rule-based fallback — Ollama unavailable.",
        }

    def _default_value(self, key: str):
        defaults = {
            "venue_type":        "conference_room",
            "event_setup_style": "scattered",
            "capacity_estimate": 20,
            "detected_features": [],
            "llm_corrections":   [],
            "confidence_notes":  "",
        }
        return defaults.get(key, "")
