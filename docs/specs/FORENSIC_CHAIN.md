# FORENSIC_CHAIN.md
**Status:** Wave 3 Block A1 contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 3 Block A1 contract baseline for `ForensicChain`.

`ForensicChain` is an append-only evidence substrate that links governance findings to source artifacts through deterministic string references.

## Boundary

`ForensicChain` defines evidence-chain entry shape, append-only behavior, and linkage validation.

This spec does not define:

- continuity qualification or carry-forward persistence behavior
- standing-risk derivation or escalation behavior
- board grouping, mapping, or board persistence behavior
- analytics, scoring, ranking, confidence, anomaly, or prediction behavior
- Control Rod runtime behavior
- Foreman's Walk runtime behavior
- storage backend, transport layer, or UI presentation

## Public And Internal Names

- Public/operator-facing label: `Forensic Chain`
- Internal build name: `ForensicChain`
- Core contract object: `ForensicChainEntry`

## Entry Types

`entryType` must be one of:

- `CLAIM`
- `EVIDENCE`
- `GAP`
- `FINDING`
- `OPERATOR_ACTION`

## ForensicChainEntry Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `chainId` | string | Yes | Unique forensic chain identifier. |
| `entryId` | string | Yes | Stable entry identifier within the chain. |
| `entryType` | enum | Yes | Must be one of `CLAIM`, `EVIDENCE`, `GAP`, `FINDING`, or `OPERATOR_ACTION`. |
| `recordedAt` | string | Yes | Timestamp in ISO 8601 format. |
| `sessionId` | string | Yes | Session identifier for the entry. |
| `sourceArtifact` | string | Yes | Artifact reference where this entry is grounded. |
| `sourceLocation` | string | Yes | Location reference within the source artifact. |
| `payload` | object | Yes | Plain content payload for the entry. |
| `linkedEntryRefs` | string[] | Yes | String references to supporting prior entries in the same chain; may be empty. |

## Linkage Rules

- Linked references are string refs only.
- Multi-source linking is allowed.
- Each linked reference must resolve to an existing `entryId` in the same chain.
- Self-linking is not allowed.
- Duplicate links in the same entry are not allowed.

## Append-Only And Immutability Rules

- Entries are append-only; existing entries must not be updated or deleted.
- `entryId` values must remain unique within a chain.
- Appended entries are immutable snapshots after creation.

## Contract Invariants

- `ForensicChain` is an evidence substrate only.
- `ForensicChain` does not create a second continuity substrate.
- `ForensicChain` does not create a second standing-risk substrate.
- `ForensicChain` does not create a board store.

## Example ForensicChainEntry

```json
{
  "chainId": "forensic_chain_wave3_001",
  "entryId": "claim_001",
  "entryType": "CLAIM",
  "recordedAt": "2026-03-30T10:00:00Z",
  "sessionId": "wave3_s01",
  "sourceArtifact": "docs/WAVE2_CLOSEOUT.md",
  "sourceLocation": "No-Leakage Confirmation",
  "payload": {
    "summary": "Continuity remained the only persisted substrate."
  },
  "linkedEntryRefs": [
    "evidence_001",
    "gap_001"
  ]
}
```

## Current Implementation Truth

- This is a Block A1 spec baseline.
- Runtime implementation exists at `src/ForensicChain.js`.
- Golden proof exists at `tests/golden/ForensicChain.golden.test.js`.