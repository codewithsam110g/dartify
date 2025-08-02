import * as ts from "ts-morph";
import { IRType } from "../../../ir/type";
import { parseType } from "../../../type/parser/type";

export function processInterfaceStmtTypes(
  node: ts.InterfaceDeclaration,
  typeMap: Map<string, IRType>,
  modulePrefix: string,
): void {
  const interfaceName = node.getName();
  const fullName = modulePrefix + interfaceName;

  let constructorCount = 0;

  // Process interface properties
  for (const member of node.getMembers()) {
    if (ts.Node.isPropertySignature(member)) {
      const typeNode = member.getTypeNode();
      if (typeNode) {
        const irType = parseType(typeNode);
        const memberKey = `${fullName}.${member.getName()}`;
        typeMap.set(memberKey, irType);
      }
    } else if (ts.Node.isMethodSignature(member)) {
      const typeNode = member.getReturnTypeNode();
      if (typeNode) {
        const irType = parseType(typeNode);
        const memberKey = `${fullName}.${member.getName()}`;
        typeMap.set(memberKey, irType);
      }

      // Process parameters
      for (const param of member.getParameters()) {
        const paramTypeNode = param.getTypeNode();
        if (paramTypeNode) {
          const irType = parseType(paramTypeNode);
          const paramKey = `${fullName}.${member.getName()}.param.${param.getName()}`;
          typeMap.set(paramKey, irType);
        }
      }
    } else if (ts.Node.isConstructSignatureDeclaration(member)) {
      const typeNode = member.getReturnTypeNode();
      if (typeNode) {
        const irType = parseType(typeNode);
        const memberKey = `${fullName}.constructor_${constructorCount++}`;
        typeMap.set(memberKey, irType);
      }

      // Process parameters
      for (const param of member.getParameters()) {
        const paramTypeNode = param.getTypeNode();
        if (paramTypeNode) {
          const irType = parseType(paramTypeNode);
          const paramKey = `${fullName}.constructor_${constructorCount++}.param.${param.getName()}`;
          typeMap.set(paramKey, irType);
        }
      }
    } else if (ts.Node.isGetAccessorDeclaration(member)) {
      let name = member.getName();
      let irType = parseType(member.getReturnTypeNode());
      const getKey = `${fullName}.get.${name}`;
      typeMap.set(getKey, irType);
    } else if (ts.Node.isSetAccessorDeclaration(member)) {
      let name = member.getName();
      let param = member.getParameters()[0];
      const irType = parseType(param.getTypeNode());
      const setKey = `${fullName}.set.${param.getName()}`;
      typeMap.set(setKey, irType);
    }
  }
}
