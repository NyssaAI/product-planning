# Workflow: Use Case Specification & Process Tree Mapping

> [!IMPORTANT] Scope Directive
> This workflow documents or refines a concrete actor workflow (`docs/features/f-gg.nn/uc-gg.nn.uu-short-slug.md`) nested under an existing feature. It owns actor definition, entry route, trigger, ASCII process trees, step details, failure paths, acceptance checks, and parent feature guide link consistency. Feature-level capability boundaries belong in `workflows/feature.md`.

---

## Operating Rules

- Reuse information and approval already supplied by the user.
- Configured paths are repo-relative. Render links relative to document location.
- Read `.plan-product/config.json` for paths and `paths.useCaseTemplate` for file shape.
- Preserve existing user-authored content unless explicit replacement is requested.
- Ask one blocking question at a time.
- Do not invent a happy path from the feature summary. The user must explain workflow steps.
- Require an entry route: how the actor reaches the flow (screen, user action, trigger, starting state).
- Write all use-case steps, details, and outcomes in plain, non-technical actor-behavior language. Do **not** leak overly technical decisions, implementation mechanics, or specific product/technology selections (frameworks, databases, APIs, config files, scripts) into use cases—those belong only in `tech-stack.md` or `roadmap.md` entries.
- Preserve `Starting Context`, `Entry Route`, `Trigger`, `Process`, and `Step Details` as separate sections.
- Render workflow process strictly as an ASCII tree using standard markers (`+--`, `|`, `\--`).
- Keep explanations for complex tree nodes under `Step Details`. Keep simple nodes in the tree only.
- Do not finalize a use case that duplicates or contradicts another sibling use case.

---

## Procedure

### 1. Target Resolution & Context Check
1. Read `.plan-product/config.json` and the feature inventory.
2. Resolve parent feature guide from `structure.features.featurePathPattern`.
3. If user named existing use case, read it. Otherwise scan sibling use cases under `structure.features.useCaseFilePattern`, select next `UC-gg.nn.uu` ID (inheriting `gg.nn` from parent `F-gg.nn` with sequential `uu` `01`–`99`), and derive path from `structure.features.useCasePathPattern`.

### 2. Workflow Discovery & Adversarial Pass
1. Interview for:
   - Primary actor and goal.
   - Starting context / prerequisite state.
   - Entry route (discovery/entry mechanism).
   - Trigger event.
   - Step-by-step progression and decision branches.
   - Complex steps requiring elaboration in `Step Details`.
   - Failure conditions and error handling.
   - Concrete acceptance criteria.
2. Restate candidate use case for confirmation.
3. Adversarial completeness & consistency check:
   - Verify every ASCII tree node identifies actor, action, and observable outcome in plain, non-technical language.
   - Verify no overly technical decisions or product/technology selections leaked into the process tree or step details.
   - Verify failure cases cover realistic validation, timeout, or state issues.
   - Compare candidate against sibling use cases in the parent folder. Stop if contradiction or duplicate flow exists.

### 3. File Generation & Parent Link
1. Read `paths.useCaseTemplate` immediately before writing.
2. Write use case file from template, filling all sections.
3. Update parent feature guide:
   - Add markdown link under `## Use Cases`: `- [UC-gg.nn.uu: Title](uc-gg.nn.uu-short-slug.md)`.

---

## Verification Checklist

- [ ] Path derived from `structure.features.useCasePathPattern`.
- [ ] Read `paths.useCaseTemplate` immediately prior to write.
- [ ] Process represented as valid ASCII tree with `+--`, `|`, and `\--`.
- [ ] No overly technical decisions or product/technology selections leaked into the use case.
- [ ] Distinct `Entry Route` and `Trigger` sections present.
- [ ] Complex tree nodes elaborated in `Step Details`.
- [ ] Sibling use cases checked for duplicates or contradictory flows.
- [ ] Parent feature guide updated with relative link to the new use case.
