from core.location_normalization import (
    _split_location_text,
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
