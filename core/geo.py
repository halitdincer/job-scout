import logging

from geopy.geocoders import Nominatim

logger = logging.getLogger(__name__)

EMPTY_RESULT = {"country_code": None, "region_code": None, "city": None}


def geocode_location(name):
    try:
        geolocator = Nominatim(user_agent="job-scout")
        location = geolocator.geocode(name, addressdetails=True)
    except Exception:
        logger.warning("Geocoding failed for '%s'", name)
        return dict(EMPTY_RESULT)

    if not location:
        logger.warning("No geocode result for '%s'", name)
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
