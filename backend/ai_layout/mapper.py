import math
from datetime import datetime, timezone
from uuid import uuid4


def iso_now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def create_item(item_type, x, z, label, rotation_y=0, scale=None, asset_url=None):
    default_visuals = {
        "chair": {"assetUrl": "/models/chair.glb", "scale": [0.7, 0.7, 0.7]},
        "podium": {"assetUrl": "/models/podium.glb", "scale": [0.1, 0.1, 0.1]},
        "screen": {"assetUrl": "/models/screen.glb", "scale": [1, 1, 1]},
        "round_table": {"assetUrl": "primitive://round_table", "scale": [1.6, 0.75, 1.6]},
        "rectangular_table": {"assetUrl": "primitive://rectangular_table", "scale": [1.8, 0.75, 0.8]},
        "stage": {"assetUrl": "primitive://stage", "scale": [5, 0.45, 3]},
        "aisle": {"assetUrl": "primitive://aisle", "scale": [1.8, 0.02, 7]},
        "plant": {"assetUrl": "primitive://plant", "scale": [0.6, 1.2, 0.6]},
    }
    visual = default_visuals[item_type]

    return {
        "id": str(uuid4()),
        "type": item_type,
        "x": x,
        "y": 0,
        "z": z,
        "rotationY": rotation_y,
        "scale": scale or visual["scale"],
        "assetUrl": asset_url or visual["assetUrl"],
        "label": label,
    }


def add_stage_cluster(items, intent):
    if not intent["layout"]["stage"]["enabled"]:
        return

    stage_z = 0 if intent["layout"]["stage"]["position"] == "center" else -intent["room"]["depth"] / 2 + 2.4
    items.append(create_item("stage", 0, stage_z, "Stage"))

    if intent["layout"]["podium"]["enabled"]:
        items.append(create_item("podium", 0, stage_z + 0.8, "Podium"))

    if intent["layout"]["screen"]["enabled"]:
        items.append(create_item("screen", 0, stage_z - 0.8, "Screen"))


def add_plants(items, intent):
    if not intent["layout"]["decor"]["plants"]:
        return

    x = intent["room"]["width"] / 2 - 1
    z = intent["room"]["depth"] / 2 - 1
    items.extend(
        [
            create_item("plant", -x, -z, "Plant 1"),
            create_item("plant", x, -z, "Plant 2"),
            create_item("plant", -x, z, "Plant 3"),
            create_item("plant", x, z, "Plant 4"),
        ]
    )


def add_row_seating(items, intent):
    rows = intent["layout"]["seating"]["rows"] or max(4, -(-intent["capacity"] // 8))
    columns = intent["layout"]["seating"]["columns"] or 8
    spacing_x = 0.95
    spacing_z = 1.15
    half_columns = columns // 2
    has_aisle = intent["layout"]["seating"]["hasCentralAisle"]
    aisle_width = 1.8 if has_aisle else 0
    front_offset = 5.8 if intent["layout"]["stage"]["enabled"] else 3.5
    start_z = -intent["room"]["depth"] / 2 + front_offset
    total_width = columns * spacing_x + aisle_width - spacing_x
    start_x = -total_width / 2

    for row in range(rows):
        for col in range(columns):
            x = start_x + col * spacing_x
            if has_aisle and col >= half_columns:
                x += aisle_width

            z = start_z + row * spacing_z
            items.append(create_item("chair", x, z, f"Chair {row + 1}-{col + 1}"))

    if has_aisle:
        items.append(
            create_item(
                "aisle",
                0,
                start_z + ((rows - 1) * spacing_z) / 2,
                "Central Aisle",
                scale=[1.8, 0.02, max(4, rows * spacing_z)],
            )
        )


def add_round_tables(items, intent):
    seats_per_table = intent["layout"]["seating"]["seatsPerTable"] or 8
    table_count = intent["layout"]["seating"]["tableCount"] or max(
        1, -(-intent["capacity"] // seats_per_table)
    )
    columns = max(2, math.ceil(table_count**0.5))
    spacing_x = 4.2
    spacing_z = 4.2
    total_width = (columns - 1) * spacing_x
    start_x = -total_width / 2
    start_z = -1 if intent["layout"]["stage"]["enabled"] else -intent["room"]["depth"] / 2 + 4.2

    for index in range(table_count):
        row = index // columns
        col = index % columns
        table_x = start_x + col * spacing_x
        table_z = start_z + row * spacing_z

        items.append(create_item("round_table", table_x, table_z, f"Table {index + 1}"))
        radius = 1.3

        for seat in range(seats_per_table):
            angle = (6.283185307179586 * seat) / seats_per_table
            items.append(
                create_item(
                    "chair",
                    table_x + math.cos(angle) * radius,
                    table_z + math.sin(angle) * radius,
                    f"Table {index + 1} Seat {seat + 1}",
                    rotation_y=-angle + 1.5707963267948966,
                )
            )


def add_mixed_seating(items, intent):
    table_intent = {
        **intent,
        "layout": {
            **intent["layout"],
            "seating": {
                **intent["layout"]["seating"],
                "type": "round_tables",
                "tableCount": intent["layout"]["seating"]["tableCount"]
                or max(2, -(-int(intent["capacity"] * 0.4) // (intent["layout"]["seating"]["seatsPerTable"] or 8))),
                "seatsPerTable": intent["layout"]["seating"]["seatsPerTable"] or 8,
            },
        },
    }
    add_round_tables(items, table_intent)

    rows = intent["layout"]["seating"]["rows"] or max(4, -(-int(intent["capacity"] * 0.6) // 8))
    columns = intent["layout"]["seating"]["columns"] or 8
    spacing_x = 0.95
    spacing_z = 1.15
    has_aisle = intent["layout"]["seating"]["hasCentralAisle"]
    aisle_width = 1.8 if has_aisle else 0
    half_columns = columns // 2
    start_x = -(columns * spacing_x + aisle_width - spacing_x) / 2
    start_z = intent["room"]["depth"] / 2 - rows * spacing_z - 2.5

    for row in range(rows):
        for col in range(columns):
            x = start_x + col * spacing_x
            if has_aisle and col >= half_columns:
                x += aisle_width
            items.append(create_item("chair", x, start_z + row * spacing_z, f"Rear Chair {row + 1}-{col + 1}"))

    if has_aisle:
        items.append(
            create_item(
                "aisle",
                0,
                start_z + ((rows - 1) * spacing_z) / 2,
                "Central Aisle",
                scale=[1.8, 0.02, max(4, rows * spacing_z)],
            )
        )


def build_seating(items, intent):
    seating_type = intent["layout"]["seating"]["type"]
    if seating_type == "round_tables":
        add_round_tables(items, intent)
    elif seating_type == "mixed":
        add_mixed_seating(items, intent)
    else:
        add_row_seating(items, intent)


def prompt_scene_plan_to_project(intent):
    items = []

    add_stage_cluster(items, intent)
    build_seating(items, intent)
    add_plants(items, intent)

    event_type = intent["eventType"]
    return {
        "id": str(uuid4()),
        "name": f"{event_type[0].upper()}{event_type[1:]} Layout",
        "createdAt": iso_now(),
        "updatedAt": iso_now(),
        "room": {
            "width": intent["room"]["width"],
            "depth": intent["room"]["depth"],
            "height": intent["room"]["height"],
        },
        "items": items,
    }
