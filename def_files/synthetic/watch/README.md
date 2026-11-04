# Watch-mode differential fixture

Hand-written inputs for `test/watch-differential.test.ts`. The test copies
this directory, applies a scripted sequence of edits, and after every edit
compares the incremental `WatchSession` build with a fresh cold compilation:
every Dart file byte for byte, the linked IR, and the link report.

The files deliberately connect through every cross-declaration feature an
incremental build could get wrong: declaration merging (reopened interfaces
and an interface/`var` constructor companion), inheritance chains that cross
files without each file importing the root, generics with bounds and
defaults, `typeof` references to consts and enum members, barrel re-exports
with a name two sources supply, and a global script file bound by name.
