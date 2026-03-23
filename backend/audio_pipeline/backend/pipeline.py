"""
Multi-Stage Audio Learning Pipeline

Stage 1: Groq LLM → Deep semantic analysis + structured script generation
Stage 2: gTTS → Convert script to expressive audio
Stage 3: Audio post-processing → normalize, add intro tone
"""

import os
import re
import json
import time
import asyncio
import hashlib
import httpx
from pathlib import Path
from typing import Optional


# ─────────────────────────────────────────────
# STAGE 1: LLM Script Generator (Groq)
# ─────────────────────────────────────────────

ANALYSIS_PROMPT = """You are an expert educational content analyst and script writer.

Your task is to analyze the provided content and create a structured audio learning script.

INPUT:
- Topic: {topic}
- Target Duration: {duration_minutes} minutes
- Difficulty Level: {difficulty}
- Voice Style: {voice_style}
{pdf_section}

INSTRUCTIONS:
1. Deeply analyze the topic/content and identify 3-6 KEY CONCEPTS
2. Create a teaching script optimized for AUDIO (spoken word, no visual aids)
3. Target EXACTLY {duration_minutes} minutes of speaking time
   - Average speaking pace: ~140 words/minute for conversational, ~120 for educational
   - Target word count: {target_words} words
4. Structure: Hook → Core Concepts → Examples → Summary → Takeaway
5. Make it engaging, use analogies, stories, and memorable examples
6. Adjust explanation depth to {difficulty} level

CRITICAL: Respond with ONLY valid JSON, no markdown, no extra text.

JSON FORMAT:
{{
  "title": "Compelling episode title",
  "key_concepts": ["concept1", "concept2", "concept3"],
  "estimated_duration_seconds": <number>,
  "word_count": <number>,
  "sections": [
    {{
      "section_type": "hook",
      "title": "Opening Hook",
      "content": "Script text here...",
      "duration_seconds": <number>
    }},
    {{
      "section_type": "concept",
      "title": "Concept Name",
      "content": "Script text here...",
      "duration_seconds": <number>
    }},
    {{
      "section_type": "example",
      "title": "Real-World Example",
      "content": "Script text here...",
      "duration_seconds": <number>
    }},
    {{
      "section_type": "summary",
      "title": "Key Takeaways",
      "content": "Script text here...",
      "duration_seconds": <number>
    }}
  ],
  "full_script": "The complete script as a single flowing text, optimized for TTS...",
  "learning_objectives": ["objective1", "objective2", "objective3"]
}}"""


REFINEMENT_PROMPT = """You are a TTS optimization specialist.

Take this educational script and rewrite it to be PERFECTLY optimized for text-to-speech audio:

ORIGINAL SCRIPT:
{script}

TARGET: {duration_minutes} minutes ({target_words} words)
VOICE STYLE: {voice_style}

OPTIMIZATION RULES:
1. Remove ALL markdown, bullets, headers, special characters
2. Spell out numbers: "3" → "three", "AI" → "A.I.", "API" → "A.P.I."
3. Add natural speech pauses with "..." for dramatic effect
4. Use rhythm and sentence variety (mix short punchy + longer flowing sentences)
5. Add verbal signposts: "First...", "Now here's the interesting part...", "Think about it this way..."
6. End sentences completely — no trailing thoughts
7. If {voice_style} is "conversational": use "you", contractions, casual tone
8. If {voice_style} is "academic": formal but not dry, precise language
9. If {voice_style} is "storytelling": narrative arc, vivid descriptions

Return ONLY the optimized script text, nothing else. No JSON, no headers."""


class GroqLLM:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "llama-3.3-70b-versatile"  # Free, fast, powerful

    async def complete(self, prompt: str, max_tokens: int = 4000, temperature: float = 0.7) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(self.base_url, headers=headers, json=payload)
            if resp.status_code != 200:
                raise Exception(f"Groq API error {resp.status_code}: {resp.text}")
            data = resp.json()
            return data["choices"][0]["message"]["content"]


