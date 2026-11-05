# Roadmap

Each milestone gets one or more briefs in [`milestones/`](milestones/) before implementation starts. A milestone closes
when its acceptance criteria are verified and the user has reviewed it. Status is updated at every merge.

S0–S6 predate D3: they were internal stages on `refactor/orchestration`, not releases (D-07). Their full task tables and
per-stage metrics are in [history/plan-s0-s6.md](history/plan-s0-s6.md) (Tracking section).

| M | Title | Outcome | Status |
|---|-------|---------|--------|
| S0 | Restore the floor | Render-to-string, a passing suite, `tsc` clean. Suite 1,654 failed → 57 passed; `tsc` 15 → 0 errors; `dist` 1.59 MB → 75 KB | Done |
| S1 | Types: nothing is anonymous | Named degradation (D-10); unsupported nodes 1,410 → 112; 68 minted typedefs, 0 dangling | Done |
| S2 | Links: the graph tells the truth | Leaflet 1,050/1,050 edges; three.js 8,184 resolved, 0 ambiguous, 31 honest misses (absent `webxr`, `@webgpu/types`) | Done |
| S3 | Declarations: the IR is complete | Complete metadata/signature IR; census 2,530 declarations / 26,240 types | Done |
| S4 | Semantic layer | Canonical bindings, merges, naming, module scopes, CLI diagnostics — [milestones/S4-semantic-layer.md](milestones/S4-semantic-layer.md); evidence in [hardening/stage-register/S4-EVIDENCE.md](hardening/stage-register/S4-EVIDENCE.md) | Done |
| S4b | Pre-S5 correctness barrier (4.11–4.17) | Run-owned state (D-20), export identity, host identity, deterministic names, executable Dart gate — [milestones/S4-pre-s5-barrier.md](milestones/S4-pre-s5-barrier.md) | Done |
| S5 | Emitter rebuilt once (`package:js` backend) | h3, Leaflet, 420 three.js libraries, all fixtures and 90 conformance cases: 0 analyzer errors/warnings (three.js was 8,342 errors) | Done |
| S6 | Conformance and ship (6.1–6.8) | js_facade_gen cases 67/90 parity + 16 improved; h3 golden 63/63; Dart gate in CI; version 1.0.0 | Done |
| S6+ | Watch mode and end-to-end (6.11–6.13) | `test:e2e` 3/3 against real h3-js/three/leaflet; `-w` incremental rebuilds verified byte-for-byte against cold builds | Done |
| HG | Hardening gate | Every verified finding of the v1 release audits (48: 3 high, 26 medium, 19 low) and the open pre-D3 findings fixed, or closed by an explicit HD decision (D-30); a closing audit checks every row — [hardening/](hardening/README.md) | In progress — audits imported 2026-11-05; briefs HG-1…HG-8 ([split](hardening/README.md#the-split)); next: `/d3-brief HG-1` |
| R1 | Release `1.0.0` | Optional `1.0.0-beta.0` under npm `next` (old S6.9); merge `refactor/orchestration` to `main` and publish `1.0.0` (old S6.10). Publishing is the user's decision (D-07) | Planned, after HG |
| V2 | `dart:js_interop` backend | A second `Backend` behind a CLI flag over the same `LinkedProgram`; platform types via `package:web` (D-06) | Planned, after R1 |
| L1 | Checker-evaluated utility types | `Record`, `Omit`, `Pick` and mapped types resolve to precise shapes where provable, replacing named fallbacks | Planned |
| L2 | External-module augmentations | Emit them (modeled and visibly suppressed today) | Planned |

**Status values:** Planned · Brief drafted · In progress · Done (date, links to brief and fix rounds) · Dropped (reason).
