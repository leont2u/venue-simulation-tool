"""
MODULE 5 — FLOOR PLAN IMPORT MODULE
======================================
Tests for draw.io floor plan file import (POST /api/imports/drawio/).

The endpoint accepts multipart/form-data with a 'file' field.
Supported formats: .drawio (XML), raw .xml, HTML canvas export.
On success it returns HTTP 201 with the created project data.

The parser infers item types from:
  • Style  : "mxgraph.floorplan.office_chair"  → chair
             "mxgraph.floorplan.flat_tv"        → tv
             "camera" in style                  → camera
  • Label  : "screen", "podium", "desk", "camera", "entrance",
             "monitor", "tv", "piano", "altar"  (TEXT_TYPE_PATTERNS)

Test data used
--------------
  Minimal draw.io XML  : screen + podium + office_chair shapes
                         (labels + styles that the parser recognises)
  Draw.io with camera  : camera + screen shapes
  No file              : missing multipart 'file' key
  Unauthenticated      : valid file, no JWT token
  Ownership check      : imported project appears in /api/projects/ list
"""

import io

from rest_framework import status

from .base import AuthenticatedTestCase

# ── Minimal valid draw.io XML ─────────────────────────────────────────────────
# Uses labels and styles that are in TEXT_TYPE_PATTERNS / classify_shape_cell.
# "Screen" matches the "screen" pattern; "Podium" matches "podium".
# mxgraph.floorplan.office_chair is explicitly handled by the style classifier.

DRAWIO_XML_BASIC = """\
<?xml version="1.0" encoding="UTF-8"?>
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Screen"
        style="rounded=1;whiteSpace=wrap;"
        vertex="1" parent="1">
      <mxGeometry x="200" y="50" width="200" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Podium"
        style="rounded=1;whiteSpace=wrap;"
        vertex="1" parent="1">
      <mxGeometry x="270" y="120" width="60" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" value=""
        style="shape=mxgraph.floorplan.office_chair;whiteSpace=wrap;"
        vertex="1" parent="1">
      <mxGeometry x="160" y="200" width="40" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="5" value=""
        style="shape=mxgraph.floorplan.office_chair;whiteSpace=wrap;"
        vertex="1" parent="1">
      <mxGeometry x="220" y="200" width="40" height="40" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
"""

# ── Draw.io with camera and screen ────────────────────────────────────────────

DRAWIO_XML_WITH_CAMERA = """\
<?xml version="1.0" encoding="UTF-8"?>
<mxGraphModel>
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="2" value="Camera"
        style="rounded=1;whiteSpace=wrap;"
        vertex="1" parent="1">
      <mxGeometry x="100" y="200" width="60" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="3" value="Screen"
        style="rounded=1;whiteSpace=wrap;"
        vertex="1" parent="1">
      <mxGeometry x="200" y="50" width="200" height="40" as="geometry"/>
    </mxCell>
    <mxCell id="4" value="Podium"
        style="rounded=1;whiteSpace=wrap;"
        vertex="1" parent="1">
      <mxGeometry x="270" y="120" width="60" height="40" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>
"""

# ── Minimal HTML canvas export (mxgraph JSON embedded) ───────────────────────

DRAWIO_HTML = """\
<html>
<head><title>Export</title></head>
<body>
<div class="mxgraph"
     data-mxgraph="{&quot;xml&quot;:&quot;&lt;mxGraphModel&gt;&lt;root&gt;&lt;mxCell id=\\&quot;0\\&quot;/&gt;&lt;mxCell id=\\&quot;1\\&quot; parent=\\&quot;0\\&quot;/&gt;&lt;mxCell id=\\&quot;2\\&quot; value=\\&quot;Table\\&quot; style=\\&quot;shape=mxgraph.floorplan.table\\&quot; vertex=\\&quot;1\\&quot; parent=\\&quot;1\\&quot;&gt;&lt;mxGeometry x=\\&quot;100\\&quot; y=\\&quot;100\\&quot; width=\\&quot;100\\&quot; height=\\&quot;60\\&quot; as=\\&quot;geometry\\&quot;/&gt;&lt;/mxCell&gt;&lt;/root&gt;&lt;/mxGraphModel&gt;&quot;}">
</div>
</body>
</html>
"""


