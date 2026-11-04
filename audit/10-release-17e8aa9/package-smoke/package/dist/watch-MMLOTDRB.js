import {
  ResolutionRun,
  SymbolTable,
  TranspileException,
  createPackageJsBackend,
  generateSymbols,
  isShapeCandidate,
  linkModuleExports,
  linkReferences,
  mergeSemanticResults,
  renderAllFiles,
  resolvedInputRoot,
  rewriteRedirects,
  runSemanticPassOnDraft,
  sourceFileOfFQN,
  summarizeLinks
} from "./chunk-M36KI3RN.js";

// src/watch.ts
import { mkdir, rm, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
function toForwardSlash(path) {
  return path.split("\\").join("/");
}
var WatchSession = class {
  constructor(options) {
    this.states = /* @__PURE__ */ new Map();
    this.renderCache = /* @__PURE__ */ new Map();
    this.lastWritten = /* @__PURE__ */ new Map();
    this.statementCaches = /* @__PURE__ */ new Map();
    this.built = false;
    if (!Array.isArray(options.files) || options.files.length === 0) {
      throw new TranspileException("Files array cannot be empty", "INVALID_FILES");
    }
    this.files = [...new Set(options.files)].sort();
    this.outDir = options.outDir || "./dart_out";
    this.write = options.write ?? true;
    this.backend = createPackageJsBackend(options.jsRoot ? { jsRoot: options.jsRoot } : {});
    this.run = new ResolutionRun(this.files, options.tsConfigFilePath);
  }
  /**
   * Builds, reusing every cached file the change set cannot affect. The first
   * call is a full build. `changed` lists files modified, added or deleted
   * since the previous build; omit it to rebuild everything.
   */
  async build(changed) {
    const started = performance.now();
    let mark = started;
    const lap = () => {
      const now = performance.now();
      const elapsed = now - mark;
      mark = now;
      return Math.round(elapsed * 10) / 10;
    };
    const changedFiles = changed ? new Set([...changed].map((file) => toForwardSlash(resolve(file)))) : void 0;
    if (changedFiles && this.built) {
      for (const file of changedFiles) {
        this.run.project.getSourceFile(file)?.refreshFromFileSystemSync();
      }
    }
    this.run.resolveAndCategorize();
    const programFiles = [...this.run.inputFiles, ...this.run.packageDepFiles];
    const live = new Set(programFiles.map(([file]) => file));
    const fileSetChanged = this.liveFiles === void 0 || this.liveFiles.size !== live.size || [...live].some((file) => !this.liveFiles.has(file));
    this.liveFiles = live;
    const seeds = this.seedFiles(changedFiles, live);
    const unchanged = fileSetChanged ? void 0 : new Set([...live].filter((file) => !seeds.has(file)));
    const resolution = this.run.buildResolutionReport(unchanged);
    const resolveTime = lap();
    for (const file of [...this.states.keys()]) if (!live.has(file)) this.states.delete(file);
    for (const file of [...this.statementCaches.keys()]) if (!live.has(file)) this.statementCaches.delete(file);
    const sources = new Map(programFiles);
    const dependents = /* @__PURE__ */ new Map();
    for (const [file, state] of this.states) {
      for (const dependency of state.dependencies) {
        const set = dependents.get(dependency) ?? /* @__PURE__ */ new Set();
        set.add(file);
        dependents.set(dependency, set);
      }
    }
    const scriptChanged = [...seeds].some(
      (file) => this.states.get(file)?.isScript && this.built
    );
    const dirty = /* @__PURE__ */ new Set();
    const memberChanged = /* @__PURE__ */ new Set();
    let heritageChanged = false;
    const queue = scriptChanged ? [...live] : [...seeds];
    while (queue.length > 0) {
      const file = queue.shift();
      if (dirty.has(file)) continue;
      const sourceFile = sources.get(file);
      if (!sourceFile) continue;
      dirty.add(file);
      if (!seeds.has(file) || scriptChanged) this.statementCaches.delete(file);
      let statementCache = this.statementCaches.get(file);
      if (!statementCache) this.statementCaches.set(file, statementCache = /* @__PURE__ */ new Map());
      const previous = this.states.get(file);
      const next = await this.regenerate(file, sourceFile, statementCache);
      this.states.set(file, next);
      const changedSurface = previous ? changedKeys(previous.interfaceKey, next.interfaceKey) : [...next.interfaceKey.keys()];
      const changedMembers = previous ? changedKeys(previous.memberKey, next.memberKey) : [...next.memberKey.keys()];
      changedMembers.forEach((fqn) => memberChanged.add(fqn));
      const shapeFQNs = /* @__PURE__ */ new Set([...shapesOf(previous), ...shapesOf(next)]);
      if ([...changedMembers, ...changedSurface].some((fqn) => shapeFQNs.has(fqn))) {
        heritageChanged = true;
      }
      if (previous && changedKeys(previous.heritageKey, next.heritageKey).length > 0) {
        heritageChanged = true;
      }
      if (changedSurface.length > 0 || next.isScript) {
        const names = namesOf(changedSurface);
        for (const dependent of dependents.get(file) ?? []) {
          if (dirty.has(dependent)) continue;
          const tokens = this.states.get(dependent)?.tokens;
          if (!tokens || [...names].some((name) => tokens.has(name))) queue.push(dependent);
        }
        if (next.isScript && this.built) {
          for (const other of live) if (!dirty.has(other)) queue.push(other);
        }
      }
    }
    const generateTime = lap();
    const table = /* @__PURE__ */ new Map();
    const namespaceExports = /* @__PURE__ */ new Map();
    const moduleExportTable = /* @__PURE__ */ new Map();
    for (const [file, state] of this.states) {
      for (const [fqn, group] of state.groups) table.set(fqn, group);
      if (state.namespaceAliases) namespaceExports.set(file, state.namespaceAliases);
      if (state.moduleExports.length > 0) moduleExportTable.set(file, state.moduleExports);
    }
    const dirtyGroups = /* @__PURE__ */ new Map();
    for (const file of dirty) {
      for (const [fqn, group] of this.states.get(file)?.groups ?? []) dirtyGroups.set(fqn, group);
    }
    const redirects = /* @__PURE__ */ new Map();
    for (const state of this.states.values()) {
      for (const redirect of state.semantic.report.redirects) {
        redirects.set(redirect.fromFQN, redirect.toFQN);
      }
    }
    rewriteRedirects(dirtyGroups, redirects);
    const linked = linkReferences(dirtyGroups, table, namespaceExports);
    for (const file of dirty) {
      const state = this.states.get(file);
      if (!state) continue;
      state.edges = /* @__PURE__ */ new Map();
      state.linkDiagnostics = [];
    }
    for (const [fqn, edges] of linked.edgesByFQN) {
      this.states.get(sourceFileOfFQN(fqn))?.edges.set(fqn, edges);
    }
    for (const diagnostic of linked.diagnostics) {
      this.states.get(sourceFileOfFQN(diagnostic.ownerFQN))?.linkDiagnostics.push(diagnostic);
    }
    const allEdges = /* @__PURE__ */ new Map();
    const linkDiagnostics = [];
    const generation = [];
    for (const state of this.states.values()) {
      for (const [fqn, edges] of state.edges) allEdges.set(fqn, edges);
      linkDiagnostics.push(...state.linkDiagnostics);
      generation.push(...state.generation);
    }
    linkDiagnostics.sort(
      (a, b) => `${a.ownerFQN}\0${a.writtenName}`.localeCompare(`${b.ownerFQN}\0${b.writtenName}`)
    );
    const semantic = mergeSemanticResults([...this.states.values()].map((state) => state.semantic));
    const report = summarizeLinks(allEdges, linkDiagnostics, table.keys(), semantic);
    const moduleExports = linkModuleExports(moduleExportTable, table.keys());
    report.moduleExportDiagnostics = [...moduleExports.diagnostics];
    const program = { symbols: table, namespaceExports, moduleExports, report };
    const linkTime = lap();
    const inputRoot = resolvedInputRoot(resolution.inputFiles);
    const multiLibrary = this.states.size > 1;
    const renderDirty = this.wasMultiLibrary === void 0 || this.wasMultiLibrary !== multiLibrary || heritageChanged ? new Set(live) : /* @__PURE__ */ new Set([...dirty, ...heritageDependents(table, memberChanged)]);
    this.wasMultiLibrary = multiLibrary;
    const files = renderAllFiles(program, this.outDir, inputRoot, false, this.backend, {
      dirty: renderDirty,
      cache: this.renderCache
    });
    const renderTime = lap();
    const written = [];
    const removed = [];
    if (this.write && generation.length === 0) {
      for (const [outputPath, file] of files) {
        if (this.lastWritten.get(outputPath) === file.content) continue;
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, file.content, "utf-8");
        this.lastWritten.set(outputPath, file.content);
        written.push(outputPath);
      }
      for (const outputPath of [...this.lastWritten.keys()]) {
        if (files.has(outputPath)) continue;
        await rm(outputPath, { force: true });
        this.lastWritten.delete(outputPath);
        removed.push(outputPath);
      }
    }
    const writeTime = lap();
    this.built = true;
    return {
      analysis: { resolution, generation, link: report },
      program,
      files,
      rebuilt: [...dirty].sort(),
      written: written.sort(),
      removed: removed.sort(),
      timings: {
        resolve: resolveTime,
        generate: generateTime,
        link: linkTime,
        render: renderTime,
        write: writeTime,
        total: Math.round((performance.now() - started) * 10) / 10
      }
    };
  }
  /** Files to regenerate first: changed or new files; everything on the first build. */
  seedFiles(changed, live) {
    if (!changed || !this.built) return new Set(live);
    const seeds = /* @__PURE__ */ new Set();
    for (const file of live) if (!this.states.has(file) || changed.has(file)) seeds.add(file);
    for (const file of changed) {
      if (live.has(file) || !this.states.has(file)) continue;
      for (const [other, state] of this.states) {
        if (live.has(other) && state.dependencies.has(file)) seeds.add(other);
      }
    }
    return seeds;
  }
  async regenerate(file, sourceFile, statementCache) {
    const table = new SymbolTable();
    const namespaceExports = /* @__PURE__ */ new Map();
    const moduleExports = /* @__PURE__ */ new Map();
    const freshFQNs = /* @__PURE__ */ new Set();
    const generation = await generateSymbols(file, sourceFile, table, namespaceExports, moduleExports, {
      statementCache,
      freshFQNs
    });
    const groups = table.release();
    const semantic = runSemanticPassOnDraft(groups);
    const keys = fingerprints(groups, semantic, this.states.get(file), freshFQNs);
    return {
      groups,
      semantic,
      ...namespaceExports.get(file) ? { namespaceAliases: namespaceExports.get(file) } : {},
      moduleExports: moduleExports.get(file) ?? [],
      generation,
      edges: /* @__PURE__ */ new Map(),
      linkDiagnostics: [],
      dependencies: new Set(
        sourceFile.getReferencedSourceFiles().map((referenced) => toForwardSlash(referenced.getFilePath()))
      ),
      isScript: !isModule(sourceFile),
      interfaceKey: keys.interfaceKey,
      memberKey: keys.memberKey,
      heritageKey: keys.heritageKey,
      lightKey: keys.lightKey,
      fileKey: keys.fileKey,
      tokens: new Set(sourceFile.getFullText().match(/[A-Za-z_$][\w$]*/g) ?? [])
    };
  }
};
function stripVolatile(key, value) {
  return key === "loc" || key === "jsDoc" || key === "resolvedFQN" || key === "resolvedDartName" ? void 0 : value;
}
function fingerprints(groups, semantic, previous, fresh) {
  const interfaceKey = /* @__PURE__ */ new Map();
  const memberKey = /* @__PURE__ */ new Map();
  const heritageKey = /* @__PURE__ */ new Map();
  const lightKey = /* @__PURE__ */ new Map();
  const fileKey = JSON.stringify([
    [...groups.keys()].filter((fqn) => groups.get(fqn).some((symbol) => symbol.minted)),
    semantic.report.redirects
  ]);
  const reusable = previous !== void 0 && fresh !== void 0 && previous.fileKey === fileKey;
  for (const fqn of [...groups.keys()].sort()) {
    const light = JSON.stringify(
      groups.get(fqn).map(
        (symbol) => symbol.facets.map((facet) => [facet.ir.kind, facet.ir.dartName, facet.ir.jsName, facet.emit, facet.namespace])
      )
    );
    lightKey.set(fqn, light);
    if (reusable && !fresh.has(fqn) && previous.lightKey.get(fqn) === light && previous.memberKey.has(fqn)) {
      interfaceKey.set(fqn, previous.interfaceKey.get(fqn));
      memberKey.set(fqn, previous.memberKey.get(fqn));
      const heritage = previous.heritageKey.get(fqn);
      if (heritage !== void 0) heritageKey.set(fqn, heritage);
      continue;
    }
    const surface = [];
    for (const symbol of groups.get(fqn)) {
      for (const facet of symbol.facets) {
        const ir = facet.ir;
        const common = {
          fqn,
          kind: ir.kind,
          namespace: facet.namespace,
          emit: facet.emit,
          synthetic: facet.synthetic,
          dartName: ir.dartName,
          jsName: ir.jsName,
          typeParams: ir.typeParams,
          scopes: facet.origin.scopes,
          fileIsModule: facet.origin.fileIsModule
        };
        if (ir.kind === "class" || ir.kind === "interface") {
          heritageKey.set(fqn, JSON.stringify([ir.extends, ir.implements], stripVolatile));
          surface.push({
            ...common,
            isAbstract: ir.isAbstract,
            extends: ir.extends,
            implements: ir.implements,
            // Only what the callable-interface/typedef decision reads.
            shape: ["callSignatures", "constructSignatures", "indexSignatures", "constructors"].map(
              (list) => (ir[list]?.length ?? 0) > 0
            ).concat(
              ["properties", "methods", "getAccessors", "setAccessors"].some(
                (list) => (ir[list]?.length ?? 0) > 0
              )
            )
          });
        } else {
          surface.push({ ...common, ir });
        }
      }
    }
    interfaceKey.set(fqn, JSON.stringify(surface, stripVolatile));
    memberKey.set(
      fqn,
      JSON.stringify(groups.get(fqn).map((symbol) => symbol.facets.map((facet) => facet.ir)), stripVolatile)
    );
  }
  for (const redirect of semantic.report.redirects) {
    interfaceKey.set(`redirect:${redirect.fromFQN}`, redirect.toFQN);
  }
  return { interfaceKey, memberKey, heritageKey, lightKey, fileKey };
}
function shapesOf(state) {
  if (!state) return [];
  const result = [];
  for (const [fqn, group] of state.groups) {
    if (group.some((symbol) => symbol.facets.some(isShapeCandidate))) result.push(fqn);
  }
  return result;
}
function changedKeys(before, after) {
  const changed = [];
  for (const [key, value] of after) if (before.get(key) !== value) changed.push(key);
  for (const key of before.keys()) if (!after.has(key)) changed.push(key);
  return changed;
}
function namesOf(fqns) {
  const names = /* @__PURE__ */ new Set();
  for (const raw of fqns) {
    for (const fqn of raw.replace(/^redirect:/, "").split(" ")) {
      const logical = fqn.slice(fqn.indexOf("::") + 2);
      for (const segment of logical.split("|")) names.add(segment.replace(/['"]/g, ""));
    }
  }
  return names;
}
function heritageDependents(table, changed) {
  if (changed.size === 0) return /* @__PURE__ */ new Set();
  const children = /* @__PURE__ */ new Map();
  for (const [fqn, group] of table) {
    for (const symbol of group) {
      for (const facet of symbol.facets) {
        const ir = facet.ir;
        if (ir.kind !== "class" && ir.kind !== "interface") continue;
        const parents = [
          ...Array.isArray(ir.extends) ? ir.extends : ir.extends ? [ir.extends] : [],
          ...ir.implements ?? []
        ];
        for (const parent of parents) {
          const target = parent.reference?.resolvedFQN;
          if (!target) continue;
          const list = children.get(target) ?? [];
          list.push(fqn);
          children.set(target, list);
        }
      }
    }
  }
  const result = /* @__PURE__ */ new Set();
  const queue = [...changed];
  const seen = new Set(queue);
  while (queue.length > 0) {
    const fqn = queue.pop();
    for (const child of children.get(fqn) ?? []) {
      if (seen.has(child)) continue;
      seen.add(child);
      result.add(sourceFileOfFQN(child));
      queue.push(child);
    }
  }
  return result;
}
function isModule(sourceFile) {
  const node = sourceFile.compilerNode;
  return node.externalModuleIndicator !== void 0;
}
export {
  WatchSession
};
