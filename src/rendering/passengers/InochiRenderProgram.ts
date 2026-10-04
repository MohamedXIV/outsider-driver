import type {
  InochiDrawCommand,
  InochiDrawFrame,
  InochiMaskMode,
} from './InochiRuntimeContracts';
import { validateInochiDrawFrame } from './InochiWasmAbi';

export type InochiRenderOperation =
  | {
      readonly kind: 'draw';
      readonly commandIndex: number;
      readonly command: InochiDrawCommand;
      readonly activeMaskLayerIds: readonly number[];
      readonly compositeDepth: number;
    }
  | {
      readonly kind: 'define-mask';
      readonly layerId: number;
      readonly commandIndex: number;
      readonly command: InochiDrawCommand;
      readonly parentMaskLayerIds: readonly number[];
      readonly compositeDepth: number;
    }
  | {
      readonly kind: 'push-mask';
      readonly layerId: number;
      readonly mode: InochiMaskMode;
      readonly compositeDepth: number;
    }
  | {
      readonly kind: 'pop-mask';
      readonly layerId: number;
      readonly compositeDepth: number;
    }
  | {
      readonly kind: 'composite-begin';
      readonly depth: number;
    }
  | {
      readonly kind: 'composite-end';
      readonly depth: number;
    }
  | {
      readonly kind: 'composite-blit';
      readonly commandIndex: number;
      readonly command: InochiDrawCommand;
      readonly activeMaskLayerIds: readonly number[];
      readonly targetCompositeDepth: number;
    };

export interface InochiRenderProgram {
  readonly frame: InochiDrawFrame;
  readonly operations: readonly InochiRenderOperation[];
  readonly maskLayerCount: number;
  readonly maximumMaskDepth: number;
  readonly maximumCompositeDepth: number;
}

function requireStateOnlyCommand(
  command: InochiDrawCommand,
  state: InochiDrawCommand['state'],
): void {
  if (command.elementCount !== 0) {
    throw new Error(
      `Inochi ${state} command must not contain drawable elements.`,
    );
  }
}

export function compileInochiRenderProgram(
  frameInput: InochiDrawFrame,
): InochiRenderProgram {
  const frame = validateInochiDrawFrame(frameInput);
  const operations: InochiRenderOperation[] = [];
  const activeMasks: number[] = [];
  let pendingMaskLayerId: number | null = null;
  let nextMaskLayerId = 0;
  let compositeDepth = 0;
  let awaitingCompositeBlit = false;
  let maximumMaskDepth = 0;
  let maximumCompositeDepth = 0;

  for (const [commandIndex, command] of frame.commands.entries()) {
    switch (command.state) {
      case 'normal':
        operations.push({
          kind: 'draw',
          commandIndex,
          command,
          activeMaskLayerIds: [...activeMasks],
          compositeDepth,
        });
        continue;

      case 'define-mask': {
        // Inochi explicitly permits mask definitions between a
        // composite-end and its following composite-blit.
        if (pendingMaskLayerId === null) {
          pendingMaskLayerId = nextMaskLayerId;
          nextMaskLayerId += 1;
        }

        operations.push({
          kind: 'define-mask',
          layerId: pendingMaskLayerId,
          commandIndex,
          command,
          parentMaskLayerIds: [...activeMasks],
          compositeDepth,
        });
        continue;
      }

      case 'push-mask':
        requireStateOnlyCommand(command, command.state);

        if (pendingMaskLayerId === null) {
          throw new Error(
            'Inochi push-mask command has no preceding mask definition.',
          );
        }

        operations.push({
          kind: 'push-mask',
          layerId: pendingMaskLayerId,
          mode: command.maskMode,
          compositeDepth,
        });
        activeMasks.push(pendingMaskLayerId);
        maximumMaskDepth = Math.max(
          maximumMaskDepth,
          activeMasks.length,
        );
        pendingMaskLayerId = null;
        continue;

      case 'pop-mask': {
        requireStateOnlyCommand(command, command.state);
        const layerId = activeMasks.pop();

        if (layerId === undefined) {
          throw new Error(
            'Inochi pop-mask command has no active mask layer.',
          );
        }

        operations.push({
          kind: 'pop-mask',
          layerId,
          compositeDepth,
        });
        continue;
      }

      case 'composite-begin':
        requireStateOnlyCommand(command, command.state);

        if (awaitingCompositeBlit) {
          throw new Error(
            'Inochi cannot begin a new composite before the previous composite is blitted.',
          );
        }

        compositeDepth += 1;
        maximumCompositeDepth = Math.max(
          maximumCompositeDepth,
          compositeDepth,
        );
        operations.push({
          kind: 'composite-begin',
          depth: compositeDepth,
        });
        continue;

      case 'composite-end':
        requireStateOnlyCommand(command, command.state);

        if (compositeDepth === 0) {
          throw new Error(
            'Inochi composite-end command has no active composite.',
          );
        }

        operations.push({
          kind: 'composite-end',
          depth: compositeDepth,
        });
        compositeDepth -= 1;
        awaitingCompositeBlit = true;
        continue;

      case 'composite-blit':
        if (!awaitingCompositeBlit) {
          throw new Error(
            'Inochi composite-blit command has no completed composite to blit.',
          );
        }

        operations.push({
          kind: 'composite-blit',
          commandIndex,
          command,
          activeMaskLayerIds: [...activeMasks],
          targetCompositeDepth: compositeDepth,
        });
        awaitingCompositeBlit = false;
        continue;
    }
  }

  if (pendingMaskLayerId !== null) {
    throw new Error(
      'Inochi render program ended with an unpushed mask definition.',
    );
  }

  if (activeMasks.length > 0) {
    throw new Error(
      'Inochi render program ended with active mask layers.',
    );
  }

  if (compositeDepth !== 0 || awaitingCompositeBlit) {
    throw new Error(
      'Inochi render program ended with an incomplete composite.',
    );
  }

  return {
    frame,
    operations,
    maskLayerCount: nextMaskLayerId,
    maximumMaskDepth,
    maximumCompositeDepth,
  };
}
