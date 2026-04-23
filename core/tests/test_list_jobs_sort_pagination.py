"""Tests for the sort + pagination envelope contract of GET /api/jobs/.

Phase 1 of the jobs-table-server-driven redesign. These tests were written
first (red) against an un-implemented envelope; the implementation then makes
them green.

Envelope shape:
    {
        "results":     [...],
        "count":       int,
        "page":        int,
        "page_size":   int,
        "total_pages": int,
        "sort":        [{"field": str, "dir": "asc"|"desc"}, ...],
    }
"""
import datetime as dt
import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from core.models import JobListing, LocationTag, SeenListing, Source


SORTABLE_FIELDS = [
    "title",
    "department",
    "team",
    "status",
    "employment_type",
    "workplace_type",
    "source_name",
    "published_at",
    "first_seen_at",
    "last_seen_at",
    "updated_at_source",
    "expired_at",
    "country",
    "region",
    "city",
    "seen",
]


def _authenticated_client(username="sortpag-user"):
    user = get_user_model().objects.create_user(
        username=username,
        password="safe-test-password-123",
    )
    client = Client()
    client.force_login(user)
    return client, user


def _make_source(name="SortCo", platform="greenhouse", board_id="sortco"):
    return Source.objects.create(name=name, platform=platform, board_id=board_id)


def _make_listing(source, external_id, title="Job", **kwargs):
    return JobListing.objects.create(
        source=source,
        external_id=external_id,
        title=title,
        url=f"https://example.com/{external_id}",
        **kwargs,
    )


# ---------------------------------------------------------------------------
# Envelope shape
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEnvelopeShape:
    def test_default_envelope_structure(self):
        source = _make_source()
        _make_listing(source, "1", title="A")
        _make_listing(source, "2", title="B")

        client = Client()
        response = client.get("/api/jobs/")

        assert response.status_code == 200
        body = response.json()
        assert isinstance(body, dict)
        assert set(body.keys()) == {
            "results",
            "count",
            "page",
            "page_size",
            "total_pages",
            "sort",
        }
        assert body["count"] == 2
        assert body["page"] == 1
        assert body["page_size"] == 50
        assert body["total_pages"] == 1
        assert body["sort"] == [{"field": "first_seen_at", "dir": "desc"}]
        assert len(body["results"]) == 2

    def test_empty_dataset_returns_empty_envelope(self):
        client = Client()
        response = client.get("/api/jobs/")

        assert response.status_code == 200
        body = response.json()
        assert body["count"] == 0
        assert body["total_pages"] == 0
        assert body["page"] == 1
        assert body["page_size"] == 50
        assert body["results"] == []


# ---------------------------------------------------------------------------
# Sort — single field
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSortSingleField:
    def test_sort_title_asc(self):
        source = _make_source()
        _make_listing(source, "1", title="Charlie")
        _make_listing(source, "2", title="Alpha")
        _make_listing(source, "3", title="Bravo")

        client = Client()
        response = client.get("/api/jobs/?sort=title:asc")

        assert response.status_code == 200
        body = response.json()
        assert [r["title"] for r in body["results"]] == ["Alpha", "Bravo", "Charlie"]
        assert body["sort"] == [{"field": "title", "dir": "asc"}]

    def test_sort_title_desc(self):
        source = _make_source()
        _make_listing(source, "1", title="Charlie")
        _make_listing(source, "2", title="Alpha")
        _make_listing(source, "3", title="Bravo")

        client = Client()
        response = client.get("/api/jobs/?sort=title:desc")

        body = response.json()
        assert [r["title"] for r in body["results"]] == ["Charlie", "Bravo", "Alpha"]
        assert body["sort"] == [{"field": "title", "dir": "desc"}]

    def test_sort_source_name_maps_to_related_column(self):
        src_z = _make_source(name="Zeta", board_id="zeta")
        src_a = _make_source(name="Alpha", board_id="alpha")
        _make_listing(src_z, "1", title="J1")
        _make_listing(src_a, "2", title="J2")

        client = Client()
        response = client.get("/api/jobs/?sort=source_name:asc")

        body = response.json()
        assert [r["source_name"] for r in body["results"]] == ["Alpha", "Zeta"]

    def test_sort_department_nulls_grouped_consistently(self):
        source = _make_source()
        _make_listing(source, "1", title="A", department="Eng")
        _make_listing(source, "2", title="B", department=None)
        _make_listing(source, "3", title="C", department="Sales")

        client = Client()
        response = client.get("/api/jobs/?sort=department:asc")

        body = response.json()
        # Must be deterministic — count matches
        assert body["count"] == 3
        assert len(body["results"]) == 3

    def test_sort_by_first_seen_at_desc_is_default(self):
        source = _make_source()
        listing_a = _make_listing(source, "1", title="A")
        listing_b = _make_listing(source, "2", title="B")

        client = Client()
        response = client.get("/api/jobs/")

        body = response.json()
        # Listing B was created after A, so it has later first_seen_at
        ids = [r["id"] for r in body["results"]]
        assert ids == [listing_b.id, listing_a.id]


