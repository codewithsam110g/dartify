# 50 — Security (pass 5)

## Threat model

dartify is a local developer CLI. It has no authentication, authorization, network listener, persistence or secrets (N/A). Its trust boundary has three edges:

1. **Input files and globs.** `.d.ts` files, often third-party (npm `@types`), plus their transitive imports and an optional user tsconfig.
2. **Generated Dart.** It is compiled into the user's application, so input-controlled text reaching code positions would be code injection into that app.
3. **Supply chain.** npm dependencies, CI actions, and the published package contents.

## Coverage

| Check | Method | Result | Label |
|---|---|---|---|
| Secrets in current tree | regex scan (AWS, GitHub, npm, Slack, private keys, OpenAI/Google API key shapes, `password=` style) over `git grep HEAD`, including `def_files` | 0 hits | Verified [runtime] |
| Secrets in history | same patterns over `git log --all -p` of a fresh **non-shallow** clone (the working clone is shallow): 99 commits, 22.8 MB of patches, all paths including `def_files` | 0 hits; 0 generic credential assignments | Verified [runtime], `logs/secrets-scan.txt` |
| `.env`, `.npmrc` | listing | none | Verified |
| Personal data | Author name in `package.json`/`LICENSE` headers (intentional attribution). Commit metadata carries author emails (2 distinct); not reproduced here | — | Noted |
| Injection: names → `@JS` strings | `dartString` escapes `\`, `"`, `$`, control characters (E-32); reviewed every `jsAnnotation` call site | sound | Verified [static] |
| Injection: docs → `///` | `dartDocLines` splits lines, escapes `*/`; lone-CR probe neutralised by TypeScript | sound for tested vectors | Verified [runtime] |
| Injection: inline `/* … */` comments | `emitTypeParams` and `intersection()` replace `*/` | sound | Verified [static] |
| Injection: `//` comments | `computedComment` replaces `\r?\n` (a lone `\r` would survive, but computed names come from TypeScript-normalised source); `// ERROR emitting` messages are not newline-escaped (exception text) | low residual risk, not exploitable from tested input | Observation |
| Injection: import/export URIs | not escaped | invalid code for `'`/`$` file names | CA-11 |
| Emitter control tokens | private-use code points from input are interpreted | integrity issue | CA-12 |
| Output path containment | `deriveOutputPath`, collision check | contained | Verified [static] |
| tsconfig handling | `ts-morph` project with `tsConfigFilePath`; no language-service plugins loaded | no code execution | Verified [static] |
| Dependencies, production | `pnpm audit --prod` | 9 advisories (6 high, 3 moderate), all glob ReDoS/matching | CA-20 |
| Dependencies, dev | `pnpm audit` | 53 total (3 critical: vitest UI, tinypool ×2) | CA-19 |
| CI | read workflow | tag-pinned actions, default token permissions | CA-18 |
| Published contents | `npm pack --dry-run` | 6 files, no fixtures or secrets | Verified [runtime] |

## Notes

- Third-party `.d.ts` files are effectively trusted: they come from the same package whose JavaScript the user runs. Within that model, CA-12 and CA-11 are integrity/robustness issues rather than privilege escalations.
- A malicious `.d.ts` could still make dartify emit misleading bindings, for example CA-06-style `@JS` paths. Generated bindings deserve the same review as any vendored code; the README does not say this.
