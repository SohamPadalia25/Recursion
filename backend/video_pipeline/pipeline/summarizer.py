"""
pipeline/summarizer.py
Step 2: Semantic extraction + summarization using Groq LLM.
"""
from utils.groq_client import chat
from utils.helpers import log, parse_json_response


def summarize(raw_content: str, duration_minutes: int = 3) -> dict:
    """
    Summarize raw content into key concepts and a structured summary.
    Returns a dict with: title, core_message, key_points, summary.
    """
    log("Performing semantic extraction & summarization...", "🔍")

    # Estimate word count for the video
    # ~130 words per minute of narration
    target_words = duration_minutes * 130
    num_sections = max(3, min(8, duration_minutes * 2))

    prompt = f"""You are an expert educational content analyst.

Analyze the following content and extract a structured summary suitable for a {duration_minutes}-minute explanatory video.

CONTENT:
{raw_content}

Return ONLY a valid JSON object with this exact structure:
{{
  "title": "Compelling video title (max 8 words)",
  "core_message": "The single most important takeaway in 1–2 sentences",
  "key_points": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3",
    "Key insight 4",
    "Key insight 5"
  ],
  "summary": "A flowing narrative summary of ~{target_words} words covering the main concepts, organized into {num_sections} natural topic areas. Write as connected paragraphs.",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "complexity_level": "beginner | intermediate | advanced"
}}

No markdown, no explanation — just the JSON object.
"""
    response = chat(
        prompt,
        system="You are an expert educational content analyst. Return only valid JSON.",
        temperature=0.3,
        max_tokens=2048,
    )

    result = parse_json_response(response)
    log(f"Title: {result.get('title', 'N/A')}", "✓")
    log(f"Key points extracted: {len(result.get('key_points', []))}", "✓")
    return result