[OWASP Front-Door Sync] Closeout

Changes made
- Confirmed `docs/OWASP_AGENTIC_MAPPING.md` already existed on local `main` and was not edited in this lane.
- Updated `README.md` front-door proof navigation to include `docs/OWASP_AGENTIC_MAPPING.md` as a bounded public reviewer-facing positioning/proof artifact.
- Updated `CLAUDE.md` with one bounded reference to `docs/OWASP_AGENTIC_MAPPING.md` under canon/reference boundary language (positioning/proof artifact only).
- Updated `REPO_INDEX.md` front-door primary-source navigation to include `docs/OWASP_AGENTIC_MAPPING.md`.
- Updated `docs/INDEX.md` documentation navigation spine to include `docs/OWASP_AGENTIC_MAPPING.md`.
- Updated `docs/indexes/WHERE_TO_CHANGE_X.md` so maintainers have an explicit entry for OWASP public positioning/security mapping copy updates.
- Added this closeout artifact: `docs/OWASP_MAPPING_FRONT_DOOR_SYNC_CLOSEOUT.md`.
- This was a docs-only lane: no runtime, test, hook, or spec files were changed.

Acceptance criteria status (PASS / FAIL / HOLD per item)
- PASS: `docs/OWASP_AGENTIC_MAPPING.md` is discoverable from `README.md`.
- PASS: `docs/OWASP_AGENTIC_MAPPING.md` is discoverable from `CLAUDE.md`.
- PASS: `docs/OWASP_AGENTIC_MAPPING.md` is discoverable from `REPO_INDEX.md`.
- PASS: `docs/OWASP_AGENTIC_MAPPING.md` is discoverable from `docs/INDEX.md`.
- PASS: `docs/OWASP_AGENTIC_MAPPING.md` is discoverable from `docs/indexes/WHERE_TO_CHANGE_X.md`.
- PASS: The mapping doc itself is unchanged.
- PASS: No runtime/test/hook/spec files were changed.
- PASS: No package/install/marketplace claims were introduced.
- PASS: Closeout artifact exists and records this sync truthfully.

New contract or migration status
- No shared contract changes were made.
- `MIGRATIONS.md` was intentionally untouched.

Test count delta (expected vs actual)
- Expected: 0 (docs-only lane)
- Actual: 0 run (docs-only lane)

Remaining HOLDs
- None.

Front-door sync status
- COMPLETE: OWASP mapping discoverability now spans `README.md`, `CLAUDE.md`, `REPO_INDEX.md`, `docs/INDEX.md`, and `docs/indexes/WHERE_TO_CHANGE_X.md`.

Next action
- Merge this docs-only branch to local `main`, push `origin/main`, and leave the working tree clean.

Signoff status
- Ready for Architect review/signoff.
