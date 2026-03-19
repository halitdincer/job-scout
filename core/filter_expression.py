from __future__ import annotations

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone


FIELD_DEFINITIONS = {
    "title": {
        "path": "title",
        "type": "text",
        "operators": {"contains", "not_contains", "eq", "neq", "is_empty", "is_not_empty"},
    },
    "department": {
        "path": "department",
        "type": "text",
        "operators": {"contains", "not_contains", "eq", "neq", "is_empty", "is_not_empty"},
    },
    "team": {
        "path": "team",
        "type": "text",
        "operators": {"contains", "not_contains", "eq", "neq", "is_empty", "is_not_empty"},
    },
    "source_name": {
        "path": "source__name",
        "type": "text",
        "operators": {"contains", "not_contains", "eq", "neq", "in", "not_in", "is_empty", "is_not_empty"},
    },
    "status": {
        "path": "status",
        "type": "enum",
        "operators": {"eq", "neq", "in", "not_in", "is_empty", "is_not_empty"},
    },
    "employment_type": {
        "path": "employment_type",
        "type": "enum",
        "operators": {"eq", "neq", "in", "not_in", "is_empty", "is_not_empty"},
    },
    "workplace_type": {
        "path": "workplace_type",
        "type": "enum",
        "operators": {"eq", "neq", "in", "not_in", "is_empty", "is_not_empty"},
    },
    "country": {
        "path": "locations__country_code",
        "type": "array_text",
        "operators": {"eq", "neq", "in", "not_in", "is_empty", "is_not_empty"},
    },
    "region": {
        "path": "locations__region_code",
        "type": "array_text",
        "operators": {"eq", "neq", "in", "not_in", "is_empty", "is_not_empty"},
    },
    "city": {
        "path": "locations__city",
        "type": "array_text",
        "operators": {"contains", "not_contains", "eq", "neq", "in", "not_in", "is_empty", "is_not_empty"},
    },
    "published_at": {
        "path": "published_at",
        "type": "date",
        "operators": {"before", "after", "in_last_days", "is_empty", "is_not_empty"},
    },
    "first_seen_at": {
        "path": "first_seen_at",
        "type": "date",
        "operators": {"before", "after", "in_last_days", "is_empty", "is_not_empty"},
    },
    "last_seen_at": {
        "path": "last_seen_at",
        "type": "date",
        "operators": {"before", "after", "in_last_days", "is_empty", "is_not_empty"},
    },
    "updated_at_source": {
        "path": "updated_at_source",
        "type": "date",
        "operators": {"before", "after", "in_last_days", "is_empty", "is_not_empty"},
    },
    "expired_at": {
        "path": "expired_at",
        "type": "date",
        "operators": {"before", "after", "in_last_days", "is_empty", "is_not_empty"},
    },
}


def validate_filter_expression(expression):
    if not isinstance(expression, dict):
        raise ValueError("Filter expression must be an object")

    if "op" in expression:
        op = expression["op"]
        if op not in {"and", "or", "not"}:
            raise ValueError(f"Unknown group operation: {op}")
        if op == "not":
            child = expression.get("child")
            if child is None:
                raise ValueError("'not' group requires a 'child'")
            validate_filter_expression(child)
            return

        children = expression.get("children")
        if not isinstance(children, list) or not children:
            raise ValueError(f"'{op}' group requires a non-empty 'children' array")
        for child in children:
            validate_filter_expression(child)
        return

    required = {"field", "operator"}
    if not required.issubset(expression.keys()):
        raise ValueError("Predicate node missing required keys: field/operator")

    field = expression["field"]
    if field not in FIELD_DEFINITIONS:
        raise ValueError(f"Unknown field: {field}")

    operator = expression["operator"]
    field_definition = FIELD_DEFINITIONS[field]
    if operator not in field_definition["operators"]:
        raise ValueError(
            f"Field '{field}' has unsupported operator '{operator}'"
        )

    if operator in {"is_empty", "is_not_empty"}:
        return

    if "value" not in expression:
        raise ValueError(f"Operator '{operator}' requires a value")

    value = expression["value"]
    _validate_operator_value(operator, value)


def build_filter_q(expression):
    validate_filter_expression(expression)

    if "op" in expression:
        op = expression["op"]
        if op == "not":
            return ~build_filter_q(expression["child"])

        children = expression["children"]
        built = [build_filter_q(child) for child in children]
        if op == "and":
            q_obj = Q()
            for child in built:
                q_obj &= child
            return q_obj

        q_obj = Q()
        for child in built:
            q_obj |= child
        return q_obj

    return _build_predicate_q(expression)


def _validate_operator_value(operator, value):
    if operator in {"in", "not_in"}:
        if not isinstance(value, list):
            raise ValueError(f"Operator '{operator}' expects a list value")
        return

    if operator == "in_last_days":
        if not isinstance(value, int) or value < 0:
            raise ValueError("Operator 'in_last_days' expects a non-negative integer")
        return

    if operator in {"contains", "not_contains", "eq", "neq", "before", "after"}:
        if value is None:
            raise ValueError(f"Operator '{operator}' does not accept null value")
        return

    raise ValueError(f"Unsupported operator '{operator}'")


def _build_predicate_q(predicate):
    field_name = predicate["field"]
    operator = predicate["operator"]
    db_path = FIELD_DEFINITIONS[field_name]["path"]

    if operator == "contains":
        return Q(**{f"{db_path}__icontains": predicate["value"]})
    if operator == "not_contains":
        return ~Q(**{f"{db_path}__icontains": predicate["value"]})
    if operator == "eq":
        return Q(**{db_path: predicate["value"]})
    if operator == "neq":
        return ~Q(**{db_path: predicate["value"]})
    if operator == "in":
        return Q(**{f"{db_path}__in": predicate["value"]})
    if operator == "not_in":
        return ~Q(**{f"{db_path}__in": predicate["value"]})
    if operator == "is_empty":
        return Q(**{f"{db_path}__isnull": True}) | Q(**{db_path: ""})
    if operator == "is_not_empty":
        return ~Q(**{f"{db_path}__isnull": True}) & ~Q(**{db_path: ""})
    if operator == "before":
        return Q(**{f"{db_path}__lt": predicate["value"]})
    if operator == "after":
        return Q(**{f"{db_path}__gt": predicate["value"]})
    if operator == "in_last_days":
        cutoff = timezone.now() - timedelta(days=predicate["value"])
        return Q(**{f"{db_path}__gte": cutoff})

    raise ValueError(f"Unsupported operator '{operator}'")
