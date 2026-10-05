# Inochi2D Passenger Rendering

Important passenger puppets are rendered through the official Inochi2D WebAssembly runtime and placed inside the Babylon taxi scene. Rendering remains presentation-only: passenger identity, relationships, suspicion, narrative state, and other gameplay truth stay outside this layer.

## Runtime supply

`npm run runtime:prepare` downloads the pinned official Inochi2D WASM release archive and verifies its SHA-256 digest before extracting the runtime to the generated public vendor directory.

The binary is not committed to Git. The BSD-2-Clause license is distributed in `public/third-party/Inochi2D-LICENSE.txt`.

Build/dev commands prepare the runtime automatically. A changed upstream nightly artifact with a different digest fails the build rather than silently changing renderer behavior.

## Boundary layers

The integration is intentionally layered:

1. `InochiWasmBindings` owns the browser WebAssembly C API and allocator scratch memory.
2. `OfficialInochiRuntimeAdapter` converts C/WASM pointers into normalized, copied TypeScript data.
3. `InochiPuppetSession` owns one puppet lifecycle, metadata, parameter writes, update/render, and disposal.
4. `InochiRenderProgram` validates mask/composite draw-state ordering.
5. `BabylonInochiPassengerRenderer` consumes only normalized draw frames and parents presentation beneath the existing taxi passenger-seat anchor.

Babylon/gameplay code never receives raw WASM pointers.

## Draw ABI

The current verified wasm32 ABI is parsed explicitly:

- vertex: four float32 values `x, y, u, v`;
- index: uint32;
- draw commands: source attachments, draw state, blend mode, mask mode, allocation/vertex/index offsets, element count, node type, and 64-byte node variables;
- mesh allocations;
- texture cache pixels;
- base-vertex behavior.

Invalid pointers/references/buffer sizes fail loudly.

## Part material variables

For Part and AnimatedPart commands the bridge decodes the current `PartVars` layout:

- tint;
- screen tint;
- opacity;
- emission strength.

The current base passenger shader follows the Inochi reference albedo equation: sampled albedo × authored opacity × active soft mask, followed by screen tint and tint.

The passenger lighting/material bridge now consumes the official texture usage order:

- slot 0: albedo;
- slot 1: emissive;
- slot 2: bump map.

Albedo and emissive are supported. Emission uses the authored `emissionStrength` from Part variables.

Bump maps remain fail-closed until their exact reference-lighting semantics are implemented; the renderer never silently treats them as a generic Babylon normal map.

## Soft masks

Mask support follows the current runtime/reference renderer state order:

```text
push-mask
  define-mask ...
  normal/composite content ...
pop-mask
```

Masks retain continuous alpha rather than reducing coverage to stencil bits.

The bridge:

- starts a first-level mask at 0 for normal mask accumulation or 1 for dodge replacement;
- copies the current mask when nesting another layer;
- rasterizes source meshes with texture alpha;
- uses source `mask` alpha or `1 - alpha` for `dodge`;
- uses GPU-compatible top-left triangle coverage to avoid double-counting shared edges;
- maps the resulting mask to Babylon UV2 coordinates.

Composite begin/end/blit states are structurally validated but remain fail-closed until a framebuffer-composite backend is required by production content. The current production/CI puppet does not emit composite states.

## Blend modes

The bridge only claims a blend mapping when Babylon state matches the Inochi reference equations.

Currently exact mappings include:

- `normal` → premultiplied Porter-Duff;
- `screen` → screen mode;
- `linear-dodge` → Babylon additive `ONE + ONE` (`ALPHA_ONEONE`), matching the current Inochi legacy renderer.

Other modes fail loudly rather than being approximated under a similar-sounding Babylon constant.

## Seat placement and ordering

Each puppet receives a renderer root parented under `taxi-anchor-passenger-seat`.

Draw-command order is preserved through deterministic Babylon alpha ordering. Puppet geometry is scaled from authored pixel space into taxi scene units without creating a second passenger/world coordinate authority.

## Verification

Unit/runtime validation covers:

- wasm32 ABI parsing;
- official binding adapter extraction;
- parameter bounds and lifecycle;
- draw-state balancing;
- Part variable decoding;
- soft-mask alpha/dodge/nesting/edge coverage;
- Babylon seat placement, geometry, UV/UV2, material state, ordering, unsupported-state failures, and disposal.

The production browser smoke has two complementary proofs:

- a tiny generated puppet exercises deterministic semantic performance parameters and the stylized lighting bridge through the real official WASM runtime;
- the pinned upstream Inochi2D `examples/ada-static.inx` puppet is the real-puppet acceptance fixture for the rendering bridge.

The Ada proof is digest-pinned by its upstream Git blob identity. It must load through official WASM, produce a non-empty real draw frame, and render successfully beneath the real TaxiScene passenger-seat anchor. The probe reports live draw states, blend modes, mask depth, and composite depth so renderer support is driven by observed puppet requirements rather than speculative complexity.

A generated fixture can verify narrow contracts, but it is not a substitute for the real upstream puppet acceptance gate for #21. None of these fixtures create a parallel demo renderer; all pass through the same production runtime/session/Babylon bridge.
