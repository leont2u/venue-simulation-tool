"""
Conference Room Floor Plan — CV-Optimised
==========================================
Designed specifically for computer-vision floor-plan import.

Rules that make CV parsing reliable:
  - NO grid (grid lines become false walls)
  - NO dimension lines (picked up as walls by morphology)
  - Structural walls: solid, thick (4 pt) black lines
  - Non-structural zones (screens, coffee area): dashed thin outlines
    → dashes survive the eye but break up under morphological OPEN,
      so they don't merge into solid segments the detector keeps
  - Legend and title block placed OUTSIDE the room bounding box,
    separated by a blank margin so they don't confuse room detection
  - Stage: solid filled rectangle (detected correctly as a zone)
  - Tables: circles with thin border (Hough circles picks them up fine)
  - Doors: standard arc symbol (detected as door swing)

Room: 22 m × 16 m
"""

import math
import os
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas as pdf_canvas


# ── Palette ────────────────────────────────────────────────────────────────
C_WALL        = colors.HexColor("#111111")   # structural wall — thick, very dark
C_WALL_FILL   = colors.HexColor("#cccccc")   # wall fill (hatch-free for clarity)
C_FLOOR       = colors.HexColor("#f8f6f2")   # room floor
C_STAGE       = colors.HexColor("#d8cfc0")   # stage fill
C_STAGE_EDGE  = colors.HexColor("#111111")   # stage border — solid (it IS a structural element)
C_TABLE_FILL  = colors.HexColor("#ede4d6")
C_TABLE_EDGE  = colors.HexColor("#333333")   # table border — thin but solid (circles need edge)
C_CHAIR       = colors.HexColor("#b8a898")
C_CHAIR_EDGE  = colors.HexColor("#444444")
C_ANNOT       = colors.HexColor("#446688")   # dashed annotation colour (screens, coffee zone)
C_LABEL       = colors.HexColor("#111111")
C_DOOR_SWING  = colors.HexColor("#446688")
C_EXIT        = colors.HexColor("#cc3322")
C_TITLE_BG    = colors.HexColor("#2c3e50")
C_TITLE_FG    = colors.white


# ── Page geometry ──────────────────────────────────────────────────────────
PAGE_W, PAGE_H = landscape(A3)
MARGIN         = 14 * mm

# Structural elements only fill the LEFT ~85 % of the page.
# Legend occupies the right strip — fully outside the room area.
LEGEND_W = 38 * mm
TITLE_H  = 16 * mm

DRAW_W = PAGE_W - 2 * MARGIN - LEGEND_W - 4 * mm
DRAW_H = PAGE_H - 2 * MARGIN - TITLE_H - 4 * mm

ROOM_W = 22.0
ROOM_D = 16.0
SCALE  = min(DRAW_W / ROOM_W, DRAW_H / ROOM_D)

ORIGIN_X = MARGIN
ORIGIN_Y = MARGIN + TITLE_H + 4 * mm


def m2p(m):  return m * SCALE
def rx(x):   return ORIGIN_X + m2p(x)
def ry(y):   return ORIGIN_Y + m2p(y)


# ── Primitive helpers ──────────────────────────────────────────────────────

def solid(c, lw=1.0, stroke=C_WALL, fill=None):
    c.setLineWidth(lw)
    c.setStrokeColor(stroke)
    c.setDash([], 0)
    if fill is not None:
        c.setFillColor(fill)


def dashed(c, lw=0.7, stroke=C_ANNOT, on=4, off=4):
    """Thin dashed line — won't survive morphological OPEN in the CV pipeline."""
    c.setLineWidth(lw)
    c.setStrokeColor(stroke)
    c.setDash([on, off], 0)


# ── Room floor ─────────────────────────────────────────────────────────────

def draw_floor(c):
    c.saveState()
    solid(c, fill=C_FLOOR)
    c.rect(rx(0), ry(0), m2p(ROOM_W), m2p(ROOM_D), fill=1, stroke=0)
    c.restoreState()


# ── Structural walls (thick solid) ────────────────────────────────────────
# Wall thickness 0.22 m drawn as a thick line pair.
# The ONLY thick-solid rectangles in the drawing = the 4 room walls.
# Everything else is dashed or thin.

