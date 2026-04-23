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
        "sofa": {"assetUrl": "primitive://sofa", "scale": [1.8, 0.8, 0.8]},
        "bar": {"assetUrl": "primitive://bar", "scale": [1.5, 1.0, 0.7]},
        "entrance": {"assetUrl": "primitive://entrance", "scale": [2.0, 2.4, 0.4]},
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


def add_central_aisle(items, center_z, depth):
    items.append(
        create_item(
            "aisle",
            0,
            center_z,
            "Central Aisle",
            scale=[1.8, 0.02, max(4, depth)],
        )
    )


def add_theatre_rows(items, intent, columns=8, front_offset=5.8, label_prefix="Chair"):
    rows = intent["layout"]["seating"]["rows"] or max(4, math.ceil(intent["capacity"] / columns))
    spacing_x = 0.95
    spacing_z = 1.15
    has_aisle = intent["layout"]["seating"]["hasCentralAisle"]
    aisle_width = 1.8 if has_aisle else 0
    half_columns = columns // 2
    start_z = -intent["room"]["depth"] / 2 + front_offset
    total_width = columns * spacing_x + aisle_width - spacing_x
    start_x = -total_width / 2

    for row in range(rows):
        for col in range(columns):
            x = start_x + col * spacing_x
            if has_aisle and col >= half_columns:
                x += aisle_width
            z = start_z + row * spacing_z
            items.append(create_item("chair", x, z, f"{label_prefix} {row + 1}-{col + 1}"))

    if has_aisle:
        add_central_aisle(items, start_z + ((rows - 1) * spacing_z) / 2, rows * spacing_z)


def add_round_tables(items, intent, cabaret=False, standing=False):
    seats_per_table = intent["layout"]["seating"]["seatsPerTable"]
    seats_per_table = 0 if standing else (seats_per_table or 8)
    table_count = intent["layout"]["seating"]["tableCount"] or max(
        1,
        math.ceil(intent["capacity"] / max(1, seats_per_table or 10)),
    )
    columns = max(2, math.ceil(table_count**0.5))
    spacing_x = 4.2
    spacing_z = 4.2
    total_width = (columns - 1) * spacing_x
    start_x = -total_width / 2
    start_z = -1 if intent["layout"]["stage"]["enabled"] else -intent["room"]["depth"] / 2 + 4.5
    front_focus_z = -intent["room"]["depth"] / 2

    for index in range(table_count):
        row = index // columns
        col = index % columns
        table_x = start_x + col * spacing_x
        table_z = start_z + row * spacing_z
        table_scale = [1.2, 1.1, 1.2] if standing else None
        table_type = "bar" if standing else "round_table"

        items.append(create_item(table_type, table_x, table_z, f"Table {index + 1}", scale=table_scale))

        if standing or seats_per_table <= 0:
            continue

        radius = 1.35
        for seat in range(seats_per_table):
            angle = (math.pi * 2 * seat) / seats_per_table
            chair_x = table_x + math.cos(angle) * radius
            chair_z = table_z + math.sin(angle) * radius
            rotation_y = -angle + math.pi / 2

            if cabaret:
                rotation_y = math.atan2(front_focus_z - chair_z, 0 - chair_x)

            items.append(
                create_item(
                    "chair",
                    chair_x,
                    chair_z,
                    f"Table {index + 1} Seat {seat + 1}",
                    rotation_y=rotation_y,
                )
            )


def add_classroom(items, intent):
    rows = max(4, math.ceil(intent["capacity"] / 6))
    table_columns = 3
    spacing_x = 3.2
    spacing_z = 2.3
    start_x = -((table_columns - 1) * spacing_x) / 2
    start_z = -intent["room"]["depth"] / 2 + 6
    seat_counter = 1

    for row in range(rows):
        for col in range(table_columns):
            table_x = start_x + col * spacing_x
            table_z = start_z + row * spacing_z
            items.append(create_item("rectangular_table", table_x, table_z, f"Classroom Table {row + 1}-{col + 1}"))
            for offset_index, seat_offset in enumerate([-0.45, 0.45]):
                if seat_counter > intent["capacity"]:
                    break
                items.append(
                    create_item(
                        "chair",
                        table_x + seat_offset,
                        table_z + 0.95,
                        f"Seat {seat_counter}",
                        rotation_y=math.pi,
                    )
                )
                seat_counter += 1

    add_central_aisle(items, start_z + ((rows - 1) * spacing_z) / 2, rows * spacing_z)


