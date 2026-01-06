"""TOON encoder for LLM tool responses.

Encodes JSON data to TOON format for token-efficient LLM communication.
TOON (Token-Oriented Object Notation) reduces token usage by ~40% for
uniform arrays of objects by declaring fields once and streaming data as rows.
"""

import logging
from typing import Any

from toon_format import encode

logger = logging.getLogger(__name__)


def encode_for_llm(data: dict[str, Any]) -> str:
    """Encode data to TOON format for LLM consumption.

    Args:
        data: Dictionary to encode (typically tool response data)

    Returns:
        TOON-formatted string
    """
    try:
        return encode(data)
    except Exception as e:
        logger.warning(f"TOON encoding failed, returning JSON: {e}")
        import json

        return json.dumps(data)


def get_toon_format_hint() -> str:
    """Return a hint explaining TOON format for system prompts."""
    return """
=== DATA FORMAT ===
Tool responses use TOON (Token-Oriented Object Notation) for efficiency.
TOON syntax:
- Objects: key: value (YAML-like)
- Primitive arrays: [N]: val1,val2,val3
- Tabular arrays: [N]{field1,field2}:
    val1,val2
    val3,val4
Read the data as you would YAML with CSV-style tabular arrays.
"""
