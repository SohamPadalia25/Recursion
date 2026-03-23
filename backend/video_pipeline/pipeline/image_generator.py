"""
pipeline/image_generator.py
Step 6: Generate scene images using Hugging Face Inference API (Free Tier).
Uses FLUX.1-schnell model for high-quality, realistic images.
Falls back to gradient placeholder images if generation fails.

🔑 SETUP: Get your free token at https://huggingface.co/settings/tokens
   - Select "Read" permissions only (safe for client-side use)
   - Set env var: HF_API_TOKEN=hf_xxx...
   - Or paste directly below (not recommended for production)
"""
import os
import time
import hashlib
import requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import io
from utils.helpers import get_output_dir, log

# ─────────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────────
VIDEO_WIDTH = 1280
VIDEO_HEIGHT = 720

# Hugging Face Configuration
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")  # Recommended: use env var
# Fallback: paste token here (⚠️ not secure for public repos)
# HF_API_TOKEN = "hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

HF_MODEL = "black-forest-labs/FLUX.1-schnell"  # Fast, high-quality, free tier compatible
# Hugging Face legacy endpoint was deprecated (HTTP 410). Router is the supported endpoint.
# Router supports the same Bearer token auth.
HF_API_URL = f"https://router.huggingface.co/hf-inference/models/{HF_MODEL}"
HF_HEADERS = {"Authorization": f"Bearer {HF_API_TOKEN}"} if HF_API_TOKEN else {}

# Retry settings for model cold-start (HF free tier)
MAX_RETRIES = 2
RETRY_DELAY = 20  # seconds


# ─────────────────────────────────────────────────────────────
# IMAGE GENERATION FUNCTIONS
# ─────────────────────────────────────────────────────────────
def generate_image_huggingface(
    prompt: str,
    output_path: str,
    width: int = VIDEO_WIDTH,
    height: int = VIDEO_HEIGHT,
    seed: int = None,
    negative_prompt: str = "blurry, low quality, distorted, watermark, text, signature",
) -> bool:
    """
    Generate image using Hugging Face Inference API (Free Tier).
    
    Args:
        prompt: Text description of the image
        output_path: Where to save the generated PNG
        width/height: Output dimensions
        seed: Random seed for reproducibility (optional)
        negative_prompt: What to avoid in the image
    
    Returns:
        bool: True if generation succeeded, False otherwise
    """
    if not HF_API_TOKEN:
        log("⚠️  HF_API_TOKEN not set - Hugging Face API requires authentication", "⚠")
        return False

    # Enhance prompt for better cinematic results
    enhanced_prompt = f"{prompt}, high quality, detailed, professional, cinematic, 8k, sharp focus"
    
    # Prepare payload for FLUX.1-schnell
    payload = {
        "inputs": enhanced_prompt,
        "parameters": {
            "width": width,
            "height": height,
            "num_inference_steps": 20,  # Balance speed/quality
            "guidance_scale": 3.5,       # Lower = more creative, higher = more prompt-following
        }
    }
    
    # Add seed for reproducibility if provided
    if seed is not None:
        payload["parameters"]["seed"] = seed
    
    # Add negative prompt if model supports it (FLUX does)
    if negative_prompt:
        payload["parameters"]["negative_prompt"] = negative_prompt

    for attempt in range(MAX_RETRIES + 1):
        try:
            response = requests.post(
                HF_API_URL,
                headers=HF_HEADERS,
                json=payload,
                timeout=90  # HF can be slow on cold start
            )
            
            # Handle model loading state (common on free tier)
            if response.status_code == 503:
                wait_time = response.json().get("estimated_time", RETRY_DELAY)
                log(f"  Model loading, waiting {wait_time:.1f}s... (attempt {attempt+1}/{MAX_RETRIES+1})", "⏳")
                time.sleep(min(wait_time, RETRY_DELAY))
                continue
            
            # Success: save the image
            if response.status_code == 200 and len(response.content) > 1000:
                # Verify it's actually an image
                try:
                    img = Image.open(io.BytesIO(response.content))
                    img.verify()  # Check it's a valid image
                    with open(output_path, "wb") as f:
                        f.write(response.content)
                    return True
                except Exception:
                    pass  # Content wasn't a valid image
            
            # Log error details for debugging
            if response.status_code != 200:
                try:
                    error_msg = response.json().get("error", "Unknown error")
                    log(f"  HF API error {response.status_code}: {error_msg}", "⚠")
                except:
                    log(f"  HF API error {response.status_code}", "⚠")
                    
        except requests.exceptions.Timeout:
            log(f"  Request timed out (attempt {attempt+1})", "⚠")
        except requests.exceptions.ConnectionError:
            log(f"  Connection error (attempt {attempt+1})", "⚠")
        except Exception as e:
            log(f"  Unexpected error: {e}", "⚠")
    
    return False


