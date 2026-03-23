"""
pipeline/video_assembler.py
Step 7: Assemble audio + images → final MP4 video using MoviePy.
Adds Ken Burns effect (slow zoom/pan) for dynamic visuals.
Overlays scene title text on each scene.

Compatible with both MoviePy v1.x and v2.x.
"""
import os
from pathlib import Path
import numpy as np
from utils.helpers import get_output_dir, log, timestamp, sanitize_filename

VIDEO_W = 1280
VIDEO_H = 720
FPS = 24


def _import_moviepy():
    """Import MoviePy and detect version, returning a dict of classes/functions."""
    try:
        # Try v2.x imports first
        from moviepy import (
            ImageClip, AudioFileClip, ColorClip,
            CompositeVideoClip, concatenate_videoclips,
        )
        # v2.x uses with_duration / with_position / with_audio
        return {
            "ImageClip": ImageClip,
            "AudioFileClip": AudioFileClip,
            "ColorClip": ColorClip,
            "CompositeVideoClip": CompositeVideoClip,
            "concatenate_videoclips": concatenate_videoclips,
            "version": 2,
        }
    except ImportError:
        # Fall back to v1.x
        from moviepy.editor import (
            ImageClip, AudioFileClip, ColorClip,
            CompositeVideoClip, concatenate_videoclips,
        )
        return {
            "ImageClip": ImageClip,
            "AudioFileClip": AudioFileClip,
            "ColorClip": ColorClip,
            "CompositeVideoClip": CompositeVideoClip,
            "concatenate_videoclips": concatenate_videoclips,
            "version": 1,
        }


def _set_duration(clip, duration, mp):
    """Set duration — v1 uses set_duration, v2 uses with_duration."""
    if mp["version"] == 2:
        return clip.with_duration(duration)
    return clip.set_duration(duration)


def _set_position(clip, pos, mp):
    """Set position — v1 uses set_position, v2 uses with_position."""
    if mp["version"] == 2:
        return clip.with_position(pos)
    return clip.set_position(pos)


def _set_audio(clip, audio, mp):
    """Set audio — v1 uses set_audio, v2 uses with_audio."""
    if mp["version"] == 2:
        return clip.with_audio(audio)
    return clip.set_audio(audio)


