"""
Audio Learning Pipeline - FastAPI Backend
Uses: Groq (free LLM) + gTTS (free TTS)
"""

import os
import json
import time
import tempfile
import hashlib
from pathlib import Path
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

from pipeline import AudioLearningPipeline

app = FastAPI(title="Audio Learning Pipeline", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve outputs directory
OUTPUT_DIR = Path("outputs")
OUTPUT_DIR.mkdir(exist_ok=True)
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# Serve frontend
FRONTEND_DIR = Path("../frontend")
if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


@app.get("/")
async def root():
    """Serve the frontend"""
    frontend_path = Path("../frontend/index.html")
    if frontend_path.exists():
        return FileResponse(str(frontend_path))
    return {"message": "Audio Learning Pipeline API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": time.time()}


@app.post("/generate")
async def generate_audio_lesson(
    topic: Optional[str] = Form(None),
    duration_minutes: int = Form(5),
    voice_style: str = Form("conversational"),
    difficulty: str = Form("intermediate"),
    pdf_file: Optional[UploadFile] = File(None),
):
    """
    Main pipeline endpoint.
    Accepts either a topic string OR a PDF file.
    """
    if not topic and not pdf_file:
        raise HTTPException(400, "Provide either a topic or a PDF file")

    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(500, "GROQ_API_KEY environment variable not set")

    # Extract PDF text if uploaded
    pdf_text = None
    if pdf_file:
        content = await pdf_file.read()
        pdf_text = extract_pdf_text(content)
        if not topic:
            topic = f"Content from {pdf_file.filename}"

    pipeline = AudioLearningPipeline(groq_api_key=groq_key)

    try:
        result = await pipeline.run(
            topic=topic,
            duration_minutes=duration_minutes,
            voice_style=voice_style,
            difficulty=difficulty,
            pdf_text=pdf_text,
            output_dir=str(OUTPUT_DIR),
        )
        return JSONResponse(result)

    except Exception as e:
        raise HTTPException(500, f"Pipeline error: {str(e)}")


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract text from PDF bytes"""
    try:
        import pdfplumber
        import io
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            pages = []
            for page in pdf.pages[:20]:  # Limit to first 20 pages
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n".join(pages)
    except ImportError:
        try:
            import PyPDF2
            import io
            reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            pages = []
            for page in reader.pages[:20]:
                pages.append(page.extract_text())
            return "\n\n".join(pages)
        except ImportError:
            return "[PDF extraction failed - install pdfplumber or PyPDF2]"


if __name__ == "__main__":
    print("\n🎧 Audio Learning Pipeline Server")
    print("=" * 40)
    print("Make sure GROQ_API_KEY is set in your environment!")
    print("Get free key at: https://console.groq.com/keys")
    print("=" * 40)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)