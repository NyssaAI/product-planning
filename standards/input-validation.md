# Input Validation Standards

**Always validate on server. Use allowlists. Sanitize output. Two phases: structure then business rules.**

---

## Two-Phase Validation

**Phase 1: Entry Point** — Type, format, length, presence
```python
def create_user(email: str) -> Result:
    if not email or not "@" in email:
        return Result.error("invalid_email")
    if len(email) > 200:
        return Result.error("email_too_long")
```

**Phase 2: Business Rules** — State, permissions, conflicts
```python
    if user_exists(email):
        return Result.error("email_already_registered")
    
    return Result.ok(database.insert({"email": email}))
```

---

## Entry Point (Always)

Validate at system boundaries:
- HTTP request bodies, query params
- File uploads
- Third-party API responses
- Forms

**Check**: Type, format, length, required, allowlist values

---

## Common Patterns

| Check | Code |
|-------|------|
| **Required** | `if not value: raise error("required")` |
| **Length** | `if len(value) > 200: raise error("too_long")` |
| **Range** | `if value < 0 or value > 100: raise error("out_of_range")` |
| **Email** | `if "@" not in value: raise error("invalid_email")` |
| **UUID** | `if not is_valid_uuid(value): raise error("invalid_id")` |
| **Allowlist** | `if value not in ["a", "b", "c"]: raise error("invalid_value")` |
| **Regex** | `if not regex.match(value): raise error("invalid_format")` |

---

## Sanitization by Context

| Context | How | Example |
|---------|-----|---------|
| **SQL** | Parameterize | `execute("... WHERE email = ?", [email])` |
| **HTML** | Escape | `escape_html(user_input)` |
| **URL** | Encode | `urlencode(search_term)` |
| **Shell** | Never concat | Use subprocess, not `system()` |

---

## Business Rules (After Phase 1)

Once structure is valid, check:
- Permissions (can user do this?)
- State (is system in right state?)
- Conflicts (does this already exist?)
- Invariants (business constraints)

---

## Error Messages

```python
# ❌ Vague
"Invalid input"

# ✅ Clear & actionable
"Email must be valid format: name@domain.com"

# ❌ Leaks details
"Foreign key constraint violation on users.id"

# ✅ Business language
"User not found"
```

---

## Testing

- Valid inputs pass
- Invalid inputs fail (type, format, length, allowlist)
- Edge cases handled (empty, zero, negative, max)
- Business rules enforced
- Error messages clear

---

## Checklist

- [ ] Server-side validation (never trust client)
- [ ] All entry points validated
- [ ] Allowlists (not blocklists)
- [ ] Output sanitized per context
- [ ] Business rules validated
- [ ] Error messages are actionable
- [ ] Edge cases tested
- [ ] No secrets in validation errors
