from unittest.mock import patch, Mock

import pytest
import requests

from core.adapters import get_adapter, GreenhouseAdapter, LeverAdapter, AshbyAdapter


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


class TestGreenhouseAdapter:
    def _mock_response(self, json_data, status_code=200):
        response = Mock()
        response.status_code = status_code
        response.json.return_value = json_data
        response.raise_for_status.side_effect = (
            None
            if status_code == 200
            else requests.HTTPError(response=response)
        )
        return response

    @patch("core.adapters.requests.get")
    def test_fetch_listings(self, mock_get):
        mock_get.return_value = self._mock_response({
            "jobs": [
                {
                    "id": 12345,
                    "title": "Software Engineer",
                    "departments": [{"id": 1, "name": "Engineering"}],
                    "location": {"name": "San Francisco, CA"},
                    "absolute_url": "https://boards.greenhouse.io/airbnb/jobs/12345",
                }
            ]
        })
        adapter = GreenhouseAdapter()
        listings = adapter.fetch_listings("airbnb")
        assert len(listings) == 1
        assert listings[0] == {
            "external_id": "12345",
            "title": "Software Engineer",
            "department": "Engineering",
            "location": "San Francisco, CA",
            "url": "https://boards.greenhouse.io/airbnb/jobs/12345",
        }
        mock_get.assert_called_once_with(
            "https://boards-api.greenhouse.io/v1/boards/airbnb/jobs",
            params={"content": "true"},
            timeout=30,
        )

    @patch("core.adapters.requests.get")
    def test_empty_departments(self, mock_get):
        mock_get.return_value = self._mock_response({
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
    def test_http_error(self, mock_get):
        mock_get.return_value = self._mock_response({}, status_code=404)
        adapter = GreenhouseAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("nonexistent")


class TestLeverAdapter:
    def _mock_response(self, json_data, status_code=200):
        response = Mock()
        response.status_code = status_code
        response.json.return_value = json_data
        response.raise_for_status.side_effect = (
            None
            if status_code == 200
            else requests.HTTPError(response=response)
        )
        return response

    @patch("core.adapters.requests.get")
    def test_fetch_listings(self, mock_get):
        mock_get.return_value = self._mock_response([
            {
                "id": "abc-123",
                "text": "Account Manager",
                "categories": {
                    "department": "Sales",
                    "location": "New York, NY",
                },
                "hostedUrl": "https://jobs.lever.co/company/abc-123",
            }
        ])
        adapter = LeverAdapter()
        listings = adapter.fetch_listings("company")
        assert len(listings) == 1
        assert listings[0] == {
            "external_id": "abc-123",
            "title": "Account Manager",
            "department": "Sales",
            "location": "New York, NY",
            "url": "https://jobs.lever.co/company/abc-123",
        }
        mock_get.assert_called_once_with(
            "https://api.lever.co/v0/postings/company",
            params={"mode": "json"},
            timeout=30,
        )

    @patch("core.adapters.requests.get")
    def test_missing_department(self, mock_get):
        mock_get.return_value = self._mock_response([
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

    @patch("core.adapters.requests.get")
    def test_http_error(self, mock_get):
        mock_get.return_value = self._mock_response([], status_code=404)
        adapter = LeverAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("nonexistent")


class TestAshbyAdapter:
    def _mock_response(self, json_data, status_code=200):
        response = Mock()
        response.status_code = status_code
        response.json.return_value = json_data
        response.raise_for_status.side_effect = (
            None
            if status_code == 200
            else requests.HTTPError(response=response)
        )
        return response

    @patch("core.adapters.requests.get")
    def test_fetch_listings(self, mock_get):
        mock_get.return_value = self._mock_response({
            "jobs": [
                {
                    "id": "uuid-456",
                    "title": "Engineer",
                    "department": "Engineering",
                    "location": "Remote",
                    "jobUrl": "https://jobs.ashbyhq.com/company/uuid-456",
                }
            ]
        })
        adapter = AshbyAdapter()
        listings = adapter.fetch_listings("company")
        assert len(listings) == 1
        assert listings[0] == {
            "external_id": "uuid-456",
            "title": "Engineer",
            "department": "Engineering",
            "location": "Remote",
            "url": "https://jobs.ashbyhq.com/company/uuid-456",
        }
        mock_get.assert_called_once_with(
            "https://api.ashbyhq.com/posting-api/job-board/company",
            timeout=30,
        )

    @patch("core.adapters.requests.get")
    def test_http_error(self, mock_get):
        mock_get.return_value = self._mock_response({}, status_code=404)
        adapter = AshbyAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("nonexistent")
