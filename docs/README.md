# dartify documentation

`docs/` is the **source of truth** for dartify's design. Code follows the docs. When they disagree, it is raised and
resolved, then the docs are updated first.

Start here:

1. [architecture.md](architecture.md): the system overview
2. [decisions.md](decisions.md): the master decision list (D-NN), plus deferred and pending items
3. [roadmap.md](roadmap.md): milestones and their status
4. [process.md](process.md): how work is planned, implemented and reviewed, the gate and the test tiers

Detail:

- [hardening/](hardening/README.md): the hardening gate — the findings register, HD decisions, HG briefs and imported
  audits. [hardening/stage-register/](hardening/stage-register/README.md) is the pre-D3 per-area audit with every
  `R-`/`P-`/`T-`/`I-`/`L-`/`E-`/`D-`/`X-`/`W-`/`CA-`/`DAR-` finding ([FINDINGS.md](hardening/stage-register/FINDINGS.md))
- [milestones/](milestones/): implementation briefs (one per round; fix rounds are `<id>-fixN.md`). The S4 semantic
  contract ([S4-semantic-layer.md](milestones/S4-semantic-layer.md)) and the pre-S5 barrier
  ([S4-pre-s5-barrier.md](milestones/S4-pre-s5-barrier.md)) are completed briefs that still define behaviour
- [issues.md](issues.md): the issues log (I-NN): problems found in hands-on testing or released builds
- [procedures/](procedures/README.md): step-by-step operational procedures
- [history/](history/README.md): the S0–S6 plan ([plan-s0-s6.md](history/plan-s0-s6.md)) and the legacy
  implementation exhibit (D-29)
- `../CHANGELOG.md`: user-visible changes, updated at every merge
- `../ROADMAP.md`: the public short version of the roadmap

Reference data outside `docs/`:

| Path | What it gives you |
|---|---|
| `def_files/js_facade_gen_test_cases.md` | 90 input/output pairs from the reference tool — the de facto spec, executed by `test/conformance/` |
| `test/conformance/ledger.json` | Status and reason for every non-parity reference case (D-27) |
| `test/dart/baseline.json` | The exact accepted `dart analyze` census per fixture set (D-14) |
| `def_files/synthetic/s5_emitter/README.md` | Multi-file emitter fixture matrix |

Useful corpora in `def_files/` (1,654 `.d.ts` files, not shipped to npm):

| Path | Why |
|---|---|
| `h3/h3.d.ts` | **the motivating use case, not a demo** (D-15) |
| `h3/h3_web.golden.dart` | js_facade_gen output shipped in h3 — the real-consumer golden |
| `leaflet/*.d.ts` | namespaces + qualified names — exercises `L-02`; 92 `extends`, 15 namespaces |
| `three/src/Three.Core.d.ts` | 420-file transitive resolution, ~5 s |
| `legacy_tests/*.d.ts` | the `js_facade_gen` conformance fixtures |
| `synthetic/probe.d.ts` | **hand-written.** One run reproduces ~16 findings |
| `synthetic/s3-complete.d.ts` | executable declaration-IR fidelity contract |
| `synthetic/s5_emitter/*.d.ts` | multi-file S5 Dart/CLI golden |
| `synthetic/runtime/` | dart2js runtime probe used by `pnpm test:dart` (`probe.d.ts`, `probe.js`, `main.dart`, `main.expected`) |
