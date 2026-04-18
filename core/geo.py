import logging
import re

from geopy.geocoders import Nominatim

logger = logging.getLogger(__name__)

EMPTY_RESULT = {"country_code": None, "region_code": None, "city": None}

_INTERNAL_PREFIX_RE = re.compile(r"^(?:Fins Only|FutureSite)-", re.IGNORECASE)
_CODED_LOCATION_RE = re.compile(r"^([A-Z]{2})-(.+)$")
_REMOTE_DASH_RE = re.compile(r"^Remote\s+[–—-]\s*(.+)$", re.IGNORECASE)
_REMOTE_PAREN_RE = re.compile(r"^Remote\s*\(([^)]+)\)$", re.IGNORECASE)
_REMOTE_IN_RE = re.compile(r"^Remote\s+in\s+(?:the\s+)?(.+)$", re.IGNORECASE)
_NOISE_TOKENS = frozenset({"Remote", "MSO"})


def _clean_location_name(name):
    """Clean a location tag name into a form Nominatim can geocode."""
    text = name.strip()
    if not text or text.startswith("&"):
        return None

    # Strip internal prefixes
    text = _INTERNAL_PREFIX_RE.sub("", text)

    # Handle XX-...-Remote/MSO coded patterns
    m = _CODED_LOCATION_RE.match(text)
    if m:
        rest = m.group(2)
        rest = re.sub(r"^Remote-", "", rest)
        parts = [p.strip() for p in rest.split("-")]
        parts = [p for p in parts if p not in _NOISE_TOKENS]
        if len(parts) > 1 and any(
            w in parts[-1] for w in ("Building", "CrunchyData")
        ):
            parts = parts[:-1]
        parts = [p.replace(" Metro", "").strip() for p in parts]
        parts = [p for p in parts if p]
        return ", ".join(reversed(parts)) if parts else None

    # Handle "Remote - Place"
    m = _REMOTE_DASH_RE.match(text)
    if m:
        place = m.group(1).strip()
        return None if "multiple" in place.lower() else place

    # Handle "Remote (Place)"
    m = _REMOTE_PAREN_RE.match(text)
    if m:
        return m.group(1).strip()

    # Handle "Remote in [the] Place"
    m = _REMOTE_IN_RE.match(text)
    if m:
        return m.group(1).strip()

    # Strip "Remote-Friendly (...)" prefix
    text = re.sub(
        r"^Remote-Friendly\b(?:\s*\([^)]*\))?[\s,]*", "", text, flags=re.IGNORECASE
    ).strip()
    # Strip "Hybrid -" prefix
    text = re.sub(r"^Hybrid\s*[–—-]\s*", "", text, flags=re.IGNORECASE).strip()
    # Strip " - Remote..." suffix (e.g., "Canada - Remote (ON, AB, BC,")
    text = re.sub(r"\s*-\s*Remote\b.*$", "", text, flags=re.IGNORECASE).strip()
    # Strip trailing ", Remote" / ", Remote (U.S.)"
    text = re.sub(
        r",\s*Remote\b(?:\s*\([^)]*\))?(?=,|$)", "", text, flags=re.IGNORECASE
    ).strip()
    # Strip "Place (Remote ...)" annotations (including nested parens)
    text = re.sub(r"\s*\(Remote[^)]*\)*$", "", text, flags=re.IGNORECASE).strip()
    # Strip "(Office Mix)" / "(Home Mix)" annotations
    text = re.sub(r"\s*\([^)]*(?:Mix|Office)\)", "", text, flags=re.IGNORECASE).strip()
    # Strip "Anywhere" suffix
    text = re.sub(r"\s+Anywhere$", "", text, flags=re.IGNORECASE).strip()

    # If still starts with "Remote", not geocodable
    if re.match(r"^Remote\b", text, re.IGNORECASE):
        return None

    return text or None


def geocode_location(name):
    cleaned = _clean_location_name(name)
    if cleaned is None:
        return dict(EMPTY_RESULT)

    try:
        geolocator = Nominatim(user_agent="job-scout", timeout=2)
        location = geolocator.geocode(cleaned, addressdetails=True)
    except Exception:
        logger.warning("Geocoding failed for '%s'", name)
        return dict(EMPTY_RESULT)

    if not location:
        logger.warning("No geocode result for '%s' (cleaned: '%s')", name, cleaned)
        return dict(EMPTY_RESULT)

    address = location.raw.get("address", {})
    country_code = address.get("country_code", "").upper() or None

    region_code = address.get("ISO3166-2-lvl4")

    city = (
        address.get("city")
        or address.get("town")
        or address.get("village")
    )

    return {
        "country_code": country_code,
        "region_code": region_code,
        "city": city,
    }
