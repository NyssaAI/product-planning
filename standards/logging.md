# Logging Standards

**All software must write structured logs to disk.** Logs are the primary debugging tool — when something goes wrong, the log file should tell the story of what happened without needing a debugger or code changes.

---

## Log Levels

| Level | Purpose | When to use |
|-------|---------|-------------|
| **debug** | Trace code execution | Function entry/exit, variable values, branch decisions, loop iterations |
| **info** | System-to-system interfaces | Incoming requests, outgoing calls, job start/complete, config loaded |
| **warn** | Recoverable problems | Retry attempts, fallback used, deprecated feature called, slow query |
| **error** | Failures requiring attention | Unhandled exceptions, failed operations, missing resources, broken invariants |

---

## Debug Level: Trace Everything

Debug mode must produce enough detail to reconstruct code execution from the log file alone. This is non-negotiable — it is the primary way to diagnose issues.

**Log at debug:**
- Function entry with arguments: `debug("createUser called", { email, role })`
- Decision points: `debug("user exists, updating instead of creating", { userId })`
- Loop progress: `debug("processing item", { index, total, itemId })`
- Return values: `debug("createUser complete", { userId, elapsed })`
- External call setup: `debug("calling API", { url, method, headers: sanitized })`
- Data transformations: `debug("mapped records", { inputCount, outputCount, skipped })`

```python
def create_user(email: str, role: str) -> Result[User]:
    logger.debug("createUser called", email=email, role=role)

    if not is_valid_email(email):
        logger.debug("email validation failed", email=email)
        return Result.error("invalid_email")

    existing = db.find_user(email)
    logger.debug("user lookup complete", email=email, found=existing is not None)

    if existing:
        logger.debug("user exists, returning existing", user_id=existing.id)
        return Result.ok(existing)

    user = db.insert_user(email=email, role=role)
    logger.debug("user created", user_id=user.id, elapsed=timer.elapsed())
    return Result.ok(user)
```

---

## Info Level: System Boundaries

Info is the production default. Log at the interfaces between systems — where data enters, leaves, or crosses a boundary.

**Log at info:**
- HTTP requests received (method, path, status, duration)
- Outbound API calls (service, endpoint, status, duration)
- Database queries (operation, table, row count, duration)
- Job/task lifecycle (started, completed, failed)
- Configuration loaded (source, key settings — never secrets)
- Startup and shutdown

```python
logger.info("request received", method="POST", path="/users", content_length=128)
logger.info("user created", user_id=user.id, duration_ms=42)
logger.info("API call complete", service="stripe", endpoint="/charges", status=200, duration_ms=350)
```

---

## Writing Logs to Disk

Logs must be written to disk. Console output alone is not sufficient.

- **Log directory**: Use a `logs/` directory in the project root, or a configurable path via environment variable (`LOG_DIR`)
- **File naming**: `{app-name}.log` for current, `{app-name}.{date}.log` for rotated files
- **Rotation**: Rotate daily or at 50MB, whichever comes first. Retain at least 7 days
- **Format**: Structured JSON, one object per line (for machine parsing)
- **Console**: Also write to stdout/stderr for development convenience, but disk is the source of truth

```
logs/
├── myapp.log              # current log file
├── myapp.2026-04-10.log   # rotated
└── myapp.2026-04-09.log
```

---

## Structured Log Format

Every log line must include:

```json
{
  "timestamp": "2026-04-11T14:32:07.123Z",
  "level": "info",
  "message": "user created",
  "service": "user-service",
  "userId": "abc-123",
  "durationMs": 42
}
```

**Required fields**: `timestamp`, `level`, `message`
**Recommended fields**: `service`, `requestId` / `correlationId`

---

## What Never Goes in Logs

- Passwords, tokens, API keys, secrets
- Full credit card numbers, SSNs, or PII beyond what's needed
- Raw request/response bodies containing sensitive data
- Stack traces at info level (use error level)

Sanitize before logging:

```python
# Bad
logger.info("auth header", authorization=request.headers["Authorization"])

# Good
logger.info("auth header present", has_auth=bool(request.headers.get("Authorization")))
```

---

## Configuration

Control logging via environment variable:

```
LOG_LEVEL=debug    # development — full trace
LOG_LEVEL=info     # production — system boundaries
LOG_LEVEL=warn     # quiet mode — problems only
```

Default to `info` if not set.

---

## Checklist

- [ ] Logs written to disk (not just console)
- [ ] Debug level traces function entry/exit, arguments, decisions, return values
- [ ] Info level covers all system-to-system interfaces
- [ ] Structured JSON format with timestamp, level, message
- [ ] Log rotation configured (daily or 50MB)
- [ ] No secrets in log output
- [ ] LOG_LEVEL configurable via environment variable
- [ ] Errors include enough context to diagnose without reproduction
