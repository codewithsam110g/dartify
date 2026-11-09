# Watch fixture: cross-file globals

Inputs for the differential edits in `test/watch-differential.test.ts` that
exercise global declaration merging (HD-06): `Settings` is declared in the
script files `a.d.ts` and `b.d.ts` and in a `declare global` block in `m.d.ts`;
`plain.d.ts` is an ordinary module that uses it. The session names the inputs
by glob, so the edits can add and remove whole files.
