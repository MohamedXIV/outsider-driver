import { Compiler } from 'inkjs/full';
import { validateInkSourceContract } from './InkSourceContract';

export class InkCompilationError extends Error {
  public readonly causeValue: unknown;

  public constructor(causeValue: unknown) {
    super(
      causeValue instanceof Error
        ? `Ink compilation failed: ${causeValue.message}`
        : 'Ink compilation failed.',
    );
    this.name = 'InkCompilationError';
    this.causeValue = causeValue;
  }
}

export interface CompiledInkStory {
  readonly json: string;
  readonly declaredExternals: readonly string[];
}

export function compileInkSource(source: string): CompiledInkStory {
  const declaredExternals = validateInkSourceContract(source);

  try {
    const story = new Compiler(source).Compile();
    const json = story.ToJson();

    if (typeof json !== 'string' || json.length === 0) {
      throw new Error('inkjs produced empty compiled story JSON.');
    }

    return {
      json,
      declaredExternals,
    };
  } catch (error: unknown) {
    throw new InkCompilationError(error);
  }
}
