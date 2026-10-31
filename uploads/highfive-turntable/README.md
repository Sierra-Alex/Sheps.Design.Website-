# Highfive turntable — scroll hero

A scroll-driven hero: as the visitor scrolls, the Highfive camera bar turns 180° from front to back, while a pink cloud rises from the bottom, dissolves as it crosses the camera, and the sky pushes in toward a cloud sea. Port callouts appear on the back view at the end.

This folder has everything needed to add it to the Sheps.Studio / sheps.design page in Claude Design.

---

## What's in the folder

| File | Use it when |
|---|---|
| `highfive-turntable-standalone.html` | **Easiest upload.** One file (~1.8 MB) with every image and all 120 frames embedded. Works on its own anywhere. |
| `hero.html` | The hero section only, loading images from `assets/` and `frames/`. Use this if Claude Design keeps assets as separate files. |
| `full-page-reference.html` | The hero plus the dark "Around the back" ports section and footer, for reference. |
| `frames/f001.webp` … `f120.webp` | The turntable: 120 rendered frames, 0° → 180°, 1.5° apart. 1440×420, transparent background. |
| `assets/sky-sea.webp` | Background: sky and distant cloud sea with peaks (2880×1600). Pinned to the bottom of the screen. |
| `assets/cloud-front.webp` | The big cloud that rises in front of the camera (from the Figma "hero animation" frames). |
| `assets/cloud-pink.webp`, `cloud-pastel.webp` | The two small far clouds behind the camera. |

Fonts load from Google Fonts: **Noto Serif** (headline) and **Manrope** (body/labels). The Highfive logo and play button are inline SVG from the Figma file.

---

## How it works

**Structure.** A tall section (`.scene`, 420vh) with a sticky full-screen panel inside it (`.pin`, 100vh). Scroll progress through the section, `p` from 0 to 1, drives everything. One full turn = 3.2 screen-heights of scrolling.

**The turntable.** A `<canvas>` (`#cv`, 1440×420) draws one of the 120 frames: `frame = round(p × 119)`. Frames preload in a coarse-to-fine order (frame 1, then every 8th, 4th, 2nd, then the rest), so scrubbing works before everything has loaded; until a frame arrives the nearest loaded one is drawn. The camera sits centred on screen at `width: min(86.2vw, 1320px)`.

**Layers, back to front:**

| z | Layer | Behaviour |
|---|---|---|
| 0 | `.bg` sky + cloud sea | `background-size: cover`, anchored to the bottom. Scales 100% → **120%** across the scroll, growing from the bottom edge so the cloud sea stays pinned. |
| 1 | `.cl.pink`, `.cl.pastel` far clouds | Rise at **different speeds**: pink travels ~420 Figma px (slow, further away); pastel ~880 (about twice as fast). Muted to match the cloud sea. |
| 2 | `.stage` camera canvas + callouts | Centred. Port callouts fade in from p = 0.84 to 0.94. |
| 4 | `.frontcloud` big cloud | Follows the five Figma keyframes (see below). Fades and swells as it crosses the camera. |
| 5 | `.head` headline, `.nav` | Always above the clouds. |
| 6 | `.rail` scroll indicator | 0° → 180° progress line with a live degree readout, pinned near the bottom. |

**Front cloud keyframes.** From the Figma "hero animation" section (five 1440×800 frames, camera centred at y = 400): the cloud's top edge sits at **632, 362, 42, −308, −588** in frames 1–5, interpolated linearly across the scroll. Positions are scaled by how wide the camera renders (`stage width ÷ 1241`), so it keeps its relationship to the camera at any screen size.

**Front cloud fade.** Tied to position, not scroll percentage. The fade starts when the cloud's visible top edge (5% down the image) reaches the **bottom of the camera**, and it's gone when that edge passes the **top of the camera**. As it fades it scales up to **112%** from its bottom edge, so it billows upward as it dissolves.

**Cloud treatment.** Both the front and far clouds use `filter: saturate(.45) brightness(1.06) contrast(.88) blur(2.5px)` so they sit with the cloud sea rather than on top of it. The front cloud also fades out over its bottom 22% with a mask.

**Play button.** Glides through the full turn in about 5.2 s (ease-in-out). Clicking again pauses; scrolling, touch or keys take over.

---

## Values you're likely to tweak

All in the `<script>` and `<style>` of `hero.html`:

| What | Where | Current |
|---|---|---|
| Scroll length of the turn | `.scene{height:420vh}` | 420vh |
| Background push-in | `bgEl.style.transform = scale(1 + 0.2 * p)` | 0.2 (→ 120%) |
| Front cloud path | `KEYS = [632, 362, 42, -308, -588]` | Figma frames 1–5 |
| Front cloud swell while fading | `scale(1 + 0.12 * e)` | 0.12 (→ 112%) |
| Far cloud speeds | `FAR[].y0 / y1` | pink 300 → −120, pastel 620 → −260 |
| Far cloud strength | `FAR[].op` | 0.72 / 0.70 |
| Cloud colour match | `.cl` and `.frontcloud` `filter` | see above |
| When callouts appear | `band(p, [0.84, 0.94, 2, 3])` | 84–94% |

---

## Adding it to the Sheps.Studio page

1. Upload `highfive-turntable-standalone.html` (or `hero.html` with the `assets/` and `frames/` folders).
2. Paste the prompt below into Claude Design.

The page's class names are short and generic (`.scene`, `.pin`, `.stage`, `.head`, `.nav`, `.rail`, `.label`, `.serif`, `.gut`). If they clash with the existing page, prefix them (e.g. `hf-`) when merging. The JavaScript is wrapped in its own function and only looks up its own IDs (`scene`, `cv`, `stage`, `bg`, `frontcloud`, `co`, `fill`, `deg`, `load`, `play`).

### Prompt for Claude Design

> I've uploaded a finished scroll animation: the Highfive camera turntable hero (`highfive-turntable-standalone.html`, plus `README.md`, which explains how it works). Add it to my full page design as a section, keeping the animation exactly as it is: the 420vh pinned scroll section, the 120-frame canvas turntable, the sky background that scales from 100% to 120% while pinned to the bottom, the front cloud following its five keyframes and fading as it crosses the camera, the two far clouds at different speeds, the port callouts at the end, the play button, and the 0–180° scroll indicator. Don't re-time or restyle the motion. Fit the section into the page's layout and spacing, and prefix its class names if they clash with the existing styles. [Say where it should go, e.g. "as a case-study section after the hero" or "inside the Highfive project page".]

---

## Notes

- **Ports on the back are mirrored** compared with the real device photo (the render shows Audio/HDMI on the left; the real unit has DC in/Reset/Ethernet on the left). The callout labels match the render. Fixing it means a change to the Blender model and a re-render.
- **Captions** ("The lens sits deep in the face" etc.) are still in the markup but hidden, because the Figma frames don't use them. Remove `hidden` from `.caps` to bring them back.
- The frames were rendered in Blender (Cycles, 128 samples, denoised) with pastel sky lighting and light motion blur. The source file is `Untitled.blend` in the Highfive_Turntable folder.
