import ast
import re

_COMPOSITE_LOCATION_SPLIT_RE = re.compile(
    r"\s+or\s+|\s+/\s+|;|\s*\|\s*|\s*[•·]\s*", re.IGNORECASE
)

_PROFILE_REGISTRY = {
    ("greenhouse", "stripe"): "stripe",
}


def get_parsing_profile(platform, board_id):
    return _PROFILE_REGISTRY.get((platform, board_id), "default")


def _split_location_text(value):
    if not isinstance(value, str):
        return []

    return [part.strip() for part in _COMPOSITE_LOCATION_SPLIT_RE.split(value) if part.strip()]


_CITY_STATE_COUNTRY_RE = re.compile(
    r"^[A-Za-z .'\-]+, [A-Z]{2}(, [A-Z]{2})?$"
)

_REMOTE_VARIANT_RE = re.compile(
    r"^(Remote|US[- ]?Remote|CA[- ]?Remote|Canada[- ]?Remote|"
    r"Remote[ -]US|Remote[ -]Canada|Remote in .+)$",
    re.IGNORECASE,
)


def _split_stripe_location(value):
    if not isinstance(value, str):  # pragma: no cover — guarded by caller
        return []

    text = value.strip()
    if not text:  # pragma: no cover — guarded by caller
        return []

    base_tokens = _split_location_text(text)
    if len(base_tokens) != 1 or base_tokens[0] != text:
        return base_tokens

    if _CITY_STATE_COUNTRY_RE.match(text):
        return [text]

    if _REMOTE_VARIANT_RE.match(text):
        return [text]

    parts = [p.strip() for p in text.split(",") if p.strip()]
    if len(parts) >= 2:
        return parts

    return [text]


def normalize_location_value(raw, profile="default"):
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

    if profile == "stripe":
        return _split_stripe_location(text)

    return _split_location_text(text)


def normalize_location_values(raw_values, profile="default"):
    names = []
    seen = set()

    for raw in raw_values:
        for token in normalize_location_value(raw, profile=profile):
            if token not in seen:
                seen.add(token)
                names.append(token)

    return names
