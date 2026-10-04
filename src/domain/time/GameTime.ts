import * as z from 'zod';

export const MINUTES_PER_DAY = 24 * 60;

export const GameTimeSchema = z
  .object({
    day: z.number().int().positive(),
    minuteOfDay: z
      .number()
      .int()
      .min(0)
      .max(MINUTES_PER_DAY - 1),
  })
  .strict();

export type GameTime = z.infer<typeof GameTimeSchema>;

export function gameMinuteIndex(time: GameTime): number {
  const validated = GameTimeSchema.parse(time);
  const index =
    (validated.day - 1) * MINUTES_PER_DAY + validated.minuteOfDay;

  if (!Number.isSafeInteger(index)) {
    throw new RangeError('Game time exceeds JavaScript safe-integer precision.');
  }

  return index;
}

export function compareGameTime(left: GameTime, right: GameTime): number {
  return gameMinuteIndex(left) - gameMinuteIndex(right);
}

export function advanceGameTime(
  time: GameTime,
  minutes: number,
): GameTime {
  if (!Number.isSafeInteger(minutes) || minutes < 0) {
    throw new RangeError('Minutes to advance must be a non-negative safe integer.');
  }

  const nextIndex = gameMinuteIndex(time) + minutes;

  if (!Number.isSafeInteger(nextIndex)) {
    throw new RangeError('Advanced game time exceeds safe-integer precision.');
  }

  return GameTimeSchema.parse({
    day: Math.floor(nextIndex / MINUTES_PER_DAY) + 1,
    minuteOfDay: nextIndex % MINUTES_PER_DAY,
  });
}

export const GameTimeWindowSchema = z
  .object({
    opensAt: GameTimeSchema,
    closesAt: GameTimeSchema,
  })
  .strict()
  .refine(
    (window) => compareGameTime(window.opensAt, window.closesAt) <= 0,
    {
      message: 'A time window cannot close before it opens.',
      path: ['closesAt'],
    },
  );

export type GameTimeWindow = z.infer<typeof GameTimeWindowSchema>;
