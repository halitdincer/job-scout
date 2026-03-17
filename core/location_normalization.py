import ast
import re

_COMPOSITE_LOCATION_SPLIT_RE = re.compile(r"\s+or\s+|\s+/\s+|;", re.IGNORECASE)


def _split_location_text(value):
    if not isinstance(value, str):
        return []

    return [part.strip() for part in _COMPOSITE_LOCATION_SPLIT_RE.split(value) if part.strip()]


def normalize_location_value(raw):
    if not isinstance(raw, str):
        return []

    text = raw.strip()
    if not text:
        return []

    if text.startswith("{") and text.endswith("}"):
        try:
            parsed = ast.literal_eval(text)
        except (ValueError, SyntaxError):
            return []

        if isinstance(parsed, dict):
            location = parsed.get("location")
            if isinstance(location, str):
                return _split_location_text(location)
            return []

    return _split_location_text(text)


def normalize_location_values(raw_values):
    names = []
    seen = set()

    for raw in raw_values:
        for token in normalize_location_value(raw):
            if token not in seen:
                seen.add(token)
                names.append(token)

    return names
