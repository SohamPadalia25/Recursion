"""
pipeline/script_generator.py
Step 3: Transform summary into a full narration script.
"""
from utils.groq_client import chat
from utils.helpers import log


def generate_script(summary_data: dict, duration_minutes: int = 3) -> str:
    """
    Generate a full narration script from the summarized content.
    Returns a plain-text script string.
    """
    log("Generating narration script...", "✍️")

    # ~130 words per minute is natural speech pace
    target_words = duration_minutes * 130
    title = summary_data.get("title", "Untitled")
    core_message = summary_data.get("core_message", "")
    key_points = "\n".join(f"- {p}" for p in summary_data.get("key_points", []))
    summary = summary_data.get("summary", "")
    level = summary_data.get("complexity_level", "intermediate")

    prompt = f"""You are a professional documentary scriptwriter and science communicator.

Write a compelling, engaging narration script for a {duration_minutes}-minute explanatory video about:
**{title}**

Core Message: {core_message}

Key Points to Cover:
{key_points}

Source Summary:
{summary}

Audience Level: {level}

SCRIPT REQUIREMENTS:
- Target exactly ~{target_words} words (for {duration_minutes} minutes at ~130 wpm)
- Start with a HOOK: a surprising fact, question, or bold statement
- Use conversational, engaging language — like an enthusiastic expert talking to a curious friend
- Avoid jargon unless explained simply
- Build naturally from introduction → core concepts → applications → conclusion
- End with a memorable closing statement or call to action
- Do NOT include stage directions, [MUSIC], [CUT TO], etc. — just the spoken words
- Write in flowing paragraphs, not bullet points
- Each paragraph should naturally correspond to one visual "scene" (aim for {duration_minutes * 2} paragraphs)

Output ONLY the script text. No title, no labels, just the words to be spoken.
"""
    script = chat(
        prompt,
        system="You are a professional documentary scriptwriter.",
        temperature=0.75,
        max_tokens=3000,
    )

    word_count = len(script.split())
    log(f"Script generated: {word_count} words (~{word_count // 130} min)", "✓")
    return script