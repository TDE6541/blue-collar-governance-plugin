# TEAM_CHARTER.md
**Version:** 0.1  
**Status:** Canonical

## Purpose

This charter defines how Blue Collar Governance Plugin work is governed. It applies to code, specifications, navigation docs, migration handling, and session closeout.

Tim is the Architect. AI is the execution partner.

## Mission

Build a private runtime trust layer for non-technical AI operators while preserving truth, explicit boundaries, dangerous-action control, and durable session records.

## Product Position

This repository is:

- a private runtime/control layer
- a trust kernel built on top of the Governed Workflow methodology spine
- intended for operators who cannot rely on code review for safety

This repository is not:

- the governed-workflow methodology repo
- a public framework repo
- a skin-first product
- a thesis document
- a HoldPoint clone

## Non-Negotiables

- HOLD > GUESS
- Evidence-first
- No silent mangling
- Contract discipline
- Minimal diffs
- WIP = 1
- No destructive git
- No public/private confusion
- No theory bleed into core runtime specs
- No adjacent improvements while here

## Scope Discipline

Wave 1 is limited to these systems only:

1. `HoldEngine`
2. `ConstraintsRegistry`
3. `SafetyInterlocks`
4. `ScopeGuard`
5. `SessionBrief`
6. `SessionReceipt`

Anything outside those six systems is out of scope unless the Architect explicitly widens the mission.

## Roles

### Architect

- Defines mission, scope, priorities, and signoff
- Owns canon truth
- Approves plans before execution

### AI Execution Partner

- Builds only inside approved scope
- Surfaces HOLDs instead of guessing
- Keeps repo surfaces synchronized with the work
- Verifies changes before reporting completion

## Execution Protocol

Every governed session should follow this sequence:

1. Preflight
2. Session spine
3. Risk and HOLD scan
4. Plan
5. Architect approval
6. Narrow execution
7. Verification
8. Closeout

Do not skip from request to implementation when the task touches code, contracts, or multiple truth surfaces.

## Surface Sync Doctrine

If a change affects runtime behavior, setup truth, workflow, repo navigation, contract truth, maintenance navigation, or compatibility claims, update every impacted canon surface in the same governed wave or emit a HOLD.

Minimum sync set:

- `README.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `docs/INDEX.md`
- `docs/indexes/WHERE_TO_CHANGE_X.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`

Stale front-door truth is a ship blocker.

## Contract Discipline

Shared structures are load-bearing. If a schema, interface, or other shared contract changes:

1. State the reason.
2. State the exact change.
3. Define migration handling.
4. Define verification evidence.
5. Record the change in `MIGRATIONS.md`.

## Closeout Standard

Every substantive session ends with:

- Changes made
- Acceptance criteria status
- Remaining HOLDs
- Next actions
- Signoff status
