# Acceptance Tests

Agent acceptance tests (AATs) use Cucumber feature files to define expected behavior.

## Directory structure

```
docs/acceptance-tests/
└── {timestamp}-{slug}/
    ├── {slug}.feature              - Cucumber feature file
    └── ...                         - supporting step definitions, fixtures
```

## Conventions

- Each feature gets its own dated directory
- Feature files use standard Gherkin syntax (Given/When/Then)
- Step definitions and fixtures live alongside the feature file they support
