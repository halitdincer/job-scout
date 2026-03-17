## ADDED Requirements

### Requirement: Canonical filter expression schema
The system SHALL define a canonical JSON filter expression schema composed of boolean group nodes and predicate nodes. Group nodes SHALL support `and`, `or`, and `not`. Predicate nodes SHALL include `field`, `operator`, and `value` keys.

#### Scenario: Valid nested expression
- **WHEN** a filter expression contains an `and` group with nested `or` and `not` children
- **THEN** the expression is accepted as structurally valid

#### Scenario: Invalid node shape rejected
- **WHEN** a predicate node omits `field` or `operator`
- **THEN** the system rejects the expression with a validation error

### Requirement: Typed field and operator validation
The system SHALL enforce a typed field/operator registry so each field only accepts supported operators and value types.

#### Scenario: Unsupported operator rejected
- **WHEN** a request uses operator `contains` on a date-only field that does not support `contains`
- **THEN** the system returns a validation error describing the unsupported operator

#### Scenario: Invalid value type rejected
- **WHEN** a request uses operator `in` with a non-array value
- **THEN** the system returns a validation error describing the expected value type

### Requirement: Server-side expression evaluation for jobs queries
The jobs query path SHALL evaluate valid filter expressions server-side against job listing data and return only matching rows.

#### Scenario: Text match with NOT
- **WHEN** a request filters with `title contains engineer` and `NOT title contains senior`
- **THEN** results include engineer listings that do not include senior in title

#### Scenario: Array field inclusion
- **WHEN** a request filters `country in ["US", "CA"]`
- **THEN** results include listings whose country array contains at least one provided value

### Requirement: Future persistence compatibility
The canonical expression schema SHALL be deterministic and serializable so it can be stored and reused by future systems without semantic changes.

#### Scenario: Round-trip serialization
- **WHEN** a valid expression is serialized and then deserialized
- **THEN** the deserialized expression preserves equivalent filtering semantics
