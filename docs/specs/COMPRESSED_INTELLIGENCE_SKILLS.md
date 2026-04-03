# COMPRESSED_INTELLIGENCE_SKILLS.md
**Status:** Wave 5B Block B contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B Block B compressed intelligence micro-slice contract baseline.

The slice introduces three operator-facing skills that are read/query/render-only surfaces over already-shipped engine outputs:

- `/phantoms`
- `/ufo`
- `/gaps`

## Boundary

This spec defines:

- deterministic skill-surface output contracts for the three approved routes
- fixed route-to-engine mappings for this micro-slice
- explicit anti-widening and anti-gamification constraints for skill surfaces

This spec does not define:

- new engine behavior or new engine write paths
- SessionBrief schema changes
- SessionReceipt schema changes
- Control Rod enum/profile changes
- Operator Trust Ledger, Journeyman, Warranty, or Scarcity contract changes
- skills outside `/phantoms`, `/ufo`, and `/gaps`
- stateful operator-action surfaces (`/callout`, `/change-order`, `/lockout`, `/permit`)
- skins, onboarding, package, install, runtime-hook, compatibility, or marketplace behavior
- telemetry, phone-home, external API, account-required, or payment-gate behavior
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing tranche label: `Compressed Intelligence Skills`
- Internal build name: `CompressedIntelligenceSkills`
- Core routes: `/phantoms`, `/ufo`, `/gaps`

## Fixed Mapping Rules

- `/phantoms` maps to `ForemansWalk` truthfulness findings view only.
- `/ufo` maps to `StandingRiskEngine` unresolved/aging risk view only.
- `/gaps` maps to `OmissionCoverageEngine` omission expected-signal-missing view only.

Mapping reinterpretation is not allowed in this block.

## Read/Query/Render-Only Posture

- Compressed Intelligence skills consume existing engine outputs only.
- Compressed Intelligence skills render deterministic views only.
- Compressed Intelligence skills do not mutate existing engine state.
- Compressed Intelligence skills do not introduce hidden write paths.
- Compressed Intelligence skills do not widen shared contracts.

## Route Contracts

## `/phantoms`

Input: `ForemansWalk.evaluate(...)` output object.

Route behavior:

- Include only truthfulness findings from the existing findings stream.
- Include only finding types `PHANTOM`, `GHOST`, and `PARTIAL_VERIFICATION`.
- Do not include non-truthfulness findings.

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/phantoms`. |
| `findingCount` | number | Yes | Count of truthfulness findings included in this view. |
| `findingSummary` | object | Yes | Count map by `PHANTOM`, `GHOST`, `PARTIAL_VERIFICATION`. |
| `findings` | object[] | Yes | Truthfulness finding list (`issueRef`, `findingType`, `severity`, `pass`, `summary`, `evidenceRefs`). |

## `/ufo`

Input: `StandingRiskEngine.deriveStandingRisk(...)` output array.

Route behavior:

- Include unresolved/aging standing-risk states only.
- Included states are `OPEN`, `CARRIED`, and `STANDING`.
- Terminal states (`RESOLVED`, `DISMISSED`, `EXPLICITLY_ACCEPTED`) are excluded from unresolved view output.

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/ufo`. |
| `unresolvedCount` | number | Yes | Count of unresolved/aging items included in this view. |
| `terminalExcludedCount` | number | Yes | Count of terminal-state items excluded from unresolved view output. |
| `escalationSummary` | object | Yes | Count map by `OPEN`, `CARRIED`, `STANDING`. |
| `unresolvedItems` | object[] | Yes | Unresolved standing-risk list (`entryId`, `entryType`, `state`, `originSessionId`, `lastSeenSessionId`, `sessionCount`, `carryCount`, `triadSatisfied`, `relevantWorkContinued`, `blastRadiusStillExists`, `rationale`, `evidenceRefs`). |

## `/gaps`

Input: `OmissionCoverageEngine.evaluate(...)` output object.

Route behavior:

- Include omission expected-signal-missing findings only.
- Preserve pack-scoped omission shape and deterministic missing-item vocabulary.

Output object:

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/gaps`. |
| `profilePack` | string | Yes | Profile pack evaluated by omission engine. |
| `sessionId` | string | Yes | Session id associated with omission evaluation input. |
| `missingCount` | number | Yes | Number of omission findings in this view. |
| `missingFindings` | object[] | Yes | Omission finding list (`profilePack`, `missingExpectedItem`, `missingItemCode`, `summary`, `evidenceRefs`). |

## Anti-Gamification Rule

Compressed Intelligence skills must not emit:

- `score`
- `points`
- `badge`
- `rank`
- `leaderboard`
- engagement analytics or social comparison outputs

## Contract Invariants

- Output is deterministic for the same inputs.
- Input objects remain unchanged after rendering.
- Existing engine contracts remain unchanged.
- SessionBrief no-widening remains enforced (`journeymanLevel` is not introduced).
- No hidden write path is introduced.

## Current Implementation Truth

- This is a Wave 5B Block B v1 spec baseline.
- Runtime adapter implementation exists at `src/CompressedIntelligenceSkills.js`.
- Golden proof exists at `tests/golden/CompressedIntelligenceSkills.golden.test.js`.
- Operator-facing skill artifacts exist at:
  - `skills/phantoms/SKILL.md`
  - `skills/ufo/SKILL.md`
  - `skills/gaps/SKILL.md`