def draw_walls(c):
    WALL_LW = 4.5   # pt — clearly heavier than any annotation line

    c.saveState()
    solid(c, lw=WALL_LW, stroke=C_WALL)

    # Door openings on south wall: two 1.4 m pairs at x=7.3 and x=13.3
    door_gaps = [(7.3, 1.4), (13.3, 1.4)]

    # South wall — draw segments either side of doors
    seg_x = 0.0
    for (dx, dw) in sorted(door_gaps):
        if dx > seg_x:
            c.line(rx(seg_x), ry(0), rx(dx), ry(0))
        seg_x = dx + dw
    c.line(rx(seg_x), ry(0), rx(ROOM_W), ry(0))

    # North wall — full (stage back wall is structural)
    c.line(rx(0), ry(ROOM_D), rx(ROOM_W), ry(ROOM_D))

    # East wall — fire exit gap at y=7.0, h=1.2
    c.line(rx(ROOM_W), ry(0), rx(ROOM_W), ry(7.0))
    c.line(rx(ROOM_W), ry(8.2), rx(ROOM_W), ry(ROOM_D))

    # West wall — fire exit gap at y=7.0
    c.line(rx(0), ry(0), rx(0), ry(7.0))
    c.line(rx(0), ry(8.2), rx(0), ry(ROOM_D))

    c.restoreState()


# ── Wall cap lines (double-line convention at corners) ─────────────────────

def draw_wall_caps(c):
    CAP = 2.5
    c.saveState()
    solid(c, lw=CAP, stroke=C_WALL)
    # Inner corner lines
    c.line(rx(0), ry(0), rx(0), ry(0))  # noop — corners already closed by walls
    c.restoreState()


# ── Door symbols ───────────────────────────────────────────────────────────

def draw_door(c, hinge_x, wall_y, width=1.4, opens_in=True):
    c.saveState()
    solid(c, lw=1.2, stroke=C_WALL)
    # Door panel (thin rect across opening)
    c.setFillColor(colors.HexColor("#f0e8dc"))
    c.rect(rx(hinge_x), ry(wall_y) - 2, m2p(width), 4, fill=1, stroke=1)
    # Swing arc
    dashed(c, lw=0.7, stroke=C_DOOR_SWING, on=3, off=3)
    r = m2p(width)
    if opens_in:
        c.arc(rx(hinge_x), ry(wall_y), rx(hinge_x) + r, ry(wall_y) + r, 0, 90)
    c.restoreState()


def draw_doors(c):
    for dx in [7.3, 13.3]:
        draw_door(c, dx, 0.0, width=1.4)


# ── Exit arrows ────────────────────────────────────────────────────────────

def draw_exits(c):
    c.saveState()
    solid(c, lw=0.8, stroke=C_EXIT, fill=C_EXIT)
    c.setFont("Helvetica-Bold", 5.5)

    for side, x_m, y_m in [("east", ROOM_W, 7.6), ("west", 0.0, 7.6)]:
        px, py = rx(x_m), ry(y_m)
        arrow = m2p(0.5)
        if side == "east":
            c.line(px, py, px + arrow, py)
            c.line(px + arrow, py, px + arrow - 4, py + 3)
            c.line(px + arrow, py, px + arrow - 4, py - 3)
            c.drawString(px + arrow + 2, py - 3, "EXIT")
        else:
            c.line(px, py, px - arrow, py)
            c.line(px - arrow, py, px - arrow + 4, py + 3)
            c.line(px - arrow, py, px - arrow + 4, py - 3)
            c.drawRightString(px - arrow - 2, py - 3, "EXIT")

    c.restoreState()


# ── Stage (solid fill — structural zone, not furniture) ───────────────────

STAGE_W  = 8.0
STAGE_D  = 2.5
STAGE_X  = (ROOM_W - STAGE_W) / 2
STAGE_Y  = ROOM_D - STAGE_D


