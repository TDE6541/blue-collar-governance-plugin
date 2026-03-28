---
name: fire-team-session
public_label: Governed Execution Protocol
class: execution
tier: core
inherits: hold-doctrine
description: "Phase-gated workflow for governed work. Use for any task involving code changes, multi-file edits, debugging, structured document changes, system modifications, or any work where scope, contracts, and verification matter."
---

# Governed Execution Protocol

## Purpose

This skill is the default workflow for work that has a meaningful done-state.

Its job is to prevent the most common failure mode in AI-assisted work: starting implementation before the task is properly framed, the truth sources are identified, the risks are surfaced, and the acceptance criteria are clear.

This protocol is not for casual conversation.
It is for work that can create rework, regressions, drift, or false confidence if handled loosely.

---

## When to use this skill

Use this skill when:

- the task touches code or multiple files
- the task affects structured documents or operational artifacts
- contracts, schemas, exports, APIs, or data formats may be affected
- the work has acceptance criteria
- getting it wrong would cost time, trust, or stability
- the task requires planning, execution, verification, and closeout

Do not use this skill when:

- the user asks a quick question
- the task is exploratory only
- the conversation is casual or brainstorming
- the work is a single-response answer with no real execution path

Rule of thumb: if the task has a real delivery state, use this protocol.

---

## Core principle

Work does not start with implementation.
Work starts with framing.

The correct sequence is:

1. Understand the task
2. Surface HOLDs and risks
3. Build the minimal plan
4. Get explicit approval
5. Execute narrowly
6. Verify against acceptance criteria
7. Close out cleanly

Skipping phases saves minutes up front and often costs hours later.

---

## Phase 0 — Preflight

Before governance review begins, establish the working perimeter.

### Required preflight
- confirm the workspace or repo you are operating in
- confirm the current branch or working context
- identify the governing truth sources for this session
- confirm whether existing work is already in progress
- check whether the task is a continuation or a fresh session

### Truth sources

State the specific authorities for the session, such as:

- repo files
- canonical docs
- source data
- issue/ticket text
- user-provided artifacts
- external references

If the truth sources are unclear, do not proceed casually. Surface that as a HOLD.

---

## Phase 1 — Governance Review (AEGIS)

Before any planning or implementation happens, produce a Session Spine.

### Session Spine
```
Goal (one sentence)
In scope
Anti-goals
Truth sources
Contracts touched: Yes/No — which
Migration guard: Yes/No — why
Acceptance criteria
Constraints: time, risk, or other limits
```

### Machine-readable SESSION_SPINE emission (v2)

When a governed session is active, emit one deterministic block whenever the session spine is first established, and emit an updated block when closeout/signoff state changes.

Use this exact fenced format:

```SESSION_SPINE
{
  "block_type": "SESSION_SPINE",
  "version": "2.0",
  "goal": "one sentence goal",
  "truth_sources": ["TEAM_CHARTER.md", "AI_EXECUTION_DOCTRINE.md"],
  "contract_risk": false,
  "execution_notes": null,
  "closeout_summary": null,
  "verification_summary": null,
  "risk_notes": null,
  "next_action": null,
  "signoff_by": null,
  "signoff_status": "not_signed_off"
}
```

Rules:
- Keep valid JSON.
- Keep keys stable and spelled exactly as shown.
- Emit only values supported by evidence.
- If unknown, use `null` (do not guess).
- Keep public prose readable, but this block is the canonical machine payload.

### Then assess risk

**Contract-risk scan**

What existing structures could drift if this work proceeds?
Name them specifically:

- schemas
- APIs
- exports
- UI contracts
- data formats
- document contracts

**HOLD scan**

What is unknown, ambiguous, or unverified?
Surface all meaningful HOLDs before work begins, not after.

**Do-not-ship conditions**

What would make this work unsafe to deliver?
Name the failure modes explicitly.

**Evidence required**

What must be checked in code, docs, source material, or repo state before any edits begin?

### Phase 1 output

Present:

- the Session Spine
- risk scan
- HOLDs
- do-not-ship conditions
- evidence required

Do not proceed until scope is confirmed.

---

## Phase 2 — Planning (VEKTOR)

