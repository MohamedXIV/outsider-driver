import {
  NarrativeExternalFunctionSchema,
  type NarrativeExternalFunction,
} from './contracts/NarrativeBoundary';

const externalDeclarationPattern =
  /^\s*EXTERNAL\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm;

export class InkSourceContractError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'InkSourceContractError';
  }
}

export function getDeclaredInkExternals(
  source: string,
): readonly string[] {
  const declarations: string[] = [];

  for (const match of source.matchAll(externalDeclarationPattern)) {
    const name = match[1];

    if (name !== undefined) {
      declarations.push(name);
    }
  }

  return declarations;
}

export function validateInkSourceContract(
  source: string,
): readonly NarrativeExternalFunction[] {
  const declarations = getDeclaredInkExternals(source);
  const unique = new Set<string>();

  for (const declaration of declarations) {
    if (unique.has(declaration)) {
      throw new InkSourceContractError(
        `Ink external is declared more than once: ${declaration}`,
      );
    }

    unique.add(declaration);

    const parsed = NarrativeExternalFunctionSchema.safeParse(declaration);

    if (!parsed.success) {
      throw new InkSourceContractError(
        `Ink source declares unsupported game external: ${declaration}`,
      );
    }
  }

  return declarations.map((declaration) =>
    NarrativeExternalFunctionSchema.parse(declaration),
  );
}
