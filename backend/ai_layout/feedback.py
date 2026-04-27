import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from django.conf import settings
except ModuleNotFoundError:
    settings = None


BASE_DIR = (
    Path(settings.BASE_DIR)
    if settings is not None and getattr(settings, "configured", False)
    else Path(__file__).resolve().parents[1]
)
FEEDBACK_PATH = BASE_DIR / ".cache" / "ai_layout_feedback.jsonl"


def store_layout_feedback(prompt: str, correction: str, context: dict[str, Any] | None = None):
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    entry = {
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "prompt": prompt.strip(),
        "correction": correction.strip(),
        "context": context or {},
    }
    with FEEDBACK_PATH.open("a", encoding="utf-8") as file:
        file.write(json.dumps(entry, ensure_ascii=True) + "\n")
    return entry


def recent_layout_feedback(limit: int = 5):
    if not FEEDBACK_PATH.exists():
        return []

    lines = FEEDBACK_PATH.read_text(encoding="utf-8").splitlines()
    entries = []
    for line in lines[-limit:]:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(entry, dict) and entry.get("correction"):
            entries.append(entry)
    return entries


def build_feedback_prompt_context(limit: int = 5):
    entries = recent_layout_feedback(limit)
    if not entries:
        return "No planner correction history yet."

    return "\n".join(
        f"- Prompt: {entry.get('prompt', '')[:120]} | Correction: {entry.get('correction', '')[:160]}"
        for entry in entries
    )
