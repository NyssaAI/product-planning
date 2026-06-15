# Testing Principles

**Three-tier pyramid: Many unit tests, fewer integration tests, few E2E tests.**

| Tier | Scope | Speed | When | What |
|------|-------|-------|------|------|
| **Unit** | Function/class | ms | Every save | Logic, branches, edge cases |
| **Integration** | Component + real dependencies | seconds | Every commit | Real DB, API calls, interactions |
| **E2E** | Full user workflow | 10-30s | Before release | Critical paths only |
| **Acceptance / AAT** | Behavior vs. spec acceptance criteria | seconds-minutes | Per work item | Gherkin/Cucumber `.feature` files in `test/acceptance-tests/` (see [acceptance-tests.md](acceptance-tests.md)) |

---

## Unit Tests

**Test behavior, not implementation. One assertion per test.**

```python
def test_validate_email_accepts_valid():
    assert is_valid_email("user@example.com")

def test_validate_email_rejects_empty():
    assert not is_valid_email("")

def test_user_defaults_to_inactive():
    user = User(name="Alice")
    assert user.is_active == False
```

Don't test:
- Trivial getters/setters
- Private methods
- Third-party libraries

---

## Integration Tests

**Use real dependencies (real database, real API clients).**

```python
def test_create_user_persists_to_database():
    db = create_test_database()
    result = create_user(db, "alice@example.com")
    
    assert result.is_ok
    saved = db.query("SELECT * FROM users WHERE email = ?", ["alice@example.com"])
    assert saved is not None
```

Avoid mocks when possible—they hide real bugs.

---

## E2E Tests

**Test critical user flows only. Test on mobile + desktop.**

```python
def test_user_completes_signup():
    page.goto("https://example.com/signup")
    page.fill("input[name=email]", "alice@example.com")
    page.fill("input[name=password]", "secure_password")
    page.click("button[type=submit]")
    
    page.wait_for_url("**/dashboard")
    assert page.locator("text=Welcome").is_visible()
```

Avoid testing every field separately—test complete workflows only.

---

## Best Practices

- **Descriptive names**: `test_user_defaults_to_inactive` not `test_user`
- **Wait for elements**: Use `wait_for_selector()`, not assertions on async content
- **No snapshots**: Write explicit assertions instead
- **Accessibility**: Test keyboard navigation in E2E
- **Realistic data**: Don't use `x@b.c`, use `alice@example.com`
- **Test errors**: Ensure both success and failure paths work

---

## Checklist

- [ ] Unit tests for logic, branches, edge cases
- [ ] Integration tests with real dependencies
- [ ] E2E tests for critical user flows
- [ ] Tests focus on behavior, not implementation
- [ ] Descriptive test names
- [ ] No flaky tests (proper waits, no race conditions)
- [ ] Both success and failure paths tested
- [ ] Accessibility tested
