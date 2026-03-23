"""
pipeline/tts_engine.py
Step 5: Convert scene narrations to audio using Edge-TTS (Microsoft, free).
No API key needed. High quality neural voices.
"""
import asyncio
import os
from pathlib import Path
import edge_tts
from utils.helpers import get_output_dir, log


# Available high-quality voices
VOICES = {
    "male_us": "en-US-GuyNeural",
    "female_us": "en-US-JennyNeural",
    "male_uk": "en-GB-RyanNeural",
    "female_uk": "en-GB-SoniaNeural",
    "male_au": "en-AU-WilliamNeural",
    "female_au": "en-AU-NatashaNeural",
}

DEFAULT_VOICE = "en-US-GuyNeural"


async def _synthesize_scene(
    text: str,
    output_path: str,
    voice: str = DEFAULT_VOICE,
    rate: str = "+0%",
    volume: str = "+0%",
):
    """Async TTS synthesis for a single scene."""
    communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
    await communicate.save(output_path)


def synthesize_all_scenes(
    scenes: list[dict],
    voice: str = DEFAULT_VOICE,
    rate: str = "-5%",  # Slightly slower for clarity
) -> list[dict]:
    """
    Generate audio files for all scenes.
    Adds 'audio_path' key to each scene dict.
    Returns updated scenes list.
    """
    log(f"Generating TTS audio with voice: {voice}", "🔊")
    audio_dir = get_output_dir("audio")

    async def run_all():
        tasks = []
        paths = []
        for scene in scenes:
            scene_num = scene["scene_number"]
            audio_path = str(audio_dir / f"scene_{scene_num:03d}.mp3")
            paths.append(audio_path)
            tasks.append(
                _synthesize_scene(
                    text=scene["narration"],
                    output_path=audio_path,
                    voice=voice,
                    rate=rate,
                )
            )
        # Run concurrently
        await asyncio.gather(*tasks)
        return paths

    # Handle event loop compatibility
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        paths = loop.run_until_complete(run_all())
    except RuntimeError:
        paths = asyncio.run(run_all())

    for scene, path in zip(scenes, paths):
        scene["audio_path"] = path
        log(f"  Scene {scene['scene_number']:02d} audio → {Path(path).name}", "✓")

    return scenes


def get_audio_duration(audio_path: str) -> float:
    """Get duration of an mp3 file in seconds using mutagen or ffprobe."""
    try:
        from mutagen.mp3 import MP3
        audio = MP3(audio_path)
        return audio.info.length
    except ImportError:
        # Fallback: estimate from file size (~128kbps mp3 ≈ 16KB/s)
        size = os.path.getsize(audio_path)
        return size / 16000


def update_scene_durations(scenes: list[dict]) -> list[dict]:
    """Update duration_seconds based on actual audio file length."""
    for scene in scenes:
        if "audio_path" in scene and os.path.exists(scene["audio_path"]):
            scene["duration_seconds"] = int(get_audio_duration(scene["audio_path"]))
    return scenes