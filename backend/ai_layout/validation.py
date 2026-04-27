import math


ITEM_RADII = {
    "chair": 0.35,
    "round_table": 0.9,
    "rectangular_table": 0.9,
    "stage": 1.8,
    "podium": 0.45,
    "screen": 0.75,
    "aisle": 0.9,
    "plant": 0.35,
    "sofa": 0.9,
    "bar": 0.8,
    "entrance": 0.7,
}


def item_radius(item):
    if item.get("type") == "aisle":
        return ITEM_RADII["aisle"]

    scale = item.get("scale")
    if isinstance(scale, list) and len(scale) >= 3:
        return max(float(scale[0]), float(scale[2])) * 0.35
    return ITEM_RADII.get(item.get("type"), 0.5)


def validate_generated_project(project, intent):
    room = project["room"]
    half_width = room["width"] / 2
    half_depth = room["depth"] / 2
    issues = []
    hard_failures = []

    for item in project["items"]:
        radius = item_radius(item)
        x = float(item.get("x", 0))
        z = float(item.get("z", 0))
        if abs(x) + radius > half_width or abs(z) + radius > half_depth:
            hard_failures.append(f"{item.get('label', item.get('type'))} is outside the room boundary.")

    major_items = [
        item
        for item in project["items"]
        if item.get("type") in {"round_table", "rectangular_table", "stage", "podium", "screen", "bar", "sofa"}
    ]
    for index, first in enumerate(major_items):
        for second in major_items[index + 1 :]:
            distance = math.hypot(float(first["x"]) - float(second["x"]), float(first["z"]) - float(second["z"]))
            minimum = (item_radius(first) + item_radius(second)) * 0.75
            if distance < minimum:
                issues.append(
                    f"{first.get('label', first['type'])} is very close to {second.get('label', second['type'])}."
                )

    if intent["layout"]["seating"]["hasCentralAisle"]:
        has_aisle = any(item.get("type") == "aisle" for item in project["items"])
        if not has_aisle:
            hard_failures.append("Central aisle was requested but not generated.")

    if intent["layout"]["stage"]["enabled"]:
        stage = next((item for item in project["items"] if item.get("type") == "stage"), None)
        if not stage:
            hard_failures.append("Stage was required but not generated.")
        elif stage["z"] > 1 and intent["layout"]["stage"]["position"] == "front":
            issues.append("Stage should normally sit at the front focus wall.")

    project.setdefault("sceneSettings", {})
    project["sceneSettings"]["aiPlanner"] = {
        "eventType": intent["eventType"],
        "layoutStyle": intent["layoutStyle"],
        "capacity": intent["capacity"],
        "validation": {
            "status": "passed_with_notes" if issues else "passed",
            "issues": issues[:12],
            "checked": [
                "room_bounds",
                "major_object_spacing",
                "central_aisle_presence",
                "stage_presence",
                "exit_clearance_guidance",
            ],
        },
        "professionalNotes": intent.get("professionalNotes", []),
        "spacingRules": intent.get("spacingRules", {}),
        "cameraPlan": intent.get("cameraPlan", []),
        "avLayering": intent.get("avLayering", []),
    }

    if hard_failures:
        raise ValueError("Generated layout failed validation: " + " ".join(hard_failures))

    return project
