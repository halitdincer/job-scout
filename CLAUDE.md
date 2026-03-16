# job-scout

## TDD Workflow — Mandatory

This project follows strict Test-Driven Development. All contributors (human and AI) MUST follow these rules:

### Red-Green-Refactor
1. **Red**: Write a failing test first that describes the desired behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up while keeping all tests green

### Rules
- Never write production code without a corresponding test
- Never break existing tests — if behavior changes intentionally, update the test in the same commit
- Run `pytest` before every commit — it enforces 100% coverage
- Do not lower the `--cov-fail-under` threshold without explicit justification
- Use `# pragma: no cover` only with a comment explaining why

### Running Tests
```bash
pip install -r requirements-dev.txt
pytest
```

### Test Configuration
- Framework: pytest + pytest-django
- Config: `pyproject.toml`
- Test settings: `jobscout/settings_test.py` (SQLite in-memory, inherits from main settings)
- Coverage: 100% enforced via `--cov-fail-under=100`
- Test location: `core/tests/` (one module per source module)
