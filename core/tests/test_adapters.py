from unittest.mock import patch, Mock

import pytest
import requests

from core.adapters import (
    AshbyAdapter,
    GreenhouseAdapter,
    LeverAdapter,
    get_adapter,
    normalize_employment_type,
    normalize_workplace_type,
)


class TestNormalizationHelpers:
    def test_employment_type_permanent(self):
        assert normalize_employment_type("Permanent") == "full_time"

    def test_employment_type_fulltime(self):
        assert normalize_employment_type("FullTime") == "full_time"

    def test_employment_type_contract(self):
        assert normalize_employment_type("Contract") == "contract"

    def test_employment_type_intern(self):
        assert normalize_employment_type("Intern") == "intern"

    def test_employment_type_none_returns_unknown(self):
        assert normalize_employment_type(None) == "unknown"

    def test_employment_type_empty_returns_unknown(self):
        assert normalize_employment_type("") == "unknown"

    def test_employment_type_unrecognized_returns_unknown(self):
        assert normalize_employment_type("Freelance") == "unknown"

    def test_workplace_type_remote(self):
        assert normalize_workplace_type("remote") == "remote"

    def test_workplace_type_hybrid(self):
        assert normalize_workplace_type("hybrid") == "hybrid"

    def test_workplace_type_onsite(self):
        assert normalize_workplace_type("onsite") == "on_site"

    def test_workplace_type_none_returns_unknown(self):
        assert normalize_workplace_type(None) == "unknown"

    def test_workplace_type_empty_returns_unknown(self):
        assert normalize_workplace_type("") == "unknown"

    def test_workplace_type_unrecognized_returns_unknown(self):
        assert normalize_workplace_type("flexible") == "unknown"


class TestAdapterRegistry:
    def test_get_greenhouse_adapter(self):
        adapter = get_adapter("greenhouse")
        assert isinstance(adapter, GreenhouseAdapter)

    def test_get_lever_adapter(self):
        adapter = get_adapter("lever")
        assert isinstance(adapter, LeverAdapter)

    def test_get_ashby_adapter(self):
        adapter = get_adapter("ashby")
        assert isinstance(adapter, AshbyAdapter)

    def test_unknown_platform_raises_value_error(self):
        with pytest.raises(ValueError, match="Unknown platform"):
            get_adapter("workday")


def _mock_response(json_data, status_code=200):
    response = Mock()
    response.status_code = status_code
    response.json.return_value = json_data
    response.raise_for_status.side_effect = (
        None
        if status_code == 200
        else requests.HTTPError(response=response)
    )
    return response


class TestGreenhouseAdapter:
    @patch("core.adapters.requests.get")
    def test_fetch_listings(self, mock_get):
        mock_get.return_value = _mock_response({
            "jobs": [
                {
                    "id": 12345,
                    "title": "Software Engineer",
                    "departments": [{"id": 1, "name": "Engineering"}],
                    "location": {"name": "San Francisco, CA"},
                    "absolute_url": "https://boards.greenhouse.io/airbnb/jobs/12345",
                    "first_published": "2026-01-15T10:00:00-05:00",
                    "updated_at": "2026-03-01T12:00:00-05:00",
                }
            ]
        })
        adapter = GreenhouseAdapter()
        listings = adapter.fetch_listings("airbnb")
        assert len(listings) == 1
        listing = listings[0]
        assert listing["external_id"] == "12345"
        assert listing["title"] == "Software Engineer"
        assert listing["department"] == "Engineering"
        assert listing["locations"] == ["San Francisco, CA"]
        assert listing["url"] == "https://boards.greenhouse.io/airbnb/jobs/12345"
        assert listing["team"] is None
        assert listing["employment_type"] == "unknown"
        assert listing["workplace_type"] == "unknown"
        assert listing["country"] is None
        assert listing["published_at"] == "2026-01-15T10:00:00-05:00"
        assert listing["updated_at_source"] == "2026-03-01T12:00:00-05:00"
        mock_get.assert_called_once_with(
            "https://boards-api.greenhouse.io/v1/boards/airbnb/jobs",
            params={"content": "true"},
            timeout=30,
        )

    @patch("core.adapters.requests.get")
    def test_empty_departments(self, mock_get):
        mock_get.return_value = _mock_response({
            "jobs": [
                {
                    "id": 99,
                    "title": "Designer",
                    "departments": [],
                    "location": {"name": "Remote"},
                    "absolute_url": "https://example.com/99",
                }
            ]
        })
        adapter = GreenhouseAdapter()
        listings = adapter.fetch_listings("test")
        assert listings[0]["department"] is None

    @patch("core.adapters.requests.get")
    def test_no_location(self, mock_get):
        mock_get.return_value = _mock_response({
            "jobs": [
                {
                    "id": 99,
                    "title": "Designer",
                    "departments": [],
                    "absolute_url": "https://example.com/99",
                }
            ]
        })
        adapter = GreenhouseAdapter()
        listings = adapter.fetch_listings("test")
        assert listings[0]["locations"] == []

    @patch("core.adapters.requests.get")
    def test_http_error(self, mock_get):
        mock_get.return_value = _mock_response({}, status_code=404)
        adapter = GreenhouseAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("nonexistent")


