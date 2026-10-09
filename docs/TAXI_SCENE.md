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
   ├─ cameraMotionRoot
   │  └─ driver camera
   └─ interiorRoot
      ├─ cockpit/interior presentation assets
      ├─ passengerSeat anchor
      ├─ passengerLighting anchor
      ├─ radio anchor
      ├─ navigation anchor
      └─ translator anchor
```

This hierarchy is intentional:

- `taxiMotionRoot` receives body response such as pitch, roll, suspension movement, braking response, and road vibration;
- `cameraMotionRoot` receives an authored/parameterized camera response on top of body motion, allowing camera motion to be attenuated independently;
- authored world/route presentation remains under `worldRoot`;
- cockpit, passenger, and dashboard attachments inherit taxi body motion;
- nothing in this hierarchy implies free driving or a road-navigation simulation.

Yaw/steering is deliberately not owned by the light-dynamics presenter. Future route presentation may orient or move authored world scenery, but route truth remains in the route-progression domain system.

## Passenger contract

`passengerSeat` is the canonical local transform for a passenger renderer.

`passengerLighting` is a separate hook for passenger-specific light/probe behavior. The baseline scene parents a cabin point light to it. Future Inochi2D integration should consume these hooks rather than hard-coding camera-space positions.

## Dashboard interaction anchors

Radio, navigation, and translator each receive an explicit transform anchor. Future UI/rendering systems attach presentation to these nodes without turning UI transforms into domain state.

Input behavior is deliberately not implemented here.

## Data-driven presentation

`TaxiSceneDefinition` is strict, versioned, JSON-serializable authored data.

The asset contract supports boxes, low-poly cylinders, toruses, and textured planes. Sizes scale a unit primitive; cylinders run along local Y, toruses lie in local XZ, and planes lie in local XY facing negative Z. Tessellation is bounded to 6–32 segments and torus tube ratio to 0.02–0.4. Existing version-1 box definitions remain valid through additive defaults.

Materials use authored diffuse/emissive colors and optional repository-owned `/taxi/*.svg` textures. Non-emissive wear/cloth textures remain lit surfaces; emissive instrument planes use ordinary Babylon materials with authored texture brightness. No custom toon shader is introduced. Identical finishes share scene-owned materials, and repeated primitives share instanced geometry within their interior/world lighting space. The orchestrator disposes all of these resources with the scene.

The cream-and-olive cab includes analog instrumentation, a dispatch radio, a route terminal, physical switches, padded seats, repair patches, handles, and windshield hardware. Display artwork supplies a visual face only; it does not declare route, radio, speed, or gameplay state. Existing interaction anchors remain the integration points for future live presentation.

Warm cabin lighting affects the authored interior. Up to two data-defined spot headlights move with the taxi and exclude interior meshes. Cool world ambient and emissive street lamps/windows establish the nighttime exterior without shadow maps or a postprocessing dependency. The authored street is a static composition; route progression and route-specific scenery remain owned by their existing systems.

Fixed-camera screenshots, lighting values, reproduction commands, and current limits are documented in [the issue #66 visual review](visuals/66/README.md).

A future scene-schema version may add glTF/GLB asset sources without changing gameplay/domain ownership or the taxi transform hierarchy.

## Camera

The driver camera transform, field of view, and clip planes are authored in the scene definition.

The camera is not attached to Babylon free-camera controls. There are no WASD/free-driving controls in the taxi foundation.

See `docs/AUTOPILOT_DYNAMICS.md` for the deterministic route/dynamics boundary.
