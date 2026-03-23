#!/usr/bin/env python3
"""
Bridge script used by Node backend to execute audio/video pipelines.
Prints a marker-prefixed JSON line that Node parses:
__PIPELINE_JSON__{"success":true,...}
"""

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
AUDIO_BACKEND_DIR = ROOT / "audio_pipeline" / "backend"
VIDEO_PIPELINE_DIR = ROOT / "video_pipeline"
PIPELINE_OUTPUT_ROOT = ROOT / "pipeline_outputs"


def run_audio(args: argparse.Namespace) -> dict:
    sys.path.insert(0, str(AUDIO_BACKEND_DIR))

    from pipeline import AudioLearningPipeline  # type: ignore
    from main import extract_pdf_text  # type: ignore

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise RuntimeError("GROQ_API_KEY environment variable not set")

    topic = args.topic
    pdf_text = None
    if args.pdf:
        pdf_bytes = Path(args.pdf).read_bytes()
        pdf_text = extract_pdf_text(pdf_bytes)
        if not topic:
            topic = f"Content from {Path(args.pdf).name}"

    output_dir = PIPELINE_OUTPUT_ROOT / "audio"
    output_dir.mkdir(parents=True, exist_ok=True)

    pipeline = AudioLearningPipeline(groq_api_key=groq_key)
    result = asyncio.run(
        pipeline.run(
            topic=topic,
            duration_minutes=args.duration,
            voice_style=args.style,
            difficulty=args.difficulty,
            pdf_text=pdf_text,
            output_dir=str(output_dir),
        )
    )

    audio_file = result.get("audio_file")
    audio_url = f"/pipeline-outputs/audio/{audio_file}" if audio_file else None
    return {
        "pipeline": "audio",
        "result": result,
        "outputUrl": audio_url,
        "outputFile": audio_file,
    }


def run_video(args: argparse.Namespace) -> dict:
    sys.path.insert(0, str(VIDEO_PIPELINE_DIR))
    from main import run_pipeline  # type: ignore

    output_dir = PIPELINE_OUTPUT_ROOT / "video"
    output_dir.mkdir(parents=True, exist_ok=True)
    os.environ["OUTPUT_DIR"] = str(output_dir)

    video_path = run_pipeline(
        topic=args.topic,
        pdf_path=args.pdf,
        duration_minutes=args.duration,
        voice_key=args.voice,
        use_ai_images=not args.no_ai_images,
        save_storyboard=False,
    )

    video_name = Path(video_path).name if video_path else None
    video_url = f"/pipeline-outputs/video/{video_name}" if video_name else None
    return {
        "pipeline": "video",
        "result": {"video_path": video_path},
        "outputUrl": video_url,
        "outputFile": video_name,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pipeline", choices=["audio", "video"], required=True)
    parser.add_argument("--topic", type=str, default=None)
    parser.add_argument("--pdf", type=str, default=None)
    parser.add_argument("--duration", type=int, default=3)
    parser.add_argument("--style", type=str, default="conversational")
    parser.add_argument("--difficulty", type=str, default="intermediate")
    parser.add_argument("--voice", type=str, default="male_us")
    parser.add_argument("--no-ai-images", action="store_true")
    args = parser.parse_args()

    if not args.topic and not args.pdf:
        raise ValueError("Provide either topic or pdf")

    if args.pipeline == "audio":
        payload = run_audio(args)
    else:
        payload = run_video(args)

    print(f"__PIPELINE_JSON__{json.dumps({'success': True, 'data': payload})}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"__PIPELINE_JSON__{json.dumps({'success': False, 'error': str(exc)})}")
        sys.exit(1)