def make_scene_clip(scene: dict, fade_duration: float = 0.5) -> "CompositeVideoClip":
    """
    Create a video clip for a single scene:
    - Background: image with slow Ken Burns zoom
    - Audio: narration
    - Text overlay: scene title (PIL-based, no ImageMagick needed)
    """
    mp = _import_moviepy()
    ImageClip = mp["ImageClip"]
    AudioFileClip = mp["AudioFileClip"]
    ColorClip = mp["ColorClip"]
    CompositeVideoClip = mp["CompositeVideoClip"]

    audio_path = scene.get("audio_path")
    image_path = scene.get("image_path")
    scene_title = scene.get("title", f"Scene {scene['scene_number']}")
    duration = float(scene.get("duration_seconds", 10))

    audio_clip = None
    try:
        # --- Audio ---
        if audio_path and os.path.exists(audio_path):
            audio_clip = AudioFileClip(audio_path)
            duration = float(audio_clip.duration)

        # --- Background Image with Ken Burns zoom ---
        # IMPORTANT: do NOT precompute/store frames in RAM (can easily be hundreds of MB per scene).
        # Instead, generate frames on-demand with PIL; slower but stable on low-memory machines.
        if image_path and os.path.exists(image_path):
            from PIL import Image as PILImage
            from moviepy.video.VideoClip import VideoClip

            pil_base = PILImage.open(image_path).convert("RGB")

            def make_frame_kb(t):
                scale = 1.0 + 0.08 * (float(t) / max(duration, 1e-6))
                new_w = int(VIDEO_W * scale)
                new_h = int(VIDEO_H * scale)

                frame_img = pil_base.resize((new_w, new_h), PILImage.LANCZOS)
                x0 = max(0, (new_w - VIDEO_W) // 2)
                y0 = max(0, (new_h - VIDEO_H) // 2)
                frame_img = frame_img.crop((x0, y0, x0 + VIDEO_W, y0 + VIDEO_H))
                return np.asarray(frame_img, dtype=np.uint8)

            bg_clip = VideoClip(make_frame_kb, duration=duration)
        else:
            bg_clip = _set_duration(
                ColorClip(size=(VIDEO_W, VIDEO_H), color=[20, 20, 40]), duration, mp
            )

        # --- Title text overlay using PIL (no ImageMagick needed) ---
        try:
            title_overlay = _make_title_overlay(scene_title, scene["scene_number"], duration)
            title_clip_obj = ImageClip(title_overlay)
            title_clip_obj = _set_duration(title_clip_obj, duration, mp)
            title_clip_obj = _set_position(title_clip_obj, ("center", 20), mp)
            layers = [bg_clip, title_clip_obj]
        except Exception as e:
            log(f"  Title overlay skipped: {e}", "⚠")
            layers = [bg_clip]

        # --- Compose ---
        composite = CompositeVideoClip(layers, size=(VIDEO_W, VIDEO_H))

        # Fade in/out
        try:
            if mp["version"] == 2:
                from moviepy.video.fx import FadeIn, FadeOut

                composite = composite.with_effects([FadeIn(fade_duration), FadeOut(fade_duration)])
            else:
                composite = composite.fadein(fade_duration).fadeout(fade_duration)
        except Exception:
            pass  # Fades are cosmetic — skip if unavailable

        # Attach audio
        if audio_clip is not None:
            composite = _set_audio(composite, audio_clip, mp)

        return composite
    except Exception:
        # If we fail mid-construction, close the audio reader to avoid noisy __del__ errors.
        try:
            if audio_clip is not None:
                audio_clip.close()
        except Exception:
            pass
        raise


def _make_title_overlay(title: str, scene_num: int, duration: float) -> np.ndarray:
    """
    Render a semi-transparent title bar as a numpy RGBA image using PIL only.
    No ImageMagick dependency.
    """
    from PIL import Image as PILImage, ImageDraw, ImageFont

    # Transparent canvas
    img = PILImage.new("RGBA", (VIDEO_W, 90), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Semi-transparent dark bar
    draw.rectangle([(0, 0), (VIDEO_W, 90)], fill=(0, 0, 0, 140))

    # Try to load a decent font; fall back to default
    font_title = None
    font_num = None
    for font_path in [
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]:
        if os.path.exists(font_path):
            try:
                font_title = ImageFont.truetype(font_path, 34)
                font_num = ImageFont.truetype(font_path, 22)
                break
            except Exception:
                continue
    if font_title is None:
        font_title = ImageFont.load_default()
        font_num = font_title

    # Scene number badge
    badge_text = f"  {scene_num:02d}  "
    draw.rectangle([(20, 20), (80, 65)], fill=(255, 255, 255, 50))
    draw.text((28, 26), badge_text, fill=(200, 200, 255, 255), font=font_num)

    # Title text
    draw.text((100, 22), title, fill=(255, 255, 255, 240), font=font_title)

    return np.array(img)


def assemble_video(
    scenes: list[dict],
    title: str,
    output_filename: str = None,
) -> str:
    """
    Assemble all scene clips into the final MP4.
    Returns path to final video.
    """
    mp = _import_moviepy()
    ColorClip = mp["ColorClip"]
    concatenate_videoclips = mp["concatenate_videoclips"]

    log(f"Assembling {len(scenes)} scenes into final video... (MoviePy v{mp['version']})", "🎞️")
    video_dir = get_output_dir("videos")

    if not output_filename:
        safe_title = sanitize_filename(title)
        output_filename = f"{safe_title}_{timestamp()}.mp4"

    output_path = str(video_dir / output_filename)

    # Build clips with low concurrency to keep memory usage stable.
    from concurrent.futures import ThreadPoolExecutor, as_completed
    clips = []
    max_workers = 1

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_scene = {executor.submit(make_scene_clip, scene): scene for scene in scenes}
        completed_clips = {}

        for future in as_completed(future_to_scene):
            scene = future_to_scene[future]
            scene_num = scene["scene_number"]
            try:
                clip = future.result()
                completed_clips[scene_num] = clip
                log(f"  Scene {scene_num:02d}: ✓ Rendered", "✓")
            except Exception as e:
                log(f"  Scene {scene_num:02d}: Failed - {e}", "✗")
                duration = float(scene.get("duration_seconds", 5))
                fallback = _set_duration(
                    ColorClip(size=(VIDEO_W, VIDEO_H), color=[10, 10, 30]), duration, mp
                )
                completed_clips[scene_num] = fallback

    # Sort clips by scene number
    clips = [completed_clips[i] for i in sorted(completed_clips.keys())]

    # Clear memory
    del completed_clips

    if not clips:
        raise RuntimeError("No clips were generated — cannot assemble video.")

    final = None
    try:
        # Concatenate
        log("Concatenating clips...", "⟳")
        final = concatenate_videoclips(clips, method="compose")

        # Write video
        log(f"Encoding video → {output_path}", "💾")

        write_kwargs = dict(
            fps=FPS,
            codec="libx264",
            audio_codec="aac",
            remove_temp=True,
            threads=8,
            preset="fast",
            bitrate="6000k",
        )
        # v1 accepts logger=None; v2 uses logger parameter differently
        try:
            final.write_videofile(output_path, logger=None, **write_kwargs)
        except TypeError:
            final.write_videofile(output_path, **write_kwargs)

        total_duration = final.duration
        log(
            f"Video saved: {output_path} ({total_duration:.1f}s / {total_duration / 60:.1f} min)",
            "🎉",
        )
        return output_path
    finally:
        # Always release ffmpeg readers/processes.
        try:
            if final is not None:
                final.close()
        except Exception:
            pass
        for c in clips:
            try:
                c.close()
            except Exception:
                pass