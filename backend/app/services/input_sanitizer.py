"""Input sanitization for prompt injection protection."""

import re
import unicodedata

from app.models.prompt_guard import SanitizationResult


class InputSanitizer:
    """Sanitizes user input to remove potential injection vectors."""

    # Characters that could be used as prompt delimiters
    DELIMITER_CHARS = {
        "```": "[code]",
        "---": "-",
        "===": "=",
        "<<<": "<",
        ">>>": ">",
        "###": "#",
        "***": "*",
    }

    # Zero-width and invisible characters to remove
    INVISIBLE_CHARS = {
        "\u200b",  # Zero-width space
        "\u200c",  # Zero-width non-joiner
        "\u200d",  # Zero-width joiner
        "\u2060",  # Word joiner
        "\ufeff",  # Zero-width no-break space (BOM)
        "\u00ad",  # Soft hyphen
        "\u034f",  # Combining grapheme joiner
        "\u2028",  # Line separator
        "\u2029",  # Paragraph separator
    }

    def sanitize(self, input_text: str) -> SanitizationResult:
        """Sanitize input text by removing/escaping dangerous content."""
        modifications: list[str] = []
        result = input_text

        # Step 1: Unicode normalization (NFC form)
        normalized = unicodedata.normalize("NFC", result)
        if normalized != result:
            modifications.append("unicode_normalized")
            result = normalized

        # Step 2: Remove null bytes
        if "\x00" in result:
            result = result.replace("\x00", "")
            modifications.append("null_bytes_removed")

        # Step 3: Remove zero-width and invisible characters
        for char in self.INVISIBLE_CHARS:
            if char in result:
                result = result.replace(char, "")
                modifications.append(f"invisible_char_removed_{hex(ord(char))}")

        # Step 4: Normalize whitespace
        original_len = len(result)
        result = self._normalize_whitespace(result)
        if len(result) != original_len:
            modifications.append("whitespace_normalized")

        # Step 5: Replace potential delimiter sequences
        for delimiter, replacement in self.DELIMITER_CHARS.items():
            if delimiter in result:
                result = result.replace(delimiter, replacement)
                modifications.append(f"delimiter_escaped_{delimiter}")

        # Step 6: Escape XML-like tags that could interfere with prompt structure
        result, escaped = self._escape_xml_tags(result)
        if escaped:
            modifications.append("xml_tags_escaped")

        # Step 7: Remove excessive repeated characters (e.g., "!!!!!" -> "!!")
        result, reduced = self._reduce_repeated_chars(result)
        if reduced:
            modifications.append("repeated_chars_reduced")

        # Step 8: Trim to max length (should already be validated, but safety check)
        if len(result) > 500:
            result = result[:500]
            modifications.append("truncated")

        return SanitizationResult(
            original=input_text,
            sanitized=result.strip(),
            modifications=modifications,
        )

    def _normalize_whitespace(self, text: str) -> str:
        """Normalize whitespace: collapse multiple spaces, handle newlines."""
        # Replace multiple newlines with single newline
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Replace multiple spaces with single space
        text = re.sub(r" {2,}", " ", text)
        # Replace tabs with spaces
        text = text.replace("\t", " ")
        # Remove leading/trailing whitespace from each line
        lines = [line.strip() for line in text.split("\n")]
        return "\n".join(lines)

    def _escape_xml_tags(self, text: str) -> tuple[str, bool]:
        """Escape XML-like tags that could interfere with prompt delimiters."""
        escaped = False
        # Match potential XML tags but preserve legitimate uses
        # We escape tags that look like they could be prompt injection markers
        dangerous_tags = [
            r"<\|[^|]+\|>",  # Special tokens like <|system|>
            r"</?system>",
            r"</?user>",
            r"</?assistant>",
            r"</?prompt>",
            r"</?instruction>",
            r"\[INST\]",
            r"\[/INST\]",
        ]

        for pattern in dangerous_tags:
            if re.search(pattern, text, re.IGNORECASE):
                text = re.sub(
                    pattern, lambda m: f"[{m.group(0)}]", text, flags=re.IGNORECASE
                )
                escaped = True

        return text, escaped

    def _reduce_repeated_chars(self, text: str) -> tuple[str, bool]:
        """Reduce excessive repeated punctuation characters."""
        reduced = False
        # Match 3 or more of the same punctuation character
        pattern = r"([!?.,;:*#\-=+])\1{2,}"
        if re.search(pattern, text):
            text = re.sub(pattern, r"\1\1", text)
            reduced = True
        return text, reduced
