# Design Patterns and SOLID Principles

Practical SOLID and design pattern guidance for all software development. Apply these when they reduce complexity, not to satisfy a checklist.

- **Single Responsibility**: Every module, class, or function should have one reason to change.
- **Open/Closed**: Software should be open for extension, closed for modification. Instead of adding `if/else` branches or `switch` statements, design for new behavior to be added without changing existing code.
    - **Closed for modification** — Don't edit existing code to add features
    - **Open for extension** — Add new behavior by adding new code
- **Liskov Substitution**: Subtypes must be substitutable for their base type without breaking code. If class B is a subtype of class A, you should be able to replace A with B without affecting behavior.
- **Interface Segregation**: Clients should not depend on interfaces they don't use. Keep interfaces focused; split large interfaces into smaller, client-specific ones.
- **Dependency Inversion**: High-level modules should not depend on low-level modules. Both should depend on abstractions. Pass dependencies in, don't hard-code them.


## Common Design Patterns

Use design patterns when they simplify a solution to a coding problem. Name the types involved to make the pattern used obvious. These are common patterns:

- **Factory**: Creates objects without exposing creation logic.
    - **Use when:** Object creation is complex or should be centralized.
- **Strategy**: Encapsulates interchangeable algorithms.
    - **Use when:** Multiple algorithms exist for a task; caller should choose one.
- **Registry**: Maps keys to handlers/factories for dynamic dispatch.
    - **Use when:** Need to dispatch based on a key without switch/if-else chains.
- **Builder**: Constructs complex objects step-by-step.
    - **Use when:** Object has many optional parameters or construction is multi-step.
- **Adapter**: Converts interface of one class to another clients expect.
    - **Use when:** Two classes with incompatible interfaces need to work together.
- **Result**: Encapsulates success and failure states into an object that can be returned from a method. Often uses Monads.
    - **Use when:** To handle errors that are not actually exceptional.

---

## Anti-Patterns to Avoid

| Pattern | Why It's Wrong | Use Instead |
|---------|---|---|
| **God Object** | Single class doing everything (validation, persistence, caching, logging) | Split by responsibility |
| **Feature Envy** | Object using data/methods from another object excessively | Move logic to the object that owns the data |
| **Tight Coupling** | Classes depend directly on concrete implementations | Inject dependencies via constructor |
| **Premature Abstraction** | Creating abstractions before 3+ real use cases exist | Inline, duplicate, then refactor when pattern emerges |
| **Swiss Army Knife API** | One function with 10+ parameters and complex logic | Split into focused functions or use builder |
| **Data Clumps** | Same groups of variables appearing together repeatedly | Group into a dedicated type in `src/models/` when 2+ features use it (see [project-structure](./project-structure.md)) |
| **Large Switch Statements** | Growing switch/if-else for different cases | Use registry, factory, or strategy pattern |

---

## When to Apply Patterns

**DO use patterns when:**
- Code has grown to 3+ similar pieces (DRY principle)
- Pattern reduces complexity and improves readability
- You have a clear reason (YAGNI — "You Aren't Gonna Need It")

**DON'T use patterns when:**
- You're following a checklist instead of solving a problem
- Pattern adds unnecessary abstraction layers
- Code is simple and patterns would obscure intent
