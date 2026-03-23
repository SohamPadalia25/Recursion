"""
utils/helpers.py
Shared utilities for the video pipeline.
"""
import os
import re
import json
import time
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def get_output_dir(subdir: str = "") -> Path:
    base = Path(os.getenv("OUTPUT_DIR", "./outputs"))
    path = base / subdir if subdir else base
    path.mkdir(parents=True, exist_ok=True)
    return path


def sanitize_filename(name: str) -> str:
    """Remove unsafe characters from filenames."""
    return re.sub(r"[^\w\-_. ]", "_", name)[:80]


def parse_json_response(text: str) -> dict | list:
    """
    Extract JSON from LLM response, handling markdown fences.
    """
    # Strip markdown code fences
    text = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON block within the text
        match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if match:
            return json.loads(match.group(1))
        raise ValueError(f"Could not parse JSON from LLM response:\n{text[:500]}")


def timestamp() -> str:
    return str(int(time.time()))


def log(msg: str, icon: str = "▸"):
    print(f"  {icon}  {msg}")