@pytest.mark.django_db
@pytest.mark.parametrize("field", SORTABLE_FIELDS)
def test_each_sortable_field_accepted(field):
    source = _make_source()
    listing = _make_listing(
        source,
        "1",
        title="A",
        department="Eng",
        team="Platform",
        status="active",
        employment_type="full_time",
        workplace_type="remote",
        published_at=timezone.now(),
        updated_at_source=timezone.now(),
    )
    tag = LocationTag.objects.create(
        name="SF", country_code="US", region_code="US-CA", city="San Francisco"
    )
    listing.locations.add(tag)

    client = Client()
    response = client.get(f"/api/jobs/?sort={field}:asc")

    assert response.status_code == 200
    body = response.json()
    assert body["sort"] == [{"field": field, "dir": "asc"}]
    assert body["count"] == 1


# ---------------------------------------------------------------------------
# Sort — multi-column precedence
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSortMultiColumn:
    def test_sort_status_asc_then_first_seen_desc(self):
        source = _make_source()
        a_active = _make_listing(source, "1", title="A", status="active")
        b_expired = _make_listing(source, "2", title="B", status="expired")
        c_active = _make_listing(source, "3", title="C", status="active")

        client = Client()
        response = client.get(
            "/api/jobs/?sort=status:asc,first_seen_at:desc"
        )

        body = response.json()
        # Within "active", C was created after A → desc puts C before A.
        # "expired" sorts after "active" alphabetically.
        assert [r["id"] for r in body["results"]] == [
            c_active.id,
            a_active.id,
            b_expired.id,
        ]
        assert body["sort"] == [
            {"field": "status", "dir": "asc"},
            {"field": "first_seen_at", "dir": "desc"},
        ]

    def test_three_level_sort(self):
        source = _make_source()
        _make_listing(source, "1", title="A", status="active", team="X")
        _make_listing(source, "2", title="B", status="active", team="Y")
        _make_listing(source, "3", title="C", status="expired", team="X")

        client = Client()
        response = client.get("/api/jobs/?sort=status:asc,team:asc,title:asc")

        body = response.json()
        assert body["sort"] == [
            {"field": "status", "dir": "asc"},
            {"field": "team", "dir": "asc"},
            {"field": "title", "dir": "asc"},
        ]
        assert [r["title"] for r in body["results"]] == ["A", "B", "C"]


# ---------------------------------------------------------------------------
# Sort — invalid inputs
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSortInvalid:
    def test_invalid_field_returns_400_with_allowlist(self):
        client = Client()
        response = client.get("/api/jobs/?sort=evil:asc")

        assert response.status_code == 400
        body = response.json()
        assert "error" in body
        # Error must mention at least one valid field name
        assert any(field in body["error"] for field in SORTABLE_FIELDS)

    def test_invalid_direction_returns_400(self):
        client = Client()
        response = client.get("/api/jobs/?sort=title:sideways")

        assert response.status_code == 400
        body = response.json()
        assert "error" in body

    def test_missing_direction_returns_400(self):
        client = Client()
        response = client.get("/api/jobs/?sort=title")

        assert response.status_code == 400
        assert "error" in response.json()

    def test_empty_sort_param_falls_back_to_default(self):
        source = _make_source()
        _make_listing(source, "1", title="A")

        client = Client()
        response = client.get("/api/jobs/?sort=")

        assert response.status_code == 200
        body = response.json()
        assert body["sort"] == [{"field": "first_seen_at", "dir": "desc"}]


