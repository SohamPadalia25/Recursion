"""
pipeline/extractor.py
Step 1: Extract raw content from a PDF file or a topic string.
"""
from pathlib import Path
from utils.helpers import log
from utils.groq_client import chat


def extract_from_pdf(pdf_path: str) -> str:
    """
    Extract all text from a PDF using PyMuPDF (fitz).
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError("PyMuPDF not installed. Run: pip install PyMuPDF")

    log(f"Reading PDF: {pdf_path}", "📄")
    doc = fitz.open(pdf_path)
    pages_text = []
    for page_num, page in enumerate(doc, 1):
        text = page.get_text("text")
        if text.strip():
            pages_text.append(f"[Page {page_num}]\n{text}")
    doc.close()

    full_text = "\n\n".join(pages_text)
    log(f"Extracted {len(full_text)} characters from {len(pages_text)} pages", "✓")
    return full_text


def extract_from_topic(topic: str) -> str:
    """
    Use Groq LLM to generate comprehensive raw content about a topic.
    """
    log(f"Generating content for topic: '{topic}'", "🧠")
    prompt = f"""You are an expert researcher and educator.

Generate a comprehensive, factual, and well-structured knowledge base about the topic: "{topic}"

Include:
1. Definition and core concepts
2. Historical background and key milestones
3. How it works (technical or conceptual explanation)
4. Key components or subsystems
5. Real-world applications and examples
6. Benefits and challenges
7. Current state and future directions
8. Key people, organizations, or discoveries involved

Write in clear, informative prose. Be thorough — aim for 1000–1500 words.
"""
    content = chat(prompt, system="You are an expert researcher.", temperature=0.5, max_tokens=2048)
    log(f"Generated {len(content)} characters of source content", "✓")
    return content


def extract(topic: str = None, pdf_path: str = None) -> str:
    """
    Main extraction entry point. Provide either topic or pdf_path.
    Returns raw text content.
    """
    if pdf_path:
        raw = extract_from_pdf(pdf_path)
        # Optionally truncate very long PDFs to stay within LLM context
        if len(raw) > 12000:
            log("PDF is large — truncating to 12,000 chars for LLM context", "⚠")
            raw = raw[:12000] + "\n\n[Content truncated for processing]"
        return raw
    elif topic:
        return extract_from_topic(topic)
    else:
        raise ValueError("Provide either a topic string or a pdf_path.")