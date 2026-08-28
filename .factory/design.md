# Trace Context Probe — visual thesis

## Direction: paper-cut diorama

Trace propagation is invisible, layered, and easiest to reason about when each async hop feels like a physical stage. The interface is a top-down paper diorama: cream stock is the process, raised cards are boundaries, a stitched cord is the trace lineage, and a torn gap is the first lost context. The metaphor explains the product; it is not ornamental. The site is intentionally single-mode, painted as warm paper to keep diagnostic colors unambiguous.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#F3EAD7` | page ground |
| Paper light | `#FFF9EC` | raised layers and inputs |
| Ink | `#192E2B` | primary text (12.1:1 on paper light) |
| Muted ink | `#4C615C` | secondary text (6.6:1 on paper) |
| Teal thread | `#087F73` | active controls and preserved context |
| Deep teal | `#075E57` | links and control hover states |
| Saffron | `#D98614` | attention and pending states |
| Rust | `#A9362B` | broken boundary and errors |
| Cut edge | `#D7C7A9` | borders and paper depth |
| Aubergine | `#51334E` | terminal/code surfaces |

Status never relies on color: every result also has a shape, icon, and label (`Preserved`, `Lost`, or `Mismatch`). All foreground pairs target WCAG AA or better.

## Type

- Display: Georgia, Cambria, `Times New Roman`, serif. Its editorial shapes make the explanatory layer feel like annotations on a physical field notebook.
- Utility and body: `ui-monospace`, SFMono-Regular, Consolas, monospace. Trace IDs, code, control labels, and prose share the precise voice of a diagnostic instrument.
- No fonts are downloaded. System families keep the package private, fast, and legible. Body text is at least 16px with 1.6 line height; numeric IDs use tabular figures.

## Spacing and shape

- An 8px base rhythm (`4, 8, 12, 16, 24, 32, 48, 64, 96`).
- Content max width 1180px; prose max width 68 characters.
- Corners are lightly hand-cut rather than pill-shaped: 2–10px radii with asymmetric `clip-path` only on decorative layers.
- Shadows are hard-edged offsets (`4px 5px 0`) to read as stacked cardstock, never glass blur.
- Controls are at least 44px tall, with an offset teal focus outline.

## Interaction grammar

- The main action is “Run five break tests.” It turns the illustrated thread into five named checkpoints.
- Scenario tabs behave as a real keyboard-operable radio group; selecting one updates the graph and its text alternative.
- Copy actions confirm in a polite live region. Offline state leaves the demo fully functional and explains that nothing is sent anywhere.
- Diagnostic cards form a left-to-right lineage on wide screens and a top-to-bottom thread on phones. The phone view drops ambient cut-paper scraps and retains every diagnostic label.

## Motion

Layers enter once with 180–260ms transform-and-opacity movement from their apparent paper depth. A newly identified break receives one 220ms emphasis. No animation loops. Under `prefers-reduced-motion: reduce`, transforms and transitions are removed and state changes are instant; depth remains through outline, overlap, and shadow.

## Original asset plan and provenance

- `site/public/hero-diorama.webp`: original generated paper-cut illustration showing a teal trace thread crossing callback, timer, queue, stream, and middleware layers before a visible torn gap. It contains no text, logo, UI, or third-party mark. It is explanatory atmosphere beside the real semantic demo, with concise alt text.
- Generator: Param Factory `/opt/fleet/lib/gen-image.sh`, deployment recorded in the adjacent generation metadata. Generated 2026-08-28 for this repository; project use under the repository MIT license. No stock assets or third-party marks.
- Prompt: “Use case: stylized-concept. Asset type: landing page hero illustration. Primary request: an intricate tactile paper-cut diorama explaining a distributed trace crossing asynchronous Node.js boundaries. Scene/backdrop: warm cream archival paper viewed in a shallow three-quarter top-down perspective. Subject: one continuous teal paper thread travels through five distinct layered portals suggesting a callback loop, clock/timer, queue tray, flowing stream channel, and framework arch; after the fourth portal the thread has one unmistakable torn gap with the loose ends visible, then continues faintly. Style/medium: handcrafted cut cardstock, folded paper edges, subtle fiber texture, editorial technical illustration, no photorealism. Composition/framing: wide landscape, action concentrated center and right, calm negative space at left for page copy. Lighting/mood: soft studio side light, crisp small paper shadows, analytical but inviting. Color palette: warm cream, ink green, deep teal, restrained saffron, one rust-red torn edge. Constraints: no words, no letters, no numbers, no logos, no people, no screens, no watermark; clean silhouettes; one trace thread only. Avoid: generic gradient, neon glow, glossy 3D plastic, stock vector style, illegible pseudo-text.”

The runtime graph and icons are original HTML/CSS/SVG primitives generated from probe data, not external assets.
