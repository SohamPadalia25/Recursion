"""
utils/groq_client.py
Groq LLM wrapper — uses llama-3.3-70b-versatile (free tier)
Get your key at: https://console.groq.com
"""
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY not set. Get a free key at https://console.groq.com "
                "and add it to your .env file."
            )
        _client = Groq(api_key=api_key)
    return _client


def chat(
    prompt: str,
    system: str = "You are a helpful assistant.",
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """
    Send a prompt to Groq and return the response text.
    Model: llama-3.3-70b-versatile (free on Groq)
    """
    client = get_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()