After scope is confirmed, build the minimal execution plan.

### Discovery
- what needs inspection
- why it needs inspection
- what the current state appears to be

### Patch plan
- minimal-diff list, file by file
- exact files or artifacts to touch
- exact areas that must remain untouched

### Blast radius

State:

- what could regress
- what adjacent systems or artifacts could be affected
- what must not drift

### Verification plan
- how each acceptance criterion will be checked
- what commands, tests, reviews, or inspections will confirm correctness
- what evidence will count as success

### Phase 2 output

Present the full plan and then stop.

Use an explicit gate:

```
PLAN COMPLETE — awaiting APPROVE before execution
```

Do not start implementation without explicit approval.

---

## Phase 3 — Execution (OPERATOR)

After receiving approval, execute the plan.

### Execution rules
- change only what the plan specified
- preserve evidence
- do not invent missing details
- do not silently mangle source material
- default new items to proposed unless explicitly confirmed
- complete and verify changes in a deliberate sequence
- if something unexpected appears, STOP and convert it into a HOLD

### Implementation standard
- one thing at a time
- verify before moving on
- no unplanned refactors
- no "while I'm here" edits
- no silent scope expansion

---

## Phase 4 — Verification and Closeout

After execution, verify against the original acceptance criteria.

### Required closeout
- what changed
- why it changed
- whether each acceptance criterion is PASS / FAIL / HOLD
- remaining HOLDs
- next action
- blast radius result
- whether any contract or migration issue was triggered
- whether signoff is still required before ship/merge

### Closeout format
```
Changes made
Acceptance criteria status
Remaining HOLDs
Next actions
Signoff status
```

A session is not complete just because edits exist.
It is complete when the result is verified and its state is legible.

---

## Minimal Viable Session (MVS)

When time or energy is constrained, compress the protocol to:

```
Goal (one sentence)
One artifact to produce
Truth source
HOLDs
Next action
```

MVS is a fallback, not a default operating mode.
If it repeats too often, schedule a full governed session.

---

## Scope management rules

### What counts as scope creep
- fixing something outside the agreed plan
- adding an adjacent improvement
- refactoring stable code or docs without approval
- adding non-essential commentary or cleanup
- expanding the task because a better idea appeared mid-session

### What to do instead
- note it
- log it as a proposal, follow-up, or HOLD
- do not act on it without a new Session Spine and approval gate

Unplanned changes are one of the most common sources of regression and trust erosion.

---

## Contract change protocol

If the work touches a schema, export format, API contract, or structured data model, the plan must include:

- why the change is worth making
- what changes exactly
- how compatibility or migration is handled
- how the change will be verified
- what explicit signoff is required

Contract changes are never silent and never casual.

---

## Handoff protocol

When a session ends mid-task or moves to another context, produce a handoff:

```
Goal in progress
Current state
Open HOLDs
Next action
Files or artifacts touched
Verification state
```

A good handoff should let the next session resume without reconstructing the whole task from memory.

---

## Signoff rule

Verification and signoff are different.

Verification checks whether the work matches the plan.
Signoff determines whether it is acceptable to ship, merge, send, or treat as complete.

If the task changes a contract, affects a live system, or carries material risk, explicit signoff remains required even after verification passes.

---

## How this skill works with the doctrine layer

This skill inherits hold-doctrine by default.

That means it must:

- distinguish fact, inference, and HOLD
- preserve evidence
- avoid silent mangling
- treat contracts as load-bearing
- keep scope narrow
- surface uncertainty instead of polishing over it

This protocol governs motion.
The doctrine governs truth.

---

## Non-goals

This protocol does not exist to:

- slow down simple work
- turn every session into bureaucracy
- replace judgment
- eliminate iteration
- forbid compression when time is short

Its purpose is proportionate rigor for work that matters.

---

## Public explanation

This is a phase-gated execution workflow for AI-assisted work.

It ensures that meaningful work moves through:

1. framing
2. governance review
3. planning
4. approval
5. execution
6. verification
7. closeout

The value is not ceremony.
The value is reducing rework, preventing drift, protecting contracts, and making high-leverage work more trustworthy.
