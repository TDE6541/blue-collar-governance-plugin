# OWASP Agentic Security Mapping — Blue Collar Governance Plugin

**Version:** 1.0
**Date:** April 9, 2026
**Author:** Tim Deavenport
**Plugin surface at time of writing:** Claude Code-native local runtime · 31 shipped skills · latest lifecycle closeout: 24 handled official lifecycle events (24/26 = 92.3%) · latest lifecycle closeout verification: 406 full golden / 79 HookRuntime golden / 8 hook-runtime live integration tests · zero external dependencies
**Lifecycle boundary note:** `WorktreeCreate` and `WorktreeRemove` remain pending, and `Setup` remains unclaimed.
**License:** MIT
**Repo:** [github.com/TDE6541/blue-collar-governance-plugin](https://github.com/TDE6541/blue-collar-governance-plugin)

---

## Purpose

This document maps the Blue Collar Governance Plugin against two OWASP agentic security frameworks:

1. **OWASP Top 10 for Agentic Applications (2026)** — the OWASP GenAI Security Project's framework for system-level agentic risk.
2. **OWASP Agentic Skills Top 10** — the OWASP project covering the skill content layer across agent ecosystems.

This mapping is intentionally conservative. Ratings describe what ships today at the plugin's actual layer, not what could exist later, not what sits in adjacent products, and not what a broader enterprise stack might achieve when combined with identity, sandboxing, registry controls, or enterprise control planes.

---

## Executive Summary

The Blue Collar Governance Plugin is strongest where OWASP asks for least agency and strong observability at the point of execution. In current shipped form, it is a local deterministic governance runtime for Claude Code that can classify and gate the plugin-governed `Bash`, `Write`, and `Edit` path before execution, preserve governance state across compaction, record evidence to a forensic chain, and run post-session verification through Foreman's Walk.

Its best fits remain **ASI02 Tool Misuse**, **ASI09 Human-Agent Trust Exploitation**, and **AST09 No Governance**. Those are the places where the plugin is directly in the line of fire and where shipped mechanisms materially change outcomes: fail-closed pre-execution gating, explicit approval ceremony, evidence-linked review, and session-of-record accountability.

Its weak fits remain layer boundaries, not product failures. The plugin does not solve identity and credential architecture, execution sandboxing, cryptographic provenance, cross-platform skill reuse, or secure inter-agent transport. Those are different control layers.

The short answer is: deterministic local runtime governance at the developer-agent boundary, with strong observability and explicit proof, but not identity, sandboxing, fleet-wide control, or loader security.

---

## Rating Method

| Rating | Meaning |
|---|---|
| **STRONG** | A direct, shipped mitigation exists at the plugin's own layer and materially changes risk, not just visibility. |
| **PARTIAL** | The plugin materially constrains, contains, or exposes the risk, but only for part of the problem or only at one layer. |
| **THIN** | The plugin reduces attack surface indirectly or improves evidence after the fact, but does not address the core OWASP mitigation requirement. |
| **NOT ADDRESSED** | The risk sits outside the plugin's design layer. |

One distinction matters throughout this document: **blocking an unsafe action is not the same thing as detecting the upstream threat that led to it**.

A second distinction matters too: zero dependencies, local-only execution, and repo-local operation are real strengths, but they do not become identity governance, sandboxing, provenance, or inter-agent security just because they reduce surface area.

---

## Scope Boundaries

This plugin explicitly does not claim:

- **Identity or credential governance.** The plugin governs actions, not identities.
- **Container or sandbox isolation.** The plugin governs in place on the host.
- **Inter-agent communication security.** It does not secure agent-to-agent transport.
- **Supply-chain provenance verification.** It does not prove the authenticity of imported components.
- **Cross-platform skill governance.** It is Claude Code-native.
- **Internal model alignment or anomaly detection.** It constrains behavior from outside the model.
- **Package, marketplace, or universal install claims.** `package.json` is absent, and package/install/marketplace surfaces remain unverified.

Those boundaries are architectural. They are not TODOs disguised as omissions.

---

## Coverage Summary

### OWASP Top 10 for Agentic Applications (ASI01–ASI10)

| Rating | Count | Risks |
|---|---|---|
| **STRONG** | 2 | ASI02 (Tool Misuse), ASI09 (Human-Agent Trust Exploitation) |
| **PARTIAL** | 4 | ASI01 (Goal Hijacking), ASI05 (Unexpected Code Execution), ASI08 (Cascading Failures), ASI10 (Rogue Agents) |
| **THIN** | 3 | ASI03 (Identity and Privilege Abuse), ASI04 (Agentic Supply Chain Compromise), ASI06 (Memory and Context Poisoning) |
| **NOT ADDRESSED** | 1 | ASI07 (Insecure Inter-Agent Communication) |

### OWASP Agentic Skills Top 10 (AST01–AST10)

| Rating | Count | Risks |
|---|---|---|
| **STRONG** | 1 | AST09 (No Governance) |
| **PARTIAL** | 2 | AST03 (Over-Privileged Skills), AST07 (Update Drift) |
| **THIN** | 4 | AST01 (Malicious Skills), AST02 (Skill Supply Chain Compromise), AST04 (Insecure Metadata), AST08 (Poor Scanning) |
| **NOT ADDRESSED** | 3 | AST05 (Unsafe Deserialization), AST06 (Weak Isolation), AST10 (Cross-Platform Reuse) |

---

## What This Plugin Is

The Blue Collar Governance Plugin is a deterministic governance runtime for Claude Code. In the shipped repo state this document is evaluating, it provides:

- fail-closed command-hook enforcement on the governed `Bash`, `Write`, and `Edit` path
- `HARD_STOP` / `SUPERVISED` / `FULL_AUTO` posture resolution through `ControlRodMode`
- governance-state preservation across compaction and session restart surfaces
- append-only forensic evidence capture
- post-session verification through a five-pass `ForemansWalk`
- operator-facing skills that read or render deterministic runtime truth
- an intake pilot chain that stops at reviewed artifacts only

The public repo also matters to the claim boundary. Current repo truth says plugin mode and standalone mode are alternate loading paths, matched tools are configured in `.claude/settings.json`, `Agent` tool governance is not claimed, and broader compatibility is not yet validated.

For exact current lifecycle and regression counts, this document anchors to the latest lifecycle closeout, not to older time-point closeouts preserved for historical accuracy.

---

## Cross-Cutting OWASP Principles: Least Agency and Strong Observability

OWASP's agentic-application framing is especially relevant in two places.

| OWASP Principle | What OWASP Means | Where the Plugin Is Strong | Honest Limit |
|---|---|---|---|
| **Least Agency** | Minimize agent autonomy; require explicit approval for risky actions; bind action to auditable control. | `ControlRodMode`, fail-closed `HookRuntime`, `ConstraintsRegistry`, `SafetyInterlocks`, `/red-tag`, `/permit`, `/lockout`, and explicit `HARD_STOP` / `SUPERVISED` / `FULL_AUTO` posture. | Applies to the plugin-governed `Bash` / `Write` / `Edit` path. Not a general identity, budget, network-egress, or all-tools governance system. |
| **Strong Observability** | Know what the agent did, why it did it, and what evidence supports it. | `ForensicChain`, `ForemansWalk`, `StandingRiskEngine`, `OmissionCoverageEngine`, `OpenItemsBoard` via `/fire-break`, `SessionReceipt`, `/prevention-record`, `/toolbox-talk`, and `/census`. | Primarily repo-local and session-local. Not a SIEM, enterprise telemetry lake, or fleet inventory plane. |

### Bounded Note on Absence Computation

Several shipped components implement observability by detecting what should exist but does not: `OmissionCoverageEngine` flags expected signals that are missing, `ForemansWalk` detects claims without evidence and evidence without claims, `StandingRiskEngine` escalates unresolved items across sessions, and `OpenItemsBoard` / `/fire-break` compose missing and unresolved signals into a single operator surface. That is not a third OWASP principle and it does not change any rating. It is one concrete way this repo implements strong observability.

---

## Where This Plugin Sits in the Governance Stack

| Layer | What That Layer Governs | Plugin Position |
|---|---|---|
| Identity / credential plane | Who the agent is and which credentials it may use | Not here |
| Registry / provenance plane | What components are trusted to load | Not here |
| Platform-native constraint plane | What the host platform allows by design | Not here |
| Framework middleware plane | Runtime policy across multiple frameworks or agent stacks | Not here |
| Enterprise control plane | Fleet visibility, posture, inline enterprise controls, response | Not here |
| Observability / evaluation plane | Behavioral visibility and assurance | Partial overlap |
| **Developer-agent boundary** | **Whether the local coding agent action proceeds, is supervised, or is blocked** | **Here** |
| Host isolation plane | Where code may execute safely | Not here |


---

## Claude Code CVE Context for the AST Layer

Two recent Claude Code CVEs matter here because they show that configuration files and hook-adjacent surfaces are part of the execution layer, not harmless metadata:

- **CVE-2025-59536:** versions before `1.0.111` could execute project code before the user accepted the startup trust dialog.
- **CVE-2026-21852:** versions before `2.0.65` could exfiltrate Anthropic API keys by reading `ANTHROPIC_BASE_URL` from project config before trust confirmation.

These CVEs do **not** mean the plugin fixes the host platform from inside Claude Code. If Claude Code itself is vulnerable before trust confirmation and before the plugin's runtime takes control, that is upstream of this plugin's layer. They are included here because they justify keeping several AST ratings intentionally low even while the plugin is strong at downstream runtime governance once the platform is trusted and patched.

---

## OWASP Top 10 for Agentic Applications (2026) — Detailed Mapping

---

### ASI01 — Agent Goal Hijacking — PARTIAL

OWASP defines goal hijack as manipulation of agent goals, plans, or decision paths through direct or indirect instruction injection, including poisoned documents, web pages, RAG content, and meeting or calendar artifacts.

The plugin does not detect or sanitize malicious content, does not inspect the model's planning state, and does not implement prompt-injection filtering, signed immutable intent capsules, or other direct goal-integrity controls. What it does do is constrain the consequences of a hijacked coding agent once that hijack tries to become execution: `ControlRodMode` and fail-closed `HookRuntime` gate the governed `Bash` / `Write` / `Edit` path, `ScopeGuard` and `ChangeOrderEngine` surface drift from declared scope, and `ForemansWalk` plus `ForensicChain` force after-the-fact accountability.

Why **PARTIAL** and not **THIN**: the plugin can materially reduce blast radius at execution time. Why not **STRONG**: it does not detect or prevent the hijack itself.

**Honest claim:** The plugin constrains what a goal-hijacked coding agent can do on the governed execution path. It does not determine whether the goal was hijacked.

**Relevant mechanisms:** `ControlRodMode`, `HookRuntime` (`PreToolUse`), `ScopeGuard`, `ConstraintsRegistry`, `ChangeOrderEngine`, `HoldEngineScarcitySignal`, `ForemansWalk`, `ForensicChain`.

---

### ASI02 — Tool Misuse and Exploitation — STRONG

OWASP treats tool misuse as a direct least-agency failure: the agent uses legitimate tools in unsafe ways because permissions, validation, or supervision are too broad.

This is the plugin's strongest technical fit. On the plugin-governed `Bash`, `Write`, and `Edit` path, matched actions pass through pre-execution classification and posture resolution. `HARD_STOP` blocks the action. `SUPERVISED` requires human approval. `FULL_AUTO` allows it to proceed. `ConstraintsRegistry`, `SafetyInterlocks`, `/red-tag`, `/permit`, `/lockout`, `ForensicChain`, and `ForemansWalk` provide both enforcement and reviewable evidence that control fired and that the session matched its governed plan.

The limits are still real: no container sandboxing, no outbound allowlists, no rate caps, and no generalized argument-schema validation for arbitrary tools.

**Honest claim:** The plugin strongly governs unsafe local tool use on the governed `Bash` / `Write` / `Edit` path. It does not provide sandboxing or arbitrary-tool validation outside that path.

**Relevant mechanisms:** `ControlRodMode`, `HookRuntime` (`PreToolUse`, `PermissionRequest`), `ConstraintsRegistry`, `SafetyInterlocks`, `ScopeGuard`, `ChangeOrderEngine`, `ForensicChain`, `ForemansWalk`.

**Evidence anchor:** inspect `src/HookRuntime.js`, `src/ControlRodMode.js`, `tests/golden/HookRuntime.golden.test.js`, and the latest lifecycle closeout for the current `79` HookRuntime golden tests and `8` hook-runtime live integration tests.

---

### ASI03 — Identity and Privilege Abuse — THIN

OWASP's concern is the attribution gap when agents inherit user sessions, reuse secrets, or trust internal delegation without distinct bounded identities.

The plugin does not create agent identities, scope credentials, isolate agent identity from user identity, or implement step-up authentication. Its contribution is narrower: `/permit` and `/lockout` provide action-level authorization ceremony, and `ForensicChain` records who authorized what and when.

**Honest claim:** The plugin records and gates privileged actions at action time. It does not solve distinct agent identity or credential governance.

**Relevant mechanisms:** `ControlRodMode` permit/lockout path, `ForensicChain`.

---

### ASI04 — Agentic Supply Chain Compromise — THIN

OWASP's ASI04 is about dynamically trusted runtime components: tools, descriptors, schemas, MCP servers, and imported dependencies.

The plugin reduces some supply-chain exposure through architecture: no npm dependencies, no cloud dependency, no telemetry, direct local operation. Those are real reductions. They are not provenance. The repo does not claim signed manifests, registry verification, SBOM/AIBOM output, or descriptor authenticity checks. `/census` provides governance visibility at the repo surface, not proof that imported components are authentic.

**Honest claim:** The plugin reduces supply-chain surface by being small, local, and dependency-light. It does not verify provenance.

**Relevant mechanisms:** zero-dependency local architecture, `/census`.

---

### ASI05 — Unexpected Code Execution — PARTIAL

OWASP's ASI05 covers natural-language-to-execution paths: shell execution, generated code, or RCE triggered by agent behavior.

The plugin makes many risky execution attempts impossible or supervised before they run. `ControlRodMode`, fail-closed `HookRuntime`, `SafetyInterlocks`, `/red-tag`, `/permit`, and `/lockout` gate risky `Bash`, `Write`, and `Edit` actions. But once approved, the plugin does not provide a hardened sandbox, egress control, package vetting, or resource isolation.

**Honest claim:** The plugin is a strong pre-execution gate on the governed path. It is not a secure code-execution environment.

**Relevant mechanisms:** `ControlRodMode`, `HookRuntime` (`PreToolUse`), `SafetyInterlocks`, permit/lockout path, `ForensicChain`.

---

### ASI06 — Memory and Context Poisoning — THIN

OWASP focuses on corruption of persistent memory, embeddings, RAG stores, or long-lived context that changes future reasoning.

The plugin does not protect the agent's full semantic memory substrate. What it does protect is its own governance continuity: hook-runtime state preservation across compaction, `ContinuityLedger` carry-forward, `StandingRiskEngine` escalation, `OmissionCoverageEngine` missing-signal surfacing, and `ForensicChain` evidence preservation. That is governance-layer continuity, not model-memory hygiene.

**Honest claim:** The plugin hardens governance continuity across sessions and compaction. It does not secure the agent's full memory stack.

**Relevant mechanisms:** `HookRuntime` compaction-survival path, `ContinuityLedger`, `StandingRiskEngine`, `OmissionCoverageEngine`, `HoldEngineScarcitySignal`, `ForensicChain`.

---

### ASI07 — Insecure Inter-Agent Communication — NOT ADDRESSED

OWASP treats this as a distinct vulnerability class: spoofing, replay, downgrade, and schema manipulation inside agent-to-agent channels.

The plugin does not provide channel authentication, message signing, mTLS, nonce handling, authenticated discovery, or transport-level schema enforcement.

**Honest claim:** If multiple agents are talking over insecure channels, this plugin is not the control that secures those channels.

**Relevant mechanisms:** None material.

---

### ASI08 — Cascading Failures — PARTIAL

OWASP's ASI08 is about propagation and amplification: one fault fans out across tools, agents, sessions, or feedback loops.

The plugin provides containment through observability and bounded autonomy. `ControlRodMode` limits action freedom, `StandingRiskEngine` escalates unresolved issues, `OmissionCoverageEngine` surfaces missing signals, `OpenItemsBoard` / `/fire-break` consolidate issues, `WarrantyMonitor` tracks degradation, `ChangeOrderEngine` formalizes drift, and `ForemansWalk` refuses a clean closeout when gaps remain.

It does not ship multi-agent fan-out controls, distributed circuit breakers, consensus requirements, resource ceilings, or a system-wide kill-switch.

**Honest claim:** The plugin is good at making single-session or single-operator cascades smaller and more visible. It is not a multi-agent failure-management plane.

**Relevant mechanisms:** `ControlRodMode`, `ChangeOrderEngine`, `StandingRiskEngine`, `OmissionCoverageEngine`, `OpenItemsBoard`, `WarrantyMonitor`, `ForemansWalk`, `ForensicChain`.

---

### ASI09 — Human-Agent Trust Exploitation — STRONG

OWASP's concern is that human approval becomes meaningless when the agent presents polished, confident explanations and the human cannot tell truth from performance.

The plugin addresses this directly inside the governed session. `HOLD > GUESS` forces structured uncertainty instead of fluent fabrication. `HoldEngineScarcitySignal` makes incomplete information explicit. `ForemansWalk` truthfulness and evidence-integrity passes detect phantom claims, ghost evidence, and incomplete verification. `ControlRodMode` forces explicit human approval on dangerous domains. `ForensicChain` preserves an audit trail of claims, evidence, and approvals. `/callout`, `/diagnose`, `/keystone`, and `/eliminate` sharpen review.

The plugin does not defend against deepfakes, phishing, or out-of-band social engineering. But inside the local governed session it does move trust calibration outside the model's self-presentation and into deterministic verification plus explicit approval boundaries.

**Honest claim:** The plugin checks whether the model's claims earned trust inside the governed session. It does not solve broader social-engineering or media-authenticity problems.

**Relevant mechanisms:** `HoldEngine`, `HoldEngineScarcitySignal`, `ForemansWalk`, `ControlRodMode`, `ForensicChain`, `/callout`, `/diagnose`, `/keystone`, `/eliminate`.

**Evidence anchor:** inspect `src/ForemansWalk.js`, `src/ForensicChain.js`, and the truthfulness-oriented render surfaces under `skills/`.

---

### ASI10 — Rogue Agents — PARTIAL

OWASP uses ASI10 for misaligned or concealed behavior by the agent itself: goal drift, reward hacking, self-directed action, concealment, emergent misalignment.

The plugin does not align the model internally. It creates external walls (`HARD_STOP`), behavioral audit surfaces (`ForemansWalk`), live oversight surfaces (`BuddySystem` / `/callout`), cross-session trust progression (`JourneymanTrustEngine`), and degradation monitoring (`WarrantyMonitor`, `StandingRiskEngine`).

It does not ship anomaly detection, reward-function testing, formal alignment evaluation, or compromised-agent isolation.

**Honest claim:** The plugin can constrain and expose some rogue behavior from outside the model. It does not solve rogue-agent alignment.

**Relevant mechanisms:** `ControlRodMode`, `ForemansWalk`, `BuddySystem`, `ForensicChain`, `WarrantyMonitor`, `StandingRiskEngine`, `JourneymanTrustEngine`.

---

## OWASP Agentic Skills Top 10 — Detailed Mapping

**Framework status note:** The OWASP Agentic Skills Top 10 is still an active OWASP project rather than a maturity-equivalent twin of the Agentic Applications Top 10. It belongs here because it directly addresses the skill layer where this repo operates and because its threat model is highly relevant to Claude Code-style skill ecosystems.

---

### AST01 — Malicious Skills — THIN

The plugin's own shipped skills are lower-risk than generic prompt-heavy skills because most are thin read/query/render or bounded decision surfaces over deterministic engines rather than open-ended instruction blobs. That is a real structural advantage.

But the plugin does not scan, identify, quarantine, or verify malicious skills in the broader ecosystem. No signing, no publisher verification, no registry scanning, no quarantine.

**Honest claim:** The plugin's own skills are lower-risk by design. It does not solve malicious-skill discovery outside its own repo.

---

### AST02 — Skill Supply Chain Compromise — THIN

The plugin reduces exposure by shipping as a local repo artifact with zero external dependencies.

But the Claude Code CVEs matter here. They showed that repository-controlled configuration can become an execution surface before trust confirmation and before the plugin's runtime takes control. That is upstream. The correct score remains **THIN**: the plugin reduces surface after trust and patching, but it does not secure the host platform's project-load path or provide signed skill provenance.

**Honest claim:** The plugin reduces skill supply-chain exposure by staying local and dependency-light. It does not verify provenance or secure Claude Code's loader.

---

### AST03 — Over-Privileged Skills — PARTIAL

OWASP wants explicit, scoped permissions and least agency at the skill layer.

The plugin does not ship per-skill permission manifests, per-skill credentials, or skill-specific identities. But it does enforce runtime least agency over the governed execution path. `ControlRodMode`, fail-closed `HookRuntime`, deny rules, `/red-tag`, `/permit`, and `/lockout` materially reduce what an over-privileged skill can do once it tries to act through the governed `Bash` / `Write` / `Edit` path.

**Honest claim:** The plugin provides runtime least agency for governed actions. It is not a full skill-permission manifest system.

---

### AST04 — Insecure Metadata — THIN

The plugin lowers metadata blast radius because skill metadata carries less power than in many skill ecosystems; more behavior lives in deterministic engines and bounded runtime logic.

It does not lint metadata, detect invisible-character abuse, verify publisher identity, or perform impersonation checks.

**Honest claim:** The plugin reduces metadata risk by moving power out of metadata. It does not scan metadata for abuse.

---

### AST05 — Unsafe Deserialization — NOT ADDRESSED

This is the platform's loader and parser problem. The plugin does not own Claude Code's parsing pathways. Recent CVEs prove that this layer is real and dangerous, but they do not turn into plugin mitigations.

**Honest claim:** Not addressed. Unsafe loading and deserialization sit upstream of this plugin's runtime.

---

### AST06 — Weak Isolation — NOT ADDRESSED

The plugin governs actions in place on the host. No containerization, VM isolation, seccomp, or per-skill process separation ships in this repo.

**Honest claim:** The plugin is not an isolation boundary.

---

### AST07 — Update Drift — PARTIAL

The plugin ships as a version-controlled repo artifact, with explicit closeouts, truth-sync discipline, and no auto-update or marketplace indirection in current shipped form.

That helps. It does not become cryptographic update assurance. No signed updates, no hash pinning, no immutable update mechanism, and no automatic re-scan ship here.

**Honest claim:** The plugin reduces update drift by being local, explicit, and version-controlled. It does not provide cryptographic update assurance.

---

### AST08 — Poor Scanning — THIN

OWASP is right that pattern-only scanning is insufficient.

The plugin offers a different answer, but only downstream: when scanning misses something, deterministic runtime guardrails can still block or force approval on the resulting unsafe action along the governed path. That matters. It does not make the plugin a scanner.

**Honest claim:** The plugin is downstream containment when scanning fails. It is not a scanning system.

---

### AST09 — No Governance — STRONG

OWASP describes the absence of governance, oversight, audit logging, and controlled action at the skill layer.

At enterprise fleet scope, the plugin does not satisfy the full inventory, revocation, and non-human-identity side of that problem. At the **local Claude Code session boundary**, however, it is a concrete governance runtime:

- `ControlRodMode` manages permissions through three-tier autonomy profiles
- `HookRuntime` enforces fail-closed governance on the shipped governed path
- `ForensicChain` provides audit logging for governance-relevant actions and decisions
- `ForemansWalk` delivers post-session verification and accountability
- `SessionReceipt` provides session-of-record documentation
- `ConstraintsRegistry` enforces never-do rules
- `ChangeOrderEngine` governs live scope drift
- `/rights`, `/prevention-record`, `/census`, `/chain`, `/fire-break`, and `/callout` provide operational governance visibility

That is enough to keep **STRONG**, but only with the scope boundary stated plainly.

**Honest claim:** At the local Claude Code session boundary, this plugin is real governance. It is not enterprise-wide skill inventory or identity-lifecycle governance.

---

### AST10 — Cross-Platform Reuse — NOT ADDRESSED

The plugin is Claude Code-native. It does not track or govern skill reuse across OpenClaw, Cursor/Codex, VS Code, or other ecosystems.

**Honest claim:** Not addressed. Cross-platform skill security belongs to registry, standardization, and per-platform validation controls.

---

## How to Verify These Claims

A serious reviewer should not trust this document on style. They should verify it against repo truth.

### Front door and canon surfaces

- `README.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `docs/INDEX.md`
- `MIGRATIONS.md`

### Load-bearing runtime specs

- `docs/specs/HOOK_RUNTIME_ENFORCEMENT_SPINE.md`
- `docs/specs/CONTROL_ROD_MODE.md`
- `docs/specs/FORENSIC_CHAIN.md`
- `docs/specs/FOREMANS_WALK_ENGINE.md`
- `docs/specs/OMISSION_COVERAGE_ENGINE.md`
- `docs/specs/OPEN_ITEMS_BOARD.md`
- `docs/specs/CHANGE_ORDER_ENGINE.md`

### Proof-bearing artifacts

- `docs/WAVE6_PROOF_PACK.md`
- `docs/WAVE6_CLOSEOUT.md`
- `docs/WAVE7_CLOSEOUT.md`
- `docs/PHASE1_LIFECYCLE_EXPANSION_CLOSEOUT.md`
- `docs/PHASE2_LIFECYCLE_EXPANSION_CLOSEOUT.md`
- `docs/PHASE3_LIFECYCLE_EXPANSION_CLOSEOUT.md`

### Test and implementation surfaces

- `src/HookRuntime.js` — enforcement spine
- `src/ControlRodMode.js` — autonomy profiles
- `src/ForensicChain.js` — evidence substrate
- `src/ForemansWalk.js` — post-session verification engine

Run the two most direct verification commands:

```bash
node --test tests/golden/HookRuntime.golden.test.js
node --test tests/live/wave5.hook-runtime.live.test.js
```

Then cross-check the current lifecycle and regression snapshot in `docs/PHASE3_LIFECYCLE_EXPANSION_CLOSEOUT.md`:

- `24` handled official lifecycle events
- `406` full golden regression tests
- `79` HookRuntime golden tests
- `8` hook-runtime live integration tests
- `WorktreeCreate` and `WorktreeRemove` still pending
- `Setup` still unclaimed

Also verify the negative boundaries:

- `package.json` is absent
- package/install/marketplace claims remain unverified
- `Agent` tool governance is not claimed
- Work Order intake chain stops at reviewed artifacts only

If any front-door surface claims broader coverage, broader platform support, or package/marketplace distribution without matching proof, the proof wins and the claim should be cut.

---

## Publication Risk

This document fails if it confuses execution-time blocking with upstream threat detection, if it treats local runtime governance as enterprise-wide agent security, or if it outruns current repo proof on lifecycle counts, package/install status, or governed-path scope.

---

## The Differentiator

Most agent-governance material lives above the agent as policy, platform control, or enterprise visibility. This repo lives at the moment of execution: deterministic local code between Claude Code and the file system, with a receipt after the fact.

It does not rely on the model's self-description as the control. The control is local deterministic code, and the receipt is local deterministic evidence.

---

*This mapping reflects the plugin's shipped state as of April 9, 2026. Ratings should change only when shipped architecture and proof change with it.*
