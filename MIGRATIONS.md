# MIGRATIONS.md
**Status:** Active when shared contracts change

## Purpose

This log records changes to shared contracts in this repository: schemas, interfaces, data shapes, export formats, or other structures that downstream behavior depends on.

Wave 1 established the first proposed contract baselines for the six trust-kernel systems. Wave 3 Block 0 introduced the first approved shared-contract widening entry. Wave 4 Block A1 records the Control Rod v1 -> v2 shared-contract behavioral upgrade.

## Log

| Date | Change | Migration Path | Sign-off |
|------|--------|----------------|----------|
| 2026-03-30 | SessionBrief additive field toolboxTalk (second approved widening of a Wave 1 shared contract) | Adds one optional summary object for startup carry-forward context (`summary`, `counts`, `refs`, `currentHazards`, `activeDeferredChangeOrderSummary`, `permitLockoutSummary`, `continuityStandingRiskSummary`); existing briefs remain compatible when field is absent; no additional flat Brief fields were introduced | Architect signed off 2026-04-03 |
| 2026-03-30 | ControlRodMode v1 -> v2 behavioral upgrade (LOTO + Permit semantics on HARD_STOP domains; autonomy enum unchanged) | Existing `controlRodProfile` snapshots remain compatible because domain ids and autonomy enum are unchanged; v2 adds deterministic authorization/permit contract validation and gate decisions without data rewrite | Architect signed off 2026-04-03 |
| 2026-03-30 | SessionBrief additive field controlRodProfile (first approved widening of a Wave 1 shared contract) | Spec baseline widened in Wave 3 Block 0; runtime adoption deferred to Block B1; no data rewrite yet; no other Block 0 contract widening approved | Architect signed off 2026-04-03 |

## Entry Rules

- Add an entry only when an existing shared contract changes.
- Do not fabricate history for bootstrap or first-baseline promotion work.
- If a contract changes, update the affected canon surfaces in the same governed wave.
