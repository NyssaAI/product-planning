# Timestamp Format

## Writing timestamps

All new dated directories and files use the `YYYY.MM.DD-HHMMSS` write format:

```
YYYY.MM.DD-HHMMSS
```

- 24-hour clock
- Local time
- Use the current timestamp at the moment of creation

### Examples

```
2026.04.11-143207-auth-token-expired/
2026.04.01-124512-add-retry-logic/
```

## Reading timestamps

Code that parses timestamps must accept both the canonical format and ISO 8601:

| Format | Example | Notes |
|--------|---------|-------|
| Canonical | `2026.04.11-143207` | Dots in date, compact time |
| ISO 8601 | `2026-04-11T14:32:07` | Dashes in date, colons in time |

### Conversion

```
Canonical → ISO:  2026.04.11-143207  →  2026-04-11T14:32:07
ISO → Canonical:  2026-04-11T14:32:07  →  2026.04.11-143207
```

### Parsing guidance

When reading a timestamp from a directory or filename:

1. Check for `.` in the date portion → canonical format
2. Check for `-` in the date portion → ISO format
3. Extract date and time components, normalize to a datetime for comparison and sorting
