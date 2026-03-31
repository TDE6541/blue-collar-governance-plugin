# WAVE5_OPERATOR_PRODUCT.md
**Status:** Wave 5A Block 0 truth-sync/substrate-gate/naming-scrub shipped; Wave 5A Block A baselines implemented (Operator Trust Ledger v1 + Journeyman Trust Engine v1); Wave 5A Block B baseline implemented (Warranty Monitor v1 derived-only); Wave 5A Block C baseline implemented (HoldEngine Scarcity Signal v1 derived-only); Wave 5B Block A baseline implemented (Session Lifecycle skills tranche read/query/render-only); Wave 5B Block B baseline implemented (Compressed Intelligence skills micro-slice read/query/render-only); Wave 5B Block C baseline implemented (Compressed History & Trust skills micro-slice read/query/render-only); remaining Wave 5B runtime behavior outside Blocks A, B, and C not implemented
**Audience:** Architect, implementers, maintainers

## Purpose

This document is the Wave 5 umbrella truth surface.

Wave 5 is one narrative wave executed in two delivery phases:

- Wave 5A
- Wave 5B

Wave 5A starts with Block 0 as a docs-only truth-sync and substrate-gate step, then implements the first runtime baseline in Block A.

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
- Block A implements Operator Trust Ledger v1 and Journeyman Trust Engine v1 with SessionBrief no-widening preserved.
- Block B implements Warranty Monitor v1 as derived-only monitoring with no new persisted substrate.
- Warranty remains derived-first by default and is not a standalone substrate in Block 0.
- HoldEngine Scarcity Signal is approved as additive enrichment direction and is implemented in Block C as derived-only enrichment (no substrate widening).
- Wave 5B Block A implements Session Lifecycle skills (`/toolbox-talk`, `/receipt`, `/as-built`, `/walk`) as read/query/render-only surfaces with no shared-contract widening.
- Wave 5B Block B implements Compressed Intelligence skills (`/phantoms`, `/ufo`, `/gaps`) as read/query/render-only surfaces with no shared-contract widening.
- Wave 5B Block C implements Compressed History & Trust skills (`/chain`, `/warranty`, `/journeyman`) as read/query/render-only surfaces with no shared-contract widening.
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
- Wave 5A Block A runtime baselines are now implemented at:
  - `docs/specs/OPERATOR_TRUST_LEDGER.md`
  - `docs/specs/JOURNEYMAN_TRUST_ENGINE.md`
  - `src/OperatorTrustLedger.js`
  - `src/JourneymanTrustEngine.js`
  - `tests/golden/OperatorTrustLedger.golden.test.js`
  - `tests/golden/JourneymanTrustEngine.golden.test.js`
- Wave 5A Block B derived-only warranty baseline is now implemented at:
  - `docs/specs/WARRANTY_MONITOR.md`
  - `src/WarrantyMonitor.js`
  - `tests/golden/WarrantyMonitor.golden.test.js`
- Wave 5A Block C derived-only scarcity baseline is now implemented at:
  - `docs/specs/HOLD_ENGINE_SCARCITY_SIGNAL.md`
  - `src/HoldEngineScarcitySignal.js`
  - `tests/golden/HoldEngineScarcitySignal.golden.test.js`
- Wave 5B Block A Session Lifecycle skill tranche is now implemented at:
  - `docs/specs/SESSION_LIFECYCLE_SKILLS.md`
  - `skills/toolbox-talk-SKILL.md`
  - `skills/receipt-SKILL.md`
  - `skills/as-built-SKILL.md`
  - `skills/walk-SKILL.md`
  - `src/SessionLifecycleSkills.js`
  - `tests/golden/SessionLifecycleSkills.golden.test.js`
- Wave 5B Block B Compressed Intelligence skill micro-slice is now implemented at:
  - `docs/specs/COMPRESSED_INTELLIGENCE_SKILLS.md`
  - `skills/phantoms-SKILL.md`
  - `skills/ufo-SKILL.md`
  - `skills/gaps-SKILL.md`
  - `src/CompressedIntelligenceSkills.js`
  - `tests/golden/CompressedIntelligenceSkills.golden.test.js`
- Wave 5B Block C Compressed History & Trust skill micro-slice is now implemented at:
  - `docs/specs/COMPRESSED_HISTORY_TRUST_SKILLS.md`
  - `skills/chain-SKILL.md`
  - `skills/warranty-SKILL.md`
  - `skills/journeyman-SKILL.md`
  - `src/CompressedHistoryTrustSkills.js`
  - `tests/golden/CompressedHistoryTrustSkills.golden.test.js`
- Remaining Wave 5B runtime behavior outside Blocks A, B, and C is not implemented yet.
- Skills outside Session Lifecycle, Compressed Intelligence, and Compressed History & Trust plus skins/onboarding/package surfaces remain unimplemented.
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
- Block A runtime/spec/test baseline for Operator Trust Ledger v1 and Journeyman Trust Engine v1
- Block B runtime/spec/test baseline for Warranty Monitor v1 (derived-only)
- Block C runtime/spec/test baseline for HoldEngine Scarcity Signal v1 (derived-only)
- later 5A blocks only by explicit approval

Wave 5B:

- Block A runtime/spec/test baseline for Session Lifecycle skills (`/toolbox-talk`, `/receipt`, `/as-built`, `/walk`) as read/query/render-only surfaces
- Block B runtime/spec/test baseline for Compressed Intelligence skills (`/phantoms`, `/ufo`, `/gaps`) as read/query/render-only surfaces
- Block C runtime/spec/test baseline for Compressed History & Trust skills (`/chain`, `/warranty`, `/journeyman`) as read/query/render-only surfaces
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
