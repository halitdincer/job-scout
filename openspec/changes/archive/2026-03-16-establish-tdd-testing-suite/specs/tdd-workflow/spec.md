## ADDED Requirements

### Requirement: TDD mandate in project configuration
The project SHALL have a TDD mandate documented in `CLAUDE.md` (or equivalent project instructions) that all developers and AI agents MUST follow when making changes.

#### Scenario: AI agent reads project instructions before coding
- **WHEN** an AI agent begins work on the project
- **THEN** the agent reads CLAUDE.md and follows the TDD workflow: write failing test first, then implement, then refactor

### Requirement: Red-green-refactor workflow
All new features and bug fixes SHALL follow the red-green-refactor cycle: (1) write a failing test, (2) write the minimum code to make it pass, (3) refactor while keeping tests green.

#### Scenario: New feature developed with TDD
- **WHEN** a developer adds a new feature
- **THEN** the commit history shows test code committed before or alongside implementation code, and all tests pass

### Requirement: No existing tests broken
Changes to the codebase SHALL NOT break any existing passing tests. If a test needs to change due to intentional behavior changes, the test SHALL be updated in the same commit as the implementation change.

#### Scenario: Regression detected
- **WHEN** a code change causes a previously passing test to fail
- **THEN** the CI pipeline fails and the change is not merged

### Requirement: Coverage threshold cannot decrease
The coverage threshold configured in `pyproject.toml` SHALL NOT be lowered without explicit justification documented in the commit message.

#### Scenario: Attempt to lower coverage threshold
- **WHEN** a change reduces the `--cov-fail-under` value in pyproject.toml
- **THEN** the change requires explicit justification in the commit message and PR description
