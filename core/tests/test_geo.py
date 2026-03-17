from unittest.mock import patch, Mock

from core.geo import geocode_location


class TestGeocodeLocation:
    @patch("core.geo.Nominatim")
    def test_full_parse(self, mock_nominatim_cls):
        geocoder = Mock()
        mock_nominatim_cls.return_value = geocoder
        location = Mock()
        location.raw = {
            "address": {
                "country_code": "ca",
                "ISO3166-2-lvl4": "CA-ON",
                "city": "Toronto",
            }
        }
        geocoder.geocode.return_value = location

        result = geocode_location("Toronto, ON, Canada")
        assert result == {
            "country_code": "CA",
            "region_code": "CA-ON",
            "city": "Toronto",
        }

    @patch("core.geo.Nominatim")
    def test_country_only(self, mock_nominatim_cls):
        geocoder = Mock()
        mock_nominatim_cls.return_value = geocoder
        location = Mock()
        location.raw = {
            "address": {
                "country_code": "us",
            }
        }
        geocoder.geocode.return_value = location

        result = geocode_location("United States")
        assert result == {
            "country_code": "US",
            "region_code": None,
            "city": None,
        }

    @patch("core.geo.Nominatim")
    def test_unparseable_returns_none(self, mock_nominatim_cls):
        geocoder = Mock()
        mock_nominatim_cls.return_value = geocoder
        geocoder.geocode.return_value = None

        result = geocode_location("Remote")
        assert result == {
            "country_code": None,
            "region_code": None,
            "city": None,
        }

    @patch("core.geo.Nominatim")
    def test_exception_returns_none(self, mock_nominatim_cls):
        geocoder = Mock()
        mock_nominatim_cls.return_value = geocoder
        geocoder.geocode.side_effect = Exception("Timeout")

        result = geocode_location("Some Place")
        assert result == {
            "country_code": None,
            "region_code": None,
            "city": None,
        }

    @patch("core.geo.Nominatim")
    def test_country_with_region_no_city(self, mock_nominatim_cls):
        geocoder = Mock()
        mock_nominatim_cls.return_value = geocoder
        location = Mock()
        location.raw = {
            "address": {
                "country_code": "us",
                "ISO3166-2-lvl4": "US-CA",
            }
        }
        geocoder.geocode.return_value = location

        result = geocode_location("California, US")
        assert result == {
            "country_code": "US",
            "region_code": "US-CA",
            "city": None,
        }

    @patch("core.geo.Nominatim")
    def test_town_used_when_no_city(self, mock_nominatim_cls):
        geocoder = Mock()
        mock_nominatim_cls.return_value = geocoder
        location = Mock()
        location.raw = {
            "address": {
                "country_code": "ca",
                "ISO3166-2-lvl4": "CA-ON",
                "town": "Waterloo",
            }
        }
        geocoder.geocode.return_value = location

        result = geocode_location("Waterloo, ON")
        assert result == {
            "country_code": "CA",
            "region_code": "CA-ON",
            "city": "Waterloo",
        }

    @patch("core.geo.Nominatim")
    def test_village_used_when_no_city_or_town(self, mock_nominatim_cls):
        geocoder = Mock()
        mock_nominatim_cls.return_value = geocoder
        location = Mock()
        location.raw = {
            "address": {
                "country_code": "gb",
                "ISO3166-2-lvl4": "GB-ENG",
                "village": "Cotswold",
            }
        }
        geocoder.geocode.return_value = location

        result = geocode_location("Cotswold, England")
        assert result == {
            "country_code": "GB",
            "region_code": "GB-ENG",
            "city": "Cotswold",
        }