def create_placeholder_image(
    scene: dict,
    output_path: str,
    width: int = VIDEO_WIDTH,
    height: int = VIDEO_HEIGHT,
) -> str:
    """
    Create a visually appealing gradient placeholder image if generation fails.
    """
    import colorsys

    scene_num = scene.get("scene_number", 1)
    title = scene.get("title", "")
    description = scene.get("visual_description", "")

    # Generate unique color based on scene number
    hue = (scene_num * 0.15) % 1.0
    r1, g1, b1 = [int(c * 255) for c in colorsys.hsv_to_rgb(hue, 0.7, 0.3)]
    r2, g2, b2 = [int(c * 255) for c in colorsys.hsv_to_rgb((hue + 0.5) % 1.0, 0.5, 0.6)]

    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)

    # Gradient background
    for y in range(height):
        ratio = y / height
        r = int(r1 + (r2 - r1) * ratio)
        g = int(g1 + (g2 - g1) * ratio)
        b = int(b1 + (b2 - b1) * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Add scene info text
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
    except Exception:
        font_large = ImageFont.load_default()
        font_small = font_large

    # Scene number
    draw.text((60, 60), f"Scene {scene_num}", fill=(255, 255, 255, 200), font=font_large)

    # Title
    draw.text((60, 130), title, fill=(255, 255, 200), font=font_large)

    # Description (wrapped)
    words = description.split()
    lines, line = [], []
    for word in words:
        line.append(word)
        if len(" ".join(line)) > 55:
            lines.append(" ".join(line[:-1]))
            line = [word]
    if line:
        lines.append(" ".join(line))

    for i, text_line in enumerate(lines[:4]):
        draw.text((60, 220 + i * 35), text_line, fill=(200, 220, 255), font=font_small)

    img.save(output_path, "PNG")
    return output_path


def generate_all_images(scenes: list[dict], use_ai: bool = True) -> list[dict]:
    """
    Generate images for all scenes using Hugging Face API.
    Adds 'image_path' key to each scene dict.
    
    Args:
        scenes: List of scene dictionaries with 'scene_number', 'title', etc.
        use_ai: If False, skip AI generation and use placeholders only
    
    Returns:
        Updated scenes list with 'image_path' added to each
    """
    log(f"Generating images for {len(scenes)} scenes via Hugging Face ({HF_MODEL})...", "🖼️")
    
    if use_ai and not HF_API_TOKEN:
        log("⚠️  HF_API_TOKEN not set - falling back to placeholder images", "⚠")
        use_ai = False
    
    image_dir = get_output_dir("images")
    image_dir.mkdir(parents=True, exist_ok=True)

    from concurrent.futures import ThreadPoolExecutor, as_completed

    def generate_single_image(scene):
        """Generate image for a single scene."""
        scene_num = scene["scene_number"]
        image_path = str(image_dir / f"scene_{scene_num:03d}.png")
        prompt = scene.get("image_prompt", scene.get("visual_description", "abstract background"))

        success = False

        if use_ai:
            # Generate deterministic seed from prompt for reproducibility
            seed = int(hashlib.md5(prompt.encode()).hexdigest(), 16) % 99999
            success = generate_image_huggingface(prompt, image_path, seed=seed)

        if not success:
            log(f"  Scene {scene_num:02d}: AI failed, creating placeholder", "⚠")
            create_placeholder_image(scene, image_path)

        scene["image_path"] = image_path
        return scene_num, success

    # Use ThreadPoolExecutor for parallel image generation
    # HF free tier: limit to 2-3 concurrent requests to avoid rate limiting
    max_workers = min(2, len(scenes))
    results = {}

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_scene = {executor.submit(generate_single_image, scene): scene for scene in scenes}

        for future in as_completed(future_to_scene):
            scene = future_to_scene[future]
            scene_num = scene["scene_number"]
            try:
                num, success = future.result()
                status = "✓ AI image generated" if success else "✓ Placeholder created"
                log(f"  Scene {num:02d}: {status}", "✓")
                results[scene_num] = success
            except Exception as e:
                log(f"  Scene {scene_num:02d}: Failed - {e}", "✗")
                # Create placeholder as fallback
                image_path = str(image_dir / f"scene_{scene_num:03d}.png")
                create_placeholder_image(scene, image_path)
                scene["image_path"] = image_path
                results[scene_num] = False

    # Summary
    success_count = sum(1 for v in results.values() if v)
    log(f"✅ Image generation complete: {success_count}/{len(scenes)} AI images", "🎉")
    
    return scenes


# ─────────────────────────────────────────────────────────────
# ALTERNATIVE MODELS (uncomment to switch)
# ─────────────────────────────────────────────────────────────
# High quality, slower:
# HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"

# Fast, good quality:
# HF_MODEL = "black-forest-labs/FLUX.1-dev"  # May require pro tier

# Anime style:
# HF_MODEL = "prompthero/openjourney-v4"

# Photorealistic:
# HF_MODEL = "Lykon/dreamshaper-8"