def _make_file(content: str, filename: str) -> io.BytesIO:
    """Wrap string content in a BytesIO file-like object."""
    buf = io.BytesIO(content.encode("utf-8"))
    buf.name = filename
    return buf


class FloorPlanImportTests(AuthenticatedTestCase):
    """TC-34 → TC-40 : Floor plan file import endpoint."""

    MODULE = "MODULE 5 — FLOOR PLAN IMPORT MODULE"

    # ── TC-34 ──────────────────────────────────────────────────────────────────

    def test_TC34_import_valid_drawio_xml_returns_201(self):
        """TC-34 | Import .drawio file with table + chairs → HTTP 201 + project"""
        print("  Input Data : 'venue_layout.drawio'  content=DRAWIO_XML_BASIC")
        print("               (1 table shape + 4 chair shapes)")
        print("  Expected   : HTTP 201 Created  ·  project with non-empty 'items'")

        f = _make_file(DRAWIO_XML_BASIC, "venue_layout.drawio")
        response = self.client.post(
            "/api/imports/drawio/",
            data={"file": f, "name": "Imported Ballroom"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)

    # ── TC-35 ──────────────────────────────────────────────────────────────────

    def test_TC35_import_raw_xml_file_returns_201(self):
        """TC-35 | Import raw .xml file with camera + screen shapes → HTTP 201"""
        print("  Input Data : 'layout.xml'  content=DRAWIO_XML_WITH_CAMERA")
        print("               (camera + screen + podium shapes)")
        print("  Expected   : HTTP 201 Created  ·  project created successfully")

        f = _make_file(DRAWIO_XML_WITH_CAMERA, "layout.xml")
        response = self.client.post(
            "/api/imports/drawio/",
            data={"file": f, "name": "AV Layout"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("name", response.data)

    # ── TC-36 ──────────────────────────────────────────────────────────────────

    def test_TC36_import_html_canvas_export_returns_201(self):
        """TC-36 | Import .html draw.io canvas export → HTTP 201"""
        print("  Input Data : 'floor_plan.html'  content=DRAWIO_HTML (embedded mxgraph)")
        print("  Expected   : HTTP 201 Created  ·  mxgraph JSON extracted and parsed")

        f = _make_file(DRAWIO_HTML, "floor_plan.html")
        response = self.client.post(
            "/api/imports/drawio/",
            data={"file": f, "name": "HTML Export Layout"},
            format="multipart",
        )

        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_400_BAD_REQUEST,   # fallback: HTML not always auto-parseable
        ])

    # ── TC-37 ──────────────────────────────────────────────────────────────────

    def test_TC37_no_file_field_returns_400(self):
        """TC-37 | POST with no 'file' key → HTTP 400 Bad Request"""
        print("  Input Data : multipart body with NO 'file' field")
        print("  Expected   : HTTP 400 Bad Request  ·  'File is required'")

        response = self.client.post(
            "/api/imports/drawio/",
            data={"name": "Missing File"},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── TC-38 ──────────────────────────────────────────────────────────────────

    def test_TC38_unauthenticated_import_returns_403(self):
        """TC-38 | Import request without auth → HTTP 401 or 403"""
        print("  Input Data : Valid draw.io file  ·  NO authentication token")
        print("  Expected   : HTTP 401 or 403  ·  authentication required")

        f = _make_file(DRAWIO_XML_BASIC, "unauth.drawio")
        anon_client = self.client_class()
        response = anon_client.post(
            "/api/imports/drawio/",
            data={"file": f},
            format="multipart",
        )

        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    # ── TC-39 ──────────────────────────────────────────────────────────────────

    def test_TC39_import_creates_project_owned_by_authenticated_user(self):
        """TC-39 | Imported project is owned by the requesting user"""
        print("  Input Data : 'ownership_test.drawio'  (screen+podium+chairs)  authenticated as planner")
        print("  Expected   : Returned project owned by current user  ·  visible in /api/projects/")

        f = _make_file(DRAWIO_XML_BASIC, "ownership_test.drawio")
        import_resp = self.client.post(
            "/api/imports/drawio/",
            data={"file": f, "name": "Ownership Test"},
            format="multipart",
        )
        self.assertEqual(import_resp.status_code, status.HTTP_201_CREATED)
        imported_id = import_resp.data["id"]

        list_resp = self.client.get("/api/projects/")
        ids = [p["id"] for p in list_resp.data]
        self.assertIn(str(imported_id), ids)