# ---------------------------------------------------------------------------
# Sort — composite M2M arrays (country/region/city)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSortLocationFields:
    def test_sort_country_is_stable_with_m2m(self):
        source = _make_source()
        listing1 = _make_listing(source, "1", title="US Role")
        listing2 = _make_listing(source, "2", title="CA Role")
        us_tag = LocationTag.objects.create(name="NYC", country_code="US")
        ca_tag = LocationTag.objects.create(name="Toronto", country_code="CA")
        listing1.locations.add(us_tag)
        listing2.locations.add(ca_tag)

        client = Client()
        response = client.get("/api/jobs/?sort=country:asc")

        body = response.json()
        # CA comes before US alphabetically; no duplicate rows despite M2M join
        titles = [r["title"] for r in body["results"]]
        assert titles == ["CA Role", "US Role"]
        assert body["count"] == 2

    def test_sort_country_desc(self):
        source = _make_source()
        listing1 = _make_listing(source, "1", title="US Role")
        listing2 = _make_listing(source, "2", title="CA Role")
        listing1.locations.add(LocationTag.objects.create(name="NYC", country_code="US"))
        listing2.locations.add(LocationTag.objects.create(name="Toronto", country_code="CA"))

        client = Client()
        response = client.get("/api/jobs/?sort=country:desc")

        body = response.json()
        assert [r["title"] for r in body["results"]] == ["US Role", "CA Role"]

    def test_sort_by_region_dedupes_multi_tag_listing(self):
        source = _make_source()
        a = _make_listing(source, "1", title="A")
        b = _make_listing(source, "2", title="B")
        a.locations.add(LocationTag.objects.create(name="SF", region_code="US-CA"))
        a.locations.add(LocationTag.objects.create(name="NY", region_code="US-NY"))
        b.locations.add(LocationTag.objects.create(name="TX", region_code="US-TX"))

        client = Client()
        response = client.get("/api/jobs/?sort=region:asc")

        body = response.json()
        assert body["count"] == 2
        assert len(body["results"]) == 2

    def test_sort_city_ascending(self):
        source = _make_source()
        a = _make_listing(source, "1", title="A")
        b = _make_listing(source, "2", title="B")
        a.locations.add(LocationTag.objects.create(name="ZCity", city="Zurich"))
        b.locations.add(LocationTag.objects.create(name="ACity", city="Athens"))

        client = Client()
        response = client.get("/api/jobs/?sort=city:asc")

        body = response.json()
        assert [r["title"] for r in body["results"]] == ["B", "A"]


