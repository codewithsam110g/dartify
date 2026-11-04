import { readFileSync } from "fs";
import { resolve } from "path";

/** One input/output pair from `def_files/js_facade_gen_test_cases.md`. */
export interface ConformanceCase {
  /** `1.9`, or `1.9#2` for the second pair in a section. */
  id: string;
  title: string;
  typescript: string;
  /** Undefined when the reference tool emits nothing (§12.2). */
  dart?: string;
}

/**
 * Extracts every TypeScript → Dart pair from the reference document. A
 * section may hold several pairs; a TypeScript block with no following Dart
 * block expects empty output.
 */
export function loadConformanceCases(
  path = resolve("def_files/js_facade_gen_test_cases.md"),
): ConformanceCase[] {
  const text = readFileSync(path, "utf8");
  const cases: ConformanceCase[] = [];
  const sections = text.split(/^### /m).slice(1);
  for (const section of sections) {
    const heading = section.split("\n")[0].trim();
    const match = heading.match(/^(\d+\.\d+)\s+(.*)$/);
    if (!match) continue;
    const [, number, title] = match;
    const blocks = [...section.matchAll(/```(typescript|dart)\n([\s\S]*?)```/g)].map((block) => ({
      language: block[1],
      body: block[2],
    }));
    let pair = 0;
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];
      if (block.language !== "typescript") continue;
      const next = blocks[index + 1];
      pair++;
      cases.push({
        id: pair === 1 ? number : `${number}#${pair}`,
        title,
        typescript: block.body,
        ...(next?.language === "dart" ? { dart: next.body } : {}),
      });
    }
  }
  return cases;
}
