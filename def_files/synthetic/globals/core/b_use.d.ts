// Another file using the augmented lib types: Array<string> is still a Dart
// List<String>, String a Dart String.
declare function joinAll(parts: Array<string>, extra: ReadonlyArray<number>): string;
declare function shoutAll(parts: Array<string>): string[];
declare function describe(text: String): string;
