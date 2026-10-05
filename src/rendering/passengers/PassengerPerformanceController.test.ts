import { describe, expect, it } from 'vitest';
import type { InochiParameterDescriptor } from './InochiRuntimeContracts';
import { PassengerPerformanceController } from './PassengerPerformanceController';

function descriptor(
  name: string,
  lowerBounds: readonly number[],
  upperBounds: readonly number[],
  value: readonly number[],
): InochiParameterDescriptor {
  return {
    name,
    lowerBounds,
    upperBounds,
    value,
    active: true,
  };
}

function createHarness(
  getMotionIntensity: () => number = () => 1,
) {
  const descriptors = [
    descriptor('Mouth', [0], [1], [0]),
    descriptor('Blink', [0], [1], [0]),
    descriptor('Gaze', [-1, -2], [1, 2], [0, 0]),
    descriptor('Head', [-2, -1], [2, 1], [0, 0]),
    descriptor('Body', [-1, -1], [1, 1], [0, 0]),
    descriptor('Mood', [-1], [1], [0]),
  ];
  const writes: {
    readonly name: string;
    readonly values: readonly number[];
  }[] = [];

  const puppet = {
    listParameters: () => descriptors,
    setParameter: (
      name: string,
      values: readonly number[],
    ) => {
      writes.push({
        name,
        values: [...values],
      });
    },
  };

  const profile = {
    passengerId: 'passenger:test-rider',
    channels: {
      talk: [
        {
          parameterName: 'Mouth',
          components: [
            {
              source: 'value',
              invert: false,
            },
          ],
        },
      ],
      blink: [
        {
          parameterName: 'Blink',
          components: [
            {
              source: 'value',
              invert: true,
            },
          ],
        },
      ],
      gaze: [
        {
          parameterName: 'Gaze',
          components: [
            {
              source: 'x',
              invert: false,
            },
            {
              source: 'y',
              invert: false,
            },
          ],
        },
      ],
      head: [
        {
          parameterName: 'Head',
          components: [
            {
              source: 'x',
              invert: false,
            },
            {
              source: 'y',
              invert: true,
            },
          ],
        },
      ],
      body: [
        {
          parameterName: 'Body',
          components: [
            {
              source: 'x',
              invert: false,
            },
            {
              source: 'y',
              invert: false,
            },
          ],
        },
      ],
    },
    expressions: [
      {
        name: 'concerned',
        assignments: [
          {
            parameterName: 'Mood',
            normalizedValues: [0.5],
          },
        ],
      },
    ],
    cues: [
      {
        name: 'guarded',
        expression: 'concerned',
        operations: [
          {
            channel: 'gaze',
            values: [-1, 0.25],
          },
          {
            channel: 'head',
            values: [0.5, -0.5],
          },
        ],
      },
    ],
  } as const;

  return {
    controller: new PassengerPerformanceController(
      puppet,
      profile,
      {
        getMotionIntensity,
      },
    ),
    writes,
  };
}

describe('PassengerPerformanceController', () => {
  it('maps semantic talk/blink/gaze/head/body controls into puppet bounds', () => {
    const { controller, writes } = createHarness();

    controller.setTalk(0.75);
    controller.setBlink(0.25);
    controller.setGaze(0.5, -0.5);
    controller.setHeadPose(0.5, -0.5);
    controller.setBodyPose(-1, 1);

    expect(writes).toEqual([
      {
        name: 'Mouth',
        values: [0.75],
      },
      {
        name: 'Blink',
        values: [0.75],
      },
      {
        name: 'Gaze',
        values: [0.5, -1],
      },
      {
        name: 'Head',
        values: [1, 0.5],
      },
      {
        name: 'Body',
        values: [-1, 1],
      },
    ]);
  });

  it('applies named cues without exposing puppet parameter names to callers', () => {
    const { controller, writes } = createHarness();

    controller.applyCue('guarded');

    expect(writes.slice(0, 6)).toEqual([
      { name: 'Mouth', values: [0] },
      { name: 'Blink', values: [0] },
      { name: 'Gaze', values: [0, 0] },
      { name: 'Head', values: [0, 0] },
      { name: 'Body', values: [0, 0] },
      { name: 'Mood', values: [0] },
    ]);
    expect(writes.slice(-3)).toEqual([
      {
        name: 'Mood',
        values: [0.5],
      },
      {
        name: 'Gaze',
        values: [-1, 0.5],
      },
      {
        name: 'Head',
        values: [1, 0.5],
      },
    ]);
  });

  it('attenuates gaze/head/body performance while preserving talk and expressions', () => {
    const { controller, writes } = createHarness(() => 0.25);

    controller.setTalk(0.8);
    controller.setGaze(1, -1);
    controller.setHeadPose(1, 1);
    controller.setExpression('concerned');

    expect(writes).toEqual([
      {
        name: 'Mouth',
        values: [0.8],
      },
      {
        name: 'Gaze',
        values: [0.25, -0.5],
      },
      {
        name: 'Head',
        values: [0.5, -0.25],
      },
      {
        name: 'Mood',
        values: [0.5],
      },
    ]);
  });

  it('resets the previous expression before switching expressions or clearing it', () => {
    const { controller, writes } = createHarness();

    controller.setExpression('concerned');
    controller.setExpression(null);

    expect(writes).toEqual([
      {
        name: 'Mood',
        values: [0.5],
      },
      {
        name: 'Mood',
        values: [0],
      },
    ]);
  });

  it('fails closed when a profile disagrees with the loaded puppet', () => {
    const puppet = {
      listParameters: () => [
        descriptor('Mouth', [0], [1], [0]),
      ],
      setParameter: () => undefined,
    };

    expect(() => {
      new PassengerPerformanceController(puppet, {
        passengerId: 'passenger:test-rider',
        channels: {
          talk: [],
          blink: [],
          gaze: [
            {
              parameterName: 'Mouth',
              components: [
                {
                  source: 'x',
                  invert: false,
                },
                {
                  source: 'y',
                  invert: false,
                },
              ],
            },
          ],
          head: [],
          body: [],
        },
        expressions: [],
        cues: [],
      });
    }).toThrow(/puppet parameter has 1 dimensions/);
  });

  it('rejects semantic inputs outside their authored normalized domains', () => {
    const { controller } = createHarness();

    expect(() => {
      controller.setTalk(1.1);
    }).toThrow();

    expect(() => {
      controller.setGaze(-1.1, 0);
    }).toThrow();
  });
});
