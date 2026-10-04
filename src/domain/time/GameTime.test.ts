import { describe, expect, it } from 'vitest';
import {
  GameTimeSchema,
  GameTimeWindowSchema,
  advanceGameTime,
  compareGameTime,
} from './GameTime';

describe('GameTime', () => {
  it('advances across day boundaries without a campaign-length limit', () => {
    expect(
      advanceGameTime(
        {
          day: 1_000_000,
          minuteOfDay: 23 * 60 + 55,
        },
        10,
      ),
    ).toEqual({
      day: 1_000_001,
      minuteOfDay: 5,
    });
  });

  it('orders calendar positions deterministically', () => {
    expect(
      compareGameTime(
        { day: 9, minuteOfDay: 60 },
        { day: 10, minuteOfDay: 0 },
      ),
    ).toBeLessThan(0);
  });

  it('rejects invalid minutes within a day', () => {
    expect(
      GameTimeSchema.safeParse({
        day: 1,
        minuteOfDay: 1440,
      }).success,
    ).toBe(false);
  });

  it('rejects windows that close before they open', () => {
    expect(
      GameTimeWindowSchema.safeParse({
        opensAt: { day: 5, minuteOfDay: 900 },
        closesAt: { day: 5, minuteOfDay: 899 },
      }).success,
    ).toBe(false);
  });
});
