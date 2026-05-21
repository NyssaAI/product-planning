# Security Fundamentals

**Validate at boundaries. Never expose secrets. Use HTTPS always. Hash passwords. Expire sessions.**

---

## Core Rules

1. **Validate all untrusted input** — HTTP requests, file uploads, API responses, forms
2. **Sanitize for context** — Escape HTML, parameterize SQL, encode URLs, avoid shell execution
3. **Never hardcode secrets** — Use environment variables or secret management tools
4. **Never log secrets** — No API keys, passwords, tokens in logs or error messages
5. **HTTPS only** — All data transmission encrypted
6. **Hash passwords** — bcrypt, scrypt, or PBKDF2 (never MD5, SHA1, SHA256)
7. **Rate limit** — Prevent brute force (login attempts, API requests)
8. **Expire sessions** — Tokens/cookies should expire after reasonable time
9. **Authenticate & authorize** — Verify user identity AND permission for action
10. **Minimal data** — Store only what you need

---

## Secrets Management

```python
# ❌ WRONG
API_KEY = "sk-1234567890"
logger.info(f"Key: {api_key}")
raise Error(f"Failed: {password}")

# ✅ RIGHT
API_KEY = os.getenv("API_KEY")
logger.info("Authenticating")
raise Error("Authentication failed")
```

---

## Input Validation

See `input-validation.md`. In brief:

- **SQL**: Parameterized queries always
- **HTML**: Escape output
- **URLs**: Encode user input
- **Shell**: Never pass user input to `system()` or `exec()`

---

## Authentication

```python
# Verify user is who they claim
token = verify_token(request.headers.get("Authorization"))
if not token:
    return 401 unauthorized()
```

---

## Authorization

```python
# Verify user has permission for this action
if token.user_id != resource_owner_id and not token.is_admin:
    return 403 forbidden()
```

---

## Sessions

- **Secure tokens**: Use cryptographically secure random generation
- **Secure cookies**: `secure=True`, `httponly=True`, `samesite="Strict"`
- **Expiration**: Sessions expire after 1 hour; refresh tokens after 30 days
- **Rate limit**: Limit login attempts (max 5 per 5 minutes)

---

## Testing

- Test that invalid input is rejected
- Test that unauthorized users can't access resources
- Test that secrets aren't logged
- Test that errors don't leak information

---

## Checklist

- [ ] Secrets in environment variables only
- [ ] Input validated at entry point
- [ ] Output escaped for context (HTML, SQL, URLs)
- [ ] HTTPS enforced
- [ ] Passwords hashed (bcrypt/scrypt/PBKDF2)
- [ ] Sessions expire
- [ ] Rate limiting implemented
- [ ] No secrets in logs/errors
- [ ] Stack traces hidden from users
- [ ] Dependencies updated regularly
