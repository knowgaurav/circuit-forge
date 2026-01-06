"""Input validation for prompt injection protection."""

import logging
import re

from app.models.prompt_guard import ThreatLevel, ValidationResult

logger = logging.getLogger(__name__)

# Maximum allowed input length
MAX_TOPIC_LENGTH = 500

# Patterns that indicate prompt injection attempts
BLOCKED_PATTERNS = [
    # Direct instruction override attempts
    (
        r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)",
        "instruction_override",
    ),
    (r"ignore\s+above", "instruction_override"),
    (
        r"disregard\s+(all\s+)?(previous|above|prior|your)\s+(instructions?|prompts?|rules?)",
        "instruction_override",
    ),
    (r"disregard\s+your\s+\w+\s+prompt", "instruction_override"),
    (
        r"forget\s+(all\s+)?(previous|above|prior|your|everything)",
        "instruction_override",
    ),
    (
        r"override\s+(all\s+)?(previous|above|prior|your)\s+(instructions?|prompts?|rules?)",
        "instruction_override",
    ),
    (
        r"do\s+not\s+follow\s+(the\s+)?(previous|above|prior|system)\s+(instructions?|prompts?|rules?)",
        "instruction_override",
    ),
    # System prompt extraction
    (
        r"(show|reveal|display|print|output)\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions?|rules?)",
        "prompt_extraction",
    ),
    (
        r"tell\s+me\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?)",
        "prompt_extraction",
    ),
    (
        r"what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions?|rules?)",
        "prompt_extraction",
    ),
    (r"repeat\s+(your|the)\s+(system\s+)?(prompt|instructions?)", "prompt_extraction"),
    # Role manipulation
    (r"you\s+are\s+now\s+(a|an)\s+", "role_manipulation"),
    (r"pretend\s+(you\s+are|to\s+be)\s+", "role_manipulation"),
    (r"act\s+as\s+(if\s+you\s+are\s+)?(a|an)\s+", "role_manipulation"),
    (r"roleplay\s+as\s+", "role_manipulation"),
    # Jailbreak patterns
    (r"\bDAN\b", "jailbreak"),
    (r"developer\s+mode", "jailbreak"),
    (r"jailbreak", "jailbreak"),
    (r"\[INST\]", "jailbreak"),
    (r"<\|im_start\|>", "jailbreak"),
    (r"<\|system\|>", "jailbreak"),
    # Code injection
    (r";\s*DROP\s+TABLE", "sql_injection"),
    (r"<script", "xss"),
    (r"javascript:", "xss"),
    (r"\{\{.*\}\}", "template_injection"),
    (r"\$\{.*\}", "template_injection"),
]

# Suspicious patterns (warning but not blocked)
SUSPICIOUS_PATTERNS = [
    (r"```", "markdown_code_block"),
    (r"<[a-zA-Z]+>", "html_like_tag"),
    (r"\\n\\n", "escaped_newlines"),
    (r"base64", "encoding_reference"),
    (r"hex\s*:", "encoding_reference"),
]

# Allowed characters (alphanumeric, common punctuation, spaces)
ALLOWED_CHARS_PATTERN = re.compile(r"^[\w\s\-.,!?'\"():;/&#+@*%$°±×÷=<>]+$", re.UNICODE)


class InputValidator:
    """Validates user input for potential prompt injection attacks."""

    def __init__(self) -> None:
        self.blocked_patterns = [
            (re.compile(pattern, re.IGNORECASE), name)
            for pattern, name in BLOCKED_PATTERNS
        ]
        self.suspicious_patterns = [
            (re.compile(pattern, re.IGNORECASE), name)
            for pattern, name in SUSPICIOUS_PATTERNS
        ]

    def validate(self, input_text: str) -> ValidationResult:
        """Validate input text for potential injection attacks."""
        blocked_patterns: list[str] = []
        warnings: list[str] = []
        threat_level = ThreatLevel.SAFE

        # Check length
        if len(input_text) > MAX_TOPIC_LENGTH:
            return ValidationResult(
                isValid=False,
                threatLevel=ThreatLevel.BLOCKED,
                blockedPatterns=["input_too_long"],
                warnings=[
                    f"Input exceeds maximum length of {MAX_TOPIC_LENGTH} characters"
                ],
            )

        # Check for empty input
        if not input_text or not input_text.strip():
            return ValidationResult(
                isValid=False,
                threatLevel=ThreatLevel.BLOCKED,
                blockedPatterns=["empty_input"],
                warnings=["Input cannot be empty"],
            )

        # Check for control characters
        if self._has_control_characters(input_text):
            blocked_patterns.append("control_characters")
            threat_level = ThreatLevel.BLOCKED

        # Check for null bytes
        if "\x00" in input_text:
            blocked_patterns.append("null_byte")
            threat_level = ThreatLevel.BLOCKED

        # Check for zero-width characters
        if self._has_zero_width_characters(input_text):
            blocked_patterns.append("zero_width_characters")
            threat_level = ThreatLevel.BLOCKED

        # Check blocked patterns
        for pattern, name in self.blocked_patterns:
            if pattern.search(input_text):
                blocked_patterns.append(name)
                threat_level = ThreatLevel.BLOCKED
                logger.warning(
                    f"Blocked pattern detected: {name} in input: {input_text[:100]}..."
                )

        # If already blocked, return early
        if threat_level == ThreatLevel.BLOCKED:
            return ValidationResult(
                isValid=False,
                threatLevel=threat_level,
                blockedPatterns=blocked_patterns,
                warnings=warnings,
            )

        # Check suspicious patterns
        for pattern, name in self.suspicious_patterns:
            if pattern.search(input_text):
                warnings.append(f"Suspicious pattern: {name}")
                if threat_level == ThreatLevel.SAFE:
                    threat_level = ThreatLevel.SUSPICIOUS

        # Check for unusual character sequences
        if not ALLOWED_CHARS_PATTERN.match(input_text):
            unusual_chars = self._find_unusual_characters(input_text)
            if unusual_chars:
                warnings.append(f"Unusual characters detected: {unusual_chars}")
                if threat_level == ThreatLevel.SAFE:
                    threat_level = ThreatLevel.SUSPICIOUS

        return ValidationResult(
            isValid=True,
            threatLevel=threat_level,
            blockedPatterns=blocked_patterns,
            warnings=warnings,
        )

    def _has_control_characters(self, text: str) -> bool:
        """Check for control characters (except common whitespace)."""
        for char in text:
            code = ord(char)
            # Allow common whitespace: tab (9), newline (10), carriage return (13), space (32)
            if code < 32 and code not in (9, 10, 13):
                return True
            # Check for other control characters
            if 127 <= code <= 159:
                return True
        return False

    def _has_zero_width_characters(self, text: str) -> bool:
        """Check for zero-width and invisible characters."""
        zero_width_chars = {
            "\u200b",  # Zero-width space
            "\u200c",  # Zero-width non-joiner
            "\u200d",  # Zero-width joiner
            "\u2060",  # Word joiner
            "\ufeff",  # Zero-width no-break space (BOM)
            "\u00ad",  # Soft hyphen
        }
        return any(char in text for char in zero_width_chars)

    def _find_unusual_characters(self, text: str) -> str:
        """Find and return unusual characters in the text."""
        unusual = set()
        for char in text:
            if not re.match(r"[\w\s\-.,!?'\"():;/&#+@*%$°±×÷=<>]", char, re.UNICODE):
                unusual.add(char)
        return "".join(sorted(unusual))[:20]
