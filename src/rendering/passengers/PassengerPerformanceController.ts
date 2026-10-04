import * as z from 'zod';
import type {
  PassengerPerformanceChannel,
  PassengerPerformanceProfile,
  PerformanceInputSource,
  PerformanceParameterBinding,
} from '../../content/passengers/PassengerPerformanceContracts';
import { PassengerPerformanceProfileSchema } from '../../content/passengers/PassengerPerformanceContracts';
import type { PassengerPerformanceControlPort } from '../../app/ports/PassengerPerformancePort';
import type { InochiParameterDescriptor } from './InochiRuntimeContracts';

const unitSchema = z.number().min(0).max(1);
const signedSchema = z.number().min(-1).max(1);

export interface PassengerPerformancePuppetPort {
  listParameters(): readonly InochiParameterDescriptor[];
  setParameter(
    parameterName: string,
    values: readonly number[],
  ): void;
}

interface SemanticInput {
  readonly value: number;
  readonly x: number;
  readonly y: number;
}

function normalizedToParameter(
  normalizedSigned: number,
  lower: number,
  upper: number,
): number {
  const amount = (normalizedSigned + 1) / 2;
  return lower + (upper - lower) * amount;
}

function semanticComponentValue(
  source: PerformanceInputSource,
  input: SemanticInput,
): number {
  switch (source) {
    case 'value':
      return input.value * 2 - 1;
    case 'x':
      return input.x;
    case 'y':
      return input.y;
  }
}

