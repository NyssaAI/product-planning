# Phase packets and return contracts

Each packet is the prompt the main agent hands a fresh subagent for one pipeline phase, plus the return the main agent gates on. Fill every `<...>` slot from loop state before dispatch. Every packet starts with the standards preamble; the main agent never omits it.

## Standards preamble (every packet)

```text
Load the `dev-standards` skill (host name may be `dev-standards:dev-standards`) and apply it as a
constraint on this work. Keep this phase's primary workflow; use dev-standards only to govern
repository layout, naming, architecture, implementation, testing, and review decisions. State a
material conflict instead of silently choosing a lower-precedence rule.
Applicable constraints for this repo: <preflight summary>
Resolve every skill named below against the host's available-skills list and invoke that exact entry.
Work from the repo root: <absolute repo root>. Current branch: <run branch>. Do not push, open a PR,
merge, rebase, or switch branches. Do not touch these pre-run files: <dirty set or none>.
```

## plan

Invoke `ce-plan` with its skip token. ce-plan has no pipeline-mode token: `confirm:auto` is the only
flag that suppresses a question (the scoping confirmation), and it treats an automated caller as
pipeline mode on its own, which forces markdown, runs `ce-doc-review mode:non-interactive`, and
returns before the handoff menu. The orchestrator states whether the run uses the default autonomous
mode or the opt-in interactive mode.

```text
<standards preamble>
Invoke the `ce-plan` skill with `confirm:auto` followed by the brief below. You are an automated
caller with no user present: write a Durable implementation plan and return before any handoff
menu. Run mode: <autonomous | interactive>.

In autonomous mode, if ce-plan reaches an in-scope question or decision blocker, make the best
supported choice and continue. Prefer settled product and feature decisions, then the roadmap's
verification contract, then established repository conventions, then the least irreversible option
that still completes the unit. Record each choice in the plan under `## Autonomous decisions` with
the blocker, decision, rationale, and evidence. Return `status: blocked` only when implementation is
impossible without missing authority, a destructive or external action not authorized by the user,
or an unavailable prerequisite. In interactive mode, do not answer an unresolved question yourself
and do not render numbered choices; return it as the blocker so the orchestrator can ask the user.

Plan this unit:
<unit brief>

Read the feature guide at <feature guide path> and, when it exists, the roadmap's Verify: line;
the plan's verification contract must make that checkpoint demonstrable. Record the applicable
dev-standards categories in the technical design. Prefer the in-scope module docs under the
configured code-map root (<code-map root>/modules/) when they help orient the task. Use targeted
source reading directly when sufficient; maps are optional evidence, not a prerequisite.
<when revising: Deepen the existing plan at <plan path>. Resolve these blocking review findings:
<findings>>

Return exactly:
status: <complete | blocked>
artifact_path: <absolute path ce-plan reported writing, or none>
artifact_readiness: <value from the plan metadata>
execution: <value from the plan metadata>
blocker: <text when blocked>
recovery_path: <text when blocked>
autonomous_decisions: <concise list of blocker, decision, rationale, and evidence; none when empty>
```

Gate: `status: complete`, a readable `artifact_path` reported by this run, `artifact_readiness: implementation-ready`, and `execution: code`. A `status: blocked` whose blocker is an in-scope decision question goes to the user in interactive mode or is decided by the orchestrator in autonomous mode, then the packet is redispatched once with the answer or decision appended to the brief. A repeated decision blocker or any hard blocker stops the loop. A plan file that exists but was not reported this run is not a written plan. When `autonomous_decisions` is not `none`, every entry must be present in the plan's `## Autonomous decisions` section before implementation and retained for the completion commit body.

## plan-review

```text
<standards preamble>
Invoke the `ce-doc-review` skill with `mode:non-interactive <plan path>`. Let it apply the fixes it
routes to Apply in the document's native format. Return its non-interactive synthesis envelope
verbatim, then append:

blocking: <list of findings the coherence, feasibility, or adversarial reviewers rated
high-confidence and that say the plan cannot work as written; "none" otherwise>
residuals: <every other unapplied finding as "<lens> — <title> — <one-line reason>">
```

Gate: `blocking: none` advances. Otherwise the loop runs the plan packet once as a revision and reviews again; a second blocking result stops.

## implement

```text
<standards preamble>
Invoke the `ce-work` skill with `mode:return-to-caller <plan path>`. Implement every unit in the
plan on the current branch with path-limited incremental commits and local verification. Do not
enter the standalone shipping tail. Return the complete return-to-caller envelope verbatim.
```

