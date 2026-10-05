import * as z from 'zod';

const utcTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const SaveEnvelopeSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    savedAt: z.string().regex(utcTimestampPattern),
    state: z.unknown(),
  })
  .strict();

export interface RuntimeSchema<T> {
  parse(input: unknown): T;
}

export interface SaveVersionDefinition {
  readonly version: number;
  readonly schema: RuntimeSchema<unknown>;
}

export interface SaveMigrationDefinition {
  readonly fromVersion: number;
  readonly toVersion: number;
  migrate(state: unknown): unknown;
}

export interface SaveEnvelope<TState> {
  readonly schemaVersion: number;
  readonly savedAt: string;
  readonly state: TState;
}

export interface VersionedSaveCodecConfig<TCurrent> {
  readonly currentVersion: number;
  readonly currentSchema: RuntimeSchema<TCurrent>;
  readonly historicalVersions?: readonly SaveVersionDefinition[];
  readonly migrations?: readonly SaveMigrationDefinition[];
}

export class SaveVersionError extends Error {
  public constructor(
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SaveVersionError';
  }
}

function assertVersion(version: number, label: string): void {
  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new SaveVersionError(`${label} must be a positive safe integer.`);
  }
}

function versionLabel(version: number): string {
  return String(version);
}

export class VersionedSaveCodec<TCurrent> {
  readonly #currentVersion: number;
  readonly #currentSchema: RuntimeSchema<TCurrent>;
  readonly #schemas = new Map<number, RuntimeSchema<unknown>>();
  readonly #migrations = new Map<number, SaveMigrationDefinition>();

  public constructor(config: VersionedSaveCodecConfig<TCurrent>) {
    assertVersion(config.currentVersion, 'Current save version');

    this.#currentVersion = config.currentVersion;
    this.#currentSchema = config.currentSchema;

    for (const definition of config.historicalVersions ?? []) {
      this.#registerSchema(definition.version, definition.schema);
    }

    this.#registerSchema(config.currentVersion, config.currentSchema);

    for (const migration of config.migrations ?? []) {
      assertVersion(migration.fromVersion, 'Migration source version');
      assertVersion(migration.toVersion, 'Migration target version');

      if (migration.toVersion !== migration.fromVersion + 1) {
        throw new SaveVersionError(
          `Migrations must be sequential: ${versionLabel(migration.fromVersion)} -> ${versionLabel(migration.toVersion)}`,
        );
      }

      if (this.#migrations.has(migration.fromVersion)) {
        throw new SaveVersionError(
          `Duplicate migration from version ${versionLabel(migration.fromVersion)}.`,
        );
      }

      this.#migrations.set(migration.fromVersion, migration);
    }
  }

  public encode(state: TCurrent, savedAt: string): SaveEnvelope<TCurrent> {
    const validatedTimestamp = SaveEnvelopeSchema.shape.savedAt.parse(savedAt);
    const validatedState = this.#currentSchema.parse(state);

    return {
      schemaVersion: this.#currentVersion,
      savedAt: validatedTimestamp,
      state: validatedState,
    };
  }

  public decode(input: unknown): SaveEnvelope<TCurrent> {
    let envelope: z.infer<typeof SaveEnvelopeSchema>;

    try {
      envelope = SaveEnvelopeSchema.parse(input);
    } catch (error: unknown) {
      throw new SaveVersionError(
        `Save envelope is invalid: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }

    if (envelope.schemaVersion > this.#currentVersion) {
      throw new SaveVersionError(
        `Save version ${versionLabel(envelope.schemaVersion)} is newer than supported version ${versionLabel(this.#currentVersion)}.`,
      );
    }

    let version = envelope.schemaVersion;
    let state = this.#parseState(version, envelope.state);

    while (version < this.#currentVersion) {
      const migration = this.#migrations.get(version);

      if (migration === undefined) {
        throw new SaveVersionError(
          `No migration registered from save version ${versionLabel(version)}.`,
        );
      }

      state = migration.migrate(state);
      version = migration.toVersion;
      state = this.#parseState(version, state);
    }

    return {
      schemaVersion: this.#currentVersion,
      savedAt: envelope.savedAt,
      state: this.#currentSchema.parse(state),
    };
  }

  public serialize(state: TCurrent, savedAt: string): string {
    return JSON.stringify(this.encode(state, savedAt));
  }

  public deserialize(serialized: string): SaveEnvelope<TCurrent> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch (error: unknown) {
      throw new SaveVersionError(
        'Save data is not valid JSON.',
        { cause: error },
      );
    }

    return this.decode(parsed);
  }

  #registerSchema(version: number, schema: RuntimeSchema<unknown>): void {
    assertVersion(version, 'Save schema version');

    if (this.#schemas.has(version)) {
      throw new SaveVersionError(
        `Duplicate save schema definition for version ${versionLabel(version)}.`,
      );
    }

    this.#schemas.set(version, schema);
  }

  #parseState(version: number, state: unknown): unknown {
    const schema = this.#schemas.get(version);

    if (schema === undefined) {
      throw new SaveVersionError(
        `No state schema registered for save version ${versionLabel(version)}.`,
      );
    }

    try {
      return schema.parse(state);
    } catch (error: unknown) {
      throw new SaveVersionError(
        `Save state for version ${versionLabel(version)} is invalid: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
}
