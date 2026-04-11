**Status:** Confidence Required Coverage additive contract baseline (Packet 2 v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Packet 2 additive contract for Confidence Required Coverage.

Required coverage is an explicit opt-in layer on top of shipped Confidence Gradient Phase 1.

It does not change `scan(files)` meaning.

## Truth Lock

Policy file location is fixed to repo root only:

- `confidence-required-coverage.json`

Engine method truth is fixed to:

- `ConfidenceGradientEngine.evaluateRequiredCoverage(files, policy)`

Skill/render truth is fixed to:

- `/confidence` may compose the separate required coverage report additively

Observed marker truth and required coverage truth must remain separate.

## Boundary

This slice defines:

- exact policy file location truth
- exact policy shape
- exact additive engine evaluator method
- exact required coverage report shape
- exact policy error vocabulary
- exact missing coverage finding vocabulary

This slice does not define:

- `scan(files)` mutation
- filesystem reads inside the engine
- filesystem-absence proof
- domain-keyed policy
- glob or pattern DSL policy
- inheritance
- marker-family overrides
- semicolon-family support
- reviewed-clean semantics
- score/trend/health math
- hook/lifecycle/chain/board/omission/temporal/identity integration

## Policy Contract

Policy object:

| Field | Type | Required | Description |
|---|---|---|---|
| `version` | integer | Yes | Literal `1`. |
| `targets` | object[] | Yes | Explicit required coverage targets. |

Policy target object:

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | Deterministic target id. |
| `filePath` | string | Yes | Exact path-normalizable file target. |

Policy grain rules:

- target selection is exact normalized `filePath` only
- no domain-keyed policy
- no glob or pattern DSL
- no inheritance
- no comments/severity knobs/marker-family overrides in this baseline
- no threshold knobs beyond implicit slash marker count `>= 1`

Coverage rule:

- a target is covered when slash-family marker count is at least `1`

No policy file means no required coverage evaluation.

## Initial Policy Artifact

The approved initial repo-visible policy artifact is:

```json
{
  "version": 1,
  "targets": [
    {
      "id": "hook-runtime-core",
      "filePath": "src/HookRuntime.js"
    }
  ]
}
```

## Required Coverage Report Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `policyMode` | string | Yes | Literal `explicit_opt_in`. |
| `markerFamily` | string | Yes | Literal `slash`. |
| `targetCount` | integer | Yes | Raw count of policy targets. |
| `evaluatedTargetCount` | integer | Yes | Count of targets actually evaluated against supplied scan input. |
| `findings` | object[] | Yes | Missing required coverage findings only. |
| `policyErrors` | object[] | Yes | Separate policy/input errors only. |

Missing coverage finding shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Literal `REQUIRED_COVERAGE_MISSING`. |
| `policyTargetId` | string | Yes | Policy target id. |
| `filePath` | string | Yes | Normalized target path. |
| `domain` | object | Yes | Deterministic file-path domain result. |
| `markerCount` | integer | Yes | Observed slash-family marker count. |
| `minimumMarkerCount` | integer | Yes | Literal `1`. |

Policy error shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | string | Yes | Approved policy error code only. |
| `policyTargetId` | string or null | Yes | Target id when addressable; otherwise `null`. |
| `filePath` | string or null | Yes | Normalized target path when addressable; otherwise `null`. |

## Required Error Vocabulary

Use only this engine-level policy error vocabulary:

- `POLICY_TARGET_INVALID`
- `POLICY_TARGET_DUPLICATE`
- `POLICY_TARGET_OUTSIDE_SCAN_FENCE`
- `POLICY_TARGET_NOT_IN_SCAN_INPUT`

Use only this missing coverage finding code:

- `REQUIRED_COVERAGE_MISSING`

Do not invent filesystem-absence codes.

## Evaluation Rules

- use the same explicit `files[]` posture as `scan(files)`
- reuse the same path normalization semantics as confidence scanning
- keep Windows and `.claude` normalization coherent with Phase 1
- validate `version`
- validate `targets`
- validate target `id`
- validate target `filePath`
- detect duplicate ids deterministically
- detect duplicate normalized file paths deterministically
- detect outside-scan-fence targets deterministically
- emit `POLICY_TARGET_NOT_IN_SCAN_INPUT` when a valid in-fence target is absent from supplied `files[]`
- do not read the filesystem
- do not claim filesystem absence
- do not count semicolon-family content as required coverage satisfaction

## Engine vs Skill Boundary

Engine truth:

- normalize and validate policy
- evaluate required coverage against explicit `files[]`
- return a separate required coverage report

Skill truth:

- keep existing observed marker render intact
- compose the required coverage report additively under `/confidence`
- keep required coverage findings separate from observed marker truth
- keep policy errors separate from required coverage findings

## No-Ship Boundaries

Do not ship any Packet 2 change that:

- widens `scan(files)` in place
- changes existing `scan(files)` contract meaning
- touches `.claude/settings.json`
- touches Omission / HookRuntime / Walk / Chain / ControlRod surfaces
- requires domain-first or glob-first policy behavior
- touches a file outside the approved structural fence
- introduces semicolon-family support
- introduces reviewed-clean semantics
- introduces score/trend/health math
- requires migration-grade widening for route composition
- materially contradicts current repo truth

## Current Implementation Truth

- Runtime implementation lives at `src/ConfidenceGradientEngine.js` and `src/ConfidenceSkill.js`.
- Golden proof lives at `tests/golden/ConfidenceGradientEngine.golden.test.js` and `tests/golden/ConfidenceSkill.golden.test.js`.
- Operator-facing behavior lives at `skills/confidence/SKILL.md`.
