# WAVE5_BLOCK0_SUBSTRATE_GATE.md
**Status:** Block 0 substrate-gate memo locked; runtime not implemented
**Date:** 2026-03-30
**Audience:** Architect, implementers, maintainers

## Purpose

This memo records the Wave 5A Block 0 substrate-gate decisions.

Block 0 is docs-only. It does not ship runtime behavior.

## Merit-Gate Rubric

A substrate candidate passes only when it satisfies all checks:

1. Lifecycle distinctness: introduces a real state lifecycle not already represented by existing substrates.
2. Derivation honesty: derived-only representation is materially brittle or misleading.
3. Operator legibility: state can be read/query/rendered clearly without hidden engine behavior.
4. Contract boundedness: shape and boundaries can be defined without scope fog.
5. Integration value: trust-surface clarity gained is worth the added complexity.

Continuity doctrine by itself is not a sufficient accept/reject argument.

## Operator Trust Ledger Assessment

Assessment against rubric:

- Lifecycle distinctness: PASS
  - Existing continuity tracks unresolved carry-forward work (`hold`, `blocked_operation`, `operator_deferred_decision`, `omission_finding`).
  - Existing standing risk tracks escalation state derived from continuity.
  - Existing forensic chain tracks append-only evidence linkage.
  - None of these provides a dedicated operator-trust posture lifecycle.
- Derivation honesty: PASS
  - Forcing trust posture into continuity/standing/evidence layers would mix unrelated concerns and reduce query clarity.
- Operator legibility: PASS
  - A dedicated ledger supports direct trust-state reads at query/render time.
- Contract boundedness: PASS (directional)
  - Block 0 can lock direction now while deferring exact runtime schema to later implementation blocks.
- Integration value: PASS
  - Separating trust posture from carry-forward and evidence layers improves operator legibility and contract clarity.

Decision:

- Operator Trust Ledger is approved on engineering merit as the Wave 5A substrate direction candidate.
- This is a direction lock only. Runtime implementation is not shipped in Block 0.

## Warranty Derived-First Assessment

Assessment:

- Warranty can be represented as a derived monitoring surface from explicit trust-state evidence.
- No Block 0 evidence proves that derived representation is dishonest or brittle.

Decision:

- Warranty remains derived-first in Block 0.
- No standalone Warranty substrate is approved in Block 0.
- Promotion to standalone substrate requires explicit later proof of derivation failure.

## Scarcity Signal Assessment

Assessment:

- Scarcity Signal can enrich hold/trust interpretation without introducing a new lifecycle substrate.
- A separate substrate is not justified at Block 0.

Decision:

- HoldEngine Scarcity Signal is approved as additive enrichment direction only.
- No Scarcity substrate is approved in Block 0.

## SessionBrief No-Widening Decision

Decision:

- SessionBrief widening remains hard-locked off in Wave 5 Block 0.
- `journeymanLevel` is not added.
- Journeyman trust reads trust state at query/render time.

## Final Block 0 Decisions

- Block 0 stays docs-only.
- Wave 5 remains one narrative wave executed as 5A / 5B.
- Operator Trust Ledger is approved as Wave 5A substrate direction candidate.
- Warranty remains derived-first.
- Scarcity Signal remains additive enrichment direction.
- SessionBrief no-widening stays hard-locked.
- Skill topology is locked to 28 skills across 7 groups.
- Skills remain read/query/render layers only with no hidden engine behavior.
- No package/install/runtime-hook claims are introduced beyond existing repo truth.
- No migration entry is added in Block 0 because no existing shared contract shape is widened in this block.

## Consequences For Block A Later

Block A must:

- define the Operator Trust Ledger contract surface explicitly before runtime code lands
- keep Warranty derived-first unless explicit falsification evidence appears
- keep Scarcity Signal additive and bounded
- preserve SessionBrief no-widening
- preserve honest package/install claims unless real surfaces are implemented

## What Remains Intentionally Unresolved

- Exact Operator Trust Ledger schema and field inventory.
- Exact persistence/read APIs and lifecycle transitions.
- Exact derivation shape for Warranty monitoring outputs.
- Exact Scarcity Signal data shape and thresholds.
- Any package/install/runtime-hook implementation path.

