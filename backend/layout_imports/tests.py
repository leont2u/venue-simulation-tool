"""Unit tests for the Gemma3 vision CV pipeline."""
import unittest

from layout_imports.detection import (
    _clamp01,
    _extract_json_from_llm,
    _infer_chair_count,
    _normalize_item_type,
    _postprocess_vision_output,
    vision_parsed_to_understanding,
)


class TestExtractJsonFromLlm(unittest.TestCase):
    def test_clean_json(self):
        result = _extract_json_from_llm('{"items": [], "zones": []}')
        self.assertEqual(result, {"items": [], "zones": []})

    def test_markdown_fence(self):
        text = '```json\n{"items": [], "zones": []}\n```'
        result = _extract_json_from_llm(text)
        self.assertEqual(result, {"items": [], "zones": []})

    def test_embedded_json(self):
        text = 'Here is the result: {"items": [], "zones": []} done.'
        result = _extract_json_from_llm(text)
        self.assertEqual(result, {"items": [], "zones": []})

    def test_no_json_raises(self):
        with self.assertRaises(ValueError):
            _extract_json_from_llm("No JSON here at all")


class TestNormalizeItemType(unittest.TestCase):
    def test_valid_type_passthrough(self):
        self.assertEqual(_normalize_item_type("round_table"), "round_table")
        self.assertEqual(_normalize_item_type("stage"), "stage")
        self.assertEqual(_normalize_item_type("mixing_desk"), "mixing_desk")

    def test_alias_mapping(self):
        self.assertEqual(_normalize_item_type("banquet_table"), "rectangular_table")
        self.assertEqual(_normalize_item_type("lectern"), "podium")
        self.assertEqual(_normalize_item_type("monitor"), "tv")
        self.assertEqual(_normalize_item_type("couch"), "sofa")

    def test_case_insensitive(self):
        self.assertEqual(_normalize_item_type("STAGE"), "stage")
        self.assertEqual(_normalize_item_type("Round_Table"), "round_table")

    def test_unknown_type_returns_none(self):
        self.assertIsNone(_normalize_item_type("spaceship"))
        self.assertIsNone(_normalize_item_type(""))


class TestClamp01(unittest.TestCase):
    def test_in_range(self):
        self.assertAlmostEqual(_clamp01(0.5), 0.5)

    def test_below_zero(self):
        self.assertAlmostEqual(_clamp01(-1.0), 0.0)

    def test_above_one(self):
        self.assertAlmostEqual(_clamp01(2.5), 1.0)

    def test_string_coercion(self):
        self.assertAlmostEqual(_clamp01("0.3"), 0.3)

    def test_invalid_returns_zero(self):
        self.assertAlmostEqual(_clamp01("bad"), 0.0)


class TestInferChairCount(unittest.TestCase):
    def test_label_hint(self):
        self.assertEqual(_infer_chair_count("round_table", "Table for 8"), 8)
        self.assertEqual(_infer_chair_count("round_table", "12-seat round"), 12)

    def test_default_round(self):
        self.assertEqual(_infer_chair_count("round_table"), 6)

    def test_default_rectangular(self):
        self.assertEqual(_infer_chair_count("rectangular_table"), 8)


