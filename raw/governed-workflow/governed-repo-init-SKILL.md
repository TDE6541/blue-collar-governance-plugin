---
name: governed-repo-init
public_label: Governed Project Bootstrap
class: bootstrap
tier: install
inherits: hold-doctrine
enables: fire-team-session
description: "Bootstraps a new project or repo with governance docs, a default governed structure, canon-vs-exploration boundaries, and a session-ready operating foundation for AI-assisted work."
---

# Governed Project Bootstrap

## Purpose

This skill installs the minimum structure required for governed AI-assisted work.

It does not just create folders.
It creates a working project foundation with:
- governance documents
- contract/migration discipline
- canon-vs-exploration boundaries
- a default repo structure
- a clear first-session path

The goal is to reduce drift, prevent silent contract breakage, and stop brainstorms from being mistaken for requirements.

## When to use this skill

Use this skill when:
- starting a new project
- initializing a repo
- migrating a loosely structured project into a governed one
- setting up AI-assisted development for the first time
- creating a reusable project starter for a team or client
- standardizing how new governed projects begin

Do not use this skill when:
- the project already has an established governance system
- the user only wants a quick script or single-file prototype
- the task is exploratory and not yet ready for project scaffolding

## What this skill creates

At minimum, this skill scaffolds:

- `TEAM_CHARTER.md` — project constitution
- `AI_EXECUTION_DOCTRINE.md` — execution field manual
- `CONTRIBUTING.md` — contribution rules aligned to governance
- `MIGRATIONS.md` — contract / schema / interface change log
- `README.md` — project front door
- `REPO_INDEX.md` — repo-level index
- `docs/INDEX.md` — docs index
- `docs/indexes/WHERE_TO_CHANGE_X.md` — maintenance change guide
- governed folder structure
- canon-vs-exploration boundary
- first-session prompt
- setup manifest with HOLDs and next steps

## v2 governed session defaults

When bootstrapping governed repos that will use local hook-driven workflow capture, also scaffold these local-first expectations:

- `.governed/sessions/` for durable session artifacts (`session.md` + `session.json`)
- `.governed/hooks/events.jsonl` as the deterministic hook event intake path
- `.governed/exports/` for markdown/json reporting exports
- v2-ready session artifact fields: `source`, `execution_notes`, `verification_summary`, `risk_notes`, `signoff_by`, `signoff_status`, `files_touched`, `contract_risks_detected`, `hold_history`, `hook_events_captured`, `executed_at`, `closed_at`

If a project deliberately omits hook capture, keep manual fallback viable and document the omission explicitly.

## Required inputs

Before scaffolding, gather:

- Project name
- One-sentence description
- Current status: New / MVP / Prototype / Migration
- Tech stack
- Deployment context, if known
- Likely contract types, if known
  Examples: API, schema, export format, UI contract, data model

If the user does not know some of these yet, do not guess.
Carry them forward as HOLDs in the generated README or setup manifest.

## Resource pack requirement

This skill is strongest when paired with a template/resource pack.

Expected references:
- `TEAM_CHARTER_TEMPLATE.md`
- `AI_EXECUTION_DOCTRINE_TEMPLATE.md`
- `CONTRIBUTING_TEMPLATE.md`
- `MIGRATIONS_TEMPLATE.md`
- optional: `WHY_THIS_KIT.md`

If these resources are missing, do not pretend they exist.
Surface a HOLD and either:
- generate a reduced bootstrap from known rules, or
- pause and request the missing templates

This skill follows the same doctrine it installs: **HOLD > GUESS**.

## Default governed project structure

Use this as the default profile unless the project clearly requires a variant:

`[project-name]/`
`├── src/`
`├── tests/`
`│   ├── golden/`
`│   └── live/`
`├── docs/`
`│   ├── INDEX.md`
`│   ├── specs/`
`│   ├── indexes/`
`│   │   └── WHERE_TO_CHANGE_X.md`
`│   ├── schemas/`
`│   └── learning-notes/`
`├── scripts/`
`├── TEAM_CHARTER.md`
`├── AI_EXECUTION_DOCTRINE.md`
`├── CONTRIBUTING.md`
`├── MIGRATIONS.md`
`├── REPO_INDEX.md`
`└── README.md`

### Folder intent

- `src/` = working system code
- `tests/golden/` = known-good reference cases
- `tests/live/` = integration or live-environment checks
- `docs/INDEX.md` = docs index
- `docs/specs/` = authoritative specifications
- `docs/indexes/` = surface-aware navigation and change guidance
- `docs/schemas/` = authoritative contracts and structures when present
- `docs/learning-notes/` = optional exploration, scratch, R&D, non-authoritative
- `scripts/` = utility and automation helpers

## The canon-vs-exploration boundary

This is one of the most important rules in the whole stack.

Treat these as **canon**:
- `docs/specs/`
- `docs/indexes/`
- `docs/schemas/` when present
- the governance docs in repo root
- `README.md` and `REPO_INDEX.md`

Treat these as **exploration**:
- `docs/learning-notes/` when present

The system should not treat exploration artifacts as settled decisions.

This boundary exists to prevent a common failure mode:
the assistant finds a brainstorm, assumes it is authoritative, and starts building on top of it.

