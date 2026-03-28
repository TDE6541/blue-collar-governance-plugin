# Repo Skeleton — Quick Reference

This is a starter repository structure. Copy it as the foundation for a new project, then add your governance docs (TEAM_CHARTER.md and AI_EXECUTION_DOCTRINE.md) to the root.

---

## What's included

```
repo_skeleton/
├── src/                        # Your application code goes here
├── tests/
│   ├── golden/                 # Known-good reference outputs — regression anchors
│   └── live/                   # Integration and live tests
├── docs/
│   ├── specs/                  # Canonical specifications — authoritative, promoted
│   ├── schemas/                # Data contracts, API shapes, schema versions
│   └── learning-notes/         # R&D, exploration, scratch work — NOT authoritative
├── scripts/                    # Utility and automation scripts
├── .gitignore                  # Pre-configured for Python + Node + common IDE/OS files
├── CONTRIBUTING.md             # Contribution guidelines (references the charter)
├── MIGRATIONS.md               # Schema/contract change log (empty, ready to use)
└── README.md                   # Project README template (fill in your project details)
```

---

## How to use it

1. Copy this directory as your new project root
2. Add **TEAM_CHARTER.md** and **AI_EXECUTION_DOCTRINE.md** to the root
3. Fill in the README.md template with your project details
4. Initialize git: `git init && git add -A && git commit -m "Initial scaffold"`
5. Start building

---

## The canon vs exploration boundary

This is the most important structural decision in the skeleton:

- **`docs/specs/`** and **`docs/schemas/`** are canon. The AI treats these as authoritative. Decisions here are settled. Changes here trigger contract discipline.

- **`docs/learning-notes/`** is exploration. Ideas, experiments, research, scratch work. The AI does NOT treat these as requirements or settled decisions. Content here may be promoted to specs later — but only deliberately.

This boundary prevents the AI from building on top of brainstorms. Keep it clean.

---

## The golden tests directory

`tests/golden/` holds known-good reference outputs — inputs paired with expected results. When you have a pipeline, transformation, or process that should produce consistent output, put a reference case here. It becomes your regression anchor: if a change breaks golden output, you know immediately.

You don't need golden tests on day one. But when your project has any process that transforms input → output, start capturing them here.
