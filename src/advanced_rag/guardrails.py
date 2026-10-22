"""Application-level checks around a query.

These are application-level guardrails, not a comprehensive security or safety system.
"""

from __future__ import annotations

import re

INJECTION = re.compile(
    r"(ignore (all |any )?(previous|prior) instructions|reveal (the )?(system|developer) prompt|"
    r"disregard (the )?(rules|instructions)|print (the )?(api key|secret))",
    re.IGNORECASE,
)

SAFE_FALLBACK = "I could not produce a grounded answer from the retrieved passages."


class GuardrailError(ValueError):
    """A request failed an application check."""


def check_question(question: str, max_chars: int) -> str:
    cleaned = question.strip()
    if not cleaned:
        raise GuardrailError("Enter a question first.")
    if len(cleaned) > max_chars:
        raise GuardrailError(f"Keep the question under {max_chars} characters.")
    if INJECTION.search(cleaned):
        raise GuardrailError("The question was rejected by the application guardrail.")
    return cleaned


def bound_context(texts: list[str], max_chars: int) -> list[str]:
    kept: list[str] = []
    used = 0
    for text in texts:
        if used >= max_chars:
            break
        room = max_chars - used
        piece = text[:room]
        if piece:
            kept.append(piece)
            used += len(piece)
    return kept


def grounded_answer(answer: str, citations: list[str], required: bool) -> str:
    text = answer.strip()
    if not text:
        return SAFE_FALLBACK
    if required and not citations:
        return SAFE_FALLBACK
    if required and not any(citation in text for citation in citations):
        return SAFE_FALLBACK
    return text