## Golden tests rule

`tests/golden/` exists to capture known-good examples.

If the project transforms input into output in any meaningful way, golden cases should eventually live here:
- sample inputs
- expected outputs
- reference edge cases

Golden tests are not always required on day one.
But when trust matters, they become one of the fastest ways to make regressions visible.

## Configurable vs invariant elements

### Configurable
These can be adapted to the project:
- project name
- domain description
- tech stack
- deployment context
- README placeholders
- contract examples relevant to the project
- folder-shape variants for unusual project types

### Invariant
These should not be weakened during bootstrap:
- HOLD > GUESS
- evidence-first reasoning
- no silent mangling
- contract discipline
- minimal diffs
- canon-vs-exploration boundary
- explicit approval gate between planning and execution
- migration logging for shared contract changes

These are not stylistic preferences.
They are the load-bearing parts of the system.

## Bootstrap sequence

### Step 1 — Gather the project frame
Capture the required inputs.
Do not invent missing details.

### Step 2 — Establish the structure
Create the default governed layout, including the front door and docs/indexes navigation spine, adapting only where project shape clearly demands it.

### Step 3 — Generate the governance docs
Create or customize:
- `README.md`
- `REPO_INDEX.md`
- `docs/INDEX.md`
- `docs/indexes/WHERE_TO_CHANGE_X.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`

### Step 4 — Explain the system
Give the user a short practical explanation of:
- what each governance document does
- what the front door and index spine point to
- what counts as canon
- where exploration belongs
- how migration logging works
- how the first governed session begins

### Step 5 — Emit a setup manifest
Always end with a manifest that makes the scaffold legible.

## Document generation rules

### README.md
Customize with:
- project name
- one-sentence description
- status
- stack
- repo structure
- where to start
- how to reach the main surfaces quickly
- placeholders where the user must fill in details

Do not invent setup steps or deployment details that were not provided.
Keep the README as a front door, not a substitute for deeper indexes.

### REPO_INDEX.md and docs/INDEX.md
Generate these as indexes, not duplicate inventories.
Point readers to the actual repo surfaces: front door, specs, proof, extension/runtime, skills/resources, and compatibility layers.
Only add engine/ui indexes when the repo shape clearly warrants them.

### docs/indexes/WHERE_TO_CHANGE_X.md
Keep this maintenance-oriented.
Map common change requests to the correct surface and file set so future sessions can navigate without guessing.

### TEAM_CHARTER.md
Generate from the template or governing source.
Keep the governance structure intact.
Only adapt project-specific examples where clearly justified.

### AI_EXECUTION_DOCTRINE.md
Generate from the template or governing source.
Keep the phase-gated execution flow intact.
Update repo map language to match the actual structure created.

### CONTRIBUTING.md
Keep aligned to the charter and doctrine.
Do not let it drift into generic contribution fluff.

### MIGRATIONS.md
Initialize as an empty change log, ready for first use.
Do not fabricate history.

## Setup manifest requirement

After bootstrap, always provide a setup manifest with:

- Files created
- Structure created
- Canon locations
- Exploration locations
- HOLDs caused by missing project details
- User-fill fields still needed
- Recommended first governed session
- Optional follow-up artifacts available

This keeps the bootstrap from ending as a pile of files without an operational next step.

## First-session prompt

After scaffolding, provide a clean first-session activation prompt like this:

"I've set up the project charter and execution doctrine for this repo. Read both documents and confirm:
1. the governing doctrine
2. the execution flow
3. the approval gate
4. the contract/migration rules

Then propose the smallest useful first task and stop for approval."

## Optional follow-up artifact

Offer an optional explainer such as `WHY_THIS_KIT.md` for users who want:
- rationale behind the governance rules
- onboarding help for collaborators
- a concise explanation of why the project is structured this way

This is optional.
The governed bootstrap should work without it.

## Non-goals

This skill does not:
- invent schemas, APIs, or data models
- fabricate setup instructions
- flatten the governance docs into shallow summaries
- treat scratch notes as authoritative
- force every project into one exact folder shape when a clear variant is needed
- replace later project-specific design work

Its job is to install the governed foundation, not to pretend the project is already fully designed.

## Variants

The default structure is strong, but not every project needs the exact same profile.

Examples:
- a docs-heavy project may reduce `src/`
- a data-heavy project may need `data/` or `notebooks/`
- an API-heavy project may expand `docs/schemas/`
- a product prototype may begin smaller but still keep the canon boundary and governance docs intact
- engine/ui indexes should appear only when the repo shape clearly warrants them

Adapt structure where needed.
Do not weaken the invariants.

## Public explanation

This skill bootstraps a project so AI-assisted work starts with governance, not improvisation.

It installs:
- the rules
- the execution flow
- the contract log
- the front door
- the canon boundary

The value is not extra paperwork.
The value is that the project becomes easier to trust, easier to continue, and less likely to accumulate invisible drift.

## Neutral origin note

This bootstrap pattern comes from repeated AI-assisted project work where the same failure modes kept appearing:
- brainstorms treated as requirements
- silent contract changes
- missing migration history
- vague contribution rules
- no clear boundary between canon and exploration

This skill exists to prevent those failures early, while the project is still easy to shape.