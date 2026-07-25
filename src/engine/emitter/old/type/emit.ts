import { IRType, TypeKind } from "@ir/type";

export function emitType(type: IRType): string {
  // 1. Calculate the base Dart type string, assuming it's non-nullable for now.
  let baseType: string;

  switch (type.kind) {
    // Primitives
    case TypeKind.Any:
    case TypeKind.Unknown:
    case TypeKind.Never:
    case TypeKind.Undefined:
      baseType = "dynamic";
      break;

    case TypeKind.String:
    case TypeKind.StringLiteral:
      baseType = "String";
      break;

    case TypeKind.Number:
    case TypeKind.NumberLiteral:
      baseType = "num";
      break;

    case TypeKind.BigInt:
      baseType = "BigInt";
      break;

    case TypeKind.Boolean:
    case TypeKind.BooleanLiteral:
      baseType = "bool";
      break;

    case TypeKind.Void:
      baseType = "void";
      break;

    // Bare `null` in type position (`T-07`, js_facade_gen §1.10). Returned
    // directly: `Null?` is not a thing, and the nullability pass below would
    // otherwise append one since this node is nullable by construction.
    case TypeKind.Null:
      return "Null";

    // Array
    case TypeKind.Array:
      baseType = "List<" + emitType(type.elementType!) + ">";
      break;

    // TypeReference (Generics)
    case TypeKind.TypeReference: {
      let typeName = type.name;
      if (typeName === "Array") typeName = "List";
      // Dart has no read-only list type, so this collapses to List the same
      // way `readonly T[]` does — js_facade_gen §14.4 (`T-07`).
      if (typeName === "ReadonlyArray") typeName = "List";
      if (typeName === "Promise") typeName = "Future";
      if (typeName === "Date") typeName = "DateTime";

      if (type.genericArgs && type.genericArgs.length > 0) {
        const args = type.genericArgs.map(emitType).join(", ");
        baseType = `${typeName}<${args}>`;
      } else {
        baseType = typeName;
      }
      break;
    }

    // Unions (Now correctly assumes null has been filtered out by the parser)
    case TypeKind.Union: {
      const uniqueNames = [
        ...new Set(type.unionTypes!.map((e) => emitType(e))),
      ];

      if (uniqueNames.length > 1) {
        return (
          "dynamic " +
          "/* " +
          type.unionTypes!.map((e) => emitType(e)).join("|") +
          " */"
        );
      } else {
        const only = emitType(type.unionTypes![0]);
        // `dynamic?` is not valid Dart — dynamic already admits null (`E-17`).
        // This branch returns early, so it has to repeat the guard applied to
        // `baseType` at the end of the function rather than inherit it.
        if (type.isNullable && !isDynamicLike(only) && only !== "void") {
          return `${only}?`;
        }
        return only;
      }
    }

    // Tuples
    case TypeKind.Tuple: {
      const elementTypes = type.tupleTypes!.map(emitType);
      const uniqueTypes = new Set(elementTypes);

      if (uniqueTypes.size === 0) {
        baseType = "List<dynamic>";
      } else if (uniqueTypes.size === 1) {
        baseType = `List<${[...uniqueTypes][0]}>`;
      } else {
        baseType = `List<dynamic>`;
      }
      break;
    }

    // Function
    case TypeKind.Function: {
      const retType = emitType(type.returnType!);
      const requiredParams: string[] = [];
      const optionalParams: string[] = [];

      type.parameters!.forEach((param) => {
        let mainString = emitType(param.type);

        if (mainString === "dynamic") {
          mainString = "dynamic"; // ensure dynamic stays in place
        }

        if (param.isOptional) {
          optionalParams.push(mainString);
        } else {
          requiredParams.push(mainString);
        }
      });

      let paramString = requiredParams.join(", ");
      if (optionalParams.length > 0) {
        if (paramString.length > 0) {
          paramString += ", ";
        }
        paramString += `[${optionalParams.join(", ")}]`;
      }

      baseType = `${retType} Function(${paramString})`;
      break;
    }
    
    // Something with no Dart representation. The linker has usually minted a
    // documented typedef for it and pointed `aliasName` at it (`E-16`), which
    // is what `originalText` and `unsupportedReason` are preserved for. Bare
    // `dynamic` remains the answer when emitting an IR the linker never saw —
    // unit tests calling `emitType` directly, and the alias declaration's own
    // right-hand side, which must not refer to itself.
    case TypeKind.Unsupported:
      // Returned directly, like `Null` above: a minted alias is a typedef for
      // `dynamic`, so `KeyOfBoxString?` is exactly as invalid as `dynamic?`
      // (`E-17`). The nullability of the original expression is already
      // subsumed — `dynamic` admits null.
      return type.aliasName ?? "dynamic";

    // Intersections: `Foo & Bar` *is* a `Foo`, so the first member is a real
    // supertype and strictly more useful than `dynamic` — the reader gets
    // `Foo`'s API instead of nothing. `js_facade_gen` §5.3 does the same. The
    // comment keeps the discarded members on the record (principle 1).
    //
    // Note this is deliberately *not* a minted alias. A named `dynamic` would
    // satisfy principle 2 to the letter while telling the reader less than the
    // supertype does; naming beats anonymity, but a usable type beats both.
    //
    // The *first* member as written, not the most specific one. `any & Foo` is
    // `any` in TypeScript, so promoting `Foo` out of it would hand callers a
    // `Foo` API over a value the source never promised was one.
    case TypeKind.Intersection: {
      const members = type.intersectionTypes!.map(emitType);
      const unique = [...new Set(members)];

      // Deduped in the comment as well as the test — the sibling union branch
      // computes its unique set and then joins the original list anyway
      // (`E-18`), and repeating that here would be repeating a known defect.
      baseType =
        unique.length === 1
          ? unique[0]
          : `${members[0]} /* ${unique.join("&")} */`;
      break;
    }

    // Default fallback for unhandled TypeLiterals, etc.
    default:
      baseType = "dynamic";
      break;
  }

  // 2. The Final Check: Apply the top-level nullability modifier.
  // This handles cases like `(string | null)[]` -> `List<String?>`
  // or `Promise<string | null>` -> `Future<String?>`.
  // And most importantly, simple `string | null` -> `String?`.
  if (type.isNullable && !isDynamicLike(baseType) && baseType !== "void") {
    return `${baseType}?`;
  }

  return baseType;
}

/**
 * Whether an emitted type already admits null, and so must not take a `?`.
 *
 * The commented form is why this is not an equality check. A nullable union of
 * two representable members emits `dynamic` followed by a trailing block
 * comment naming them, which is not string-equal to `"dynamic"`. The original
 * `E-17` guard compared for exact equality and let that through, producing a
 * commented `dynamic` with a `?` stuck on the end — uncompilable, and live in
 * three.js output until S1.9 surfaced it.
 */
function isDynamicLike(emitted: string): boolean {
  return emitted === "dynamic" || emitted.startsWith("dynamic /*");
}
