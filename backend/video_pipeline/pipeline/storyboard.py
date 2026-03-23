"""
pipeline/storyboard.py
Step 4: Transform script into a structured storyboard with scenes.
Each scene has: narration text, visual description, image prompt, duration.
"""
import json
from utils.groq_client import chat
from utils.helpers import log, parse_json_response


def generate_storyboard(script: str, title: str, duration_minutes: int = 3) -> list[dict]:
    """
    Convert a narration script into a list of scene objects.
    
    Each scene dict:
    {
        "scene_number": int,
        "title": str,           # Short scene title
        "narration": str,       # Text to be spoken for this scene
        "visual_description": str,  # What should be shown visually
        "image_prompt": str,    # Detailed prompt for image generation
        "duration_seconds": int # Estimated duration based on word count
    }
    """
    log("Building storyboard from script...", "🎬")

    num_scenes = duration_minutes * 2  # ~2 scenes per minute

    prompt = f"""You are a professional video storyboard artist and director.

Convert the following narration script for "{title}" into exactly {num_scenes} structured scenes for a {duration_minutes}-minute video.

SCRIPT:
{script}

Return ONLY a valid JSON array of {num_scenes} scene objects. Each object must have:
{{
  "scene_number": 1,
  "title": "Short scene title (3-5 words)",
  "narration": "The exact portion of the script for this scene (spoken text)",
  "visual_description": "What the viewer sees: describe the visual style, content, mood, colors",
  "image_prompt": "Detailed image generation prompt. Include: subject, style, lighting, composition, mood, color palette. Make it photorealistic or illustrative as appropriate. Example: 'A glowing quantum computer in a dark lab, blue light, dramatic, ultra-detailed, 8K, cinematic'",
  "duration_seconds": 30
}}

Rules:
- Split the script evenly across {num_scenes} scenes
- Each narration chunk should be roughly equal in length
- Visual descriptions must be VIVID and specific — not generic
- Image prompts must be rich, detailed, 20–40 words, optimized for AI image generation
- Duration should reflect word count (~2 seconds per word)
- Make visuals complement and enhance the narration — don't just illustrate the words

Return ONLY the JSON array, no other text.
"""
    response = chat(
        prompt,
        system="You are a professional storyboard director. Return only valid JSON.",
        temperature=0.6,
        max_tokens=4096,
    )

    scenes = parse_json_response(response)

    # Ensure it's a list
    if isinstance(scenes, dict) and "scenes" in scenes:
        scenes = scenes["scenes"]

    # Recalculate durations based on actual word counts
    for scene in scenes:
        words = len(scene.get("narration", "").split())
        scene["duration_seconds"] = max(10, int(words / 2.2))  # ~2.2 words/sec
        scene["scene_number"] = scenes.index(scene) + 1

    total_seconds = sum(s["duration_seconds"] for s in scenes)
    log(f"Storyboard: {len(scenes)} scenes, ~{total_seconds // 60}m {total_seconds % 60}s total", "✓")
    return scenes