# Coverage manifest

Audited HEAD: `17e8aa932bd42aa9c667f40c2ac8567764799380`. Counts are physical lines, including blank lines. Status `Unverified` means no coverage is claimed yet. Machine-readable blob identity and later read ranges are in `coverage.json`.

| File | Lines | Area | Planned method |
|---|---:|---|---|
| `.github/workflows/ci.yml` | 49 | CI | manual line-by-line + local equivalent checks; no hosted execution claim |
| `.gitignore` | 19 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `AGENTS.md` | 41 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `CHANGELOG.md` | 229 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `CLAUDE.md` | 358 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `CONTRIBUTING.md` | 58 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `LICENSE` | 201 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `PLAN.md` | 569 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `PRE_STAGE5_PLAN.md` | 176 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `README.md` | 156 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `ROADMAP.md` | 82 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `STAGE4_PLAN.md` | 324 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `Tasks.md` | 59 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `audit/01-architecture.md` | 118 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/02-entry-resolve.md` | 361 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/03-parser-decl.md` | 377 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/04-parser-type.md` | 730 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/05-ir.md` | 236 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/06-symbol-linker.md` | 505 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/07-emitter.md` | 952 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/08-dead-legacy.md` | 216 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/09-tests-tooling.md` | 366 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/FINDINGS.md` | 337 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/POST-S4-AUDIT.md` | 185 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/README.md` | 299 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `audit/S4-EVIDENCE.md` | 125 | prior reports | manual claim inventory after fresh code pass; independent current-HEAD revalidation only |
| `def_files/README.md` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/axios/axios.d.ts` | 810 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/express_project/package-lock.json` | 922 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/express_project/package.json` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/express_project/tsconfig.json` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/h3/h3.d.ts` | 655 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/h3/h3_web.golden.dart` | 421 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/js_facade_gen_test_cases.md` | 1322 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/leaflet/geojson.d.ts` | 202 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/leaflet/leaflet.d.ts` | 3160 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/leaflet_project/package-lock.json` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/leaflet_project/package.json` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/leaflet_project/tsconfig.json` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/classes.d.ts` | 81 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/comments.d.ts` | 54 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/declaration_augmentation.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/enums.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/functions.d.ts` | 46 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/interfaces.d.ts` | 87 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/keywords.d.ts` | 46 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/modules.d.ts` | 92 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/overloads.d.ts` | 57 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/promises.d.ts` | 57 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/type_aliases.d.ts` | 50 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/types.d.ts` | 95 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/legacy_tests/variables.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lib.dom/lib.dom.d.ts` | 29610 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/add.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/after.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/ary.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/assign.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/assignIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/assignInWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/assignWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/at.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/attempt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/before.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/bind.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/bindAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/bindKey.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/camelCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/capitalize.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/castArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/ceil.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/chain.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/chunk.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/clamp.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/clone.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/cloneDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/cloneDeepWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/cloneWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/array.d.ts` | 2160 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/collection.d.ts` | 1938 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/common.d.ts` | 287 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/date.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/function.d.ts` | 1455 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/lang.d.ts` | 1696 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/math.d.ts` | 407 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/number.d.ts` | 131 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/object.d.ts` | 2643 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/seq.d.ts` | 210 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/string.d.ts` | 788 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/common/util.d.ts` | 1220 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/compact.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/concat.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/cond.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/conformsTo.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/constant.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/countBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/create.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/curry.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/curryRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/debounce.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/deburr.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/defaultTo.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/defaults.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/defaultsDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/defer.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/delay.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/difference.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/differenceBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/differenceWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/divide.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/drop.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/dropRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/dropRightWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/dropWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/each.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/eachRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/endsWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/entries.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/entriesIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/eq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/escape.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/escapeRegExp.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/every.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/extend.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/extendWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fill.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/filter.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/find.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/findIndex.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/findKey.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/findLast.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/findLastIndex.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/findLastKey.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/first.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flatMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flatMapDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flatMapDepth.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flatten.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flattenDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flattenDepth.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flip.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/floor.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flow.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/flowRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/forEach.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/forEachRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/forIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/forInRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/forOwn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/forOwnRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp.d.ts` | 4962 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/F.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/T.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/__.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/add.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/after.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/all.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/allPass.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/always.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/any.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/anyPass.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/apply.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/ary.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assign.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assignAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assignAllWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assignIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assignInAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assignInAllWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assignInWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assignWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assoc.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/assocPath.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/at.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/attempt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/before.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/bind.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/bindAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/bindKey.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/camelCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/capitalize.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/castArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/ceil.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/chunk.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/clamp.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/clone.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/cloneDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/cloneDeepWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/cloneWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/compact.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/complement.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/compose.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/concat.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/cond.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/conforms.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/conformsTo.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/constant.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/contains.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/convert.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/countBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/create.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/curry.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/curryN.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/curryRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/curryRightN.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/debounce.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/deburr.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/defaultTo.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/defaults.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/defaultsAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/defaultsDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/defaultsDeepAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/defer.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/delay.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/difference.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/differenceBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/differenceWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/dissoc.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/dissocPath.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/divide.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/drop.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/dropLast.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/dropLastWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/dropRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/dropRightWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/dropWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/each.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/eachRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/endsWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/entries.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/entriesIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/eq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/equals.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/escape.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/escapeRegExp.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/every.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/extend.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/extendAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/extendAllWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/extendWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/fill.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/filter.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/find.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findIndex.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findIndexFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findKey.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findLast.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findLastFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findLastIndex.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findLastIndexFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/findLastKey.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/first.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flatMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flatMapDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flatMapDepth.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flatten.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flattenDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flattenDepth.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flip.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/floor.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flow.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/flowRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/forEach.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/forEachRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/forIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/forInRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/forOwn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/forOwnRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/fromPairs.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/functions.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/functionsIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/get.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/getOr.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/groupBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/gt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/gte.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/has.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/hasIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/head.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/identical.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/identity.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/inRange.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/includes.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/includesFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/indexBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/indexOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/indexOfFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/init.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/initial.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/intersection.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/intersectionBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/intersectionWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/invert.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/invertBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/invertObj.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/invoke.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/invokeArgs.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/invokeArgsMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/invokeMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isArguments.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isArrayBuffer.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isArrayLike.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isArrayLikeObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isBoolean.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isBuffer.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isDate.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isElement.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isEmpty.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isEqual.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isEqualWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isError.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isFinite.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isFunction.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isInteger.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isLength.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isMatch.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isMatchWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isNaN.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isNative.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isNil.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isNull.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isNumber.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isObjectLike.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isPlainObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isRegExp.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isSafeInteger.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isSet.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isString.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isSymbol.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isTypedArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isUndefined.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isWeakMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/isWeakSet.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/iteratee.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/join.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/juxt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/kebabCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/keyBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/keys.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/keysIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/last.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/lastIndexOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/lastIndexOfFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/lowerCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/lowerFirst.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/lt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/lte.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/map.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/mapKeys.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/mapValues.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/matches.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/matchesProperty.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/max.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/maxBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/mean.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/meanBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/memoize.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/merge.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/mergeAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/mergeAllWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/mergeWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/method.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/methodOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/min.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/minBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/multiply.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/nAry.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/negate.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/noConflict.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/noop.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/now.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/nth.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/nthArg.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/omit.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/omitAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/omitBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/once.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/orderBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/over.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/overArgs.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/overEvery.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/overSome.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pad.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/padChars.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/padCharsEnd.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/padCharsStart.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/padEnd.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/padStart.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/parseInt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/partial.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/partialRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/partition.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/path.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pathEq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pathOr.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/paths.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pick.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pickAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pickBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pipe.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/placeholder.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pluck.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/prop.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/propEq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/propOr.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/property.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/propertyOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/props.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pull.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pullAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pullAllBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pullAllWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/pullAt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/random.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/range.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/rangeRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/rangeStep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/rangeStepRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/rearg.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/reduce.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/reduceRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/reject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/remove.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/repeat.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/replace.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/rest.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/restFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/result.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/reverse.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/round.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/runInContext.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sample.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sampleSize.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/set.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/setWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/shuffle.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/size.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/slice.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/snakeCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/some.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortedIndex.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortedIndexBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortedIndexOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortedLastIndex.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortedLastIndexBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortedLastIndexOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortedUniq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sortedUniqBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/split.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/spread.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/spreadFrom.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/startCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/startsWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/stubArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/stubFalse.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/stubObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/stubString.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/stubTrue.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/subtract.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sum.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/sumBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/symmetricDifference.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/symmetricDifferenceBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/symmetricDifferenceWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/tail.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/take.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/takeLast.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/takeLastWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/takeRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/takeRightWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/takeWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/tap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/template.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/throttle.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/thru.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/times.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toFinite.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toInteger.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toLength.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toLower.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toNumber.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toPairs.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toPairsIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toPath.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toPlainObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toSafeInteger.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toString.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/toUpper.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/transform.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/trim.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/trimChars.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/trimCharsEnd.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/trimCharsStart.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/trimEnd.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/trimStart.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/truncate.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unapply.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unary.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unescape.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/union.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unionBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unionWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/uniq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/uniqBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/uniqWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/uniqueId.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unnest.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unset.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unzip.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/unzipWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/update.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/updateWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/upperCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/upperFirst.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/useWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/values.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/valuesIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/where.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/whereEq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/without.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/words.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/wrap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/xor.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/xorBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/xorWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/zip.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/zipAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/zipObj.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/zipObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/zipObjectDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fp/zipWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/fromPairs.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/functions.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/functionsIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/get.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/groupBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/gt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/gte.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/has.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/hasIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/head.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/identity.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/inRange.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/includes.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/index.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/indexOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/initial.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/intersection.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/intersectionBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/intersectionWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/invert.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/invertBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/invoke.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/invokeMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isArguments.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isArrayBuffer.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isArrayLike.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isArrayLikeObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isBoolean.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isBuffer.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isDate.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isElement.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isEmpty.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isEqual.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isEqualWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isError.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isFinite.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isFunction.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isInteger.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isLength.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isMatch.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isMatchWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isNaN.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isNative.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isNil.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isNull.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isNumber.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isObjectLike.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isPlainObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isRegExp.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isSafeInteger.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isSet.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isString.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isSymbol.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isTypedArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isUndefined.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isWeakMap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/isWeakSet.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/iteratee.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/join.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/kebabCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/keyBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/keys.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/keysIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/last.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/lastIndexOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/lowerCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/lowerFirst.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/lt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/lte.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/map.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/mapKeys.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/mapValues.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/matches.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/matchesProperty.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/max.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/maxBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/mean.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/meanBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/memoize.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/merge.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/mergeWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/method.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/methodOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/min.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/minBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/mixin.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/multiply.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/negate.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/noConflict.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/noop.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/now.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/nth.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/nthArg.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/omit.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/omitBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/once.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/orderBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/over.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/overArgs.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/overEvery.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/overSome.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/pad.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/padEnd.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/padStart.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/parseInt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/partial.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/partialRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/partition.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/pick.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/pickBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/property.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/propertyOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/pull.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/pullAll.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/pullAllBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/pullAllWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/pullAt.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/random.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/range.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/rangeRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/rearg.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/reduce.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/reduceRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/reject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/remove.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/repeat.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/replace.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/rest.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/result.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/reverse.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/round.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/runInContext.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sample.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sampleSize.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/set.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/setWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/shuffle.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/size.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/slice.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/snakeCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/some.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortedIndex.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortedIndexBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortedIndexOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortedLastIndex.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortedLastIndexBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortedLastIndexOf.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortedUniq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sortedUniqBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/split.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/spread.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/startCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/startsWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/stubFalse.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/stubTrue.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/subtract.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sum.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/sumBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/tail.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/take.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/takeRight.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/takeRightWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/takeWhile.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/tap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/template.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/throttle.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/thru.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/times.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toArray.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toFinite.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toInteger.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toLength.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toLower.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toNumber.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toPairs.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toPairsIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toPath.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toPlainObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toSafeInteger.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toString.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/toUpper.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/transform.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/trim.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/trimEnd.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/trimStart.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/truncate.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/unary.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/unescape.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/union.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/unionBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/unionWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/uniq.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/uniqBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/uniqWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/uniqueId.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/unset.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/unzip.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/unzipWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/update.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/updateWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/upperCase.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/upperFirst.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/values.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/valuesIn.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/without.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/words.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/wrap.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/xor.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/xorBy.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/xorWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/zip.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/zipObject.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/zipObjectDeep.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/lodash/zipWith.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/node/event.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/synthetic/api/client.d.ts` | 20 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/core/augmentation.d.ts` | 25 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/core/types.d.ts` | 21 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/probe.d.ts` | 106 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/runtime/main.dart` | 31 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/runtime/main.expected` | 18 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/runtime/probe.d.ts` | 56 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/runtime/probe.js` | 32 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/s3-complete.d.ts` | 91 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/s5_emitter/README.md` | 57 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/s5_emitter/ambient.d.ts` | 8 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/s5_emitter/augmentation.d.ts` | 26 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/s5_emitter/consumer.d.ts` | 33 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/s5_emitter/foundation.d.ts` | 119 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/watch/README.md` | 13 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/watch/barrel.d.ts` | 4 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/watch/base.d.ts` | 40 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/watch/derived.d.ts` | 25 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/watch/grand.d.ts` | 6 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/watch/other.d.ts` | 5 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/synthetic/watch/script.d.ts` | 5 | synthetic fixtures | manual line-by-line + execution and negative-case expansion inside audit folder |
| `def_files/three/build/three.core.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.core.min.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.module.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.module.min.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.tsl.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.tsl.min.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.webgpu.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.webgpu.min.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.webgpu.nodes.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/build/three.webgpu.nodes.min.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/Addons.d.ts` | 282 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/animation/AnimationClipCreator.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/animation/CCDIKSolver.d.ts` | 44 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/capabilities/WebGL.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/capabilities/WebGPU.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/ArcballControls.d.ts` | 208 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/DragControls.d.ts` | 81 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/FirstPersonControls.d.ts` | 101 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/FlyControls.d.ts` | 44 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/MapControls.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/OrbitControls.d.ts` | 295 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/PointerLockControls.d.ts` | 84 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/TrackballControls.d.ts` | 142 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/controls/TransformControls.d.ts` | 308 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/csm/CSM.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/csm/CSMFrustum.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/csm/CSMHelper.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/csm/CSMShader.d.ts` | 4 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/csm/CSMShadowNode.d.ts` | 44 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/curves/CurveExtras.d.ts` | 68 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/curves/NURBSCurve.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/curves/NURBSSurface.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/curves/NURBSUtils.d.ts` | 146 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/curves/NURBSVolume.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/effects/AnaglyphEffect.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/effects/AsciiEffect.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/effects/OutlineEffect.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/effects/ParallaxBarrierEffect.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/effects/StereoEffect.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/environments/ColorEnvironment.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/environments/DebugEnvironment.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/environments/RoomEnvironment.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/exporters/DRACOExporter.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/exporters/EXRExporter.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/exporters/GLTFExporter.d.ts` | 156 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/exporters/KTX2Exporter.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/exporters/OBJExporter.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/exporters/PLYExporter.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/exporters/STLExporter.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/exporters/USDZExporter.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/geometries/BoxLineGeometry.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/geometries/ConvexGeometry.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/geometries/DecalGeometry.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/geometries/ParametricFunctions.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/geometries/ParametricGeometry.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/geometries/RoundedBoxGeometry.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/geometries/TeapotGeometry.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/geometries/TextGeometry.d.ts` | 117 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/gpgpu/BitonicSort.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/AnimationPathHelper.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/LightProbeHelper.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/LightProbeHelperGPU.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/OctreeHelper.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/PositionalAudioHelper.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/RapierHelper.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/RectAreaLightHelper.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/TextureHelper.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/TextureHelperGPU.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/VertexNormalsHelper.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/VertexTangentsHelper.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/helpers/ViewHelper.d.ts` | 20 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/inspector/Inspector.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/inspector/RendererInspector.d.ts` | 4 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/inspector/tabs/Parameters.d.ts` | 98 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/inspector/ui/Item.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/inspector/ui/Tab.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/inspector/ui/Values.d.ts` | 80 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/interactive/HTMLMesh.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/interactive/InteractiveGroup.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/interactive/SelectionBox.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/interactive/SelectionHelper.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/libs/fflate.module.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/libs/lil-gui.module.min.d.ts` | 608 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/libs/meshopt_decoder.module.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/libs/stats.module.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/libs/tween.module.d.ts` | 2 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lighting/TiledLighting.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lights/LightProbeGenerator.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lights/RectAreaLightTexturesLib.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lights/RectAreaLightUniformsLib.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/Line2.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/LineGeometry.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/LineMaterial.d.ts` | 82 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/LineSegments2.d.ts` | 39 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/LineSegmentsGeometry.d.ts` | 53 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/Wireframe.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/WireframeGeometry2.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/webgpu/Line2.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/webgpu/LineSegments2.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/lines/webgpu/Wireframe.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/3DMLoader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/3MFLoader.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/AMFLoader.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/BVHLoader.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/ColladaLoader.d.ts` | 34 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/DDSLoader.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/DRACOLoader.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/EXRLoader.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/FBXLoader.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/FontLoader.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/GCodeLoader.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/GLTFLoader.d.ts` | 152 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/HDRCubeTextureLoader.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/HDRLoader.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/IESLoader.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/KMZLoader.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/KTX2Loader.d.ts` | 58 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/KTXLoader.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/LDrawLoader.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/LUT3dlLoader.d.ts` | 39 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/LUTCubeLoader.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/LUTImageLoader.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/LWOLoader.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/LottieLoader.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/MD2Loader.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/MDDLoader.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/MTLLoader.d.ts` | 95 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/MaterialXLoader.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/NRRDLoader.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/OBJLoader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/PCDLoader.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/PDBLoader.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/PLYLoader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/PVRLoader.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/RGBELoader.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/STLLoader.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/SVGLoader.d.ts` | 64 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/TDSLoader.d.ts` | 35 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/TGALoader.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/TIFFLoader.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/TTFLoader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/USDLoader.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/USDZLoader.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/UltraHDRLoader.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/VOXLoader.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/VRMLLoader.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/VTKLoader.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/loaders/XYZLoader.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/materials/LDrawConditionalLineMaterial.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/materials/LDrawConditionalLineNodeMaterial.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/materials/WoodNodeMaterial.d.ts` | 75 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/Capsule.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/ColorConverter.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/ColorSpaces.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/ConvexHull.d.ts` | 89 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/ImprovedNoise.d.ts` | 4 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/Lut.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/MeshSurfaceSampler.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/OBB.d.ts` | 24 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/Octree.d.ts` | 54 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/math/SimplexNoise.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/ConvexObjectBreaker.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/GPUComputationRenderer.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/Gyroscope.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/MD2Character.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/MD2CharacterComplex.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/MorphAnimMesh.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/MorphBlendMesh.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/ProgressiveLightMap.d.ts` | 58 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/ProgressiveLightMapGPU.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/RollerCoaster.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/TubePainter.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/Volume.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/misc/VolumeSlice.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/modifiers/CurveModifier.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/modifiers/CurveModifierGPU.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/modifiers/EdgeSplitModifier.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/modifiers/SimplifyModifier.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/modifiers/TessellateModifier.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/GroundedSkybox.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/Lensflare.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/LensflareMesh.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/MarchingCubes.d.ts` | 76 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/Reflector.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/ReflectorForSSRPass.d.ts` | 62 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/Refractor.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/ShadowMesh.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/Sky.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/SkyMesh.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/Water.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/Water2.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/Water2Mesh.d.ts` | 53 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/objects/WaterMesh.d.ts` | 40 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/physics/AmmoPhysics.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/physics/JoltPhysics.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/physics/RapierPhysics.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/AfterimagePass.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/BloomPass.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/BokehPass.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/ClearPass.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/CubeTexturePass.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/DotScreenPass.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/EffectComposer.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/FXAAPass.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/FilmPass.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/GTAOPass.d.ts` | 121 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/GlitchPass.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/HalftonePass.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/LUTPass.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/MaskPass.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/OutlinePass.d.ts` | 64 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/OutputPass.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/Pass.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/RenderPass.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/RenderPixelatedPass.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/RenderTransitionPass.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/SAOPass.d.ts` | 70 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/SMAAPass.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/SSAARenderPass.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/SSAOPass.d.ts` | 68 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/SSRPass.d.ts` | 99 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/SavePass.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/ShaderPass.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/TAARenderPass.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/TexturePass.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/postprocessing/UnrealBloomPass.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/renderers/CSS2DRenderer.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/renderers/CSS3DRenderer.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/renderers/Projector.d.ts` | 60 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/renderers/SVGRenderer.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/ACESFilmicToneMappingShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/AfterimageShader.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/BasicShader.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/BleachBypassShader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/BlendShader.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/BokehShader.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/BokehShader2.d.ts` | 44 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/BrightnessContrastShader.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/ColorCorrectionShader.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/ColorifyShader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/ConvolutionShader.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/CopyShader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/DOFMipMapShader.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/DepthLimitedBlurShader.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/DigitalGlitch.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/DotScreenShader.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/ExposureShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/FXAAShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/FilmShader.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/FocusShader.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/FreiChenShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/GTAOShader.d.ts` | 59 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/GammaCorrectionShader.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/HalftoneShader.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/HorizontalBlurShader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/HorizontalTiltShiftShader.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/HueSaturationShader.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/KaleidoShader.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/LuminosityHighPassShader.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/LuminosityShader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/MirrorShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/NormalMapShader.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/OutputShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/PoissonDenoiseShader.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/RGBShiftShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/SAOShader.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/SMAAShader.d.ts` | 43 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/SSAOShader.d.ts` | 49 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/SSRShader.d.ts` | 62 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/SepiaShader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/SobelOperatorShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/SubsurfaceScatteringShader.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/TechnicolorShader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/ToonShader.d.ts` | 54 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/TriangleBlurShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/UnpackDepthRGBAShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/VelocityShader.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/VerticalBlurShader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/VerticalTiltShiftShader.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/VignetteShader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/VolumeShader.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/shaders/WaterRefractionShader.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/textures/FlakesTexture.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/transpiler/AST.d.ts` | 292 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/transpiler/GLSLDecoder.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/transpiler/ShaderToyDecoder.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/transpiler/TSLEncoder.d.ts` | 49 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/transpiler/Transpiler.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/AfterImageNode.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/AnaglyphPassNode.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/AnamorphicNode.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/BilateralBlurNode.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/BleachBypass.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/BloomNode.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/CRT.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/ChromaticAberrationNode.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/DenoiseNode.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/DepthOfFieldNode.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/DotScreenNode.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/FXAANode.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/FilmNode.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/GTAONode.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/GaussianBlurNode.d.ts` | 56 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/GodraysNode.d.ts` | 20 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/LensflareNode.d.ts` | 34 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/Lut3DNode.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/MotionBlur.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/OutlineNode.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/ParallaxBarrierPassNode.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/PixelationPassNode.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/RGBShiftNode.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/RetroPassNode.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/SMAANode.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/SSAAPassNode.d.ts` | 20 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/SSGINode.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/SSRNode.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/SSSNode.d.ts` | 20 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/Sepia.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/Shape.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/SobelOperatorNode.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/StereoCompositePassNode.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/StereoPassNode.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/TRAANode.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/TransitionNode.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/boxBlur.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/depthAwareBlend.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/hashBlur.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/display/radialBlur.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/lighting/TiledLightsNode.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/math/Bayer.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/shadows/TileShadowNode.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/shadows/TileShadowNodeHelper.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/tsl/utils/Raymarching.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/BufferGeometryUtils.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/CameraUtils.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/GeometryCompressionUtils.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/GeometryUtils.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/LDrawUtils.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/SceneUtils.d.ts` | 57 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/ShadowMapViewer.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/ShadowMapViewerGPU.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/SkeletonUtils.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/SortUtils.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/UVsDebug.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/WebGLTextureUtils.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/WebGPUTextureUtils.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/utils/WorkerPool.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/ARButton.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/OculusHandModel.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/OculusHandPointerModel.d.ts` | 67 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/Text2D.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/VRButton.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/XRButton.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/XRControllerModelFactory.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/XREstimatedLight.d.ts` | 69 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/XRHandMeshModel.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/XRHandModelFactory.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/XRHandPrimitiveModel.d.ts` | 24 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/examples/jsm/webxr/XRPlanes.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/index.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/Three.Core.d.ts` | 163 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/Three.TSL.d.ts` | 628 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/Three.WebGPU.Nodes.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/Three.WebGPU.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/Three.d.ts` | 58 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/AnimationAction.d.ts` | 286 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/AnimationClip.d.ts` | 178 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/AnimationMixer.d.ts` | 173 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/AnimationObjectGroup.d.ts` | 58 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/AnimationUtils.d.ts` | 166 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/KeyframeTrack.d.ts` | 183 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/PropertyBinding.d.ts` | 101 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/PropertyMixer.d.ts` | 75 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/tracks/BooleanKeyframeTrack.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/tracks/ColorKeyframeTrack.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/tracks/NumberKeyframeTrack.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/tracks/QuaternionKeyframeTrack.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/tracks/StringKeyframeTrack.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/animation/tracks/VectorKeyframeTrack.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/audio/Audio.d.ts` | 340 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/audio/AudioAnalyser.d.ts` | 63 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/audio/AudioContext.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/audio/AudioListener.d.ts` | 75 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/audio/PositionalAudio.d.ts` | 108 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/cameras/ArrayCamera.d.ts` | 35 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/cameras/Camera.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/cameras/CubeCamera.d.ts` | 89 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/cameras/OrthographicCamera.d.ts` | 144 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/cameras/PerspectiveCamera.d.ts` | 241 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/cameras/StereoCamera.d.ts` | 44 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/constants.d.ts` | 963 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/BufferAttribute.d.ts` | 638 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/BufferGeometry.d.ts` | 442 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/Clock.d.ts` | 73 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/EventDispatcher.d.ts` | 82 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/GLBufferAttribute.d.ts` | 138 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/InstancedBufferAttribute.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/InstancedBufferGeometry.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/InstancedInterleavedBuffer.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/InterleavedBuffer.d.ts` | 162 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/InterleavedBufferAttribute.d.ts` | 201 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/Layers.d.ts` | 72 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/Object3D.d.ts` | 698 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/Raycaster.d.ts` | 212 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/RenderTarget.d.ts` | 85 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/RenderTarget3D.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/Timer.d.ts` | 77 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/Uniform.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/core/UniformsGroup.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/Controls.d.ts` | 54 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/DataUtils.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/Earcut.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/ImageUtils.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/PMREMGenerator.d.ts` | 95 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/ShapeUtils.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/TextureUtils.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/core/Curve.d.ts` | 162 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/core/CurvePath.d.ts` | 77 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/core/Interpolations.d.ts` | 36 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/core/Path.d.ts` | 166 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/core/Shape.d.ts` | 86 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/core/ShapePath.d.ts` | 98 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/ArcCurve.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/CatmullRomCurve3.d.ts` | 77 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/CubicBezierCurve.d.ts` | 72 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/CubicBezierCurve3.d.ts` | 72 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/Curves.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/EllipseCurve.d.ts` | 115 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/LineCurve.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/LineCurve3.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/QuadraticBezierCurve.d.ts` | 64 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/QuadraticBezierCurve3.d.ts` | 64 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/extras/curves/SplineCurve.d.ts` | 52 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/BoxGeometry.d.ts` | 59 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/CapsuleGeometry.d.ts` | 56 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/CircleGeometry.d.ts` | 51 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/ConeGeometry.d.ts` | 64 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/CylinderGeometry.d.ts` | 64 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/DodecahedronGeometry.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/EdgesGeometry.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/ExtrudeGeometry.d.ts` | 152 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/Geometries.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/IcosahedronGeometry.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/LatheGeometry.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/OctahedronGeometry.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/PlaneGeometry.d.ts` | 48 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/PolyhedronGeometry.d.ts` | 54 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/RingGeometry.d.ts` | 59 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/ShapeGeometry.d.ts` | 53 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/SphereGeometry.d.ts` | 67 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/TetrahedronGeometry.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/TorusGeometry.d.ts` | 67 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/TorusKnotGeometry.d.ts` | 59 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/TubeGeometry.d.ts` | 86 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/geometries/WireframeGeometry.d.ts` | 40 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/ArrowHelper.d.ts` | 77 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/AxesHelper.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/Box3Helper.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/BoxHelper.d.ts` | 53 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/CameraHelper.d.ts` | 59 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/DirectionalLightHelper.d.ts` | 60 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/GridHelper.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/HemisphereLightHelper.d.ts` | 49 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/PlaneHelper.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/PointLightHelper.d.ts` | 48 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/PolarGridHelper.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/SkeletonHelper.d.ts` | 49 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/helpers/SpotLightHelper.d.ts` | 50 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/AmbientLight.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/DirectionalLight.d.ts` | 68 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/DirectionalLightShadow.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/HemisphereLight.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/Light.d.ts` | 48 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/LightProbe.d.ts` | 46 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/LightShadow.d.ts` | 193 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/PointLight.d.ts` | 72 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/PointLightShadow.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/RectAreaLight.d.ts` | 62 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/SpotLight.d.ts` | 125 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/SpotLightShadow.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/webgpu/IESSpotLight.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/lights/webgpu/ProjectorLight.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/AnimationLoader.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/AudioLoader.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/BufferGeometryLoader.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/Cache.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/CompressedTextureLoader.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/CubeTextureLoader.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/DataTextureLoader.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/FileLoader.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/ImageBitmapLoader.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/ImageLoader.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/Loader.d.ts` | 51 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/LoaderUtils.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/LoadingManager.d.ts` | 73 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/MaterialLoader.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/ObjectLoader.d.ts` | 35 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/TextureLoader.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/nodes/NodeLoader.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/nodes/NodeMaterialLoader.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/loaders/nodes/NodeObjectLoader.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/LineBasicMaterial.d.ts` | 88 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/LineDashedMaterial.d.ts` | 56 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/Material.d.ts` | 642 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/Materials.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshBasicMaterial.d.ts` | 174 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshDepthMaterial.d.ts` | 106 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshDistanceMaterial.d.ts` | 89 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshLambertMaterial.d.ts` | 282 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshMatcapMaterial.d.ts` | 169 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshNormalMaterial.d.ts` | 124 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshPhongMaterial.d.ts` | 294 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshPhysicalMaterial.d.ts` | 291 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshStandardMaterial.d.ts` | 300 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/MeshToonMaterial.d.ts` | 223 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/PointsMaterial.d.ts` | 104 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/RawShaderMaterial.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/ShaderMaterial.d.ts` | 266 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/ShadowMaterial.d.ts` | 61 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/SpriteMaterial.d.ts` | 91 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/Line2NodeMaterial.d.ts` | 90 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/LineBasicNodeMaterial.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/LineDashedNodeMaterial.d.ts` | 88 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshBasicNodeMaterial.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshLambertNodeMaterial.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshMatcapNodeMaterial.d.ts` | 45 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshNormalNodeMaterial.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshPhongNodeMaterial.d.ts` | 77 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshPhysicalNodeMaterial.d.ts` | 269 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshSSSNodeMaterial.d.ts` | 110 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshStandardNodeMaterial.d.ts` | 93 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/MeshToonNodeMaterial.d.ts` | 45 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/NodeMaterial.d.ts` | 482 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/NodeMaterials.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/PointsNodeMaterial.d.ts` | 60 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/ShadowNodeMaterial.d.ts` | 45 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/SpriteNodeMaterial.d.ts` | 74 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/VolumeNodeMaterial.d.ts` | 56 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/materials/nodes/manager/NodeMaterialObserver.d.ts` | 132 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Box2.d.ts` | 48 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Box3.d.ts` | 74 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Color.d.ts` | 376 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/ColorManagement.d.ts` | 59 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Cylindrical.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Euler.d.ts` | 50 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Frustum.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/FrustumArray.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Interpolant.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Line3.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/MathUtils.d.ts` | 137 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Matrix2.d.ts` | 53 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Matrix3.d.ts` | 184 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Matrix4.d.ts` | 287 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Plane.d.ts` | 47 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Quaternion.d.ts` | 189 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Ray.d.ts` | 60 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Sphere.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Spherical.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/SphericalHarmonics3.d.ts` | 50 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Triangle.d.ts` | 110 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Vector2.d.ts` | 321 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Vector3.d.ts` | 301 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/Vector4.d.ts` | 241 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/interpolants/BezierInterpolant.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/interpolants/CubicInterpolant.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/interpolants/DiscreteInterpolant.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/interpolants/LinearInterpolant.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/math/interpolants/QuaternionLinearInterpolant.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/Nodes.d.ts` | 178 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/TSL.d.ts` | 173 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/AccessorsUtils.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Arrays.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/BatchNode.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Bitangent.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/BufferAttributeNode.d.ts` | 247 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/BufferNode.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/BuiltinNode.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Camera.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/ClippingNode.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/CubeTextureNode.d.ts` | 38 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/InstanceNode.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/InstancedMeshNode.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Lights.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/MaterialNode.d.ts` | 126 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/MaterialProperties.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/MaterialReferenceNode.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/ModelNode.d.ts` | 49 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/ModelViewProjectionNode.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/MorphNode.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Normal.d.ts` | 36 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Object3DNode.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/PointUVNode.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Position.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/ReferenceBaseNode.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/ReferenceNode.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/ReflectVector.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/RendererReferenceNode.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/SceneProperties.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/SkinningNode.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/StorageBufferNode.d.ts` | 83 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/StorageTextureNode.d.ts` | 45 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Tangent.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/TangentUtils.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/Texture3DNode.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/TextureBicubic.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/TextureNode.d.ts` | 88 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/TextureSizeNode.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/UV.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/UniformArrayNode.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/UserDataNode.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/VelocityNode.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/accessors/VertexColorNode.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/code/CodeNode.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/code/ExpressionNode.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/code/FunctionCallNode.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/code/FunctionNode.d.ts` | 40 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/ArrayNode.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/AssignNode.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/AttributeNode.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/BypassNode.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/ConstNode.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/ContextNode.d.ts` | 57 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/IndexNode.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/InputNode.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/InspectorNode.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/IsolateNode.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/LightingModel.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/MRTNode.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/Node.d.ts` | 595 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeAttribute.d.ts` | 47 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeBuilder.d.ts` | 144 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeCache.d.ts` | 50 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeCode.d.ts` | 4 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeError.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeFrame.d.ts` | 34 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeFunction.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeFunctionInput.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeParser.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeUniform.d.ts` | 66 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeUtils.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeVar.d.ts` | 51 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/NodeVarying.d.ts` | 59 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/OutputStructNode.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/ParameterNode.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/PropertyNode.d.ts` | 54 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/StackNode.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/StackTrace.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/StructNode.d.ts` | 20 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/StructType.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/StructTypeNode.d.ts` | 60 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/SubBuildNode.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/TempNode.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/UniformGroupNode.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/UniformNode.d.ts` | 112 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/VarNode.d.ts` | 39 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/VaryingNode.d.ts` | 36 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/core/constants.d.ts` | 72 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/BlendModes.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/BumpMapNode.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ColorAdjustment.d.ts` | 54 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ColorSpaceFunctions.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ColorSpaceNode.d.ts` | 54 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/FrontFacingNode.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/NormalMapNode.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/PassNode.d.ts` | 111 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/RenderOutputNode.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ScreenNode.d.ts` | 53 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ToneMappingFunctions.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ToneMappingNode.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ToonOutlinePassNode.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ViewportDepthNode.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ViewportDepthTextureNode.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ViewportSharedTextureNode.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/display/ViewportTextureNode.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/fog/Fog.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/BRDF_GGX.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/BRDF_GGX_Multiscatter.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/BRDF_Lambert.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/BRDF_Sheen.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/DFGLUT.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/D_GGX.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/D_GGX_Anisotropic.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/F_Schlick.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/LTC.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/Schlick_to_F0.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/V_GGX_SmithCorrelated.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BSDF/V_GGX_SmithCorrelated_Anisotropic.d.ts` | 15 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/BasicLightingModel.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/PhongLightingModel.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/PhysicalLightingModel.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/ShadowMaskModel.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/ToonLightingModel.d.ts` | 4 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/VolumetricLightingModel.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/material/getAlphaHashThreshold.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/material/getGeometryRoughness.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/material/getParallaxCorrectNormal.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/material/getRoughness.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/functions/material/getShIrradianceAt.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/geometry/RangeNode.d.ts` | 62 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/gpgpu/AtomicFunctionNode.d.ts` | 83 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/gpgpu/BarrierNode.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/gpgpu/ComputeBuiltinNode.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/gpgpu/ComputeNode.d.ts` | 46 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/gpgpu/SubgroupFunctionNode.d.ts` | 99 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/gpgpu/WorkgroupInfoNode.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/AONode.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/AmbientLightNode.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/AnalyticLightNode.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/BasicEnvironmentNode.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/BasicLightMapNode.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/DirectionalLightNode.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/EnvironmentNode.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/HemisphereLightNode.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/IESSpotLightNode.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/IrradianceNode.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/LightProbeNode.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/LightUtils.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/LightingContextNode.d.ts` | 34 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/LightingNode.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/LightsNode.d.ts` | 46 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/PointLightNode.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/PointShadowNode.d.ts` | 25 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/ProjectorLightNode.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/RectAreaLightNode.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/ShadowBaseNode.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/ShadowFilterNode.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/ShadowNode.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/lighting/SpotLightNode.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/materialx/MaterialXNodes.d.ts` | 171 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/materialx/lib/mx_hsv.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/materialx/lib/mx_noise.d.ts` | 386 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/materialx/lib/mx_transform_color.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/BitcastNode.d.ts` | 24 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/BitcountNode.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/ConditionalNode.d.ts` | 51 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/Hash.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/MathNode.d.ts` | 783 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/MathUtils.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/OperatorNode.d.ts` | 538 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/PackFloatNode.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/TriNoise3D.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/math/UnpackFloatNode.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/parsers/GLSLNodeFunction.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/parsers/GLSLNodeParser.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/pmrem/PMREMNode.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/pmrem/PMREMUtils.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/procedural/Checker.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/shapes/Shapes.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/tsl/TSLBase.d.ts` | 30 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/tsl/TSLCore.d.ts` | 2019 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/ArrayElementNode.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/ConvertNode.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/CubeMapNode.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/DebugNode.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/Discard.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/EquirectUV.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/EventNode.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/FlipNode.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/FunctionOverloadingNode.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/JoinNode.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/LoopNode.d.ts` | 43 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/MatcapUV.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/MaxMipLevelNode.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/MemberNode.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/Oscillators.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/Packing.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/PostProcessingUtils.d.ts` | 48 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/RTTNode.d.ts` | 46 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/ReflectorNode.d.ts` | 61 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/RemapNode.d.ts` | 52 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/RotateNode.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/SampleNode.d.ts` | 16 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/SetNode.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/SplitNode.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/SpriteSheetUV.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/SpriteUtils.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/StorageArrayElementNode.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/Timer.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/TriplanarTextures.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/UVUtils.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/nodes/utils/ViewportUtils.d.ts` | 3 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/BatchedMesh.d.ts` | 278 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/Bone.d.ts` | 36 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/ClippingGroup.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/Group.d.ts` | 37 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/InstancedMesh.d.ts` | 187 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/LOD.d.ts` | 112 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/Line.d.ts` | 87 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/LineLoop.d.ts` | 40 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/LineSegments.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/Mesh.d.ts` | 102 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/Points.d.ts` | 66 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/Skeleton.d.ts` | 122 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/SkinnedMesh.d.ts` | 160 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/objects/Sprite.d.ts` | 73 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/WebGL3DRenderTarget.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/WebGLArrayRenderTarget.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/WebGLCubeRenderTarget.d.ts` | 18 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/WebGLRenderTarget.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/WebGLRenderer.d.ts` | 469 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Animation.d.ts` | 102 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Attributes.d.ts` | 51 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Backend.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Background.d.ts` | 47 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/BindGroup.d.ts` | 45 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Binding.d.ts` | 50 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Bindings.d.ts` | 132 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/BlendMode.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Buffer.d.ts` | 90 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/BufferUtils.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/BundleGroup.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/CanvasTarget.d.ts` | 205 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/ChainMap.d.ts` | 49 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/ClippingContext.d.ts` | 122 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Color4.d.ts` | 55 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/ComputePipeline.d.ts` | 34 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Constants.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/CubeRenderTarget.d.ts` | 46 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/DataMap.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Geometries.d.ts` | 111 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/IndirectStorageBufferAttribute.d.ts` | 10 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Info.d.ts` | 103 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/InspectorBase.d.ts` | 117 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Lighting.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Pipeline.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Pipelines.d.ts` | 170 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/PostProcessing.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/ProgrammableStage.d.ts` | 73 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/QuadMesh.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderBundle.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderBundles.d.ts` | 32 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderContext.d.ts` | 235 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderContexts.d.ts` | 47 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderList.d.ts` | 226 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderLists.d.ts` | 46 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderObject.d.ts` | 448 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderObjectPipeline.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderObjects.d.ts` | 151 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RenderPipeline.d.ts` | 24 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Renderer.d.ts` | 1513 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/RendererUtils.d.ts` | 78 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/SampledTexture.d.ts` | 28 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Sampler.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Storage3DTexture.d.ts` | 42 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/StorageArrayTexture.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/StorageBufferAttribute.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/StorageInstancedBufferAttribute.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/StorageTexture.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Textures.d.ts` | 125 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/TimestampQueryPool.d.ts` | 120 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/Uniform.d.ts` | 262 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/UniformBuffer.d.ts` | 20 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/UniformsGroup.d.ts` | 152 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/XRManager.d.ts` | 563 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/XRRenderTarget.d.ts` | 67 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/extras/PMREMGenerator.d.ts` | 52 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/nodes/NodeBuilderState.d.ts` | 121 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/nodes/NodeLibrary.d.ts` | 129 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/nodes/NodeManager.d.ts` | 269 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/nodes/NodeSampledTexture.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/nodes/NodeSampler.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/nodes/NodeUniform.d.ts` | 250 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/common/nodes/NodeUniformsGroup.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/shaders/ShaderChunk.d.ts` | 143 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/shaders/ShaderLib.d.ts` | 29 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/shaders/UniformsLib.d.ts` | 186 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/shaders/UniformsUtils.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl-fallback/WebGLBackend.d.ts` | 14 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLAttributes.d.ts` | 23 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLBindingStates.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLBufferRenderer.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLCapabilities.d.ts` | 48 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLClipping.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLEnvironments.d.ts` | 8 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLExtensions.d.ts` | 7 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLGeometries.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLIndexedBufferRenderer.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLInfo.d.ts` | 39 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLLights.d.ts` | 50 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLObjects.d.ts` | 19 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLProgram.d.ts` | 22 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLPrograms.d.ts` | 232 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLProperties.d.ts` | 9 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLRenderLists.d.ts` | 64 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLShader.d.ts` | 1 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLShadowMap.d.ts` | 33 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLState.d.ts` | 397 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLTextures.d.ts` | 31 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLUniforms.d.ts` | 5 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLUniformsGroups.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgl/WebGLUtils.d.ts` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/WebGPUBackend.d.ts` | 26 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/WebGPURenderer.Nodes.d.ts` | 12 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/WebGPURenderer.d.ts` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/nodes/BasicNodeLibrary.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/nodes/StandardNodeLibrary.d.ts` | 92 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/nodes/WGSLNodeBuilder.d.ts` | 125 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/nodes/WGSLNodeFunction.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/nodes/WGSLNodeParser.d.ts` | 6 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webgpu/utils/WebGPUConstants.d.ts` | 342 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webxr/WebXRController.d.ts` | 63 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webxr/WebXRDepthSensing.d.ts` | 21 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/renderers/webxr/WebXRManager.d.ts` | 87 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/scenes/Fog.d.ts` | 71 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/scenes/FogExp2.d.ts` | 61 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/scenes/Scene.d.ts` | 104 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/CanvasTexture.d.ts` | 51 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/CompressedArrayTexture.d.ts` | 65 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/CompressedCubeTexture.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/CompressedTexture.d.ts` | 92 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/CubeDepthTexture.d.ts` | 41 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/CubeTexture.d.ts` | 82 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/Data3DTexture.d.ts` | 94 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/DataArrayTexture.d.ts` | 123 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/DataTexture.d.ts` | 111 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/DepthTexture.d.ts` | 105 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/ExternalTexture.d.ts` | 13 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/FramebufferTexture.d.ts` | 67 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/Source.d.ts` | 79 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/Texture.d.ts` | 550 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/VideoFrameTexture.d.ts` | 27 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/textures/VideoTexture.d.ts` | 90 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three/src/utils.d.ts` | 36 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three_project/package-lock.json` | 80 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three_project/package.json` | 17 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/three_project/tsconfig.json` | 11 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/typescript/typescript.d.ts` | 11399 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `def_files/vscode/vscode.d.ts` | 21238 | reference corpus | full automated inventory/corpus checks where supported + manual relevant slices; no full manual reading claim |
| `docs/history/README.md` | 7 | historical exhibit | manual line-by-line for inventory/reachability; no live backend conformance obligation |
| `docs/history/legacy/transpiler.ts` | 1025 | historical exhibit | manual line-by-line for inventory/reachability; no live backend conformance obligation |
| `docs/history/legacy/type.ts` | 737 | historical exhibit | manual line-by-line for inventory/reachability; no live backend conformance obligation |
| `docs/history/legacy/typeNode.ts` | 688 | historical exhibit | manual line-by-line for inventory/reachability; no live backend conformance obligation |
| `package.json` | 82 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `pnpm-lock.yaml` | 2504 | dependency lock | full machine parsing/integrity and dependency inventory + manual relevant entries |
| `pnpm-workspace.yaml` | 2 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `src/cli.ts` | 285 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/alias/name.ts` | 134 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/alias/register.ts` | 179 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/alias/registry.ts` | 137 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/backend.ts` | 76 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/packagejs/browserTypes.ts` | 535 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/packagejs/declarations.ts` | 1531 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/packagejs/index.ts` | 409 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/packagejs/library.ts` | 303 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/packagejs/program.ts` | 209 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/packagejs/support.ts` | 44 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/packagejs/text.ts` | 130 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/emitter/packagejs/types.ts` | 644 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/class.ts` | 152 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/context.ts` | 53 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/enum.ts` | 77 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/function.ts` | 44 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/index.ts` | 7 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/interface.ts` | 145 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/metadata.ts` | 97 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/signature.ts` | 157 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/array.ts` | 23 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/function.ts` | 27 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/intersection.ts` | 71 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/keywords.ts` | 38 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/literals.ts` | 110 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/restType.ts` | 21 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/sourceText.ts` | 20 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/thisType.ts` | 54 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/tuple.ts` | 52 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/type.ts` | 268 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/typeLiterals.ts` | 188 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/typeOperator.ts` | 52 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/typeQuery.ts` | 84 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/typeRefernce.ts` | 227 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/unions.ts` | 52 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/type/unsupported.ts` | 85 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/typealias.ts` | 24 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/parser/variable.ts` | 37 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/phase/emitterPhase.ts` | 216 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/phase/linkerPhase.ts` | 335 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/phase/symbolGeneration.ts` | 683 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/semantic/keywords.ts` | 128 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/semantic/merge.ts` | 639 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/semantic/names.ts` | 424 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/semantic/run.ts` | 315 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/semantic/shape.ts` | 65 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/engine/semantic/types.ts` | 66 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/class.ts` | 26 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/clone.ts` | 19 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/declaration.ts` | 35 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/enum.ts` | 23 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/function.ts` | 11 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/index.ts` | 29 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/interface.ts` | 61 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/node.ts` | 42 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/signature.ts` | 40 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/type.ts` | 217 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/typealias.ts` | 10 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/variable.ts` | 10 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/ir/visit.ts` | 56 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/reporting/linker.ts` | 144 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/resolution/moduleHost.ts` | 112 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/resolution/stdlib.ts` | 21 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/resolution/types.ts` | 24 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/symbol/dependencies.ts` | 20 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/symbol/exports.ts` | 141 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/symbol/fqn.ts` | 72 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/symbol/index.ts` | 104 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/symbol/resolve.ts` | 135 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/symbol/table.ts` | 168 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/transpiler.ts` | 837 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `src/watch.ts` | 597 | live source | manual line-by-line + caller tracing + targeted runtime probes |
| `test/__snapshots__/decl/decl-parser.test.ts.snap` | 438 | snapshots | manual expectation review + exact comparison; compiler/runtime validation separately |
| `test/__snapshots__/decl/s5-emitter-fixture.test.ts.snap` | 464 | snapshots | manual expectation review + exact comparison; compiler/runtime validation separately |
| `test/__snapshots__/smoke.test.ts.snap` | 3848 | snapshots | manual expectation review + exact comparison; compiler/runtime validation separately |
| `test/__snapshots__/type/type-parser.test.ts.snap` | 751 | snapshots | manual expectation review + exact comparison; compiler/runtime validation separately |
| `test/conformance/cases.ts` | 49 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/conformance/conformance.test.ts` | 51 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/conformance/h3-golden.test.ts` | 26 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/conformance/ledger.json` | 126 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/conformance/normalize.ts` | 265 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/conformance/run.ts` | 68 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/dart/baseline.json` | 21 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/dart/dart-gate.test.ts` | 118 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/decl/corpus.test.ts` | 148 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/decl/decl-emitter.test.ts` | 221 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/decl/decl-parser.test.ts` | 97 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/decl/parse-context.test.ts` | 36 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/decl/s3-ir.test.ts` | 191 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/decl/s5-emitter-fixture.test.ts` | 111 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/e2e.test.ts` | 77 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/h3/expected.cjs` | 20 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/h3/main.dart` | 21 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/h3/main.expected` | 14 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/h3/setup.cjs` | 2 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/leaflet/expected.cjs` | 19 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/leaflet/main.dart` | 21 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/leaflet/main.expected` | 9 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/leaflet/setup.cjs` | 9 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/three/expected.cjs` | 21 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/three/main.dart` | 25 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/three/main.expected` | 10 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/e2e/three/setup.cjs` | 3 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/generation-diagnostics.test.ts` | 52 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/corpus.test.ts` | 66 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/graph.test.ts` | 30 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/linker.test.ts` | 178 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/module-exports.test.ts` | 81 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/reporting.test.ts` | 151 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/resolution.test.ts` | 83 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/resolve.test.ts` | 96 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/semantic.test.ts` | 763 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/symbol-table.test.ts` | 93 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/linker/test-project.ts` | 70 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/run-isolation.test.ts` | 204 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/simple.test.ts` | 79 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/smoke.test.ts` | 44 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/stress.test.ts` | 87 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/test-helper.ts` | 110 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/aliasName.test.ts` | 197 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/aliasRegistration.test.ts` | 160 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/host-identity.test.ts` | 56 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/irNaming.test.ts` | 124 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/normalisation.test.ts` | 216 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/tier-a.test.ts` | 174 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/type-emitter.test.ts` | 248 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/type-parser.test.ts` | 95 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/type/unsupported.test.ts` | 88 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/watch-differential.test.ts` | 182 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `test/watch.test.ts` | 98 | tests and test assets | manual line-by-line + test execution + assertion adequacy review |
| `tools/bench.ts` | 123 | internal tools | manual line-by-line + reachability and isolation review |
| `tools/graph.ts` | 98 | internal tools | manual line-by-line + reachability and isolation review |
| `tools/graphModel.ts` | 73 | internal tools | manual line-by-line + reachability and isolation review |
| `tools/ir.ts` | 60 | internal tools | manual line-by-line + reachability and isolation review |
| `tsconfig.json` | 28 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |
| `vitest.config.ts` | 50 | root docs and configuration | manual line-by-line; dependency and promise mapping; license inventory |


## Final achieved coverage

| Area | Files | Total lines | Manually read lines | Fully read files |
| --- | ---: | ---: | ---: | ---: |
| CI | 1 | 49 | 49 | 1 |
| dependency lock | 1 | 2504 | 0 | 0 |
| historical exhibit | 4 | 2457 | 2457 | 4 |
| internal tools | 4 | 354 | 354 | 4 |
| live source | 73 | 12606 | 12606 | 73 |
| prior reports | 13 | 4807 | 1124 | 4 |
| reference corpus | 1657 | 143742 | 125 | 7 |
| root docs and configuration | 16 | 2434 | 2434 | 16 |
| snapshots | 4 | 5501 | 420 | 0 |
| synthetic fixtures | 21 | 741 | 741 | 21 |
| tests and test assets | 54 | 5604 | 5604 | 54 |

Read ranges and per-file evidence are in coverage.json. The initial planned-method rows above are not completion claims. Every source path was finally hashed with no Git access. See MASTER.md for automated coverage, explicit unread ranges and limits.
