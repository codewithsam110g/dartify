import { IRType, TypeKind } from "../../../ir/type";

export function emitType(type: IRType): string {
  switch (type.kind) {
    // Primitives
    case TypeKind.Undefined:
    case TypeKind.Unknown:
    case TypeKind.Never:
    case TypeKind.Any:
      return "dynamic";
    case TypeKind.String:
      return "String";
    case TypeKind.Number:
      return "num";
    case TypeKind.BigInt:
      return "BigInt";
    case TypeKind.Boolean:
      return "bool";

    // Literals
    case TypeKind.StringLiteral:
      return "String";
    case TypeKind.NumberLiteral:
      return "num";
    case TypeKind.BooleanLiteral:
      return "bool";

    // Array
    case TypeKind.Array:
      return "List<" + emitType(type.elementType!) + ">";

    // TypeReference
    case TypeKind.TypeReference: {
      if (type.genericArgs!.length > 0) {
        let internalString: string[] = [];
        type.genericArgs!.forEach((e) => {
          internalString.push(emitType(e));
        });
        if (type.name == "Array") {
          return "List<" + internalString.join(",") + ">";
        } else if (type.name == "Promise") {
          return "Future<" + internalString.join(",") + ">";
        } else {
          return type.name + "<" + internalString.join(",") + ">";
        }
      } else {
        if (type.name == "Date") {
          return "DateTime";
        }
        return type.name;
      }
    }

    // Unions
    case TypeKind.Union: {
      if (type.unionTypes!.length > 1) {
        return (
          "dynamic " +
          "/*" +
          type.unionTypes!.map((e) => emitType(e)).join("|") +
          "*/"
        );
      } else {
        if (type.isNullable) {
          return emitType(type.unionTypes![0]) + "?";
        } else {
          return emitType(type.unionTypes![0]);
        }
      }
    }

    // Tuples
    case TypeKind.Tuple: {
      const elementSet = new Set(type.tupleTypes!.map((e) => emitType(e)));

      if (elementSet.size == 0) {
        return "List<dynamic>";
      } else if (elementSet.size == 1) {
        return "List<" + [...elementSet][0] + ">";
      } else {
        return "List<dynamic>";
      }
    }

    // Function
    case TypeKind.Function: {
      const retType = emitType(type.returnType!);
      const parameters: string[] = [];
      type.parameters!.forEach((param) => {
        let mainString = emitType(param.type);
        if (mainString == "dynamic") {
          return "dynamic";
        }
        if (param.isOptional) {
          mainString = mainString + "?";
        }
        if (param.isRestParameter) {
          // It is already processed as T[] from parser
          mainString = mainString.slice(0, -1);
        }
        parameters.push(mainString);
      });
      return retType + " Function(" + parameters.join(", ") + ")";
    }

    default:
      return "dynamic";
  }
}
