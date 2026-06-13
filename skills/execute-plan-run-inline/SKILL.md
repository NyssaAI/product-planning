---
name: execute-plan-run-inline
description: Internal sub-skill for execute-plan contexts where plan tasks are ready for execution and subagents are unavailable.
user-invocable: false
disable-model-invocation: true
---

# Execute Plan — Run Inline

<INTERNAL-SUB-SKILL>
Invoked by `dev-tools:execute-plan` at Step 2 (fallback only). Users should use **execute-plan**, not this skill directly.
</INTERNAL-SUB-SKILL>

Load plan, review critically, execute all tasks inline in this session, report when complete.

**Announce at start:** "I'm using execute-plan-run-inline (via execute-plan) to implement this plan."

<HARD-GATE>
Use only when **execute-plan** Step 2 selects fallback: platform lacks Task/subagent support **or** your human partner explicitly requests inline execution. If subagents are available and no inline request was made, stop — parent should invoke **execute-plan-run** instead.
</HARD-GATE>

## The Process

**Parent gate:** `dev-tools:execute-plan` Step 1 verifies worktree and branch. Confirm plan header **Branch** and **Worktree** match your current directory before executing tasks.

### Step 1: Load and Review Plan
1. Read plan file
2. Review critically - identify any questions or concerns about the plan
3. If concerns: Raise them with your human partner before starting
4. If no concerns: Create TodoWrite and proceed

### Step 2: Execute Tasks

For each task:
1. Mark as in_progress
2. Follow each step exactly (plan has bite-sized steps)
3. Run verifications as specified
4. Mark as completed

### Step 3: Report Complete

After all tasks complete and verified:
- Report all tasks done to parent **execute-plan**
- Do **not** invoke **execute-plan-finish** — parent Step 3 handles PR

## When to Stop and Ask for Help

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

**Return to Review (Step 1) when:**
- Partner updates the plan based on your feedback
- Fundamental approach needs rethinking

**Don't force through blockers** - stop and ask.

## Remember
- Review plan critically first
- Follow plan steps exactly
- Don't skip verifications
- Reference skills when plan says to
- Stop when blocked, don't guess
- Never start implementation on main/master branch without explicit user consent

## Integration

**Invoked by:**
- **dev-tools:execute-plan** — Step 2 fallback only

**On completion:** Report to parent **execute-plan** — do not invoke **execute-plan-finish** directly.
