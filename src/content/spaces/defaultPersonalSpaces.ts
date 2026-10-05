import {
  PersonalSpaceCatalogSchema,
  type PersonalSpaceCatalog,
} from './PersonalSpaceContracts';

export const defaultPersonalSpaceCatalog: PersonalSpaceCatalog =
  PersonalSpaceCatalogSchema.parse({
    schemaVersion: 1,
    spaces: [
      {
        schemaVersion: 1,
        id: 'personal-space:garage',
        kind: 'garage',
        displayName: 'Garage',
        camera: {
          spawn: {
            position: [0, 1.68, -4.2],
            rotation: [0, 0, 0],
          },
          fovRadians: 1.05,
          minZ: 0.05,
          maxZ: 120,
          movementSpeed: 0.22,
          angularSensibility: 2600,
          bounds: {
            min: [-4.4, 1.68, -5.2],
            max: [4.4, 1.68, 5.2],
          },
        },
        lighting: {
          ambientDirection: [0.1, 1, -0.25],
          ambientColor: [0.28, 0.34, 0.42],
          ambientIntensity: 0.48,
          practicalLights: [
            {
              id: 'work-bay-light',
              transform: {
                position: [0, 3.4, 0.5],
                rotation: [0, 0, 0],
              },
              color: [0.72, 0.82, 1],
              intensity: 1.8,
              range: 12,
            },
            {
              id: 'garage-door-warning-light',
              transform: {
                position: [3.4, 2.2, 4.6],
                rotation: [0, 0, 0],
              },
              color: [1, 0.22, 0.08],
              intensity: 1.2,
              range: 5,
            },
          ],
        },
        environment: {
          clearColor: [0.01, 0.014, 0.02, 1],
        },
        flags: [
          {
            id: 'inspection-light',
            defaultValue: false,
          },
        ],
        assets: [
          {
            id: 'floor',
            kind: 'box',
            size: [9.5, 0.2, 11],
            transform: {
              position: [0, -0.1, 0],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.09, 0.095, 0.1],
            },
          },
          {
            id: 'back-wall',
            kind: 'box',
            size: [9.5, 4.2, 0.2],
            transform: {
              position: [0, 2, 5.4],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.055, 0.06, 0.065],
            },
          },
          {
            id: 'left-wall',
            kind: 'box',
            size: [0.2, 4.2, 11],
            transform: {
              position: [-4.65, 2, 0],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.05, 0.055, 0.06],
            },
          },
          {
            id: 'right-wall',
            kind: 'box',
            size: [0.2, 4.2, 11],
            transform: {
              position: [4.65, 2, 0],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.05, 0.055, 0.06],
            },
          },
          {
            id: 'workbench',
            kind: 'box',
            size: [2.8, 0.9, 0.8],
            transform: {
              position: [-2.6, 0.45, 3.8],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.16, 0.12, 0.09],
            },
          },
          {
            id: 'taxi-bay',
            kind: 'box',
            size: [2.2, 0.08, 4.4],
            transform: {
              position: [1.25, 0.05, 0.5],
              rotation: [0, 0, 0],
            },
            collidable: false,
            visibility: null,
            material: {
              diffuseColor: [0.08, 0.09, 0.1],
              emissiveColor: [0.03, 0.08, 0.12],
            },
          },
          {
            id: 'inspection-light-strip',
            kind: 'box',
            size: [0.12, 0.12, 3.4],
            transform: {
              position: [1.25, 0.18, 0.5],
              rotation: [0, 0, 0],
            },
            collidable: false,
            visibility: {
              flagId: 'inspection-light',
              visibleWhen: true,
            },
            material: {
              diffuseColor: [0.08, 0.15, 0.2],
              emissiveColor: [0.2, 0.65, 0.95],
            },
          },
        ],
        interactionAnchors: [
          {
            id: 'taxi-access',
            kind: 'taxi-access',
            transform: {
              position: [1.25, 1, 0.5],
              rotation: [0, 0, 0],
            },
            interactionRadius: 1.8,
          },
          {
            id: 'upgrade-bench',
            kind: 'upgrades',
            transform: {
              position: [-2.6, 1.1, 3.25],
              rotation: [0, Math.PI, 0],
            },
            interactionRadius: 1.3,
          },
          {
            id: 'garage-exit',
            kind: 'exit',
            transform: {
              position: [0, 1.2, -4.8],
              rotation: [0, Math.PI, 0],
            },
            interactionRadius: 1.4,
          },
        ],
      },
      {
        schemaVersion: 1,
        id: 'personal-space:home',
        kind: 'home',
        displayName: 'Room',
        camera: {
          spawn: {
            position: [0, 1.68, -2.6],
            rotation: [0, 0, 0],
          },
          fovRadians: 1.05,
          minZ: 0.05,
          maxZ: 80,
          movementSpeed: 0.18,
          angularSensibility: 2800,
          bounds: {
            min: [-3.4, 1.68, -3.2],
            max: [3.4, 1.68, 3.2],
          },
        },
        lighting: {
          ambientDirection: [-0.2, 1, 0.15],
          ambientColor: [0.34, 0.3, 0.42],
          ambientIntensity: 0.42,
          practicalLights: [
            {
              id: 'window-neon',
              transform: {
                position: [3.1, 2.15, 0.8],
                rotation: [0, 0, 0],
              },
              color: [0.22, 0.42, 1],
              intensity: 1.5,
              range: 8,
            },
            {
              id: 'bedside-light',
              transform: {
                position: [-2.1, 1.25, 1.8],
                rotation: [0, 0, 0],
              },
              color: [1, 0.48, 0.2],
              intensity: 1,
              range: 4,
            },
          ],
        },
        environment: {
          clearColor: [0.012, 0.01, 0.022, 1],
        },
        flags: [
          {
            id: 'message-indicator',
            defaultValue: false,
          },
        ],
        assets: [
          {
            id: 'floor',
            kind: 'box',
            size: [7.2, 0.18, 7],
            transform: {
              position: [0, -0.09, 0],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.11, 0.085, 0.075],
            },
          },
          {
            id: 'back-wall',
            kind: 'box',
            size: [7.2, 3.7, 0.18],
            transform: {
              position: [0, 1.85, 3.4],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.095, 0.075, 0.085],
            },
          },
          {
            id: 'left-wall',
            kind: 'box',
            size: [0.18, 3.7, 7],
            transform: {
              position: [-3.5, 1.85, 0],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.085, 0.07, 0.08],
            },
          },
          {
            id: 'right-wall',
            kind: 'box',
            size: [0.18, 3.7, 7],
            transform: {
              position: [3.5, 1.85, 0],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.085, 0.07, 0.08],
            },
          },
          {
            id: 'bed',
            kind: 'box',
            size: [2.2, 0.5, 1.1],
            transform: {
              position: [-2, 0.25, 2],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.18, 0.12, 0.14],
            },
          },
          {
            id: 'message-terminal',
            kind: 'box',
            size: [0.8, 1.1, 0.45],
            transform: {
              position: [2.6, 0.55, 2.4],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.07, 0.08, 0.09],
              emissiveColor: [0.02, 0.08, 0.12],
            },
          },
          {
            id: 'message-alert',
            kind: 'box',
            size: [0.14, 0.14, 0.08],
            transform: {
              position: [2.6, 1.15, 2.16],
              rotation: [0, 0, 0],
            },
            collidable: false,
            visibility: {
              flagId: 'message-indicator',
              visibleWhen: true,
            },
            material: {
              diffuseColor: [0.22, 0.08, 0.04],
              emissiveColor: [1, 0.22, 0.08],
            },
          },
          {
            id: 'shelf',
            kind: 'box',
            size: [1.8, 1.7, 0.45],
            transform: {
              position: [-2.3, 0.85, -2.6],
              rotation: [0, 0, 0],
            },
            collidable: true,
            visibility: null,
            material: {
              diffuseColor: [0.14, 0.1, 0.075],
            },
          },
        ],
        interactionAnchors: [
          {
            id: 'messages',
            kind: 'messages',
            transform: {
              position: [2.55, 1.1, 1.8],
              rotation: [0, Math.PI, 0],
            },
            interactionRadius: 1.2,
          },
          {
            id: 'possessions',
            kind: 'possessions',
            transform: {
              position: [-2.3, 1.2, -2.15],
              rotation: [0, 0, 0],
            },
            interactionRadius: 1.3,
          },
          {
            id: 'sleep',
            kind: 'sleep',
            transform: {
              position: [-1.8, 1, 1.4],
              rotation: [0, 0, 0],
            },
            interactionRadius: 1.4,
          },
          {
            id: 'home-exit',
            kind: 'exit',
            transform: {
              position: [0, 1.2, -3],
              rotation: [0, Math.PI, 0],
            },
            interactionRadius: 1.2,
          },
        ],
      },
    ],
  });
