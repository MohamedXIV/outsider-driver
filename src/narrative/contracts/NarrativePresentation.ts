import * as z from 'zod';

export const NarrativeChoiceSchema = z
  .object({
    index: z.number().int().nonnegative(),
    text: z.string(),
    tags: z.array(z.string()),
  })
  .strict();

export const NarrativeLineSchema = z
  .object({
    text: z.string(),
    tags: z.array(z.string()),
  })
  .strict();

export const NarrativeTurnSchema = z
  .object({
    lines: z.array(NarrativeLineSchema),
    choices: z.array(NarrativeChoiceSchema),
    ended: z.boolean(),
  })
  .strict();

export type NarrativeChoice = z.infer<typeof NarrativeChoiceSchema>;
export type NarrativeLine = z.infer<typeof NarrativeLineSchema>;
export type NarrativeTurn = z.infer<typeof NarrativeTurnSchema>;