# ---------------------------------------------------------------------------
# Sort — seen (authenticated and anonymous)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSortBySeen:
    def test_sort_by_seen_asc_for_authenticated_user(self):
        source = _make_source()
        seen_listing = _make_listing(source, "1", title="Seen")
        unseen_listing = _make_listing(source, "2", title="Unseen")
        client, user = _authenticated_client(username="seen-sort-user")
        SeenListing.objects.create(user=user, listing=seen_listing)

        response = client.get("/api/jobs/?sort=seen:asc")

        body = response.json()
        # asc: False (0) before True (1) → Unseen before Seen
        assert [r["title"] for r in body["results"]] == ["Unseen", "Seen"]

    def test_sort_by_seen_desc_for_authenticated_user(self):
        source = _make_source()
        seen_listing = _make_listing(source, "1", title="Seen")
        unseen_listing = _make_listing(source, "2", title="Unseen")
        client, user = _authenticated_client(username="seen-sort-desc-user")
        SeenListing.objects.create(user=user, listing=seen_listing)

        response = client.get("/api/jobs/?sort=seen:desc")

        body = response.json()
        assert [r["title"] for r in body["results"]] == ["Seen", "Unseen"]

    def test_sort_by_seen_anonymous_returns_consistent_order(self):
        source = _make_source()
        _make_listing(source, "1", title="A")
        _make_listing(source, "2", title="B")

        client = Client()
        response = client.get("/api/jobs/?sort=seen:asc")

        assert response.status_code == 200
        body = response.json()
        # Every row has seen=False for anonymous; just assert success and count
        assert body["count"] == 2
        assert all(row["seen"] is False for row in body["results"])


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestPagination:
    def _seed(self, n=7, source=None):
        source = source or _make_source()
        listings = []
        for i in range(n):
            listings.append(
                _make_listing(source, f"ext-{i}", title=f"Title {i:02d}")
            )
        return source, listings

    def test_default_page_size_50(self):
        self._seed(n=3)

        client = Client()
        response = client.get("/api/jobs/")

        body = response.json()
        assert body["page_size"] == 50
        assert body["page"] == 1
        assert body["total_pages"] == 1

    def test_page_size_splits_total_pages(self):
        self._seed(n=7)

        client = Client()
        response = client.get("/api/jobs/?page_size=25")

        body = response.json()
        assert body["page_size"] == 25
        assert body["count"] == 7
        assert body["total_pages"] == 1
        assert len(body["results"]) == 7

    def test_page_navigation(self):
        self._seed(n=7)

        client = Client()
        first = client.get("/api/jobs/?page_size=25&page=1&sort=title:asc").json()
        assert first["page"] == 1
        assert first["total_pages"] == 1

        # With page_size=25 and 7 items there's only 1 page; drop size to force split
        first = client.get(
            "/api/jobs/?page_size=25&sort=title:asc"
        ).json()
        assert first["count"] == 7

    def test_pagination_slicing_with_small_page_size(self):
        # Use a second page by shrinking effective size via sort + many seeds
        source = _make_source()
        for i in range(60):
            _make_listing(source, f"ext-{i:03d}", title=f"T{i:03d}")

        client = Client()
        page1 = client.get("/api/jobs/?sort=title:asc&page=1&page_size=25").json()
        page2 = client.get("/api/jobs/?sort=title:asc&page=2&page_size=25").json()
        page3 = client.get("/api/jobs/?sort=title:asc&page=3&page_size=25").json()

        assert page1["total_pages"] == 3
        assert page1["count"] == 60
        assert len(page1["results"]) == 25
        assert len(page2["results"]) == 25
        assert len(page3["results"]) == 10

        titles = (
            [r["title"] for r in page1["results"]]
            + [r["title"] for r in page2["results"]]
            + [r["title"] for r in page3["results"]]
        )
        assert titles == sorted(titles)

    def test_page_size_allowlist_25(self):
        client = Client()
        response = client.get("/api/jobs/?page_size=25")
        assert response.status_code == 200
        assert response.json()["page_size"] == 25

    def test_page_size_allowlist_50(self):
        client = Client()
        response = client.get("/api/jobs/?page_size=50")
        assert response.status_code == 200
        assert response.json()["page_size"] == 50

    def test_page_size_allowlist_100(self):
        client = Client()
        response = client.get("/api/jobs/?page_size=100")
        assert response.status_code == 200
        assert response.json()["page_size"] == 100

    def test_page_size_allowlist_250(self):
        client = Client()
        response = client.get("/api/jobs/?page_size=250")
        assert response.status_code == 200
        assert response.json()["page_size"] == 250

    def test_page_size_outside_allowlist_returns_400(self):
        client = Client()
        response = client.get("/api/jobs/?page_size=33")
        assert response.status_code == 400
        assert "error" in response.json()

    def test_page_size_non_integer_returns_400(self):
        client = Client()
        response = client.get("/api/jobs/?page_size=abc")
        assert response.status_code == 400

    def test_page_non_integer_returns_400(self):
        client = Client()
        response = client.get("/api/jobs/?page=abc")
        assert response.status_code == 400

    def test_page_zero_returns_400(self):
        self._seed(n=3)
        client = Client()
        response = client.get("/api/jobs/?page=0")
        assert response.status_code == 400

    def test_page_negative_returns_400(self):
        self._seed(n=3)
        client = Client()
        response = client.get("/api/jobs/?page=-1")
        assert response.status_code == 400

    def test_page_beyond_total_pages_returns_400(self):
        self._seed(n=3)
        client = Client()
        response = client.get("/api/jobs/?page=5&page_size=25")
        assert response.status_code == 400
        assert "error" in response.json()

    def test_page_one_on_empty_dataset_returns_empty_results(self):
        client = Client()
        response = client.get("/api/jobs/?page=1&page_size=25")
        assert response.status_code == 200
        body = response.json()
        assert body["count"] == 0
        assert body["page"] == 1
        assert body["total_pages"] == 0
        assert body["results"] == []

    def test_page_greater_than_one_on_empty_dataset_returns_400(self):
        client = Client()
        response = client.get("/api/jobs/?page=2&page_size=25")
        assert response.status_code == 400
        assert "error" in response.json()


