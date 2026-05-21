# Code Commenting Standards

---

## Leading File Comments

**All files must start with a comment block** that documents:
1. **Single Responsibility** — What this file does (one job)
2. **Public Interface** — Tree diagram of exported classes, functions, types
3. **Dependencies** — Critical imports or requirements

### Purpose

The leading comment is a quick reference. Developers should understand what the file does and what it exports **without reading the entire file**.

### Template

```
"""
[File SRP - what this file does]

Public Interface:
├── ClassName
│   ├── method_name(params) -> ReturnType
│   ├── property_name: Type
│   └── static_method() -> Type
├── function_name(params) -> ReturnType
└── TypeOrEnum

Dependencies: [optional]
- External library X (for Y)
- Local module Z
"""
```

**TypeScript - API Client:**
```typescript
/**
 * GoHighLevel API client for contact management.
 *
 * Public Interface:
 * ├── class ContactClient
 * │   ├── getContact(contactId: string) -> Promise<Contact>
 * │   ├── updateContact(contactId: string, data: Partial<Contact>) -> Promise<Contact>
 * ├── type Contact
 * │   ├── id: string
 * │   ├── name: string
 * └── interface ContactInput
 *
 * Dependencies:
 * - axios (for HTTP requests)
 * - dotenv (for API_KEY environment variable)
 */
```

### Best Practices

1. **Keep it short** — 5-10 lines max for the interface tree
2. **Use consistent indentation** — Helps readability
3. **Hide implementation details** — Show only public API
4. **Update when interface changes** — If you add/remove public methods, update the comment

## Self-Documenting Code

- **Self-Documenting Code**: Write code that explains itself through clear naming and structure
- **Minimal Comments**: Only comment what the code cannot express
- **Evergreen Content**: Comments should be relevant long-term, never reference recent changes or fixes
- **Section Headers**: Use section headers to organize code into logical blocks
- **Dead Code**: Never leave commented-out code. Delete it and trust version control to recover it if needed.
