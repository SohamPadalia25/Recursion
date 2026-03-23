#!/usr/bin/env python3
"""
Command-line interface for the Audio Learning Pipeline
Usage: python run_pipeline.py --topic "Quantum Computing" --duration 5
"""

import os
import sys
import asyncio
import argparse
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))
from pipeline import AudioLearningPipeline


def main():
    parser = argparse.ArgumentParser(
        description="🎧 Audio Learning Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_pipeline.py --topic "Machine Learning" --duration 5
  python run_pipeline.py --topic "Black Holes" --duration 3 --style storytelling
  python run_pipeline.py --topic "Python Decorators" --duration 7 --difficulty advanced
  python run_pipeline.py --pdf my_paper.pdf --duration 10

Get your FREE Groq API key at: https://console.groq.com/keys
Then set it: export GROQ_API_KEY=your_key_here
        """
    )

    parser.add_argument("--topic", type=str, help="Topic to generate lesson for")
    parser.add_argument("--pdf", type=str, help="Path to PDF file to process")
    parser.add_argument("--duration", type=int, default=5, help="Target duration in minutes (default: 5)")
    parser.add_argument(
        "--style",
        choices=["conversational", "academic", "storytelling"],
        default="conversational",
        help="Voice/teaching style"
    )
    parser.add_argument(
        "--difficulty",
        choices=["beginner", "intermediate", "advanced"],
        default="intermediate",
        help="Content difficulty level"
    )
    parser.add_argument("--output", type=str, default="outputs", help="Output directory")

    args = parser.parse_args()

    if not args.topic and not args.pdf:
        parser.error("Provide either --topic or --pdf")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ ERROR: GROQ_API_KEY not set!")
        print("   Get your free key at: https://console.groq.com/keys")
        print("   Then run: export GROQ_API_KEY=your_key_here")
        sys.exit(1)

    # Handle PDF
    pdf_text = None
    topic = args.topic
    if args.pdf:
        print(f"📄 Reading PDF: {args.pdf}")
        with open(args.pdf, "rb") as f:
            pdf_bytes = f.read()
        from main import extract_pdf_text
        pdf_text = extract_pdf_text(pdf_bytes)
        if not topic:
            topic = f"Content from {Path(args.pdf).name}"
        print(f"   Extracted {len(pdf_text)} characters")

    # Run pipeline
    print(f"\n🎧 Audio Learning Pipeline")
    print(f"   Topic: {topic}")
    print(f"   Duration: {args.duration} minutes")
    print(f"   Style: {args.style}")
    print(f"   Difficulty: {args.difficulty}")
    print("-" * 50)

    pipeline = AudioLearningPipeline(groq_api_key=api_key)

    result = asyncio.run(pipeline.run(
        topic=topic,
        duration_minutes=args.duration,
        voice_style=args.style,
        difficulty=args.difficulty,
        pdf_text=pdf_text,
        output_dir=args.output,
    ))

    if result["success"]:
        print(f"\n{'='*50}")
        print(f"✅ SUCCESS!")
        print(f"   Title: {result['title']}")
        print(f"   Key Concepts: {', '.join(result['key_concepts'])}")
        print(f"   Word Count: {result['word_count']}")
        print(f"   Audio File: {args.output}/{result['audio_file']}")
        print(f"   Processing Time: {result['processing_time_seconds']}s")
        print(f"\n🎵 Play with:")
        print(f"   open {args.output}/{result['audio_file']}  # macOS")
        print(f"   mpg123 {args.output}/{result['audio_file']}  # Linux")
    else:
        print(f"\n❌ Pipeline failed: {result.get('error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()