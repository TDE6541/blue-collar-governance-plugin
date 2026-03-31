# CENSUS_SKILL.md
**Status:** Wave 5B post-fire-break read/query/render-only slice contract baseline (v1)
**Audience:** Architect, implementers, maintainers

## Purpose

This document defines the Wave 5B contract baseline for `CensusSkill`.

The slice introduces one operator-facing route as a manual read/query/render-only repo snapshot:

- `/census`

## Boundary

`CensusSkill` defines:

- deterministic read/query/render output for one route
- manual local repo snapshot visibility over explicit observable truth
- explicit counts and presence views copied from the provided snapshot input

This spec does not define:

- any state mutation path
- any engine logic change
- any route beyond `/census`
- any inferred analytics or forecast behavior

## Public And Internal Names

- Public/operator-facing label: `Census Skill`
- Internal build name: `CensusSkill`
- Core route: `/census`

## Fixed Mapping Rule

- `/census` maps to explicit local repo snapshot input only.
- Route behavior remains manual read/query/render-only.
- Mapping reinterpretation is not allowed in this slice.

## Read/Query/Render-Only Posture

- The slice consumes explicit local snapshot input only.
- The slice renders deterministic route views only.
- The slice introduces no hidden mutation behavior.
- The slice introduces no shared-contract widening.

## `/census`

Input includes one required field:

- `repoSnapshot`: object containing explicit local snapshot sections

`repoSnapshot` sections:

- `repoIdentity` (`repoRoot`, `branchName`, `remoteNames`)
- `localGitPosture` (`stagedCount`, `modifiedCount`, `untrackedCount`, `untrackedFiles`)
- `shippedInventory` (`wave5bBlockA`, `wave5bBlockB`, `wave5bBlockC`, `wave5bBlockD`, `wave5bBlockE1`, `controlRodsSlice`, `fireBreakSlice`)
- `artifactCounts` (`specCount`, `skillCount`, `srcCount`, `goldenTestCount`)
- `keySurfacePresence` (`readme`, `claude`, `repoIndex`, `docsIndex`, `whereToChange`, `wave5Product`, `block0Gate`, `migrations`)

Route behavior:

- pass through identity, git posture, shipped inventory, artifact counts, and key-surface presence
- render a deterministic summary from shipped-inventory and key-surface booleans only

### `/census` Output Contract

| Field | Type | Required | Description |
|---|---|---|---|
| `route` | string | Yes | Literal `/census`. |
| `repoIdentity` | object | Yes | Local repo identity snapshot copied from input. |
| `localGitPosture` | object | Yes | Local git posture snapshot copied from input. |
| `shippedInventory` | object | Yes | Shipped-slice presence booleans copied from input. |
| `artifactCounts` | object | Yes | Explicit artifact counts copied from input. |
| `keySurfacePresence` | object | Yes | Key-surface presence booleans copied from input. |
| `snapshot` | object | Yes | Deterministic summary over boolean sections only. |

`snapshot` shape:

| Field | Type | Required | Description |
|---|---|---|---|
| `remoteConfigured` | boolean | Yes | `true` when `remoteNames` contains at least one name. |
| `shippedSliceCount` | integer | Yes | Count of `true` values in `shippedInventory`. |
| `missingShippedSlices` | string[] | Yes | Inventory keys where value is `false`. |
| `keySurfaceCount` | integer | Yes | Count of `true` values in `keySurfacePresence`. |
| `missingKeySurfaces` | string[] | Yes | Key-surface keys where value is `false`. |

## Contract Invariants

- route set is fixed to exactly `/census`
- output is deterministic for same input
- input objects remain unchanged after rendering
- no hidden write path is introduced
- no shared contract is widened

## Current Implementation Truth

- Runtime adapter implementation exists at `src/CensusSkill.js`.
- Golden proof exists at `tests/golden/CensusSkill.golden.test.js`.
- Operator-facing skill artifact exists at `skills/census-SKILL.md`.
