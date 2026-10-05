# Accessibility and Input Preferences

Accessibility and input preferences are presentation/input policy. They are not simulation truth.

## Canonical preference state

`AccessibilityPreferencesState` is the repository-visible contract for:

- interface scale;
- motion intensity;
- standard/high-contrast presentation;
- automatic/always-visible focus indicators;
- pointer look sensitivity;
- touch look sensitivity.

The state has its own schema version and strict runtime validation.

## Persistence

Production save schema v10 carries `accessibilityPreferences` so exported/imported game state retains the player’s current settings.

The browser runtime also mirrors the same validated preference state to a dedicated local-storage key. This is the active runtime preference profile until the application has a complete save-slot boot/load flow.

The browser mirror is not a second preference model: it serializes the same `AccessibilityPreferencesState` shape.

A malformed browser preference record is discarded and replaced with deterministic safe defaults. Corrupt game saves still follow the stricter save compatibility rules and fail at the appropriate save-schema boundary.

## UI architecture

The game surface remains one UI architecture.

The HTML accessibility/settings overlay sits above the Babylon canvas and uses normal browser controls:

- labeled range inputs;
- labeled selects;
- real buttons;
- semantic heading/region relationships;
- visible focus styling.

Interface scale is applied with a CSS custom property on the game shell so future dialogue/dashboard UI inherits the same scaling contract.

High contrast changes the UI presentation variables, not world simulation data.

## Keyboard and focus behavior

The Babylon canvas remains keyboard-focusable.

Pressing `Escape` while the canvas owns focus moves focus to the **Accessibility and controls settings** button.

Opening the settings panel moves focus to the first setting. Pressing `Escape` inside the panel closes it and returns focus to the settings button.

This gives keyboard and assistive-technology users an explicit path out of the canvas/application surface instead of trapping focus.

## Reduced motion

`motionIntensity` is a 0–1 presentation scalar.

It attenuates secondary motion only:

- taxi body/camera response in `TaxiMotionPresenter`;
- passenger gaze/head/body performance in `PassengerPerformanceController`.

It does not alter route progression, vehicle dynamics state, authored passenger choices, ride state, or any other gameplay authority.

Talk/blink/expression intent remains available while spatial passenger motion can be reduced.

## Pointer and touch sensitivity

Pointer and touch sensitivity are separate validated values.

Personal-space first-person presentation applies them to Babylon camera input sensibility while preserving:

- authored movement speed;
- authored movement bounds;
- interaction anchors;
- persistent personal-space state.

Touch input is explicitly installed for personal spaces; pointer/touch sensitivity changes input response only.

## Verification

Automated tests cover:

- preference schema/store behavior;
- browser persistence and corruption recovery;
- save v10 migration/compatibility;
- taxi secondary-motion attenuation;
- passenger secondary-motion attenuation;
- pointer and touch camera sensitivity;
- UI scale/contrast/focus application;
- settings persistence across browser reload;
- keyboard Escape/focus behavior.
