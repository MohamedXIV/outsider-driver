# Rendering boundary

Babylon.js, scene lifecycle, materials, shaders, Inochi rendering integration, and presentation-only state live here. Rendering must not become authoritative gameplay state.

## Current scene contract

- `BabylonSceneOrchestrator` owns scene activation/disposal.
- `taxiMotionRoot` is the reusable parent for future light vehicle dynamics.
- `worldRoot` is separate from taxi motion and receives authored route/world presentation.
- passenger, passenger-lighting, radio, navigation, and translator anchors are explicit.
- taxi presentation is created from validated repository-visible scene data.
- the driver camera is intentionally not attached to free-camera controls.

See `docs/TAXI_SCENE.md`.
