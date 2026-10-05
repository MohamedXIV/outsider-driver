# Passenger Performance and Stylized Cabin Lighting

Important passengers are authored as illustrated Inochi2D puppets but live inside the same 3D taxi lighting context as the cabin.

This layer is presentation-only. It never owns passenger identity, relationship state, suspicion, narrative truth, route state, or time/weather truth.

## Semantic performance boundary

Narrative/gameplay code requests named semantic performances, not puppet internals.

Ink uses tags such as:

```text
performance:guarded
performance:firm
```

`PassengerRideOrchestrator` derives the current semantic cue from the presented narrative turn. The cue is not a second persistent state variable: save/restore already persists the narrative turn and tags.

Each production passenger performance profile maps semantic controls to the concrete puppet:

- talk / mouth amount;
- blink amount;
- gaze X/Y;
- head pose X/Y;
- body pose X/Y;
- named expressions;
- named cues.

`PassengerPerformanceController` is the only layer that knows Inochi parameter names. It validates those names and dimensions against the live puppet descriptors.

Named cues reset the puppet to the session baseline before applying expression and channel operations, so cue results are deterministic and do not inherit stale pose state.

## Production validation

Passenger performance profiles live in `productionContent.passengerPerformance`.

The production content gate validates:

- profile passenger IDs;
- duplicate profiles/cues/expressions;
- semantic channel/source compatibility;
- expression references;
- every authored Ink `performance:<cue>` reference against the relevant passenger profile.

The browser smoke uses a real generated Inochi puppet with Mouth, Blink, Gaze, Head, Body, and Mood parameters and applies a production cue through the verified WASM runtime.

## Lighting ownership

Lighting derives from existing TaxiScene truth.

`PassengerLightingBridge` samples:

- live taxi ambient light;
- live cabin key light;
- passenger-seat-relative key direction.

Because route presentation already updates TaxiScene ambient lighting, passenger lighting automatically inherits the current day/night/weather environment instead of duplicating those rules.

Transient presentation context can add:

- passing neon;
- headlights;
- emergency lights;
- tunnel/darkness attenuation.

These are presentation accents, not persistent world-state authorities.

## Stylized material response

The Babylon Inochi renderer implements `PassengerLightingSink`.

The shader keeps the authored illustration as the base surface and applies a deliberately gentle curved-paper pseudo-normal. This gives cabin/neon/headlight directionality without pretending the 2D puppet is a physically-modelled PBR character.

Neutral lighting preserves the authored drawing. Live ambient/key/accent colors modulate it; darkness can attenuate cabin/world contribution while transient lights remain visible.

## Inochi texture attachments

The current official texture order is:

1. albedo;
2. emissive;
3. bump map.

Albedo and emissive are supported. Emissive output uses the Part's authored `emissionStrength`.

Bump maps remain fail-closed until their exact reference semantics are implemented. The bridge does not silently reinterpret them as a generic Babylon normal map.

## Verification

Unit/runtime tests cover:

- semantic cue parsing from narrative presentation;
- production cue/profile cross-validation;
- deterministic channel/expression application;
- live taxi ambient/key sampling;
- inherited route day/night/weather lighting;
- neon, headlights, emergency, and tunnel/darkness context;
- emissive attachment rendering;
- fail-closed bump handling.

Browser verification loads the real verified Inochi WASM runtime, generates a valid puppet with real performance parameters, applies a production semantic cue, applies live taxi lighting, builds a real draw frame, and renders it beneath the production passenger-seat anchor.
