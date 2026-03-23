"""
app.py — Gradio Web UI for the AI Video Pipeline
Run with: python app.py
"""
import os
import json
import tempfile
import threading
from pathlib import Path

import gradio as gr
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
from utils.helpers import get_output_dir, timestamp


def run_pipeline_ui(
    topic: str,
    pdf_file,
    duration: int,
    voice_key: str,
    use_ai_images: bool,
    progress=gr.Progress(track_tqdm=True),
):
    """Gradio-compatible pipeline runner with progress updates."""
    logs = []

    def update(msg):
        logs.append(msg)
        return "\n".join(logs)

    try:
        # Determine input
        pdf_path = None
        if pdf_file is not None:
            pdf_path = pdf_file.name
            input_label = f"PDF: {Path(pdf_path).name}"
        elif topic and topic.strip():
            input_label = f"Topic: {topic}"
        else:
            return None, None, "❌ Please provide a topic or upload a PDF."

        voice = VOICES.get(voice_key, VOICES["male_us"])
        log_text = f"🚀 Starting pipeline\n📥 Input: {input_label}\n⏱ Duration: {duration} min\n🔊 Voice: {voice}\n\n"

        # Step 1
        progress(0.05, desc="Step 1/7: Extracting content...")
        log_text += "━━━ Step 1/7: Content Extraction ━━━\n"
        raw_content = extract(topic=topic if not pdf_path else None, pdf_path=pdf_path)
        log_text += f"✓ Extracted {len(raw_content)} characters\n\n"

        # Step 2
        progress(0.15, desc="Step 2/7: Summarizing...")
        log_text += "━━━ Step 2/7: Summarization ━━━\n"
        summary = summarize(raw_content, duration_minutes=duration)
        video_title = summary["title"]
        log_text += f"✓ Title: {video_title}\n✓ Key points: {len(summary.get('key_points', []))}\n\n"

        # Step 3
        progress(0.25, desc="Step 3/7: Writing script...")
        log_text += "━━━ Step 3/7: Script Generation ━━━\n"
        script = generate_script(summary, duration_minutes=duration)
        log_text += f"✓ Script: {len(script.split())} words\n\n"

        # Step 4
        progress(0.35, desc="Step 4/7: Building storyboard...")
        log_text += "━━━ Step 4/7: Storyboard Creation ━━━\n"
        scenes = generate_storyboard(script, title=video_title, duration_minutes=duration)
        log_text += f"✓ {len(scenes)} scenes created\n\n"

        # Step 5
        progress(0.50, desc="Step 5/7: Generating speech...")
        log_text += "━━━ Step 5/7: Text-to-Speech ━━━\n"
        scenes = synthesize_all_scenes(scenes, voice=voice)
        scenes = update_scene_durations(scenes)
        log_text += f"✓ Audio generated for {len(scenes)} scenes\n\n"

        # Step 6
        progress(0.65, desc="Step 6/7: Generating images...")
        log_text += "━━━ Step 6/7: Image Generation ━━━\n"
        scenes = generate_all_images(scenes, use_ai=use_ai_images)
        log_text += f"✓ Images generated for {len(scenes)} scenes\n\n"

        # Step 7
        progress(0.85, desc="Step 7/7: Assembling video...")
        log_text += "━━━ Step 7/7: Video Assembly ━━━\n"
        video_path = assemble_video(scenes, title=video_title)
        log_text += f"✓ Video assembled!\n\n"

        progress(1.0, desc="Done!")
        log_text += f"🎉 Done! Video saved to:\n{video_path}"

        # Storyboard JSON for display
        storyboard_json = json.dumps(
            {"title": video_title, "scenes": [
                {"scene": s["scene_number"], "title": s["title"], "narration_preview": s["narration"][:100] + "..."}
                for s in scenes
            ]},
            indent=2
        )

        return video_path, storyboard_json, log_text

    except Exception as e:
        import traceback
        error_msg = f"❌ Error: {str(e)}\n\n{traceback.format_exc()}"
        return None, None, error_msg


# ── Gradio UI ──────────────────────────────────────────────────────────────────

CSS = """
.gradio-container { max-width: 1100px !important; }
.title-text { text-align: center; font-size: 2em; font-weight: bold; }
.subtitle { text-align: center; color: #888; margin-bottom: 1em; }
"""

with gr.Blocks(css=CSS, title="AI Video Pipeline") as demo:
    gr.HTML("""
    <div class='title-text'>🎬 AI Video Pipeline</div>
    <div class='subtitle'>
        Topic / PDF → LLM Summarization → Script → Storyboard → TTS + Images → Video<br>
        <small>Powered by <b>Groq</b> (free LLM) · <b>Edge-TTS</b> (free) · <b>Pollinations.ai</b> (free images)</small>
    </div>
    """)

    with gr.Row():
        with gr.Column(scale=1):
            gr.Markdown("### 📥 Input")

            topic_input = gr.Textbox(
                label="Topic",
                placeholder="e.g. Quantum Computing, Climate Change, Neural Networks...",
                lines=2,
            )
            pdf_input = gr.File(
                label="Or Upload PDF",
                file_types=[".pdf"],
            )

            gr.Markdown("### ⚙️ Settings")

            duration_slider = gr.Slider(
                minimum=1, maximum=10, value=3, step=1,
                label="Video Duration (minutes)",
            )
            voice_dropdown = gr.Dropdown(
                choices=list(VOICES.keys()),
                value="male_us",
                label="Narrator Voice",
            )
            ai_images_checkbox = gr.Checkbox(
                value=True,
                label="Use AI Image Generation (Pollinations.ai)",
            )

            run_btn = gr.Button("🚀 Generate Video", variant="primary", size="lg")

        with gr.Column(scale=2):
            gr.Markdown("### 🎬 Output")

            video_output = gr.Video(label="Generated Video")

            with gr.Accordion("📋 Storyboard Preview", open=False):
                storyboard_output = gr.Code(label="Scene Structure", language="json")

            log_output = gr.Textbox(
                label="Pipeline Log",
                lines=15,
                max_lines=20,
                interactive=False,
            )

    run_btn.click(
        fn=run_pipeline_ui,
        inputs=[topic_input, pdf_input, duration_slider, voice_dropdown, ai_images_checkbox],
        outputs=[video_output, storyboard_output, log_output],
    )

    gr.Markdown("""
    ---
    **Setup:** Add your free [Groq API key](https://console.groq.com) to `.env` · `pip install -r requirements.txt` · `python app.py`
    """)

if __name__ == "__main__":
    demo.launch(share=False, show_error=True)