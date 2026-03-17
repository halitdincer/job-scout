import pytest
from django.db.models import Q

from core.filter_expression import (
    _build_predicate_q,
    _validate_operator_value,
    build_filter_q,
    validate_filter_expression,
)


def test_validate_filter_expression_accepts_nested_logic():
    expression = {
        "op": "and",
        "children": [
            {"field": "title", "operator": "contains", "value": "engineer"},
            {
                "op": "not",
                "child": {
                    "op": "or",
                    "children": [
                        {"field": "status", "operator": "eq", "value": "expired"},
                        {"field": "source_name", "operator": "eq", "value": "Legacy Co"},
                    ],
                },
            },
        ],
    }

    validate_filter_expression(expression)


def test_validate_filter_expression_rejects_missing_predicate_fields():
    expression = {"operator": "contains", "value": "engineer"}

    with pytest.raises(ValueError, match="missing required keys"):
        validate_filter_expression(expression)


def test_validate_filter_expression_rejects_invalid_operator_for_field():
    expression = {
        "field": "published_at",
        "operator": "contains",
        "value": "2026",
    }

    with pytest.raises(ValueError, match="unsupported operator"):
        validate_filter_expression(expression)


def test_validate_filter_expression_rejects_wrong_value_type_for_in():
    expression = {
        "field": "country",
        "operator": "in",
        "value": "US",
    }

    with pytest.raises(ValueError, match="expects a list"):
        validate_filter_expression(expression)


def test_validate_filter_expression_rejects_missing_child_for_not_group():
    expression = {"op": "not", "children": []}

    with pytest.raises(ValueError, match="requires a 'child'"):
        validate_filter_expression(expression)


def test_build_filter_q_with_not_contains_returns_q_object():
    expression = {
        "op": "and",
        "children": [
            {"field": "title", "operator": "contains", "value": "engineer"},
            {
                "op": "not",
                "child": {"field": "title", "operator": "contains", "value": "senior"},
            },
        ],
    }

    q_obj = build_filter_q(expression)

    assert q_obj is not None
    assert isinstance(q_obj, Q)


@pytest.mark.parametrize(
    "expression,error",
    [
        ("bad", "must be an object"),
        ({"op": "xor", "children": []}, "Unknown group operation"),
        ({"op": "and", "children": []}, "non-empty 'children'"),
        ({"field": "unknown", "operator": "eq", "value": "x"}, "Unknown field"),
        ({"field": "title", "operator": "eq"}, "requires a value"),
        ({"field": "title", "operator": "eq", "value": None}, "does not accept null"),
        ({"field": "first_seen_at", "operator": "in_last_days", "value": -1}, "non-negative integer"),
    ],
)
def test_validate_filter_expression_rejects_invalid_inputs(expression, error):
    with pytest.raises(ValueError, match=error):
        validate_filter_expression(expression)


@pytest.mark.parametrize(
    "operator,value",
    [
        ("not_contains", "senior"),
        ("neq", "expired"),
        ("not_in", ["expired"]),
        ("is_empty", None),
        ("is_not_empty", None),
        ("before", "2026-03-17T00:00:00Z"),
        ("after", "2026-03-01T00:00:00Z"),
        ("in_last_days", 14),
    ],
)
def test_build_filter_q_supports_additional_operators(operator, value):
    expression = {"field": "first_seen_at", "operator": operator}
    if value is not None:
        expression["value"] = value

    if operator in {"not_in", "neq"}:
        expression["field"] = "status"
    if operator in {"not_contains"}:
        expression["field"] = "title"

    q_obj = build_filter_q(expression)

    assert isinstance(q_obj, Q)


def test_build_filter_q_supports_or_group():
    expression = {
        "op": "or",
        "children": [
            {"field": "status", "operator": "eq", "value": "active"},
            {"field": "status", "operator": "eq", "value": "expired"},
        ],
    }

    q_obj = build_filter_q(expression)

    assert isinstance(q_obj, Q)


def test_validate_operator_value_rejects_unsupported_operator():
    with pytest.raises(ValueError, match="Unsupported operator"):
        _validate_operator_value("bad_op", "x")


def test_build_predicate_q_rejects_unsupported_operator():
    with pytest.raises(ValueError, match="Unsupported operator"):
        _build_predicate_q({"field": "title", "operator": "bad_op", "value": "x"})
