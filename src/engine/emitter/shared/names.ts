import { IRBindingName } from "@ir/node";
import { stripQuotes } from "@/utils/utils";

export function dartName(binding: IRBindingName): string {
  return binding.dartName ?? binding.name;
}

export function jsName(binding: IRBindingName): string {
  return binding.jsName ?? binding.name;
}

export function qualifiedJsName(
  binding: IRBindingName,
  prefix: string,
): string {
  return stripQuotes(`${prefix}${jsName(binding)}`);
}

/** Emits a member annotation only when Dart and JavaScript spellings differ. */
export function renamedMemberAnnotation(
  binding: IRBindingName,
  indent = "  ",
): string[] {
  return dartName(binding) === jsName(binding)
    ? []
    : [`${indent}@JS("${jsName(binding)}")`];
}

export function memberJsAnnotation(
  binding: IRBindingName,
  indent = "  ",
): string {
  return `${indent}@JS("${jsName(binding)}")`;
}
