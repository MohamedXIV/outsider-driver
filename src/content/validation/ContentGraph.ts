import * as z from 'zod';
import {
  ENTITY_KINDS,
  EntityIdSchema,
  getEntityKind,
  type EntityId,
  type EntityKind,
} from '../../domain/ids/EntityId';

export const CONTENT_GRAPH_SCHEMA_VERSION = 1 as const;

const ContentReferenceSchema = z
  .object({
    id: EntityIdSchema,
    expectedKind: z.enum(ENTITY_KINDS).optional(),
  })
  .strict();

const ContentNodeSchema = z
  .object({
    id: EntityIdSchema,
    references: z.array(ContentReferenceSchema).default([]),
  })
  .strict();

export const ContentGraphSchema = z
  .object({
    schemaVersion: z.literal(CONTENT_GRAPH_SCHEMA_VERSION),
    nodes: z.array(ContentNodeSchema),
  })
  .strict();

export type ContentGraph = z.infer<typeof ContentGraphSchema>;

export type ContentValidationIssueCode =
  | 'duplicate_id'
  | 'missing_reference'
  | 'reference_kind_mismatch';

export interface ContentValidationIssue {
  readonly code: ContentValidationIssueCode;
  readonly sourceId: EntityId;
  readonly referenceId?: EntityId;
  readonly expectedKind?: EntityKind;
  readonly actualKind?: EntityKind;
  readonly message: string;
}

export class ContentValidationError extends Error {
  public readonly issues: readonly ContentValidationIssue[];

  public constructor(issues: readonly ContentValidationIssue[]) {
    super(issues.map((issue) => issue.message).join('\n'));
    this.name = 'ContentValidationError';
    this.issues = issues;
  }
}

export function validateContentGraph(input: unknown): ContentGraph {
  const graph = ContentGraphSchema.parse(input);
  const issues: ContentValidationIssue[] = [];
  const nodeById = new Map<EntityId, (typeof graph.nodes)[number]>();

  for (const node of graph.nodes) {
    if (nodeById.has(node.id)) {
      issues.push({
        code: 'duplicate_id',
        sourceId: node.id,
        message: `Duplicate content ID: ${node.id}`,
      });
      continue;
    }

    nodeById.set(node.id, node);
  }

  for (const node of graph.nodes) {
    for (const reference of node.references) {
      const target = nodeById.get(reference.id);

      if (target === undefined) {
        issues.push({
          code: 'missing_reference',
          sourceId: node.id,
          referenceId: reference.id,
          message: `${node.id} references missing content ${reference.id}`,
        });
        continue;
      }

      if (reference.expectedKind !== undefined) {
        const actualKind = getEntityKind(target.id);

        if (actualKind !== reference.expectedKind) {
          issues.push({
            code: 'reference_kind_mismatch',
            sourceId: node.id,
            referenceId: reference.id,
            expectedKind: reference.expectedKind,
            actualKind,
            message: `${node.id} expected ${reference.id} to be ${reference.expectedKind}, got ${actualKind}`,
          });
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new ContentValidationError(issues);
  }

  return graph;
}