export class PassengerPerformanceController
  implements PassengerPerformanceControlPort
{
  readonly #puppet: PassengerPerformancePuppetPort;
  readonly #profile: PassengerPerformanceProfile;
  readonly #descriptorByName: ReadonlyMap<
    string,
    InochiParameterDescriptor
  >;
  readonly #initialValueByName: ReadonlyMap<
    string,
    readonly number[]
  >;
  #activeExpressionName: string | null = null;

  public constructor(
    puppet: PassengerPerformancePuppetPort,
    profileInput: unknown,
  ) {
    this.#puppet = puppet;
    this.#profile =
      PassengerPerformanceProfileSchema.parse(profileInput);

    const descriptors = puppet.listParameters();
    this.#descriptorByName = new Map(
      descriptors.map((descriptor) => [
        descriptor.name,
        descriptor,
      ]),
    );
    this.#initialValueByName = new Map(
      descriptors.map((descriptor) => [
        descriptor.name,
        [...descriptor.value],
      ]),
    );

    this.#validateProfileAgainstPuppet();
  }

  public setTalk(amountInput: number): void {
    const amount = unitSchema.parse(amountInput);
    this.#applyChannel('talk', {
      value: amount,
      x: 0,
      y: 0,
    });
  }

  public setBlink(amountInput: number): void {
    const amount = unitSchema.parse(amountInput);
    this.#applyChannel('blink', {
      value: amount,
      x: 0,
      y: 0,
    });
  }

  public setGaze(xInput: number, yInput: number): void {
    this.#applySignedVectorChannel(
      'gaze',
      xInput,
      yInput,
    );
  }

  public setHeadPose(
    xInput: number,
    yInput: number,
  ): void {
    this.#applySignedVectorChannel(
      'head',
      xInput,
      yInput,
    );
  }

  public setBodyPose(
    xInput: number,
    yInput: number,
  ): void {
    this.#applySignedVectorChannel(
      'body',
      xInput,
      yInput,
    );
  }

  public setExpression(
    expressionName: string | null,
  ): void {
    this.#resetActiveExpression();

    if (expressionName === null) {
      return;
    }

    const expression = this.#profile.expressions.find(
      (candidate) => candidate.name === expressionName,
    );

    if (expression === undefined) {
      throw new Error(
        `Unknown passenger performance expression: ${expressionName}`,
      );
    }

    for (const assignment of expression.assignments) {
      const descriptor = this.#requireDescriptor(
        assignment.parameterName,
      );

      if (
        assignment.normalizedValues.length !==
        descriptor.lowerBounds.length
      ) {
        throw new Error(
          `Expression ${expressionName} supplies ${String(assignment.normalizedValues.length)} values to ${assignment.parameterName}, which has ${String(descriptor.lowerBounds.length)} dimensions.`,
        );
      }

      this.#puppet.setParameter(
        assignment.parameterName,
        assignment.normalizedValues.map(
          (normalizedValue, index) => {
            const lower = descriptor.lowerBounds[index];
            const upper = descriptor.upperBounds[index];

            if (lower === undefined || upper === undefined) {
              throw new Error(
                `Puppet parameter ${assignment.parameterName} has inconsistent bounds.`,
              );
            }

            return normalizedToParameter(
              normalizedValue,
              lower,
              upper,
            );
          },
        ),
      );
    }

    this.#activeExpressionName = expressionName;
  }

  public applyCue(cueName: string): void {
    const cue = this.#profile.cues.find(
      (candidate) => candidate.name === cueName,
    );

    if (cue === undefined) {
      throw new Error(
        `Unknown passenger performance cue: ${cueName}`,
      );
    }

    this.setExpression(cue.expression);

    for (const operation of cue.operations) {
      switch (operation.channel) {
        case 'talk':
          this.setTalk(operation.values[0]);
          break;
        case 'blink':
          this.setBlink(operation.values[0]);
          break;
        case 'gaze':
          this.setGaze(
            operation.values[0],
            operation.values[1],
          );
          break;
        case 'head':
          this.setHeadPose(
            operation.values[0],
            operation.values[1],
          );
          break;
        case 'body':
          this.setBodyPose(
            operation.values[0],
            operation.values[1],
          );
          break;
      }
    }
  }

  public reset(): void {
    this.#activeExpressionName = null;

    for (const [parameterName, initialValue] of this.#initialValueByName) {
      this.#puppet.setParameter(
        parameterName,
        initialValue,
      );
    }
  }

  #applySignedVectorChannel(
    channel: 'gaze' | 'head' | 'body',
    xInput: number,
    yInput: number,
  ): void {
    const x = signedSchema.parse(xInput);
    const y = signedSchema.parse(yInput);

    this.#applyChannel(channel, {
      value: 0,
      x,
      y,
    });
  }

  #applyChannel(
    channel: PassengerPerformanceChannel,
    input: SemanticInput,
  ): void {
    for (const binding of this.#profile.channels[channel]) {
      const descriptor = this.#requireDescriptor(
        binding.parameterName,
      );
      const values = binding.components.map(
        (component, index) => {
          const lower = descriptor.lowerBounds[index];
          const upper = descriptor.upperBounds[index];

          if (lower === undefined || upper === undefined) {
            throw new Error(
              `Puppet parameter ${binding.parameterName} has inconsistent bounds.`,
            );
          }

          const raw = semanticComponentValue(
            component.source,
            input,
          );
          const normalized = component.invert
            ? -raw
            : raw;

          return normalizedToParameter(
            normalized,
            lower,
            upper,
          );
        },
      );

      this.#puppet.setParameter(
        binding.parameterName,
        values,
      );
    }
  }

  #resetActiveExpression(): void {
    if (this.#activeExpressionName === null) {
      return;
    }

    const expression = this.#profile.expressions.find(
      (candidate) =>
        candidate.name === this.#activeExpressionName,
    );

    if (expression === undefined) {
      throw new Error(
        `Active expression disappeared from performance profile: ${this.#activeExpressionName}`,
      );
    }

    for (const assignment of expression.assignments) {
      const initial = this.#initialValueByName.get(
        assignment.parameterName,
      );

      if (initial === undefined) {
        throw new Error(
          `Missing initial puppet value for expression parameter ${assignment.parameterName}.`,
        );
      }

      this.#puppet.setParameter(
        assignment.parameterName,
        initial,
      );
    }

    this.#activeExpressionName = null;
  }

  #requireDescriptor(
    parameterName: string,
  ): InochiParameterDescriptor {
    const descriptor =
      this.#descriptorByName.get(parameterName);

    if (descriptor === undefined) {
      throw new Error(
        `Passenger performance profile references missing puppet parameter: ${parameterName}`,
      );
    }

    return descriptor;
  }

  #validateBinding(
    channel: PassengerPerformanceChannel,
    binding: PerformanceParameterBinding,
  ): void {
    const descriptor = this.#requireDescriptor(
      binding.parameterName,
    );

    if (
      descriptor.lowerBounds.length !==
      binding.components.length
    ) {
      throw new Error(
        `Performance channel ${channel} maps ${String(binding.components.length)} semantic components to ${binding.parameterName}, but the puppet parameter has ${String(descriptor.lowerBounds.length)} dimensions.`,
      );
    }

    if (
      descriptor.upperBounds.length !==
        descriptor.lowerBounds.length ||
      descriptor.value.length !==
        descriptor.lowerBounds.length
    ) {
      throw new Error(
        `Puppet parameter ${binding.parameterName} has inconsistent dimensional metadata.`,
      );
    }
  }

  #validateProfileAgainstPuppet(): void {
    for (const channel of [
      'talk',
      'blink',
      'gaze',
      'head',
      'body',
    ] as const) {
      for (const binding of this.#profile.channels[channel]) {
        this.#validateBinding(channel, binding);
      }
    }

    for (const expression of this.#profile.expressions) {
      for (const assignment of expression.assignments) {
        const descriptor = this.#requireDescriptor(
          assignment.parameterName,
        );

        if (
          descriptor.lowerBounds.length !==
          assignment.normalizedValues.length
        ) {
          throw new Error(
            `Expression ${expression.name} does not match puppet parameter dimensionality for ${assignment.parameterName}.`,
          );
        }
      }
    }
  }
}
