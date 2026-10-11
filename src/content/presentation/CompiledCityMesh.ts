import * as z from 'zod';

/**
 * Build-generated geometry projection of a source-owned, reproducible GLB.
 * Deliberately small: no runtime glTF parser or external asset loader bundle.
 */
const partSchema = z.object({
  name: z.string().min(1),
  material: z.number().int().min(0),
  positions: z.array(z.number()).min(9),
  normals: z.array(z.number()).min(9),
  uvs: z.array(z.number()).min(6),
  indices: z.array(z.number().int().min(0)).min(3),
}).strict().superRefine((part, ctx) => {
  const vertexCount = part.positions.length / 3;
  if (!Number.isInteger(vertexCount) || part.normals.length !== part.positions.length
    || part.uvs.length !== vertexCount * 2 || part.indices.length % 3 !== 0
    || part.indices.some((index) => index >= vertexCount)) {
    ctx.addIssue({ code: 'custom', message: 'Invalid compiled city mesh geometry buffers' });
  }
});

export const CompiledCityMeshSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9_]+$/),
  paintedTexture: z.string().regex(/^\/city\/[a-z0-9-]+\.png$/),
  materials: z.array(z.object({
    id: z.string().min(1),
    color: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]),
  }).strict()).min(1).max(12),
  parts: z.array(partSchema).min(1).max(32),
}).strict().superRefine((asset, ctx) => {
  if (asset.parts.some((part) => part.material >= asset.materials.length)) {
    ctx.addIssue({ code: 'custom', message: 'City mesh material index out of range' });
  }
});

export type CompiledCityMesh = z.infer<typeof CompiledCityMeshSchema>;