Gate: `status: complete` with `changed_files` non-empty, `standalone_shipping_skipped: true`, `verification_evidence` present when `behavior_change: true`, and no blocker-routed `settled_decision_conflicts`. When `behavior_change: true` and evidence is missing or too vague, run one recovery invocation and then gate again; a second incoherent return stops. The recovery form depends on the envelope's `run_id`: ce-work accepts carriers only before the plan path, in the fixed order `implementation_engine:` then `implementation_run:`, and rejects anything after the path.

```text
ce-work mode:return-to-caller implementation_run:<run_id> <plan path>     # run_id is a non-null safe id
ce-work mode:return-to-caller <plan path>                                 # run_id is null (native execution): repeat the original invocation once
```

## test

```text
<standards preamble>
Run the full test suite from the repo root with exactly this command and no filter:
<test command>
Return:
exit_code: <n>
summary: <passed/failed/skipped counts as the runner reports them>
failures: <one block per failing test: name, file, and the last 40 lines of its output; "none">
```

Gate: `exit_code: 0` advances. A non-zero exit enters the fix loop. `none detected` as the command skips this phase and records a residual.

## fix

```text
<standards preamble>
Invoke the `ce-debug` skill with `mode:pipeline`. The orchestrator's envelope allows fix and commit
on the current branch and excludes push; report `fixed-not-pushed`, never push. The plan for this
work is at <plan path>; a "failing" test that asserts the plan's intended behavior is divergent and
must be deferred, not edited to pass.

Failing suite output:
<failures block from the test packet>

Return the pipeline-mode structured return verbatim.
```

Gate: `fixed-not-pushed` or `fixed-and-pushed` reruns the test packet. `needs-human`, `diagnosed-no-fix`, or `flaky-infra` stops the loop with the return's residuals and `decision_context` reported. Three rounds without a passing suite stops.

## code-review

```text
<standards preamble>
Invoke the `ce-code-review` skill with `mode:agent plan:<plan path>`. It is report-only. Return the
JSON object it emits verbatim (status, actionable_findings, findings, artifact_path, run_id).
```

Gate: `status: failed` stops with its reason. A `settled_conflict`-stamped finding whose evidence says the settled decision is infeasible, the wrong thing, or destructive stops. Otherwise the main agent filters `actionable_findings` with the apply bar in the skill body and dispatches apply-review when any survive.

## apply-review

```text
<standards preamble>
Apply exactly these review findings in the working tree, in the listed order. Before each edit,
confirm the cited evidence still matches the code at file:line; skip and report any that does not.
Do not change contracts, permissions, security posture, or public API shape. Run the targeted tests
named by any finding with requires_verification: true.

Findings:
<filtered findings with file:line, title, suggested_fix, severity>

Then stage only the files you changed and commit:
fix(review): apply review findings for <unit id>

Return:
applied: <finding numbers>
skipped: <finding numbers with reason>
commit: <sha or none>
requires_full_rerun: <true when any applied finding had requires_verification: true>
```

Gate: `requires_full_rerun: true` reruns the test packet once; a failure returns to the fix loop with the remaining rounds.

## compound

```text
<standards preamble>
Invoke the `ce-compound` skill with `mode:non-interactive depth:full`. Context: unit <unit id>
(<statement>), plan at <plan path>. Non-trivial problems solved this unit:
<one line per problem from the implement, fix, and review phases; "none" when none>
Write at most one learning. Return the terminal signal (`Documentation complete` with the doc path,
or `Documentation skipped` with the reason).
```

Gate: either signal advances. A missing terminal signal is recorded as a residual.

## codemap

```text
<standards preamble>
The orchestrator has already confirmed that none of the generator-managed targets were dirty before
the run. Generator-managed targets are all paths under <code-map root> plus repo-root AGENTS.md and
CLAUDE.md. Before generating, snapshot the existence and content hash of every current managed
target. After generating, enumerate the targets again and compare existence and hashes so root
embedding changes and created or deleted artifacts are included.
From the repo root, run:
node "<absolute plugin root>/scripts/map-code/generate.mjs"
Return:
changed_paths: <every repo-relative generator-managed path whose existence or content changed;
include AGENTS.md and CLAUDE.md when their embedded sections changed; "none" otherwise>
reported_files: <the generator's reported files>
warnings: <generator warnings or none>
errors: <generator errors or none>
status: <`git status --short --` limited to changed_paths, or none>
```

Gate: never stops the loop. Errors and warnings are residuals. `changed_paths` is the authoritative
generator staging input for the completion commit; the main agent combines it with the managed docs
allowlist and removes every pre-run dirty path before staging.
