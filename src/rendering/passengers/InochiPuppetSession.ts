import type {
  InochiDrawFrame,
  InochiParameterDescriptor,
  InochiPuppetRuntimeHandle,
  InochiRuntimePort,
} from './InochiRuntimeContracts';

export interface InochiPuppetAssetSource {
  readonly id: string;
  load(): Promise<ArrayBuffer>;
}

export class InochiPuppetSession {
  readonly #handle: InochiPuppetRuntimeHandle;
  readonly #parameterByName: ReadonlyMap<string, InochiParameterDescriptor>;
  #disposed = false;

  private constructor(handle: InochiPuppetRuntimeHandle) {
    this.#handle = handle;
    this.#parameterByName = new Map(
      handle.listParameters().map((parameter) => [
        parameter.name,
        parameter,
      ]),
    );
  }

  public static async load(
    runtime: InochiRuntimePort,
    source: InochiPuppetAssetSource,
  ): Promise<InochiPuppetSession> {
    const data = await source.load();

    if (data.byteLength === 0) {
      throw new Error(`Inochi puppet asset is empty: ${source.id}`);
    }

    return new InochiPuppetSession(runtime.loadPuppet(data));
  }

  public get name(): string {
    this.#assertAlive();
    return this.#handle.name;
  }

  public get author(): string {
    this.#assertAlive();
    return this.#handle.author;
  }

  public listParameters(): readonly InochiParameterDescriptor[] {
    this.#assertAlive();
    return this.#handle.listParameters();
  }

  public hasParameter(name: string): boolean {
    this.#assertAlive();
    return this.#parameterByName.has(name);
  }

  public setParameter(
    name: string,
    values: readonly number[],
  ): void {
    this.#assertAlive();
    const descriptor = this.#parameterByName.get(name);

    if (descriptor === undefined) {
      throw new Error(`Unknown Inochi parameter: ${name}`);
    }

    if (values.length !== descriptor.lowerBounds.length) {
      throw new Error(
        `Inochi parameter ${name} expects ${String(descriptor.lowerBounds.length)} values, received ${String(values.length)}.`,
      );
    }

    const clamped = values.map((value, index) => {
      const lower = descriptor.lowerBounds[index];
      const upper = descriptor.upperBounds[index];

      if (lower === undefined || upper === undefined) {
        throw new Error(
          `Inochi parameter ${name} has inconsistent bound metadata.`,
        );
      }

      return Math.min(upper, Math.max(lower, value));
    });

    this.#handle.setParameter(name, clamped);
  }

  public frame(deltaSeconds: number): InochiDrawFrame {
    this.#assertAlive();

    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('Inochi frame delta must be a finite non-negative number.');
    }

    this.#handle.update(deltaSeconds);
    return this.#handle.renderFrame(deltaSeconds);
  }

  public dispose(): void {
    if (this.#disposed) {
      return;
    }

    this.#handle.dispose();
    this.#disposed = true;
  }

  #assertAlive(): void {
    if (this.#disposed) {
      throw new Error('Cannot use a disposed InochiPuppetSession.');
    }
  }
}