class TestPostprocessVisionOutput(unittest.TestCase):
    # ── fixture helpers ──────────────────────────────────────────────────────

    def _wedding_raw(self):
        return {
            "items": [
                {"type": "stage",       "x": 0.5,  "y": 0.1,  "width": 0.4,  "height": 0.12, "confidence": 0.92},
                {"type": "round_table", "x": 0.25, "y": 0.5,  "width": 0.08, "height": 0.08, "confidence": 0.85, "chairCount": 8},
                {"type": "round_table", "x": 0.75, "y": 0.5,  "width": 0.08, "height": 0.08, "confidence": 0.85, "chairCount": 8},
                {"type": "lectern",     "x": 0.5,  "y": 0.15, "width": 0.03, "height": 0.03, "confidence": 0.8},
                {"type": "speaker",     "x": 0.3,  "y": 0.12, "width": 0.02, "height": 0.02, "confidence": 0.75},
                {"type": "camera",      "x": 0.8,  "y": 0.9,  "width": 0.02, "height": 0.02, "confidence": 0.7},
            ],
            "zones": [
                {"type": "dining_area", "x": 0.5, "y": 0.55, "width": 0.8, "height": 0.6, "confidence": 0.88},
                {"type": "stage_area",  "x": 0.5, "y": 0.1,  "width": 0.5, "height": 0.2, "confidence": 0.9},
            ],
        }

    def _conference_raw(self):
        return {
            "items": [
                {"type": "screen",            "x": 0.5,  "y": 0.05, "width": 0.5,  "height": 0.06, "confidence": 0.93},
                {"type": "rectangular_table", "x": 0.5,  "y": 0.45, "width": 0.6,  "height": 0.1,  "confidence": 0.88, "chairCount": 14},
                {"type": "banquet_table",     "x": 0.2,  "y": 0.8,  "width": 0.3,  "height": 0.06, "confidence": 0.75, "chairCount": 6},
                {"type": "mixing_desk",       "x": 0.85, "y": 0.5,  "width": 0.05, "height": 0.05, "confidence": 0.8},
                {"type": "podium",            "x": 0.15, "y": 0.45, "width": 0.04, "height": 0.04, "confidence": 0.72},
            ],
            "zones": [
                {"type": "stage_area",    "x": 0.1, "y": 0.45, "width": 0.2, "height": 0.3,  "confidence": 0.82},
                {"type": "reception_area","x": 0.5, "y": 0.9,  "width": 0.8, "height": 0.15, "confidence": 0.7},
            ],
        }

    def _concert_raw(self):
        return {
            "items": [
                {"type": "stage",       "x": 0.5,  "y": 0.08, "width": 0.6,  "height": 0.15, "confidence": 0.95},
                {"type": "speaker",     "x": 0.15, "y": 0.12, "width": 0.03, "height": 0.03, "confidence": 0.88},
                {"type": "speaker",     "x": 0.85, "y": 0.12, "width": 0.03, "height": 0.03, "confidence": 0.88},
                {"type": "camera",      "x": 0.5,  "y": 0.85, "width": 0.02, "height": 0.02, "confidence": 0.75},
                {"type": "dj_booth",    "x": 0.5,  "y": 0.22, "width": 0.1,  "height": 0.05, "confidence": 0.82},
                {"type": "bar_counter", "x": 0.1,  "y": 0.7,  "width": 0.15, "height": 0.06, "confidence": 0.78},
            ],
            "zones": [
                {"type": "stage_area",  "x": 0.5, "y": 0.1,  "width": 0.7, "height": 0.2, "confidence": 0.9},
                {"type": "dance_floor", "x": 0.5, "y": 0.5,  "width": 0.7, "height": 0.5, "confidence": 0.87},
                {"type": "bar_area",    "x": 0.1, "y": 0.7,  "width": 0.2, "height": 0.2, "confidence": 0.75},
            ],
        }

    # ── wedding ──────────────────────────────────────────────────────────────

    def test_wedding_item_count(self):
        out = _postprocess_vision_output(self._wedding_raw())
        self.assertEqual(len(out["items"]), 6)

    def test_wedding_lectern_aliased_to_podium(self):
        out = _postprocess_vision_output(self._wedding_raw())
        types = [i["type"] for i in out["items"]]
        self.assertIn("podium", types)
        self.assertNotIn("lectern", types)

    def test_wedding_chair_count_preserved(self):
        out = _postprocess_vision_output(self._wedding_raw())
        tables = [i for i in out["items"] if i["type"] == "round_table"]
        self.assertTrue(all(i["chairCount"] == 8 for i in tables))

    def test_wedding_zones(self):
        out = _postprocess_vision_output(self._wedding_raw())
        zone_types = {z["type"] for z in out["zones"]}
        self.assertIn("dining_area", zone_types)
        self.assertIn("stage_area", zone_types)

    # ── conference ───────────────────────────────────────────────────────────

    def test_conference_banquet_table_mapped_to_rectangular(self):
        out = _postprocess_vision_output(self._conference_raw())
        types = [i["type"] for i in out["items"]]
        self.assertNotIn("banquet_table", types)
        self.assertEqual(types.count("rectangular_table"), 2)

    def test_conference_chair_count(self):
        out = _postprocess_vision_output(self._conference_raw())
        main = next(i for i in out["items"] if i["type"] == "rectangular_table" and i.get("chairCount") == 14)
        self.assertIsNotNone(main)

    def test_conference_zones(self):
        out = _postprocess_vision_output(self._conference_raw())
        zone_types = {z["type"] for z in out["zones"]}
        self.assertIn("stage_area", zone_types)
        self.assertIn("reception_area", zone_types)

    # ── concert ──────────────────────────────────────────────────────────────

    def test_concert_item_count(self):
        out = _postprocess_vision_output(self._concert_raw())
        self.assertEqual(len(out["items"]), 6)

    def test_concert_zone_count(self):
        out = _postprocess_vision_output(self._concert_raw())
        self.assertEqual(len(out["zones"]), 3)

    def test_concert_dance_floor(self):
        out = _postprocess_vision_output(self._concert_raw())
        zone_types = {z["type"] for z in out["zones"]}
        self.assertIn("dance_floor", zone_types)

    def test_confidence_clamped(self):
        raw = {"items": [{"type": "stage", "x": 0.5, "y": 0.5, "width": 0.1, "height": 0.1, "confidence": 1.5}], "zones": []}
        out = _postprocess_vision_output(raw)
        self.assertLessEqual(out["items"][0]["confidence"], 1.0)

    def test_unknown_type_dropped(self):
        raw = {"items": [{"type": "spaceship", "x": 0.5, "y": 0.5, "width": 0.1, "height": 0.1}], "zones": []}
        out = _postprocess_vision_output(raw)
        self.assertEqual(len(out["items"]), 0)

    def test_unknown_zone_dropped(self):
        raw = {"items": [], "zones": [{"type": "moon_base", "x": 0.5, "y": 0.5, "width": 0.2, "height": 0.2}]}
        out = _postprocess_vision_output(raw)
        self.assertEqual(len(out["zones"]), 0)


