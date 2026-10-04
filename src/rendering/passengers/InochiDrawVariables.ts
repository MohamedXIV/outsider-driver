import type { InochiDrawCommand } from './InochiRuntimeContracts';

export const INOCHI_PART_TYPE_ID = 0x0101 as const;
export const INOCHI_ANIMATED_PART_TYPE_ID = 0x0201 as const;
export const INOCHI_COMPOSITE_TYPE_ID = 0x0301 as const;

export interface InochiPartVariables {
  readonly tint: readonly [number, number, number];
  readonly screenTint: readonly [number, number, number];
  readonly opacity: number;
  readonly emissionStrength: number;
}

export interface InochiCompositeVariables {
  readonly tint: readonly [number, number, number];
  readonly screenTint: readonly [number, number, number];
  readonly opacity: number;
}

function readVec3(
  view: DataView,
  byteOffset: number,
): readonly [number, number, number] {
  return [
    view.getFloat32(byteOffset, true),
    view.getFloat32(byteOffset + 4, true),
    view.getFloat32(byteOffset + 8, true),
  ];
}

function requireFiniteUnitInterval(
  value: number,
  label: string,
): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Inochi ${label} must be finite.`);
  }

  return value;
}

export function isInochiPartType(typeId: number): boolean {
  return (
    typeId === INOCHI_PART_TYPE_ID ||
    typeId === INOCHI_ANIMATED_PART_TYPE_ID
  );
}

export function parseInochiPartVariables(
  command: InochiDrawCommand,
): InochiPartVariables {
  if (!isInochiPartType(command.type)) {
    throw new Error(
      `Inochi draw command type is not a supported Part variant: 0x${command.type.toString(16)}`,
    );
  }

  const view = new DataView(
    command.variables.buffer,
    command.variables.byteOffset,
    command.variables.byteLength,
  );

  return {
    tint: readVec3(view, 0),
    screenTint: readVec3(view, 12),
    opacity: requireFiniteUnitInterval(
      view.getFloat32(28, true),
      'part opacity',
    ),
    emissionStrength: requireFiniteUnitInterval(
      view.getFloat32(32, true),
      'part emission strength',
    ),
  };
}

export function parseInochiCompositeVariables(
  command: InochiDrawCommand,
): InochiCompositeVariables {
  if (command.type !== INOCHI_COMPOSITE_TYPE_ID) {
    throw new Error(
      `Inochi draw command type is not Composite: 0x${command.type.toString(16)}`,
    );
  }

  const view = new DataView(
    command.variables.buffer,
    command.variables.byteOffset,
    command.variables.byteLength,
  );

  return {
    tint: readVec3(view, 0),
    screenTint: readVec3(view, 12),
    opacity: requireFiniteUnitInterval(
      view.getFloat32(28, true),
      'composite opacity',
    ),
  };
}
