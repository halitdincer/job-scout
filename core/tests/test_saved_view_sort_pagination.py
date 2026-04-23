"""
Tightened saved-view validation for the Phase-3 redesign.

Contract (new):
  - `sort` must be a list of `{field, dir}` objects.
      * `field` must be in the sort allowlist (`SORT_FIELDS`).
      * `dir` must be "asc" or "desc".
      * The legacy `{column, dir}` shape is rejected on write; the client
        migrates existing stored views on load.
  - `columns` must be a list of `{field, visible?}` objects.
      * Each item is an object with a required `field` string.
      * `visible` is optional and must be a bool when present.
  - `config` is an optional object. When present:
      * `page_size` is optional; must be in `PAGE_SIZE_ALLOWLIST` when set.
      * Unknown keys are preserved (forward-compat).
  - Round-trip: `GET /api/views/{id}/` returns `sort`, `columns`, and
    `config` exactly as written.
"""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from core.models import SavedView


def _mk_client(username="sv-user"):
    user = get_user_model().objects.create_user(
        username=username, password="safe-test-password-123"
    )
    client = Client()
    client.force_login(user)
    return client, user


def _base_payload(**overrides):
    defaults = {
        "name": "V",
        "columns": [{"field": "title", "visible": True}],
        "sort": [{"field": "first_seen_at", "dir": "desc"}],
    }
    defaults.update(overrides)
    return defaults


def _post(client, payload):
    return client.post(
        "/api/views/", json.dumps(payload), content_type="application/json"
    )


def _put(client, view_id, payload):
    return client.put(
        f"/api/views/{view_id}/",
        json.dumps(payload),
        content_type="application/json",
    )


