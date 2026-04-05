# WAVE7_TRUTH_LOCK.md
**Status:** Wave 7 Block 0 truth lock shipped; Wave 7A Blocks A-C and Wave 7B are not implemented
**Date:** 2026-04-04
**Audience:** Architect, implementers, maintainers

## Purpose

This document locks Wave 7 scope, claims boundaries, and anti-goals before runtime widening begins.

Wave 7 thesis: Finish the proof surfaces. Prove the first blue-collar front door.

Wave 7 chiasm: We do not shape proof around the front door; we shape the front door around proof.

## Locked Wave 7 Cut

- C1 = `/walk` persistence seam
- C2 = `/fire-break` persistence seam
- C3 = plugin-native foreign-repo deny delivery
- Work Order is the only intake pilot for Wave 7.
- Current shipped truth: Work Order exists today as a skin/render surface only, not as a shipped intake runtime.

## Current Shipped Truth That Wave 7 Must Respect

- Wave 6 shipped fail-closed hook governance across 11 lifecycle events with live chain population, permit/lockout authoring surfaces, and cross-repo proof.
- `/walk` render still depends on `sessionBrief` and `sessionReceipt` artifacts that are not persisted by the hook runtime.
- `/fire-break` render still depends on board-side persisted inputs that are not present in single-session hook state.
- Foreign-repo deny delivery remains host-project dependent because static deny truth still lives in project `.claude/settings.json`.
- `package.json` is absent, so package/install and marketplace claims remain unverified.

## In Scope

- Block 0 is docs-only truth lock.
- Lock the Wave 7 umbrella truth around C1, C2, and C3.
- Lock Work Order as the only intake pilot for Wave 7.
- Sync front-door and maintenance-map surfaces to the same parked list and anti-goals.

## Parked / Out Of Scope

- package/install
- marketplace
- Agent governance
- multi-agent governance
- trust-transfer/certificate work
- second intake skin
- future-gated Anthropic work
- Wave 7A runtime implementation beyond the scope lock
- Wave 7B implementation

## Anti-Goals

- no roadmap inflation
- no package/install drift
- no public-facing hype artifact disguised as canon
- no claim that intake is already implemented
- no runtime, test, or migration changes in Block 0

## Migration Stance

- No migration entry is added in Block 0.
- No existing shared contract is widened in Block 0.
- `MIGRATIONS.md` remains unchanged.