def draw_stage(c):
    c.saveState()
    solid(c, lw=2.0, stroke=C_STAGE_EDGE, fill=C_STAGE)
    c.rect(rx(STAGE_X), ry(STAGE_Y), m2p(STAGE_W), m2p(STAGE_D), fill=1, stroke=1)

    # Front ledge emphasis
    solid(c, lw=2.5, stroke=C_STAGE_EDGE)
    c.line(rx(STAGE_X), ry(STAGE_Y), rx(STAGE_X + STAGE_W), ry(STAGE_Y))

    # Stair tread lines (3 treads on each side — purely decorative, thin)
    solid(c, lw=0.7, stroke=colors.HexColor("#888"))
    tread = m2p(0.25)
    for side_x in [STAGE_X + 0.15, STAGE_X + STAGE_W - 0.95]:
        for n in range(3):
            yy = ry(STAGE_Y) - n * tread
            c.line(rx(side_x), yy, rx(side_x + 0.8), yy)

    # Label
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(colors.HexColor("#333"))
    c.drawCentredString(rx(STAGE_X + STAGE_W / 2), ry(STAGE_Y + STAGE_D / 2) - 4, "STAGE")
    c.setFont("Helvetica", 5.5)
    c.setFillColor(colors.HexColor("#555"))
    c.drawCentredString(rx(STAGE_X + STAGE_W / 2), ry(STAGE_Y + STAGE_D / 2) - 13, "8.0 m × 2.5 m  (raised +0.60 m)")

    # Podium
    solid(c, lw=1.0, stroke=colors.HexColor("#555"), fill=colors.HexColor("#8a6040"))
    c.rect(rx(ROOM_W / 2 - 0.35), ry(STAGE_Y + 0.28), m2p(0.7), m2p(0.5), fill=1, stroke=1)
    c.setFont("Helvetica", 4)
    c.setFillColor(colors.white)
    c.drawCentredString(rx(ROOM_W / 2), ry(STAGE_Y + 0.48), "PODIUM")

    c.restoreState()


# ── Screens — DASHED outline so CV doesn't treat them as walls ────────────

def draw_screens(c):
    screens = [
        (STAGE_X - 3.5, ROOM_D - 0.35, 3.0, 0.28, "SCREEN L  3.0×2.0 m"),
        (STAGE_X + STAGE_W + 0.5, ROOM_D - 0.35, 3.0, 0.28, "SCREEN R  3.0×2.0 m"),
    ]
    c.saveState()
    for (x, y, w, d, label) in screens:
        # Dashed rectangle — NOT solid, so morphological OPEN breaks the line
        dashed(c, lw=1.0, stroke=C_ANNOT, on=5, off=4)
        c.setFillColor(colors.HexColor("#d0e0f0"))
        c.rect(rx(x), ry(y), m2p(w), m2p(d), fill=1, stroke=1)
        # X-mark (dashed too)
        dashed(c, lw=0.6, stroke=colors.HexColor("#7090b0"), on=3, off=3)
        c.line(rx(x), ry(y), rx(x + w), ry(y + d))
        c.line(rx(x + w), ry(y), rx(x), ry(y + d))
        # Label
        c.setFont("Helvetica-Bold", 5.5)
        c.setFillColor(colors.HexColor("#223355"))
        c.setDash([], 0)
        c.drawCentredString(rx(x + w / 2), ry(y + d / 2) - 3, label)
    c.restoreState()


# ── Round banquet tables ───────────────────────────────────────────────────

def draw_round_table(c, cx, cy, table_r=0.9, n_chairs=8, label=""):
    c.saveState()
    # Table circle — thin solid (Hough circles detects these)
    solid(c, lw=1.0, stroke=C_TABLE_EDGE, fill=C_TABLE_FILL)
    c.circle(rx(cx), ry(cy), m2p(table_r), fill=1, stroke=1)

    # Inner drape ring
    solid(c, lw=0.5, stroke=colors.HexColor("#bba888"), fill=None)
    c.setFillColor(colors.transparent)
    c.circle(rx(cx), ry(cy), m2p(table_r * 0.68), fill=0, stroke=1)

    # Label
    if label:
        c.setFont("Helvetica-Bold", 6)
        c.setFillColor(colors.HexColor("#4a3820"))
        c.drawCentredString(rx(cx), ry(cy) - 3, label)

    # Chairs
    for i in range(n_chairs):
        angle = math.radians(360 * i / n_chairs - 90)
        dist  = m2p(table_r + 0.36)
        cpx   = rx(cx) + dist * math.cos(angle)
        cpy   = ry(cy) + dist * math.sin(angle)
        solid(c, lw=0.7, stroke=C_CHAIR_EDGE, fill=C_CHAIR)
        c.circle(cpx, cpy, m2p(0.21), fill=1, stroke=1)

    c.restoreState()


