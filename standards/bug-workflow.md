# Bug Workflow

## Directory structure

```
docs/bugs/
└── {timestamp}-{slug}/
    ├── {timestamp}-{slug}-detail.md
    └── {timestamp}-{slug}-resolution.md
```

## Workflow

1. **Discovery** — When a bug is found, immediately create the dated directory and the detail file. Commit and push.
2. **Resolution** — When the fix is complete, create the resolution file in the same directory. Commit and push.
3. **No batching** — Each step gets its own commit and push. Do not combine discovery and resolution into one commit.

## Detail file contents

The detail file should include:

- **Symptom** — what was observed
- **Root cause** — why it happened (if known at time of writing)
- **Contributing factors** — environment, configuration, or code that contributed

## Resolution file contents

The resolution file should include:

- **Fix applied** — what was changed and why
- **Status** — resolved, mitigated, or deferred
- **Commits** — references to the commits that contain the fix