class TestLeverAdapter:
    @patch("core.adapters.requests.get")
    def test_fetch_listings(self, mock_get):
        mock_get.return_value = _mock_response([
            {
                "id": "abc-123",
                "text": "Account Manager",
                "categories": {
                    "department": "Sales",
                    "location": "New York, NY",
                    "allLocations": ["New York, NY", "London"],
                    "team": "Enterprise",
                    "commitment": "Permanent",
                },
                "hostedUrl": "https://jobs.lever.co/company/abc-123",
                "workplaceType": "hybrid",
                "country": "US",
                "createdAt": 1704067200000,
            }
        ])
        adapter = LeverAdapter()
        listings = adapter.fetch_listings("company")
        assert len(listings) == 1
        listing = listings[0]
        assert listing["external_id"] == "abc-123"
        assert listing["title"] == "Account Manager"
        assert listing["department"] == "Sales"
        assert listing["locations"] == ["New York, NY", "London"]
        assert listing["url"] == "https://jobs.lever.co/company/abc-123"
        assert listing["team"] == "Enterprise"
        assert listing["employment_type"] == "full_time"
        assert listing["workplace_type"] == "hybrid"
        assert listing["country"] == "US"
        assert listing["published_at"] == "2024-01-01T00:00:00+00:00"
        assert listing["updated_at_source"] is None

    @patch("core.adapters.requests.get")
    def test_missing_department(self, mock_get):
        mock_get.return_value = _mock_response([
            {
                "id": "xyz",
                "text": "Intern",
                "categories": {"location": "Remote"},
                "hostedUrl": "https://jobs.lever.co/co/xyz",
            }
        ])
        adapter = LeverAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["department"] is None
        assert listings[0]["locations"] == []
        assert listings[0]["team"] is None
        assert listings[0]["employment_type"] == "unknown"
        assert listings[0]["workplace_type"] == "unknown"

    @patch("core.adapters.requests.get")
    def test_http_error(self, mock_get):
        mock_get.return_value = _mock_response([], status_code=404)
        adapter = LeverAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("nonexistent")


class TestAshbyAdapter:
    @patch("core.adapters.requests.get")
    def test_fetch_listings(self, mock_get):
        mock_get.return_value = _mock_response({
            "jobs": [
                {
                    "id": "uuid-456",
                    "title": "Engineer",
                    "department": "Engineering",
                    "location": "London",
                    "secondaryLocations": ["Toronto", "New York"],
                    "team": "Applied-ML",
                    "employmentType": "FullTime",
                    "workplaceType": "Remote",
                    "address": {
                        "postalAddress": {
                            "addressCountry": "United Kingdom",
                        }
                    },
                    "publishedAt": "2026-01-15T10:00:00+00:00",
                    "jobUrl": "https://jobs.ashbyhq.com/company/uuid-456",
                }
            ]
        })
        adapter = AshbyAdapter()
        listings = adapter.fetch_listings("company")
        assert len(listings) == 1
        listing = listings[0]
        assert listing["external_id"] == "uuid-456"
        assert listing["title"] == "Engineer"
        assert listing["department"] == "Engineering"
        assert listing["locations"] == ["London", "Toronto", "New York"]
        assert listing["url"] == "https://jobs.ashbyhq.com/company/uuid-456"
        assert listing["team"] == "Applied-ML"
        assert listing["employment_type"] == "full_time"
        assert listing["workplace_type"] == "remote"
        assert listing["country"] == "United Kingdom"
        assert listing["published_at"] == "2026-01-15T10:00:00+00:00"
        assert listing["updated_at_source"] is None

    @patch("core.adapters.requests.get")
    def test_no_secondary_locations(self, mock_get):
        mock_get.return_value = _mock_response({
            "jobs": [
                {
                    "id": "uuid-1",
                    "title": "Designer",
                    "location": "Toronto",
                    "jobUrl": "https://jobs.ashbyhq.com/co/uuid-1",
                }
            ]
        })
        adapter = AshbyAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["locations"] == ["Toronto"]
        assert listings[0]["team"] is None
        assert listings[0]["employment_type"] == "unknown"
        assert listings[0]["workplace_type"] == "unknown"
        assert listings[0]["country"] is None

    @patch("core.adapters.requests.get")
    def test_http_error(self, mock_get):
        mock_get.return_value = _mock_response({}, status_code=404)
        adapter = AshbyAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("nonexistent")
