# WAVE5_OPERATOR_PRODUCT.md
**Status:** Wave 5A Block 0 truth-sync/substrate-gate/naming-scrub shipped; Wave 5 runtime behavior not implemented
**Audience:** Architect, implementers, maintainers

## Purpose

This document is the Wave 5 umbrella truth surface.

Wave 5 is one narrative wave executed in two delivery phases:

- Wave 5A
- Wave 5B

Wave 5A starts with Block 0 as a docs-only truth-sync and substrate-gate step.

## What Wave 5 Proves

Wave 5 proves that trust-state evolution can be governed with:

- explicit substrate decisions made on engineering merit
- no hidden engine behavior under skill labels
- strict docs/runtime claim discipline
- implementation-facing no-leakage enforcement

## Why Wave 5 Is Different From Waves 1-4

Waves 1-4 shipped runtime baselines and closeout proof.

Wave 5 starts with a governance-first gate:

- lock umbrella truth first
- pressure-test substrate decisions first
- execute naming/no-leakage scrub first
- keep runtime untouched in Block 0

## Locked Decisions

- Wave 5 remains one narrative wave executed as 5A / 5B.
- Wave 5A Block 0 is docs-only and ships truth-sync, substrate-gate, and naming scrub only.
- Wave 5 runtime behavior is not shipped in Block 0.
- Operator Trust Ledger passes the Block 0 merit gate and is approved as the Wave 5A substrate direction candidate.
- Warranty remains derived-first by default and is not a standalone substrate in Block 0.
- HoldEngine Scarcity Signal is approved as additive enrichment direction only.
- SessionBrief no-widening is hard-locked for Wave 5 (`journeymanLevel` is not added).
- Journeyman trust reads state at query/render time.
- Skill topology is locked to exactly 28 skills across 7 groups.
- Skills are read/query/render layers only; no hidden engine behavior is allowed inside skills.
- Package/install/runtime hook/compatibility claims must remain explicit and honest until verified by real shipped surfaces.

## Current Truth Baseline

- Wave 4 runtime remains the shipped implementation baseline.
- Wave 5 Block 0 truth surfaces now exist at:
  - `docs/specs/WAVE5_OPERATOR_PRODUCT.md`
  - `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`
- Wave 5 runtime behavior is not implemented yet.
- No installable plugin package, runtime hook path, or compatibility layer is implemented yet.

## Substrate Merit Rule

A candidate substrate survives only when all checks pass:

1. Distinct lifecycle: it governs state that existing substrates cannot represent without distortion.
2. Honest derivation test: derived-only representation is shown to be brittle or dishonest.
3. Operator legibility: the contract can be queried/rendered without hidden behavior.
4. Contract discipline: shape boundaries and migration impact can be stated explicitly.
5. Integration value: added complexity is justified by measurable trust-surface clarity.

Doctrine inheritance alone is not sufficient evidence.

## Wave 5A / 5B Split

Wave 5A:

- Block 0 truth sync, substrate gate, naming scrub, no-leakage fence refresh
- followed by implementation blocks after explicit approval

Wave 5B:

- downstream implementation and integration work that depends on Wave 5A contract decisions

## Block 0 Scope

Block 0 includes:

- Wave 5 umbrella truth lock
- substrate decision memo
- front-door/index sync
- implementation-facing naming scrub and leakage fence refresh

Block 0 excludes:

- runtime engine implementation
- test implementation changes
- package/publish/runtime hook claims beyond what is already real

## Wave 5 Anti-Goals

Wave 5 Block 0 does not ship:

- runtime JS behavior changes
- test behavior changes
- SessionBrief widening
- hidden engine logic labeled as "skills"
- fake install, package, publish, or marketplace readiness claims

## No-Leakage Fence

Implementation-facing and canonical surfaces must not carry personal-name or external-network/product references.

Use role/product-neutral wording (for example `Architect`, `operator`, `builder`, `team`, `field crew`).

## Proof Spine Summary

Wave 5 Block 0 truth and decision proof is anchored in:

- `README.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `docs/INDEX.md`
- `docs/indexes/WHERE_TO_CHANGE_X.md`
- `TEAM_CHARTER.md`
- `docs/WAVE5_BLOCK0_SUBSTRATE_GATE.md`

