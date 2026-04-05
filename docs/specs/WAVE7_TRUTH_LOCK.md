# WAVE7_TRUTH_LOCK.md
**Status:** Wave 7 truth lock shipped; Wave 7A Blocks A and B are implemented; Wave 7A Block C and Wave 7B are not implemented
**Date:** 2026-04-04
**Audience:** Architect, implementers, maintainers

## Purpose

This document locks Wave 7 scope, claims boundaries, and anti-goals as the proof-surface seams move from open to closed.

Wave 7 thesis: Finish the proof surfaces. Prove the first blue-collar front door.

Wave 7 chiasm: We do not shape proof around the front door; we shape the front door around proof.

## Locked Wave 7 Cut

- C1 = `/walk` persistence seam
- C2 = `/fire-break` persistence seam
- C3 = plugin-native foreign-repo deny delivery
- Work Order is the only intake pilot for Wave 7.
- Current shipped truth: Work Order exists today as a skin/render surface only, not as a shipped intake runtime.

## Current Seam Status

- C1 `/walk` persistence seam is closed. `/walk` now renders from persisted hook-runtime state alone.
- C2 `/fire-break` persistence seam is closed. `/fire-break` now renders from a persisted hook-derived governance-health snapshot that is route-compatible for `/fire-break`; canonical Open Items Board engine inputs remain outside current hook-runtime scope.
- C3 plugin-native foreign-repo deny delivery remains open.

## Current Shipped Truth That Wave 7 Must Respect

- Wave 6 shipped fail-closed hook governance across 11 lifecycle events with live chain population, permit/lockout authoring surfaces, and cross-repo proof.
- `/walk` now renders from persisted `SessionBrief` + `SessionReceipt` inputs and persisted `lastWalk` output in hook session state.
- `/fire-break` now renders from persisted `lastFireBreak`, which is a hook-derived governance-health snapshot rather than canonical `OpenItemsBoard.projectBoard()` output.
- Foreign-repo deny delivery remains host-project dependent because static deny truth still lives in project `.claude/settings.json`.
- `package.json` is absent, so package/install and marketplace claims remain unverified.

## In Scope

- Keep the Wave 7 umbrella truth aligned around C1, C2, and C3.
- Record C1 closed, C2 closed, and C3 open without overstating runtime scope.
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
- Wave 7A Block C runtime implementation
- Wave 7B implementation

## Anti-Goals

- no roadmap inflation
- no package/install drift
- no public-facing hype artifact disguised as canon
- no claim that intake is already implemented
- no claim that canonical Open Items Board persistence now exists in hook runtime

## Migration Stance

- No migration entry is added in Wave 7 truth sync.
- No existing shared contract is widened by this docs-only sync.
- `MIGRATIONS.md` remains unchanged.