def draw_seating(c):
    start_x, start_y = 2.4, 2.0
    step_x,  step_y  = 3.9, 3.3
    num = 1
    for row in range(4):
        for col in range(4):
            draw_round_table(c,
                             cx=start_x + col * step_x,
                             cy=start_y + row * step_y,
                             label=str(num))
            num += 1


# ── Coffee / refreshment zone — DASHED outline ─────────────────────────────

def draw_coffee(c):
    c.saveState()
    # Zone boundary — dashed so it won't register as a wall
    dashed(c, lw=1.0, stroke=C_ANNOT, on=5, off=4)
    c.setFillColor(colors.HexColor("#f5e8d4"))
    # Main counter (east wall side)
    c.rect(rx(18.1), ry(0.25), m2p(1.6), m2p(4.0), fill=1, stroke=1)
    # Side counter (south wall side)
    c.rect(rx(15.0), ry(0.25), m2p(3.1), m2p(1.3), fill=1, stroke=1)

    # Counter surface lines (very thin, dashed)
    dashed(c, lw=0.4, stroke=colors.HexColor("#c0904a"), on=4, off=6)
    for i in range(7):
        yy = ry(0.25) + i * m2p(0.55)
        c.line(rx(18.1), yy, rx(19.7), yy)

    # Labels
    c.setDash([], 0)
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(colors.HexColor("#6a3a10"))
    c.drawCentredString(rx(18.9), ry(2.4), "COFFEE &")
    c.drawCentredString(rx(18.9), ry(2.05), "REFRESH.")

    c.restoreState()


# ── North compass ─────────────────────────────────────────────────────────

def draw_compass(c):
    cx = rx(ROOM_W) + LEGEND_W / 2 + 4 * mm
    cy = ry(ROOM_D) - 20
    r  = 11

    c.saveState()
    solid(c, lw=1.0, stroke=colors.HexColor("#2c3e50"))
    c.setFillColor(colors.transparent)
    c.circle(cx, cy, r, fill=0, stroke=1)

    path = c.beginPath()
    path.moveTo(cx, cy + r - 1)
    path.lineTo(cx - 4, cy)
    path.lineTo(cx + 4, cy)
    path.close()
    c.setFillColor(colors.HexColor("#2c3e50"))
    c.drawPath(path, fill=1, stroke=0)

    path2 = c.beginPath()
    path2.moveTo(cx, cy - r + 1)
    path2.lineTo(cx - 4, cy)
    path2.lineTo(cx + 4, cy)
    path2.close()
    c.setFillColor(colors.white)
    c.drawPath(path2, fill=1, stroke=1)

    c.setFillColor(colors.HexColor("#2c3e50"))
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(cx, cy + r + 3, "N")
    c.restoreState()


# ── Legend strip (fully outside the room bounding box) ────────────────────

def draw_legend(c):
    lx = rx(ROOM_W) + 4 * mm
    ly = ry(0)
    lw = LEGEND_W - 4 * mm
    lh = m2p(ROOM_D)

    c.saveState()
    c.setFillColor(colors.HexColor("#faf9f7"))
    c.setStrokeColor(colors.HexColor("#bbb"))
    c.setLineWidth(0.6)
    c.rect(lx, ly, lw, lh, fill=1, stroke=1)

    # Title bar
    c.setFillColor(C_TITLE_BG)
    c.rect(lx, ly + lh - 15, lw, 15, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 6.5)
    c.setFillColor(colors.white)
    c.drawCentredString(lx + lw / 2, ly + lh - 10, "LEGEND")

    items = [
        (C_STAGE,                   C_STAGE_EDGE, "SOLID",  "Stage (structural)"),
        (colors.HexColor("#d0e0f0"), C_ANNOT,      "DASHED", "LED Screen (annotated)"),
        (C_TABLE_FILL,              C_TABLE_EDGE,  "SOLID",  "Banquet round table"),
        (C_CHAIR,                   C_CHAIR_EDGE,  "SOLID",  "Banquet chair"),
        (colors.HexColor("#f5e8d4"), C_ANNOT,      "DASHED", "Coffee station"),
        (colors.HexColor("#f0e8dc"), C_WALL,        "SOLID",  "Entry door"),
        (C_EXIT,                    C_EXIT,         "—",      "Fire exit"),
    ]
    ey = ly + lh - 32
    for (fc, ec, line_type, label) in items:
        c.setFillColor(fc)
        c.setStrokeColor(ec)
        if line_type == "DASHED":
            c.setDash([4, 4], 0)
        else:
            c.setDash([], 0)
        c.setLineWidth(0.8)
        c.rect(lx + 4, ey - 4, 10, 8, fill=1, stroke=1)

        # Line type badge
        c.setFont("Helvetica", 4.2)
        c.setFillColor(colors.HexColor("#888"))
        c.setDash([], 0)
        c.drawString(lx + 16, ey, line_type)

        c.setFont("Helvetica", 5.5)
        c.setFillColor(colors.HexColor("#222"))
        c.drawString(lx + 16, ey - 7, label)
        ey -= 16

    # CV note
    c.setFont("Helvetica-Oblique", 4.8)
    c.setFillColor(colors.HexColor("#667"))
    note = "Dashed outlines are NOT detected\nas walls by the CV pipeline."
    c.drawString(lx + 4, ey - 4, note.split("\n")[0])
    c.drawString(lx + 4, ey - 12, note.split("\n")[1])

    c.restoreState()


