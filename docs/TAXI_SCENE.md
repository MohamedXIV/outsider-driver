# Taxi Scene Architecture

The taxi is the primary embodied space of Outsider Driver, but it is not a free-driving controller.

## Scene ownership

`BabylonSceneOrchestrator` owns the currently active Babylon scene.

The runtime begins from the permanent boot-scene path and activates the taxi through the same orchestrator. Gameplay systems do not construct or dispose Babylon scenes directly.

## Transform hierarchy

```text
Scene
├─ worldRoot
│  └─ authored route/world presentation
└─ taxiMotionRoot
   ├─ driver camera
   └─ interiorRoot
      ├─ cockpit/interior presentation assets
      ├─ passengerSeat anchor
      ├─ passengerLighting anchor
      ├─ radio anchor
      ├─ navigation anchor
      └─ translator anchor
```

This hierarchy is intentional:

- future vehicle dynamics manipulate `taxiMotionRoot` for pitch, roll, suspension, braking response, and road vibration;
- authored world/route presentation remains under `worldRoot`;
- camera, cockpit, passenger, and dashboard attachments inherit the same taxi motion;
- nothing in this hierarchy implies free driving or a road-navigation simulation.

## Passenger contract

`passengerSeat` is the canonical local transform for a passenger renderer.

`passengerLighting` is a separate hook for passenger-specific light/probe behavior. The baseline scene parents a cabin point light to it. Future Inochi2D integration should consume these hooks rather than hard-coding camera-space positions.

## Dashboard interaction anchors

Radio, navigation, and translator each receive an explicit transform anchor. Future UI/rendering systems attach presentation to these nodes without turning UI transforms into domain state.

Input behavior is deliberately not implemented here.

## Data-driven presentation

`TaxiSceneDefinition` is strict, versioned, JSON-serializable authored data.

The current asset contract supports box primitives because they provide a deterministic baseline cabin/world composition that works in browser CI and headless tests. This is not a parallel prototype scene: the same orchestrator, roots, anchors, lighting hooks, and asset-definition pipeline remain the production integration points as authored art becomes richer.

A future scene-schema version may add glTF/GLB asset sources without changing gameplay/domain ownership or the taxi transform hierarchy.

## Camera

The driver camera transform, field of view, and clip planes are authored in the scene definition.

The camera is not attached to Babylon free-camera controls. There are no WASD/free-driving controls in the taxi foundation.
