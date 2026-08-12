import { IRBindingName } from "@ir/node";
import { stripQuotes } from "@/utils/utils";

export function dartName(binding: IRBindingName): string {
  return binding.dartName ?? binding.name;
}

export function jsName(binding: IRBindingName): string {
  return binding.jsName ?? binding.name;
}

export function isComputedMember(binding: IRBindingName): boolean {
  const name = jsName(binding);
  return name.startsWith("[") && name.endsWith("]");
}

export function isRenamedBinding(binding: IRBindingName): boolean {
  return dartName(binding) !== jsName(binding);
}

export function staticClassBindingName(
  owner: IRBindingName,
  member: IRBindingName,
): string {
  return `${dartName(owner)}_${dartName(member)}`;
}

export function unsupportedComputedMemberComment(
  binding: IRBindingName,
  indent = "  ",
): string {
  return `${indent}// Unsupported computed JavaScript member preserved in IR: ${jsName(binding)}`;
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