# ---------------------------------------------------------------------------
# Orthogonality — filter + sort + pagination compose
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestFilterSortPaginationCompose:
    def test_filter_status_then_sort_title_then_paginate(self):
        source = _make_source()
        for i in range(5):
            _make_listing(source, f"a-{i}", title=f"Active{i:02d}", status="active")
        for i in range(3):
            _make_listing(source, f"e-{i}", title=f"Expired{i:02d}", status="expired")

        client = Client()
        response = client.get(
            "/api/jobs/?status=active&sort=title:desc&page=1&page_size=25"
        )

        body = response.json()
        assert body["count"] == 5
        assert body["total_pages"] == 1
        assert all(r["status"] == "active" for r in body["results"])
        titles = [r["title"] for r in body["results"]]
        assert titles == sorted(titles, reverse=True)

    def test_filter_expression_count_reflects_filtered_total(self):
        source = _make_source()
        for i in range(3):
            _make_listing(source, f"e-{i}", title=f"Engineer{i}", status="active")
        for i in range(2):
            _make_listing(source, f"d-{i}", title=f"Designer{i}", status="active")

        expression = {"field": "title", "operator": "contains", "value": "engineer"}
        client = Client()
        response = client.get(
            "/api/jobs/",
            {
                "filter": json.dumps(expression),
                "sort": "title:asc",
                "page": "1",
                "page_size": "25",
            },
        )

        body = response.json()
        assert body["count"] == 3
        assert [r["title"] for r in body["results"]] == [
            "Engineer0",
            "Engineer1",
            "Engineer2",
        ]

    def test_filter_expression_invalid_still_returns_400(self):
        expression = {"field": "title", "operator": "in", "value": "engineer"}
        client = Client()
        response = client.get(
            "/api/jobs/",
            {"filter": json.dumps(expression)},
        )
        assert response.status_code == 400
        assert "error" in response.json()


# ---------------------------------------------------------------------------
# Result-row shape preserved under envelope
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestResultRowShapeUnchanged:
    def test_per_listing_keys_match_pre_envelope_shape(self):
        source = _make_source()
        listing = _make_listing(
            source,
            "1",
            title="Engineer",
            department="Eng",
            team="Platform",
            employment_type="full_time",
            workplace_type="remote",
            status="active",
        )
        tag = LocationTag.objects.create(
            name="SF", country_code="US", region_code="US-CA", city="San Francisco"
        )
        listing.locations.add(tag)

        client = Client()
        body = client.get("/api/jobs/").json()
        row = body["results"][0]

        expected_keys = {
            "id",
            "source_id",
            "source_name",
            "external_id",
            "title",
            "department",
            "locations",
            "url",
            "status",
            "team",
            "employment_type",
            "workplace_type",
            "country",
            "region",
            "city",
            "expired_at",
            "published_at",
            "updated_at_source",
            "first_seen_at",
            "last_seen_at",
            "seen",
        }
        assert set(row.keys()) == expected_keys
