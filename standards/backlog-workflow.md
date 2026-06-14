# Backlog Workflow

## Directory structure

```
docs/agent-plan/backlog/
└── {timestamp}-{slug}/
    └── {timestamp}-{slug}-detail.md
```

## Creating a backlog item

Create a dated directory with a detail file describing the work to be done. Commit and push.

## Detail file contents

The detail file should include:

- **Summary** — one-line description of the work
- **Context** — why this work matters, what it unblocks
- **Scope** — what's in and out of scope
- **Acceptance criteria** — how to know when it's done

## Starting work on a backlog item

When work begins, invoke **dev-tools:design-spec** with the detail file as input. Design-spec reads summary, context, scope, and acceptance criteria, produces a spec in `docs/agent-plan/specs/`, then hands off to `write-plan` and **execute-plan** when ready to implement. Do not skip straight to planning without a spec.
