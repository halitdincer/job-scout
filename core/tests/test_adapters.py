from unittest.mock import patch, Mock

import pytest
import requests

from core.adapters import (
    AshbyAdapter,
    BambooHRAdapter,
    GreenhouseAdapter,
    LeverAdapter,
    WorkdayAdapter,
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

    def test_get_workday_adapter(self):
        adapter = get_adapter("workday")
        assert isinstance(adapter, WorkdayAdapter)

    def test_get_bamboohr_adapter(self):
        adapter = get_adapter("bamboohr")
        assert isinstance(adapter, BambooHRAdapter)

    def test_unknown_platform_raises_value_error(self):
        with pytest.raises(ValueError, match="Unknown platform"):
            get_adapter("taleo")


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
        assert listing["is_listed"] is None
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
        assert listing["is_listed"] is None

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
                    "isListed": True,
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
        assert listing["is_listed"] is True

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
    def test_secondary_location_objects_are_normalized_to_strings(self, mock_get):
        mock_get.return_value = _mock_response({
            "jobs": [
                {
                    "id": "uuid-2",
                    "title": "Engineer II",
                    "location": "London",
                    "secondaryLocations": [
                        {
                            "location": "Toronto",
                            "address": {
                                "postalAddress": {
                                    "addressCountry": "Canada",
                                }
                            },
                        },
                        {
                            "location": "New York",
                        },
                    ],
                    "jobUrl": "https://jobs.ashbyhq.com/co/uuid-2",
                }
            ]
        })

        adapter = AshbyAdapter()
        listings = adapter.fetch_listings("co")

        assert listings[0]["locations"] == ["London", "Toronto", "New York"]

    @patch("core.adapters.requests.get")
    def test_does_not_emit_stringified_dict_locations(self, mock_get):
        mock_get.return_value = _mock_response({
            "jobs": [
                {
                    "id": "uuid-3",
                    "title": "Designer",
                    "location": "Toronto",
                    "secondaryLocations": [
                        {
                            "address": {
                                "postalAddress": {
                                    "addressCountry": "Canada",
                                }
                            },
                        },
                        "Montreal",
                    ],
                    "jobUrl": "https://jobs.ashbyhq.com/co/uuid-3",
                }
            ]
        })

        adapter = AshbyAdapter()
        listings = adapter.fetch_listings("co")

        assert listings[0]["locations"] == ["Toronto", "Montreal"]
        assert all("{" not in loc for loc in listings[0]["locations"])

    @patch("core.adapters.requests.get")
    def test_ignores_unsupported_secondary_location_types(self, mock_get):
        mock_get.return_value = _mock_response({
            "jobs": [
                {
                    "id": "uuid-4",
                    "title": "PM",
                    "location": "Toronto",
                    "secondaryLocations": ["Montreal", 42, None],
                    "jobUrl": "https://jobs.ashbyhq.com/co/uuid-4",
                }
            ]
        })

        adapter = AshbyAdapter()
        listings = adapter.fetch_listings("co")

        assert listings[0]["locations"] == ["Toronto", "Montreal"]

    @patch("core.adapters.requests.get")
    def test_http_error(self, mock_get):
        mock_get.return_value = _mock_response({}, status_code=404)
        adapter = AshbyAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("nonexistent")


class TestWorkdayAdapter:
    @patch("core.adapters.requests.post")
    def test_fetch_listings(self, mock_post):
        # Single page: total <= page size, one POST is enough.
        mock_post.return_value = _mock_response({
            "total": 1,
            "jobPostings": [
                {
                    "title": "Enterprise Architect",
                    "externalPath": (
                        "/job/Toronto---100-Adelaide-St-W/"
                        "Enterprise-Architect_R-6003"
                    ),
                    "timeType": "Full time",
                    "locationsText": "Toronto - 100 Adelaide St W",
                    "postedOn": "Posted Yesterday",
                    "bulletFields": ["R-6003"],
                }
            ],
        })
        adapter = WorkdayAdapter()
        listings = adapter.fetch_listings("tmx:wd3:TMX_Careers")
        assert len(listings) == 1
        listing = listings[0]
        assert listing["external_id"] == "R-6003"
        assert listing["title"] == "Enterprise Architect"
        assert listing["department"] is None
        assert listing["locations"] == ["Toronto - 100 Adelaide St W"]
        assert listing["url"] == (
            "https://tmx.wd3.myworkdayjobs.com"
            "/job/Toronto---100-Adelaide-St-W/Enterprise-Architect_R-6003"
        )
        assert listing["team"] is None
        assert listing["employment_type"] == "full_time"
        assert listing["workplace_type"] == "unknown"
        assert listing["country"] is None
        assert listing["published_at"] is None
        assert listing["updated_at_source"] is None
        assert listing["is_listed"] is None
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args.args[0] == (
            "https://tmx.wd3.myworkdayjobs.com/wday/cxs/tmx/TMX_Careers/jobs"
        )
        assert call_args.kwargs["json"]["offset"] == 0
        assert call_args.kwargs["timeout"] == 30

    @patch("core.adapters.requests.post")
    def test_paginates_until_total_reached(self, mock_post):
        # total=25, page size 20 → two POSTs at offset 0 and 20.
        page1 = _mock_response({
            "total": 25,
            "jobPostings": [
                {
                    "title": f"Job {i}",
                    "externalPath": f"/job/x/Job-{i}_J{i}",
                    "timeType": "Full time",
                    "locationsText": "Toronto",
                    "bulletFields": [f"J{i}"],
                }
                for i in range(20)
            ],
        })
        page2 = _mock_response({
            "total": 25,
            "jobPostings": [
                {
                    "title": f"Job {i}",
                    "externalPath": f"/job/x/Job-{i}_J{i}",
                    "timeType": "Full time",
                    "locationsText": "Toronto",
                    "bulletFields": [f"J{i}"],
                }
                for i in range(20, 25)
            ],
        })
        mock_post.side_effect = [page1, page2]
        adapter = WorkdayAdapter()
        listings = adapter.fetch_listings("tmx:wd3:TMX_Careers")
        assert len(listings) == 25
        assert mock_post.call_count == 2
        # Offsets must increment.
        first_offset = mock_post.call_args_list[0].kwargs["json"]["offset"]
        second_offset = mock_post.call_args_list[1].kwargs["json"]["offset"]
        assert first_offset == 0
        assert second_offset == 20

    @patch("core.adapters.requests.post")
    def test_external_id_falls_back_to_path_when_no_bullet_fields(self, mock_post):
        mock_post.return_value = _mock_response({
            "total": 1,
            "jobPostings": [
                {
                    "title": "Engineer",
                    "externalPath": "/job/Mumbai/Compliance-Analyst_REQ-050027",
                    "timeType": "Full time",
                    "locationsText": "Mumbai",
                }
            ],
        })
        adapter = WorkdayAdapter()
        listings = adapter.fetch_listings("morningstar:wd5:Americas")
        assert listings[0]["external_id"] == "Compliance-Analyst_REQ-050027"

    @patch("core.adapters.requests.post")
    def test_no_locations_when_locations_text_missing(self, mock_post):
        mock_post.return_value = _mock_response({
            "total": 1,
            "jobPostings": [
                {
                    "title": "Engineer",
                    "externalPath": "/job/x/Engineer_E1",
                    "bulletFields": ["E1"],
                }
            ],
        })
        adapter = WorkdayAdapter()
        listings = adapter.fetch_listings("tmx:wd3:TMX_Careers")
        assert listings[0]["locations"] == []
        assert listings[0]["employment_type"] == "unknown"

    @patch("core.adapters.requests.post")
    def test_empty_postings_terminates_pagination(self, mock_post):
        # Defensive: total claims more, but jobPostings is empty.
        mock_post.return_value = _mock_response({"total": 100, "jobPostings": []})
        adapter = WorkdayAdapter()
        listings = adapter.fetch_listings("tmx:wd3:TMX_Careers")
        assert listings == []
        assert mock_post.call_count == 1

    def test_invalid_board_id_raises(self):
        adapter = WorkdayAdapter()
        with pytest.raises(ValueError, match="board_id"):
            adapter.fetch_listings("not-a-valid-id")

    @patch("core.adapters.requests.post")
    def test_http_error(self, mock_post):
        mock_post.return_value = _mock_response({}, status_code=500)
        adapter = WorkdayAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("tmx:wd3:TMX_Careers")


class TestBambooHRAdapter:
    @patch("core.adapters.requests.get")
    def test_fetch_listings(self, mock_get):
        mock_get.return_value = _mock_response({
            "meta": {"totalCount": 1},
            "result": [
                {
                    "id": "320",
                    "jobOpeningName": "Senior Associate, Compliance",
                    "departmentId": "18570",
                    "departmentLabel": "Compliance",
                    "employmentStatusLabel": "Full-Time",
                    "location": {"city": "Toronto", "state": "Ontario"},
                    "atsLocation": {
                        "country": None,
                        "state": None,
                        "province": None,
                        "city": None,
                    },
                    "isRemote": None,
                    "locationType": "2",
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("pictonmahoney")
        assert len(listings) == 1
        listing = listings[0]
        assert listing["external_id"] == "320"
        assert listing["title"] == "Senior Associate, Compliance"
        assert listing["department"] == "Compliance"
        assert listing["locations"] == ["Toronto, Ontario"]
        assert listing["url"] == "https://pictonmahoney.bamboohr.com/careers/320"
        assert listing["team"] is None
        assert listing["employment_type"] == "full_time"
        assert listing["workplace_type"] == "on_site"
        assert listing["country"] is None
        assert listing["published_at"] is None
        assert listing["updated_at_source"] is None
        assert listing["is_listed"] is None
        mock_get.assert_called_once_with(
            "https://pictonmahoney.bamboohr.com/careers/list",
            headers={"Accept": "application/json"},
            timeout=30,
        )

    @patch("core.adapters.requests.get")
    def test_isremote_true_overrides_location_type(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "1",
                    "jobOpeningName": "Remote Engineer",
                    "departmentLabel": "Engineering",
                    "employmentStatusLabel": "Full-Time",
                    "location": {"city": None, "state": None},
                    "atsLocation": {
                        "country": "Canada",
                        "state": None,
                        "province": None,
                        "city": None,
                    },
                    "isRemote": True,
                    "locationType": "2",
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["workplace_type"] == "remote"
        # Falls through to atsLocation when location is empty.
        assert listings[0]["locations"] == ["Canada"]

    @patch("core.adapters.requests.get")
    def test_location_type_one_means_remote(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "2",
                    "jobOpeningName": "Distributed Role",
                    "departmentLabel": "Sales",
                    "employmentStatusLabel": "Part-Time",
                    "location": {"city": None, "state": None},
                    "atsLocation": {"country": None},
                    "isRemote": None,
                    "locationType": "1",
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["workplace_type"] == "remote"
        assert listings[0]["employment_type"] == "part_time"
        assert listings[0]["locations"] == []

    @patch("core.adapters.requests.get")
    def test_location_type_three_means_hybrid(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "3",
                    "jobOpeningName": "Hybrid PM",
                    "departmentLabel": "Product",
                    "employmentStatusLabel": "Contract",
                    "location": {"city": "Toronto", "state": "Ontario"},
                    "atsLocation": {},
                    "isRemote": False,
                    "locationType": "3",
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["workplace_type"] == "hybrid"
        assert listings[0]["employment_type"] == "contract"

    @patch("core.adapters.requests.get")
    def test_unknown_workplace_type_when_no_signals(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "4",
                    "jobOpeningName": "Mystery Role",
                    "departmentLabel": "Unknown",
                    "employmentStatusLabel": None,
                    "location": {"city": None, "state": None},
                    "atsLocation": {},
                    "isRemote": None,
                    "locationType": None,
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["workplace_type"] == "unknown"
        assert listings[0]["employment_type"] == "unknown"
        assert listings[0]["locations"] == []

    @patch("core.adapters.requests.get")
    def test_location_city_only(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "5",
                    "jobOpeningName": "City Only",
                    "location": {"city": "Toronto", "state": None},
                    "atsLocation": {},
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["locations"] == ["Toronto"]

    @patch("core.adapters.requests.get")
    def test_location_state_only(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "6",
                    "jobOpeningName": "State Only",
                    "location": {"city": None, "state": "Ontario"},
                    "atsLocation": {},
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["locations"] == ["Ontario"]

    @patch("core.adapters.requests.get")
    def test_ats_location_city_and_state_fallback(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "7",
                    "jobOpeningName": "ATS City+State",
                    "location": {},
                    "atsLocation": {"city": "Calgary", "province": "Alberta"},
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["locations"] == ["Calgary, Alberta"]

    @patch("core.adapters.requests.get")
    def test_ats_location_city_only_fallback(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "8",
                    "jobOpeningName": "ATS City Only",
                    "location": {},
                    "atsLocation": {"city": "Calgary"},
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["locations"] == ["Calgary"]

    @patch("core.adapters.requests.get")
    def test_ats_location_state_only_fallback(self, mock_get):
        mock_get.return_value = _mock_response({
            "result": [
                {
                    "id": "9",
                    "jobOpeningName": "ATS State Only",
                    "location": {},
                    "atsLocation": {"state": "Quebec"},
                }
            ],
        })
        adapter = BambooHRAdapter()
        listings = adapter.fetch_listings("co")
        assert listings[0]["locations"] == ["Quebec"]

    @patch("core.adapters.requests.get")
    def test_empty_results(self, mock_get):
        mock_get.return_value = _mock_response({"result": []})
        adapter = BambooHRAdapter()
        assert adapter.fetch_listings("co") == []

    @patch("core.adapters.requests.get")
    def test_http_error(self, mock_get):
        mock_get.return_value = _mock_response({}, status_code=404)
        adapter = BambooHRAdapter()
        with pytest.raises(requests.HTTPError):
            adapter.fetch_listings("nonexistent")