@pytest.mark.django_db
class TestSortShapeValidation:
    def test_accepts_field_dir_shape(self):
        client, _ = _mk_client("sort-ok")
        payload = _base_payload(
            sort=[{"field": "title", "dir": "asc"}]
        )
        response = _post(client, payload)
        assert response.status_code == 201
        assert response.json()["sort"] == [{"field": "title", "dir": "asc"}]

    def test_accepts_multi_column_sort(self):
        client, _ = _mk_client("sort-multi")
        payload = _base_payload(
            sort=[
                {"field": "status", "dir": "asc"},
                {"field": "first_seen_at", "dir": "desc"},
            ]
        )
        response = _post(client, payload)
        assert response.status_code == 201
        assert response.json()["sort"] == payload["sort"]

    def test_accepts_empty_sort_list(self):
        client, _ = _mk_client("sort-empty")
        payload = _base_payload(sort=[])
        response = _post(client, payload)
        assert response.status_code == 201
        assert response.json()["sort"] == []

    def test_rejects_legacy_column_shape(self):
        client, _ = _mk_client("sort-legacy")
        payload = _base_payload(
            sort=[{"column": "first_seen_at", "dir": "desc"}]
        )
        response = _post(client, payload)
        assert response.status_code == 400
        assert "sort" in response.json()["error"]

    def test_rejects_unknown_field(self):
        client, _ = _mk_client("sort-bad-field")
        payload = _base_payload(
            sort=[{"field": "not_a_real_field", "dir": "asc"}]
        )
        response = _post(client, payload)
        assert response.status_code == 400
        assert "sort" in response.json()["error"]

    def test_rejects_invalid_direction(self):
        client, _ = _mk_client("sort-bad-dir")
        payload = _base_payload(
            sort=[{"field": "title", "dir": "sideways"}]
        )
        response = _post(client, payload)
        assert response.status_code == 400
        assert "sort" in response.json()["error"]

    def test_rejects_non_object_sort_item(self):
        client, _ = _mk_client("sort-non-obj")
        payload = _base_payload(sort=["title:asc"])
        response = _post(client, payload)
        assert response.status_code == 400
        assert "sort" in response.json()["error"]

    def test_rejects_missing_dir(self):
        client, _ = _mk_client("sort-no-dir")
        payload = _base_payload(sort=[{"field": "title"}])
        response = _post(client, payload)
        assert response.status_code == 400
        assert "sort" in response.json()["error"]

    def test_put_rejects_missing_sort_key(self):
        client, user = _mk_client("sort-put-missing")
        view = SavedView.objects.create(
            user=user, name="X", columns=[], sort=[]
        )
        payload = {
            "name": "X",
            "columns": [{"field": "title", "visible": True}],
            # `sort` key omitted
        }
        response = _put(client, view.id, payload)
        assert response.status_code == 400
        assert "sort" in response.json()["error"]

    def test_put_validates_sort_shape(self):
        client, user = _mk_client("sort-put")
        view = SavedView.objects.create(
            user=user, name="X", columns=[], sort=[]
        )
        response = _put(
            client,
            view.id,
            _base_payload(sort=[{"column": "title", "dir": "asc"}]),
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestColumnsShapeValidation:
    def test_accepts_field_and_visible(self):
        client, _ = _mk_client("cols-ok")
        payload = _base_payload(
            columns=[
                {"field": "title", "visible": True},
                {"field": "status", "visible": False},
            ]
        )
        response = _post(client, payload)
        assert response.status_code == 201
        assert response.json()["columns"] == payload["columns"]

    def test_accepts_omitted_visible(self):
        client, _ = _mk_client("cols-no-vis")
        payload = _base_payload(columns=[{"field": "title"}])
        response = _post(client, payload)
        assert response.status_code == 201
        assert response.json()["columns"] == [{"field": "title"}]

    def test_rejects_non_object_column(self):
        client, _ = _mk_client("cols-bad")
        payload = _base_payload(columns=["title"])
        response = _post(client, payload)
        assert response.status_code == 400
        assert "columns" in response.json()["error"]

    def test_rejects_column_missing_field(self):
        client, _ = _mk_client("cols-no-field")
        payload = _base_payload(columns=[{"visible": True}])
        response = _post(client, payload)
        assert response.status_code == 400
        assert "columns" in response.json()["error"]

    def test_rejects_non_bool_visible(self):
        client, _ = _mk_client("cols-bad-vis")
        payload = _base_payload(columns=[{"field": "title", "visible": "yes"}])
        response = _post(client, payload)
        assert response.status_code == 400
        assert "columns" in response.json()["error"]

    def test_put_rejects_missing_columns_key(self):
        client, user = _mk_client("cols-put-missing")
        view = SavedView.objects.create(
            user=user, name="X", columns=[], sort=[]
        )
        payload = {
            "name": "X",
            # `columns` key omitted
            "sort": [{"field": "title", "dir": "asc"}],
        }
        response = _put(client, view.id, payload)
        assert response.status_code == 400
        assert "columns" in response.json()["error"]

    def test_put_validates_columns_shape(self):
        client, user = _mk_client("cols-put")
        view = SavedView.objects.create(
            user=user, name="X", columns=[], sort=[]
        )
        response = _put(
            client,
            view.id,
            _base_payload(columns=["title"]),
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestConfigRoundTrip:
    def test_accepts_config_with_page_size(self):
        client, _ = _mk_client("cfg-ok")
        payload = _base_payload(config={"page_size": 100})
        response = _post(client, payload)
        assert response.status_code == 201
        assert response.json()["config"] == {"page_size": 100}

    def test_accepts_config_absent(self):
        client, _ = _mk_client("cfg-absent")
        payload = _base_payload()
        response = _post(client, payload)
        assert response.status_code == 201
        assert response.json()["config"] == {}

    def test_accepts_all_allowlisted_page_sizes(self):
        for size in (25, 50, 100, 250):
            client, _ = _mk_client(f"cfg-size-{size}")
            payload = _base_payload(
                name=f"Size {size}", config={"page_size": size}
            )
            response = _post(client, payload)
            assert response.status_code == 201, response.json()
            assert response.json()["config"]["page_size"] == size

    def test_rejects_page_size_outside_allowlist(self):
        client, _ = _mk_client("cfg-bad-size")
        payload = _base_payload(config={"page_size": 42})
        response = _post(client, payload)
        assert response.status_code == 400
        assert "page_size" in response.json()["error"]

    def test_rejects_non_integer_page_size(self):
        client, _ = _mk_client("cfg-non-int")
        payload = _base_payload(config={"page_size": "fifty"})
        response = _post(client, payload)
        assert response.status_code == 400
        assert "page_size" in response.json()["error"]

    def test_rejects_non_object_config(self):
        client, _ = _mk_client("cfg-non-obj")
        payload = _base_payload(config="big")
        response = _post(client, payload)
        assert response.status_code == 400
        assert "config" in response.json()["error"]

    def test_preserves_unknown_config_keys(self):
        client, _ = _mk_client("cfg-extra")
        payload = _base_payload(
            config={"page_size": 50, "future_flag": "xyz"}
        )
        response = _post(client, payload)
        assert response.status_code == 201
        assert response.json()["config"] == {
            "page_size": 50,
            "future_flag": "xyz",
        }

    def test_put_round_trips_config(self):
        client, user = _mk_client("cfg-put")
        view = SavedView.objects.create(
            user=user, name="X", columns=[], sort=[]
        )
        response = _put(
            client,
            view.id,
            _base_payload(config={"page_size": 250}),
        )
        assert response.status_code == 200
        assert response.json()["config"] == {"page_size": 250}
        view.refresh_from_db()
        assert view.config == {"page_size": 250}

    def test_put_clears_config_when_omitted(self):
        # Absent `config` in PUT body should reset to {}.
        client, user = _mk_client("cfg-put-clear")
        view = SavedView.objects.create(
            user=user, name="X", columns=[], sort=[], config={"page_size": 100}
        )
        response = _put(client, view.id, _base_payload())
        assert response.status_code == 200
        assert response.json()["config"] == {}

    def test_get_round_trips_config(self):
        client, user = _mk_client("cfg-get")
        view = SavedView.objects.create(
            user=user,
            name="X",
            columns=[{"field": "title", "visible": True}],
            sort=[{"field": "title", "dir": "asc"}],
            config={"page_size": 100, "note": "keep"},
        )
        response = client.get(f"/api/views/{view.id}/")
        assert response.status_code == 200
        assert response.json()["config"] == {"page_size": 100, "note": "keep"}
