from core.location_normalization import (
    _split_location_text,
    get_parsing_profile,
    normalize_location_value,
    normalize_location_values,
)


class TestLocationNormalization:
    def test_non_string_value_returns_empty(self):
        assert normalize_location_value(123) == []

    def test_split_helper_non_string_returns_empty(self):
        assert _split_location_text(123) == []

    def test_empty_string_returns_empty(self):
        assert normalize_location_value("   ") == []

    def test_invalid_dict_literal_returns_empty(self):
        assert normalize_location_value("{'location': bad}") == []

    def test_split_semicolon_slash_or_patterns(self):
        assert normalize_location_value("Chicago / Remote; Toronto or Vancouver") == [
            "Chicago",
            "Remote",
            "Toronto",
            "Vancouver",
        ]

    def test_normalize_values_deduplicates(self):
        assert normalize_location_values(["Chicago / Remote", "Chicago", "Remote"]) == [
            "Chicago",
            "Remote",
        ]


class TestParsingProfileResolution:
    def test_default_profile_for_unknown_source(self):
        profile = get_parsing_profile("greenhouse", "unknown-board")
        assert profile == "default"

    def test_stripe_profile_resolved(self):
        profile = get_parsing_profile("greenhouse", "stripe")
        assert profile == "stripe"

    def test_default_profile_for_pinterest(self):
        profile = get_parsing_profile("greenhouse", "pinterest")
        assert profile == "default"

    def test_default_profile_for_none_args(self):
        profile = get_parsing_profile(None, None)
        assert profile == "default"


class TestStripeCommaParsing:
    def test_splits_abbreviation_multi_location(self):
        assert normalize_location_value("SF, NYC, CHI, SEA", profile="stripe") == [
            "SF",
            "NYC",
            "CHI",
            "SEA",
        ]

    def test_splits_full_name_multi_location(self):
        assert normalize_location_value(
            "San Francisco, Seattle, New York, Chicago", profile="stripe"
        ) == ["San Francisco", "Seattle", "New York", "Chicago"]

    def test_splits_mixed_with_remote(self):
        assert normalize_location_value(
            "US-Remote, Toronto", profile="stripe"
        ) == ["US-Remote", "Toronto"]

    def test_preserves_city_state_country(self):
        assert normalize_location_value(
            "San Francisco, CA, US", profile="stripe"
        ) == ["San Francisco, CA, US"]

    def test_preserves_city_state(self):
        assert normalize_location_value(
            "Toronto, ON", profile="stripe"
        ) == ["Toronto, ON"]

    def test_preserves_remote_variant(self):
        assert normalize_location_value(
            "Remote in the US", profile="stripe"
        ) == ["Remote in the US"]

    def test_preserves_us_remote(self):
        assert normalize_location_value(
            "US-Remote", profile="stripe"
        ) == ["US-Remote"]

    def test_still_splits_semicolons(self):
        assert normalize_location_value(
            "Chicago; Toronto", profile="stripe"
        ) == ["Chicago", "Toronto"]

    def test_still_splits_slash(self):
        assert normalize_location_value(
            "Chicago / Remote", profile="stripe"
        ) == ["Chicago", "Remote"]

    def test_single_location_unchanged(self):
        assert normalize_location_value("Toronto", profile="stripe") == ["Toronto"]

    def test_non_string_returns_empty_stripe(self):
        assert normalize_location_value(42, profile="stripe") == []

    def test_empty_string_returns_empty_stripe(self):
        assert normalize_location_value("  ", profile="stripe") == []


class TestPipeBulletSplitting:
    def test_pipe_separated(self):
        assert normalize_location_value("San Francisco, CA | New York City, NY") == [
            "San Francisco, CA",
            "New York City, NY",
        ]

    def test_bullet_separated(self):
        assert normalize_location_value("San Francisco, CA • New York, NY") == [
            "San Francisco, CA",
            "New York, NY",
        ]

    def test_pipe_with_remote_prefix(self):
        result = normalize_location_value(
            "Remote-Friendly (Travel-Required) | San Francisco, CA | Seattle, WA"
        )
        assert result == [
            "Remote-Friendly (Travel-Required)",
            "San Francisco, CA",
            "Seattle, WA",
        ]

    def test_middle_dot_separated(self):
        assert normalize_location_value("Sydney, Australia · Melbourne, Australia") == [
            "Sydney, Australia",
            "Melbourne, Australia",
        ]


class TestNonStripeRegression:
    def test_pinterest_city_state_country_not_split(self):
        assert normalize_location_value(
            "San Francisco, CA, US", profile="default"
        ) == ["San Francisco, CA, US"]

    def test_default_does_not_comma_split(self):
        assert normalize_location_value(
            "SF, NYC, CHI", profile="default"
        ) == ["SF, NYC, CHI"]

    def test_default_still_splits_semicolons(self):
        assert normalize_location_value(
            "San Francisco, CA, US; Remote, US", profile="default"
        ) == ["San Francisco, CA, US", "Remote, US"]