# ─────────────────────────────────────────────
# STAGE 2: TTS Engine (gTTS - Free)
# ─────────────────────────────────────────────

class TTSEngine:
    def __init__(self):
        self.available_engines = self._detect_engines()

    def _detect_engines(self):
        engines = []
        try:
            from gtts import gTTS
            engines.append("gtts")
        except ImportError:
            pass
        try:
            import pyttsx3
            engines.append("pyttsx3")
        except ImportError:
            pass
        return engines

    def synthesize(self, text: str, output_path: str, lang: str = "en") -> str:
        """Convert text to speech, returns output file path"""
        if "gtts" in self.available_engines:
            return self._gtts_synthesize(text, output_path, lang)
        elif "pyttsx3" in self.available_engines:
            return self._pyttsx3_synthesize(text, output_path)
        else:
            raise Exception(
                "No TTS engine available. Install: pip install gTTS\n"
                "Or for offline: pip install pyttsx3"
            )

    def _gtts_synthesize(self, text: str, output_path: str, lang: str) -> str:
        from gtts import gTTS
        # gTTS works best with chunks under 5000 chars
        chunks = self._split_text(text, max_chars=4500)

        if len(chunks) == 1:
            tts = gTTS(text=chunks[0], lang=lang, slow=False)
            tts.save(output_path)
        else:
            # Save chunks and concatenate
            chunk_files = []
            for i, chunk in enumerate(chunks):
                chunk_path = output_path.replace(".mp3", f"_chunk{i}.mp3")
                tts = gTTS(text=chunk, lang=lang, slow=False)
                tts.save(chunk_path)
                chunk_files.append(chunk_path)

            self._merge_mp3s(chunk_files, output_path)

            # Cleanup chunks
            for f in chunk_files:
                try:
                    os.remove(f)
                except:
                    pass

        return output_path

    def _pyttsx3_synthesize(self, text: str, output_path: str) -> str:
        import pyttsx3
        engine = pyttsx3.init()
        engine.setProperty("rate", 150)
        engine.setProperty("volume", 0.9)
        engine.save_to_file(text, output_path)
        engine.runAndWait()
        return output_path

    def _split_text(self, text: str, max_chars: int = 4500) -> list:
        """Split text into chunks at sentence boundaries"""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        chunks = []
        current = ""
        for sentence in sentences:
            if len(current) + len(sentence) < max_chars:
                current += " " + sentence
            else:
                if current:
                    chunks.append(current.strip())
                current = sentence
        if current:
            chunks.append(current.strip())
        return chunks if chunks else [text]

    def _merge_mp3s(self, chunk_files: list, output_path: str):
        """Merge multiple MP3 files into one"""
        try:
            from pydub import AudioSegment
            combined = AudioSegment.empty()
            for f in chunk_files:
                combined += AudioSegment.from_mp3(f)
            combined.export(output_path, format="mp3")
        except ImportError:
            # Fallback: simple binary concatenation (works for basic playback)
            with open(output_path, "wb") as out:
                for f in chunk_files:
                    with open(f, "rb") as chunk:
                        out.write(chunk.read())


# ─────────────────────────────────────────────
# MAIN PIPELINE ORCHESTRATOR
# ─────────────────────────────────────────────

