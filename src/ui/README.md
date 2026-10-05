# UI boundary

Browser UI, accessibility surfaces, dialogue/dashboard presentation, and input presentation live here. UI issues commands/events; it does not own domain truth.

The game surface uses semantic HTML controls for accessibility/input settings above the Babylon canvas. UI scale and contrast are applied through the existing shell rather than a parallel accessibility UI.

The canvas documents an explicit keyboard escape path: `Escape` moves focus to the accessibility/settings control. See `docs/ACCESSIBILITY_AND_INPUT.md`.