# ── Title block (below the room, outside room bounds) ─────────────────────

def draw_title(c):
    bx = MARGIN
    by = MARGIN
    bw = PAGE_W - 2 * MARGIN
    bh = TITLE_H - 2 * mm

    c.saveState()
    c.setFillColor(C_TITLE_BG)
    c.setStrokeColor(colors.HexColor("#1a2a3a"))
    c.setLineWidth(1.0)
    c.rect(bx, by, bw, bh, fill=1, stroke=1)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(bx + 6, by + bh - 10, "CONFERENCE HALL — FLOOR PLAN  (CV-Optimised)")

    c.setFont("Helvetica", 6.5)
    c.drawString(bx + 6, by + 3, "Venue Simulation Tool  |  22.00 × 16.00 m  |  Capacity 128 (16 tables × 8)  |  2026-06-02")

    cols = [
        ("ROOM", "22.0 × 16.0 m"),
        ("STAGE", "8.0 × 2.5 m  H=0.6 m"),
        ("SCREENS", "2 × LED  3.0 × 2.0 m"),
        ("TABLES", "16 × Ø1.8 m  8 chairs"),
        ("COFFEE", "SE corner"),
    ]
    col_x = bx + bw * 0.38
    col_step = (bw * 0.62) / len(cols)
    for i, (k, v) in enumerate(cols):
        xx = col_x + i * col_step
        c.setFont("Helvetica-Bold", 4.8)
        c.setFillColor(colors.HexColor("#aac8e8"))
        c.drawString(xx, by + bh - 7, k)
        c.setFont("Helvetica", 5.5)
        c.setFillColor(colors.white)
        c.drawString(xx, by + 3, v)

    c.restoreState()


# ── Page border ───────────────────────────────────────────────────────────

def draw_border(c):
    c.saveState()
    c.setStrokeColor(colors.HexColor("#2c3e50"))
    c.setLineWidth(2.0)
    c.rect(7, 7, PAGE_W - 14, PAGE_H - 14, fill=0, stroke=1)
    c.restoreState()


# ── Entrance labels ───────────────────────────────────────────────────────

def draw_entry_labels(c):
    c.saveState()
    c.setFont("Helvetica-Bold", 5.5)
    c.setFillColor(colors.HexColor("#224488"))
    for dx in [7.3, 13.3]:
        draw_door(c, dx, 0.0)
        c.drawCentredString(rx(dx + 0.7), ry(0) - 16, "ENTRANCE")
    draw_exits(c)
    c.restoreState()


# ── Main ─────────────────────────────────────────────────────────────────

def generate(output_path: str):
    c = pdf_canvas.Canvas(output_path, pagesize=landscape(A3))
    c.setTitle("Conference Hall Floor Plan (CV-Optimised)")
    c.setAuthor("Venue Simulation Tool")

    draw_border(c)
    draw_floor(c)
    draw_walls(c)
    draw_stage(c)
    draw_screens(c)
    draw_seating(c)
    draw_coffee(c)
    draw_entry_labels(c)
    draw_compass(c)
    draw_legend(c)
    draw_title(c)

    c.save()
    print(f"Saved → {output_path}")


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "conference_hall_floorplan.pdf")
    generate(out)
