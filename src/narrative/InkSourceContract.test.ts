import { describe, expect, it } from 'vitest';
import {
  InkSourceContractError,
  validateInkSourceContract,
} from './InkSourceContract';

describe('Ink source contract', () => {
  it('rejects narrative code that tries to call an unsupported game capability', () => {
    const source = `
EXTERNAL GAME_SET_RELATIONSHIP(value)
=== start ===
~ GAME_SET_RELATIONSHIP(100)
-> END
`;

    expect(() => validateInkSourceContract(source)).toThrow(
      InkSourceContractError,
    );
    expect(() => validateInkSourceContract(source)).toThrow(
      /unsupported game external: GAME_SET_RELATIONSHIP/,
    );
  });

  it('rejects duplicate external declarations', () => {
    const source = `
EXTERNAL GAME_CITY_ATTENTION()
EXTERNAL GAME_CITY_ATTENTION()
=== start ===
Done.
-> END
`;

    expect(() => validateInkSourceContract(source)).toThrow(
      /declared more than once/,
    );
  });
});