class TestVisionParsedToUnderstanding(unittest.TestCase):
    def _sample_parsed(self):
        return {
            "items": [
                {"type": "round_table", "x": 0.5, "y": 0.5, "width": 0.08, "height": 0.08, "confidence": 0.9, "chairCount": 6},
                {"type": "stage",       "x": 0.5, "y": 0.1, "width": 0.4,  "height": 0.1,  "confidence": 0.95},
            ],
            "zones": [
                {"type": "dining_area", "x": 0.5, "y": 0.6, "width": 0.7, "height": 0.5, "confidence": 0.85},
            ],
        }

    def test_understanding_keys(self):
        u = vision_parsed_to_understanding(self._sample_parsed())
        for key in ("walls", "doors", "windows", "rooms", "furniture", "zones", "image"):
            self.assertIn(key, u)

    def test_empty_walls_doors_rooms(self):
        u = vision_parsed_to_understanding(self._sample_parsed())
        self.assertEqual(u["walls"], [])
        self.assertEqual(u["doors"], [])
        self.assertEqual(u["rooms"], [])

    def test_virtual_canvas_dimensions(self):
        u = vision_parsed_to_understanding(self._sample_parsed())
        self.assertEqual(u["image"]["width"], 1000)
        self.assertEqual(u["image"]["height"], 1000)

    def test_coordinate_conversion(self):
        u = vision_parsed_to_understanding(self._sample_parsed())
        table = next(f for f in u["furniture"] if f["type"] == "round_table")
        # x=0.5, width=0.08 → cx_px=500, w_px=80 → left=460
        self.assertAlmostEqual(table["x"], 460.0)
        self.assertAlmostEqual(table["y"], 460.0)
        self.assertAlmostEqual(table["width"], 80.0)

    def test_chair_count_preserved(self):
        u = vision_parsed_to_understanding(self._sample_parsed())
        table = next(f for f in u["furniture"] if f["type"] == "round_table")
        self.assertEqual(table["chairCount"], 6)

    def test_zone_coordinate_conversion(self):
        u = vision_parsed_to_understanding(self._sample_parsed())
        zone = u["zones"][0]
        self.assertEqual(zone["type"], "dining_area")
        # x=0.5, width=0.7 → cx_px=500, w_px=700 → left=150
        self.assertAlmostEqual(zone["x"], 150.0)

    def test_item_without_chair_count_not_stored(self):
        u = vision_parsed_to_understanding(self._sample_parsed())
        stage = next(f for f in u["furniture"] if f["type"] == "stage")
        self.assertNotIn("chairCount", stage)


if __name__ == "__main__":
    unittest.main()
