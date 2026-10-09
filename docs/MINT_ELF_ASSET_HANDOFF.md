# Mint elf source art — asset handoff

The supplied character sheet has been cut into real alpha-preserving source-art images (portrait, torso, head and right antenna), plus a JSON manifest. These are currently **rough cutouts**, not fully repaired rig-ready parts: hair/antenna seams and face overlays require refinement. The lips, irises and eyelids remain baked into the head image.

Target directory: `public/passengers/mint-elf/`.

Current GitHub connector cannot ingest the generated binary files directly. The assets were produced in the ChatGPT conversation as `outsider-mint-elf-assets.zip` and must be transferred to the repository before any browser rendering can honestly be marked working. Do not claim this character has replaced the existing lab candidate or that browser testing passed.

Next steps: place the alpha-preserving images at the target directory, add a Babylon cutout renderer that uses the real textures, and test the three candidate modes against the actual portrait. Retain PR #79 Draft; do not merge or remove Inochi dependencies until tested.