def add_boardroom(items, intent):
    seat_count = min(max(8, intent["capacity"]), 28)
    table_length = max(5, min(12, seat_count * 0.4))
    items.append(
        create_item(
            "rectangular_table",
            0,
            0,
            "Boardroom Table",
            scale=[table_length, 0.75, 1.4],
        )
    )

    side_per = max(2, seat_count // 2)
    spacing = table_length / max(3, side_per)
    start_x = -((side_per - 1) * spacing) / 2
    index = 1

    for side_z, rotation in [(-1.3, 0), (1.3, math.pi)]:
        for i in range(side_per):
            if index > seat_count:
                break
            items.append(
                create_item(
                    "chair",
                    start_x + i * spacing,
                    side_z,
                    f"Chair {index}",
                    rotation_y=rotation,
                )
            )
            index += 1


def add_u_shape(items, intent):
    width = min(10, intent["room"]["width"] - 6)
    depth = min(8, intent["room"]["depth"] - 10)
    side_depth = depth / 2
    items.extend(
        [
            create_item("rectangular_table", 0, -side_depth, "Front Table", scale=[width / 2, 0.75, 0.8]),
            create_item("rectangular_table", -width / 2 + 0.8, 0, "Left Table", rotation_y=math.pi / 2, scale=[side_depth, 0.75, 0.8]),
            create_item("rectangular_table", width / 2 - 0.8, 0, "Right Table", rotation_y=math.pi / 2, scale=[side_depth, 0.75, 0.8]),
        ]
    )

    chair_positions = []
    for x in [-width / 2 + 1.6 + i * 1.1 for i in range(max(2, int(width // 1.2)))]:
        chair_positions.append((x, -side_depth + 1.0, math.pi))
    for z in [-side_depth + 2.0 + i * 1.1 for i in range(max(2, int(depth // 1.4)))]:
        chair_positions.append((-width / 2 + 2.0, z, math.pi / 2))
        chair_positions.append((width / 2 - 2.0, z, -math.pi / 2))

    for index, (x, z, rotation) in enumerate(chair_positions[: intent["capacity"]], start=1):
        items.append(create_item("chair", x, z, f"Chair {index}", rotation_y=rotation))


def add_hollow_square(items, intent):
    side = min(10, min(intent["room"]["width"], intent["room"]["depth"]) - 6)
    half = side / 2
    items.extend(
        [
            create_item("rectangular_table", 0, -half, "Top Table", scale=[side / 2, 0.75, 0.8]),
            create_item("rectangular_table", 0, half, "Bottom Table", scale=[side / 2, 0.75, 0.8]),
            create_item("rectangular_table", -half, 0, "Left Table", rotation_y=math.pi / 2, scale=[side / 2, 0.75, 0.8]),
            create_item("rectangular_table", half, 0, "Right Table", rotation_y=math.pi / 2, scale=[side / 2, 0.75, 0.8]),
        ]
    )

    seats_per_side = max(2, min(6, intent["capacity"] // 4 or 2))
    spacing = (side - 2) / max(1, seats_per_side - 1)
    positions = []
    for i in range(seats_per_side):
        offset = -((seats_per_side - 1) * spacing) / 2 + i * spacing
        positions.extend(
            [
                (offset, -half + 1.0, math.pi),
                (offset, half - 1.0, 0),
                (-half + 1.0, offset, math.pi / 2),
                (half - 1.0, offset, -math.pi / 2),
            ]
        )

    for index, (x, z, rotation) in enumerate(positions[: intent["capacity"]], start=1):
        items.append(create_item("chair", x, z, f"Chair {index}", rotation_y=rotation))


def add_pods(items, intent):
    cluster_count = max(2, math.ceil(intent["capacity"] / 8))
    columns = max(2, math.ceil(cluster_count**0.5))
    spacing_x = 5.4
    spacing_z = 5.4
    start_x = -((columns - 1) * spacing_x) / 2
    start_z = -intent["room"]["depth"] / 2 + 6
    seat_index = 1

    for cluster in range(cluster_count):
        row = cluster // columns
        col = cluster % columns
        x = start_x + col * spacing_x
        z = start_z + row * spacing_z
        items.append(create_item("rectangular_table", x, z, f"Cluster Table {cluster + 1}", scale=[2.2, 0.75, 1.4]))

        for seat_x, seat_z, rotation in [
            (x - 0.9, z, math.pi / 2),
            (x + 0.9, z, -math.pi / 2),
            (x, z - 0.95, 0),
            (x, z + 0.95, math.pi),
        ]:
            if seat_index > intent["capacity"]:
                break
            items.append(create_item("chair", seat_x, seat_z, f"Seat {seat_index}", rotation_y=rotation))
            seat_index += 1


def add_cocktail(items, intent):
    add_round_tables(items, intent, standing=True)


def add_auditorium(items, intent):
    add_theatre_rows(items, intent, columns=10, front_offset=6.5, label_prefix="Auditorium Seat")


def add_exhibition(items, intent):
    booth_count = max(4, math.ceil(intent["capacity"] / 10))
    columns = max(2, math.ceil(booth_count**0.5))
    spacing_x = 5.5
    spacing_z = 5.5
    start_x = -((columns - 1) * spacing_x) / 2
    start_z = -intent["room"]["depth"] / 2 + 7

    items.append(create_item("entrance", 0, intent["room"]["depth"] / 2 - 1.2, "Entrance"))

    for booth in range(booth_count):
        row = booth // columns
        col = booth % columns
        x = start_x + col * spacing_x
        z = start_z + row * spacing_z
        items.append(create_item("rectangular_table", x, z, f"Booth {booth + 1}", scale=[2.4, 0.9, 1.0]))
        items.append(create_item("bar", x, z - 1.2, f"Booth Counter {booth + 1}", scale=[1.4, 1.0, 0.6]))


def add_lounge(items, intent):
    sofa_sets = max(2, math.ceil(intent["capacity"] / 10))
    columns = max(2, math.ceil(sofa_sets**0.5))
    spacing_x = 5.6
    spacing_z = 5.2
    start_x = -((columns - 1) * spacing_x) / 2
    start_z = -intent["room"]["depth"] / 2 + 6

    for index in range(sofa_sets):
        row = index // columns
        col = index % columns
        x = start_x + col * spacing_x
        z = start_z + row * spacing_z
        items.extend(
            [
                create_item("sofa", x - 1.2, z, f"Sofa {index + 1}-A", rotation_y=math.pi / 2),
                create_item("sofa", x + 1.2, z, f"Sofa {index + 1}-B", rotation_y=-math.pi / 2),
                create_item("round_table", x, z, f"Coffee Table {index + 1}", scale=[0.9, 0.45, 0.9]),
            ]
        )


def build_layout(items, intent):
    layout_style = intent["layoutStyle"]
    if layout_style == "banquet_round_table":
        add_round_tables(items, intent)
    elif layout_style == "theatre":
        add_theatre_rows(items, intent)
    elif layout_style == "classroom":
        add_classroom(items, intent)
    elif layout_style == "boardroom":
        add_boardroom(items, intent)
    elif layout_style == "u_shape":
        add_u_shape(items, intent)
    elif layout_style == "hollow_square":
        add_hollow_square(items, intent)
    elif layout_style == "cocktail_reception":
        add_cocktail(items, intent)
    elif layout_style == "cabaret":
        add_round_tables(items, intent, cabaret=True)
    elif layout_style == "pods":
        add_pods(items, intent)
    elif layout_style == "auditorium":
        add_auditorium(items, intent)
    elif layout_style == "exhibition_booth":
        add_exhibition(items, intent)
    elif layout_style == "lounge":
        add_lounge(items, intent)
    else:
        add_theatre_rows(items, intent)


def prompt_scene_plan_to_project(intent):
    items = []

    add_stage_cluster(items, intent)
    build_layout(items, intent)
    add_plants(items, intent)

    event_type = intent["eventType"]
    layout_style = intent["layoutStyle"].replace("_", " ")
    return {
        "id": str(uuid4()),
        "name": f"{event_type[0].upper()}{event_type[1:]} {layout_style.title()} Layout",
        "createdAt": iso_now(),
        "updatedAt": iso_now(),
        "room": {
            "width": intent["room"]["width"],
            "depth": intent["room"]["depth"],
            "height": intent["room"]["height"],
        },
        "items": items,
    }
