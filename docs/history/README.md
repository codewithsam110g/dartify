# History

`legacy/` is the author's original three-day implementation of dartify — the
single-pass transpiler that first produced h3's bindings. It is kept verbatim
as an architectural exhibit (D-29; formerly PLAN.md S6.8): it shows the problem the
three-phase compiler in `src/` was rebuilt to solve. It is not built, tested,
type-checked or shipped, and it should not be "cleaned up".

`plan-s0-s6.md` is the S0–S6 stage plan (formerly `PLAN.md` at the repository root), complete and kept for its
task tables, per-stage metrics and backend policy record. Its decisions are D-05–D-17 in
[`../decisions.md`](../decisions.md).
