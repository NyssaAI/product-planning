# Error Handling Standards

**Use Result/Either types for all expected errors.** Exceptions only for unexpected infrastructure failures.

---

## Default: Result Pattern

Return `Result<T>` for any operation that can fail:

```python
def create_user(email: str) -> Result[User]:
    if not is_valid_email(email):
        return Result.error("invalid_email")
    if user_exists(email):
        return Result.error("email_already_registered")
    return Result.ok(database.insert({"email": email}))
```

**Why:**
- Explicit — Caller sees failure is possible
- Type-safe — Enforced error handling
- Composable — Chain operations cleanly
- Testable — Both paths obvious

### Errors That Use Result

- Validation failures
- Not found / permission denied
- Business rule violations
- Conflicts / duplicates
- User input rejected

**Everything return-able should return Result.**

---

## Exception-Only Cases

Exceptions **only** for infrastructure failures you can't recover from:

| When Exceptions | Example |
|---|---|
| Database connection fails | `psycopg2.OperationalError` |
| File system error | File not found (on startup config) |
| Out of memory | Unrecoverable resource exhaustion |
| Configuration invalid | Can't start application |

```python
# ✅ Exception: infrastructure failure, must fail-fast on startup
def load_config(path: str) -> dict:
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        raise ConfigurationError(f"Config missing: {path}")
```

---

## Chaining Results (Railway Pattern)

```python
result = (
    validate_email(email)
    .bind(check_user_exists)
    .bind(create_user)
)
```

No nested if/else. Errors short-circuit automatically.

---

## Pattern Matching Results

```python
result = process_order(order)
response = result.match(
    ok_func=lambda order: {"status": "success", "id": order.id},
    error_func=lambda err: {"status": "error", "message": err}
)
```

---

## Specific Error Types

Use enums for typed errors:

```python
class UserError(Enum):
    INVALID_EMAIL = "invalid_email"
    ALREADY_EXISTS = "already_exists"
    PERMISSION_DENIED = "permission_denied"

def create_user(email: str) -> Result[User, UserError]:
    if not is_valid_email(email):
        return Result.error(UserError.INVALID_EMAIL)
    ...
```

---

## Don't Do This

| Anti-Pattern | Why | Fix |
|---|---|---|
| Raise on validation fail | Use Result instead | Return `Result.error(...)` |
| Catch-all exception handlers | Hides bugs | Catch specific exceptions only |
| Silent failures | Can't debug | Propagate result up |
| Exceptions for control flow | Slow + unclear | Return Result, check it |
| Generic error messages | Can't fix | Be specific: "email already registered" |