class AudioLearningPipeline:
    def __init__(self, groq_api_key: str):
        self.llm = GroqLLM(groq_api_key)
        self.tts = TTSEngine()

    async def run(
        self,
        topic: str,
        duration_minutes: int = 5,
        voice_style: str = "conversational",
        difficulty: str = "intermediate",
        pdf_text: Optional[str] = None,
        output_dir: str = "outputs",
    ) -> dict:
        """
        Full pipeline execution.
        Returns dict with script data + audio file path.
        """
        start_time = time.time()
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        print(f"\n🚀 Starting pipeline for: '{topic}'")
        print(f"   Duration: {duration_minutes} min | Style: {voice_style} | Level: {difficulty}")

        # ── STAGE 1A: Generate structured script ──
        print("\n📝 Stage 1: Generating script with Groq LLM...")
        target_words = int(duration_minutes * 140)  # ~140 WPM

        pdf_section = ""
        if pdf_text:
            # Truncate PDF text to avoid token limits
            truncated = pdf_text[:6000] + ("..." if len(pdf_text) > 6000 else "")
            pdf_section = f"\nPDF CONTENT:\n{truncated}"

        analysis_prompt = ANALYSIS_PROMPT.format(
            topic=topic,
            duration_minutes=duration_minutes,
            difficulty=difficulty,
            voice_style=voice_style,
            target_words=target_words,
            pdf_section=pdf_section,
        )

        raw_response = await self.llm.complete(analysis_prompt, max_tokens=4000, temperature=0.7)

        # Parse JSON response
        script_data = self._parse_json_response(raw_response)
        if not script_data:
            raise Exception("LLM failed to return valid JSON script structure")

        print(f"   ✓ Generated: '{script_data.get('title', topic)}'")
        print(f"   ✓ Key concepts: {', '.join(script_data.get('key_concepts', []))}")
        print(f"   ✓ Word count: {script_data.get('word_count', 'N/A')}")

        # ── STAGE 1B: Optimize script for TTS ──
        print("\n🎨 Stage 1B: Optimizing script for audio...")
        raw_script = script_data.get("full_script", "")
        if not raw_script:
            # Fallback: join section content
            raw_script = " ".join(s.get("content", "") for s in script_data.get("sections", []))

        refinement_prompt = REFINEMENT_PROMPT.format(
            script=raw_script,
            duration_minutes=duration_minutes,
            target_words=target_words,
            voice_style=voice_style,
        )

        optimized_script = await self.llm.complete(refinement_prompt, max_tokens=3000, temperature=0.5)
        optimized_script = optimized_script.strip()
        print(f"   ✓ Optimized script: {len(optimized_script.split())} words")

        # ── STAGE 2: Text-to-Speech ──
        print("\n🔊 Stage 2: Generating audio with TTS...")
        safe_topic = re.sub(r'[^a-z0-9_]', '_', topic.lower())[:40]
        timestamp = int(time.time())
        audio_filename = f"lesson_{safe_topic}_{timestamp}.mp3"
        audio_path = str(output_path / audio_filename)

        self.tts.synthesize(optimized_script, audio_path)
        file_size = os.path.getsize(audio_path) if os.path.exists(audio_path) else 0
        print(f"   ✓ Audio saved: {audio_filename} ({file_size // 1024} KB)")

        # ── DONE ──
        elapsed = time.time() - start_time
        print(f"\n✅ Pipeline complete in {elapsed:.1f}s")

        return {
            "success": True,
            "title": script_data.get("title", topic),
            "topic": topic,
            "duration_minutes": duration_minutes,
            "key_concepts": script_data.get("key_concepts", []),
            "learning_objectives": script_data.get("learning_objectives", []),
            "sections": script_data.get("sections", []),
            "word_count": len(optimized_script.split()),
            "estimated_duration_seconds": script_data.get("estimated_duration_seconds", duration_minutes * 60),
            "optimized_script": optimized_script,
            "audio_file": audio_filename,
            "audio_url": f"/outputs/{audio_filename}",
            "processing_time_seconds": round(elapsed, 2),
            "pipeline_stages": {
                "stage1_llm": "Groq llama3-70b-8192",
                "stage2_tts": self.tts.available_engines[0] if self.tts.available_engines else "none",
            }
        }

    def _parse_json_response(self, text: str) -> Optional[dict]:
        """Robustly parse JSON from LLM response"""
        text = text.strip()

        # Remove markdown code blocks if present
        text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.MULTILINE)
        text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)

        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Extract JSON object from text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        return None