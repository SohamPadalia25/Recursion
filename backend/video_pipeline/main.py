#!/usr/bin/env python3
"""
main.py — CLI entry point for the AI Video Pipeline

Usage:
    python main.py --topic "Quantum Computing" --duration 3
    python main.py --pdf research_paper.pdf --duration 5
    python main.py --topic "Climate Change" --duration 2 --voice female_us
    python main.py --topic "Neural Networks" --duration 4 --no-ai-images
"""
import argparse
import json
import sys
import time
from pathlib import Path

from pipeline import (
    extract,
    summarize,
    generate_script,
    generate_storyboard,
    synthesize_all_scenes,
    update_scene_durations,
    generate_all_images,
    assemble_video,
)
from pipeline.tts_engine import VOICES
from utils.helpers import get_output_dir, log, timestamp


BANNER = """
╔══════════════════════════════════════════════════════════╗
║          🎬  AI Video Pipeline  —  Free & Open           ║
║   LLM: Groq (llama-3.3-70b) | TTS: Edge-TTS | Img: Pollinations ║
╚══════════════════════════════════════════════════════════╝
"""


def run_pipeline(
    topic: str = None,
    pdf_path: str = None,
    duration_minutes: int = 3,
    voice_key: str = "male_us",
    use_ai_images: bool = True,
    save_storyboard: bool = True,
) -> str:
    """
    Run the full end-to-end pipeline.
    Returns path to the final video.
    """
    print(BANNER)
    t_start = time.time()

    voice = VOICES.get(voice_key, VOICES["male_us"])
    log(f"Duration: {duration_minutes} min | Voice: {voice} | AI Images: {use_ai_images}", "⚙️")
    print()

    # ── Step 1: Extract ────────────────────────────────────
    print("━━━ Step 1/7: Content Extraction ━━━")
    raw_content = extract(topic=topic, pdf_path=pdf_path)
    print()

    # ── Step 2: Summarize ──────────────────────────────────
    print("━━━ Step 2/7: Semantic Summarization ━━━")
    summary = summarize(raw_content, duration_minutes=duration_minutes)
    video_title = summary["title"]
    print()

    # ── Step 3: Script ─────────────────────────────────────
    print("━━━ Step 3/7: Script Generation ━━━")
    script = generate_script(summary, duration_minutes=duration_minutes)
    print()

    # ── Step 4: Storyboard ─────────────────────────────────
    print("━━━ Step 4/7: Storyboard Creation ━━━")
    scenes = generate_storyboard(script, title=video_title, duration_minutes=duration_minutes)

    if save_storyboard:
        sb_path = get_output_dir() / f"storyboard_{timestamp()}.json"
        with open(sb_path, "w") as f:
            json.dump({"title": video_title, "summary": summary, "scenes": scenes}, f, indent=2)
        log(f"Storyboard saved: {sb_path}", "💾")
    print()

    # ── Step 5: Text-to-Speech ─────────────────────────────
    print("━━━ Step 5/7: Text-to-Speech (Edge-TTS) ━━━")
    scenes = synthesize_all_scenes(scenes, voice=voice)
    scenes = update_scene_durations(scenes)
    print()

    # ── Step 6: Image Generation ───────────────────────────
    print("━━━ Step 6/7: Image Generation (Pollinations.ai) ━━━")
    scenes = generate_all_images(scenes, use_ai=use_ai_images)
    print()

    # ── Step 7: Video Assembly ─────────────────────────────
    print("━━━ Step 7/7: Video Assembly (MoviePy) ━━━")
    video_path = assemble_video(scenes, title=video_title)
    print()

    elapsed = time.time() - t_start
    print("━" * 58)
    print(f"  ✅ Pipeline complete in {elapsed:.1f}s")
    print(f"  🎬 Video: {video_path}")
    print("━" * 58)
    return video_path


def main():
    parser = argparse.ArgumentParser(
        description="AI Video Pipeline — Topic/PDF → Explanatory Video",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --topic "Quantum Computing" --duration 3
  python main.py --pdf paper.pdf --duration 5 --voice female_uk
  python main.py --topic "Photosynthesis" --duration 2 --no-ai-images
        """,
    )

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--topic", type=str, help="Topic to generate video about")
    input_group.add_argument("--pdf", type=str, dest="pdf_path", help="Path to PDF file")

    parser.add_argument(
        "--duration", type=int, default=3, choices=range(1, 11),
        metavar="1-10", help="Video duration in minutes (default: 3)"
    )
    parser.add_argument(
        "--voice", type=str, default="male_us",
        choices=list(VOICES.keys()),
        help=f"TTS voice (default: male_us). Options: {', '.join(VOICES.keys())}"
    )
    parser.add_argument(
        "--no-ai-images", action="store_true",
        help="Skip AI image generation (use gradient placeholders — faster)"
    )
    parser.add_argument(
        "--no-storyboard-save", action="store_true",
        help="Don't save the intermediate storyboard JSON"
    )

    args = parser.parse_args()

    if args.pdf_path and not Path(args.pdf_path).exists():
        print(f"Error: PDF file not found: {args.pdf_path}")
        sys.exit(1)

    run_pipeline(
        topic=args.topic,
        pdf_path=args.pdf_path,
        duration_minutes=args.duration,
        voice_key=args.voice,
        use_ai_images=not args.no_ai_images,
        save_storyboard=not args.no_storyboard_save,
    )


if __name__ == "__main__":
    main()