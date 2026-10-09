# Mint elf: source-art upper-body prototype (PR #79)

## Assets on GitHub

The user uploaded the binary art and pushed it successfully to branch
`feat/sprite-passenger-visual-comparison` (first asset head `1a298e8`).
These assets are **already present** in `public/passengers/mint-elf/`:

- `portrait.webp` — one baked original portrait, all features together
- `torso.webp` — lower part of the original illustration
- `head.webp` — rough head/hair/ears cutout
- `antenna-right.webp` — isolated source-painted right antenna
- `manifest.json` — 452×558 canvas, source and rough pivot metadata; updated to point to the actual WebP filenames

These are extracted from the supplied artwork, not redraws of the former
procedural alien. They contain *real original image pixels* and transparency.

## Actual in-taxi integration

`MintElfPassengerCandidate` is selectable via **Passenger art → Mint elf** in the
existing Babylon Passenger Lab. All variants use `taxi.anchors.passengerSeat`
and the same isolated Ink dialog and semantic animation interface as the original
lab. It is **Vite development-only**; it never writes game state or saves.

- **A — Spritesheet:** one original full portrait. There are no authored
  multiple full-body frames yet; no claim of true spritesheet animation.
- **B — Layered:** torso, head, right antenna on three transparent planes.
  Head/antenna rotate around their own approximate pivots.
- **C — Hybrid:** baked full portrait, with the right antenna masked out and
  re-rendered independently (two planes).
- Masking is calculated once after WebP decode, using the actual alpha mask from
  `antenna-right.webp`. No per-frame pixel uploads, Inochi dependencies or
  extra production bundle code are introduced.
- The UI reports loading/failure, counts actual planes and estimates decoded
  RGBA texel memory. These are **not** measured GPU draw calls or VRAM.

## Limitations and acceptance

The original eyes, mouth, lashes and brows are still painted directly into the
head; gaze, speaking, blinking and expression controls are disabled for this
art. There are no finished hidden pixels for the neckline, and some hair/ear
boundaries are rough. Animation is presently gentle rotation/bob only; it cannot
yet match a hand-authored professional puppet.

To inspect: `gh pr checkout 79` (or `git pull` if already on that branch),
then `npm ci`, `npm run dev:sprites`, and visit
`http://localhost:5173/?spriteViewer=1`. Choose the **Mint elf** artwork, move
between A/B/C, turn the camera and change lighting. Dedicated test:
`npm run test:sprite:browser`. Always verify the current PR head's test status;
the previous green CI from before the binary upload does not cover this work.

**Do not merge automatically.** Preserve the earlier Inochi implementation until
the user has reviewed the new art and the replacement passes the full integration
gates. The visual identity remains the user-approved art, not the temporary
procedural alien.


## CI verification history

The first CI run after the user's asset push (run `37930313064`) stopped at
11 pre-existing lint issues in the first mint-elf cutout renderer, so it
provided no browser result. Run `37931203926` stopped at a separate
strict-lint optional-chain issue in the new viewer controls. Both sets of
findings have been corrected. Fresh verification is required on the corrected
head, including browser load of actual WebPs and comparison screenshots.
