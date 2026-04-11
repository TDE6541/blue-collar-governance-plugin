# WALK_CONFIDENCE_SIDECAR.md
**Status:** Packet 5 `/walk` confidence sidecar additive contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the bounded Packet 5 confidence sidecar contract for canonical `/walk` composition.

The sidecar is optional, precomputed, and informational only.

## Truth Lock

Packet 5 sidecar truth is locked to:

- top-level rendered field `confidence`
- `confidence.source` literal `confidence`
- deterministic section order
- supported section ids exactly `observedMarkers`, `requiredCoverage`, and `markerContinuity`
- absent sections omitted, not fabricated
- no section may overwrite or reinterpret walk findings
- temporal sections illegal in Packet 5 v1

## Boundary

This slice defines:

- the optional `confidenceSidecarView` input posture for `/walk`
- the rendered `confidence` output block
- deterministic section ordering
- Packet 5 v1 supported section ids

This slice does not define:

- confidence scan behavior
- required coverage evaluation behavior
- marker continuity comparison behavior
- temporal evaluation behavior
- `ForemansWalk` changes
- hook-runtime changes
- persistence changes
- skin translation behavior
- chain, board, or standing-risk integration

## Input Contract

`confidenceSidecarView` is optional.

When supplied, it must be an object.

Supported optional section fields are:

- `observedMarkers`
- `requiredCoverage`
- `markerContinuity`

Each supported supplied section must be an object.

Unknown or unsupported supplied fields are ignored for Packet 5 v1 and must not overwrite or reinterpret walk truth.

Packet 5 treats each supported section payload as caller-supplied precomputed view data.

`/walk` must not:

- compute those section payloads
- mutate those section payloads
- reinterpret those section payloads as walk findings

## Output Contract

When at least one supported section is supplied, `/walk` may add one optional top-level field:

| Field | Type | Required | Description |
|---|---|---|---|
| `confidence` | object | No | Informational confidence sidecar block composed only from supported supplied sections. |

`confidence` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `source` | string | Yes | Literal `confidence`. |
| `sections` | object[] | Yes | Deterministic ordered section list composed from supported supplied sections only. |

`sections` item shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `sectionId` | string | Yes | One of the supported Packet 5 v1 section ids only. |
| `view` | object | Yes | Caller-supplied precomputed informational payload for that section. |

Deterministic section order is fixed to:

1. `observedMarkers`
2. `requiredCoverage`
3. `markerContinuity`

If no supported sections are supplied, `/walk` omits the `confidence` block entirely.

## Section Semantics

`observedMarkers` is the precomputed observed-marker informational section.

`requiredCoverage` is the precomputed required-coverage informational section.

`markerContinuity` is the precomputed marker-continuity informational section.

Absent sections stay absent.

Packet 5 must not fabricate empty placeholder sections.

## Temporal Exclusion

Temporal sections are illegal in Packet 5 v1.

Packet 5 does not render:

- `markerTemporalSignals`
- stale-HOLD sidecar posture
- unresolved-KILL sidecar posture
- trend summaries
- resolution-history summaries

Temporal sidecar input must not become a hard requirement for `/walk`.

## Informational-Only Rule

The confidence sidecar is informational only.

It must not change:

- `findingCount`
- `findingSummary`
- `findings`
- finding severity
- blocking posture
- clean versus unclean closeout state
- `sessionOfRecordRef`
- `asBuiltStatusCounts`

The sidecar must not:

- alter As-Built
- write to chain
- feed standing-risk logic
- feed board logic
- imply reviewed-clean semantics

## Canonical-Only Rule

Packet 5 sidecar v1 is canonical `/walk` render only.

This slice does not widen supported skin renderers.

Unsupported skin plus sidecar requests remain on the existing raw canonical fallback path.

## Current Implementation Truth

- Runtime `/walk` composition lives at `src/SessionLifecycleSkills.js`.
- `/walk` operator guidance lives at `skills/walk/SKILL.md`.
- Packet 5 truth lock lives at `docs/specs/PACKET5_WALK_COMPOSITION_TRUTH_LOCK.md`.
