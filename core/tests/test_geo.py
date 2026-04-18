from unittest.mock import patch, Mock

from core.geo import _clean_location_name, geocode_location


class TestCleanLocationName:
    def test_coded_country_remote(self):
        assert _clean_location_name("DE-Germany-Remote") == "Germany"

    def test_coded_city_mso(self):
        assert _clean_location_name("CH-Zurich-MSO") == "Zurich"

    def test_coded_state_city_remote(self):
        assert _clean_location_name("US-WA-Seattle-Remote") == "Seattle, WA"

    def test_coded_with_building_suffix(self):
        assert _clean_location_name("DE-Berlin-Trion Building") == "Berlin"

    def test_coded_with_fins_only_prefix(self):
        assert _clean_location_name("Fins Only-KR-Seoul-MSO") == "Seoul"

    def test_coded_with_futuresite_prefix(self):
        assert _clean_location_name("FutureSite-DE-Berlin") == "Berlin"

    def test_coded_remote_in_middle(self):
        assert _clean_location_name("CA-Remote-British Columbia") == "British Columbia"

    def test_coded_metro_stripped(self):
        assert _clean_location_name("US-NJ Metro-Remote") == "NJ"

    def test_remote_dash_place(self):
        assert _clean_location_name("Remote - France") == "France"

    def test_remote_endash_place(self):
        assert _clean_location_name("Remote \u2013 San Francisco, California") == "San Francisco, California"

    def test_remote_paren_place(self):
        assert _clean_location_name("Remote (Singapore)") == "Singapore"

    def test_remote_in_place(self):
        assert _clean_location_name("Remote in Canada") == "Canada"

    def test_remote_in_the_place(self):
        assert _clean_location_name("Remote in the US") == "US"

    def test_trailing_remote(self):
        assert _clean_location_name("California, USA, Remote") == "California, USA"

    def test_trailing_remote_with_annotation(self):
        assert _clean_location_name("New York, Remote (U.S.)") == "New York"

    def test_place_remote_annotation(self):
        assert _clean_location_name("New York (Remote (U.S.))") == "New York"

    def test_country_dash_remote(self):
        assert _clean_location_name("Ireland-remote") == "Ireland"

    def test_canada_dash_remote_unclosed(self):
        assert _clean_location_name("Canada - Remote (ON, AB, BC,") == "Canada"

    def test_hybrid_prefix(self):
        assert _clean_location_name("Hybrid - Luxembourg") == "Luxembourg"

    def test_office_mix_stripped(self):
        assert _clean_location_name("Barcelona (Office Mix)") == "Barcelona"

    def test_home_mix_stripped(self):
        assert _clean_location_name("United States of America (Home Mix)") == "United States of America"

    def test_anywhere_stripped(self):
        assert _clean_location_name("Ukraine Anywhere") == "Ukraine"

    def test_remote_friendly_comma(self):
        assert _clean_location_name("Remote-Friendly, United States") == "United States"

    def test_remote_multiple_locations_skipped(self):
        assert _clean_location_name("Remote - Multiple Locations") is None

    def test_bare_remote_skipped(self):
        assert _clean_location_name("Remote US and Canada") is None

    def test_ampersand_skipped(self):
        assert _clean_location_name("& 13 other countries") is None

    def test_empty_skipped(self):
        assert _clean_location_name("") is None

    def test_clean_name_passthrough(self):
        assert _clean_location_name("San Francisco, CA") == "San Francisco, CA"

    def test_country_remote_only_code(self):
        assert _clean_location_name("US-USA-Remote") == "USA"

    def test_hyderabad_remote_india(self):
        assert _clean_location_name("Hyderabad, Remote, India") == "Hyderabad, India"


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
    def test_no_nominatim_result_returns_none(self, mock_nominatim_cls):
        geocoder = Mock()
        mock_nominatim_cls.return_value = geocoder
        geocoder.geocode.return_value = None

        result = geocode_location("Nonexistent Place")
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
