# Sheps.Studio Tools

The tool hub and its tools, moved here from Claude artifacts so they can be worked on alongside the site.
Plain HTML, no build step. Source lives in `tools/`; `site/tools/` is the deployable copy.

| Path | Tool | Notes |
|---|---|---|
| `/tools` | Tool hub | Lists every tool. Edit the `TOOLS` array to add one. |
| `/tools/hex-alpha` | Hex Alpha Calculator | Opacity ↔ 8-digit hex, previews, background / shadow / radius popups. |
| `/tools/ease-lab` | Ease Lab | Motion curves, previews and motion tokens. |
| `/tools/pdf-viewer` | PDF Viewer | `<pdf-viewer>` web component. `pdf-viewer.js` + `vendor/` (PDF.js) sit beside it. |
| `/tools/ds-layers` | Design System Layers | Exploded 3D stack of a design system. |
| `/tools/stack` | Stack | Design system as six line plates. |
| `/tools/inflate` | Inflate | X-ray pigeon image generator. |
| `/tools/ascii-filter` | ASCII Filter | Images and video to live ASCII art. A self-contained bundle: the page lives in the `__bundler/template` JSON, so edit inside that, not the outer HTML. `?embed=1` hides the nav and sidebar. |
| `/tools/dot-wake` | Dot Wake | The sheps.design hero dot effect as a tool: image/video to a halftone of dots with a cursor wake. Ported from `components/ASCIIWake.jsx` (Bencho, MIT). Default source is `/ascii/media/large-spot.mp4`. |
| `/tools/bloom` | Bloom | An uploaded image builds up out of soft colour blooms, coarse to fine, then comes into focus out of a blur. A dreamy loading effect. Opens with a sample (`/tools/bloom/cube.webp`). Build time 3–120s (default 30), blur, grain, glow, start colour. Exports PNG and a video of the build. |

## Things that only work inside Claude

These pages were built as Claude artifacts. On the open web they load, but these features need the Claude runtime (`window.claude`):

- **Inflate**: generating images runs through the viewer's Figma connector. Off Claude, "Copy for Midjourney" and "Upload image" still work.
- **Stack**: saving your own design systems uses Claude's artifact storage. The built-in systems still show.

## Shared pieces

- **About popup**: every tool has an About link that opens the dotted-head explainer. The head is the site's `components/EyeTracker.jsx` (from Bencho, MIT), bundled inline and rendered with React 18 from cdnjs. Each page inlines `shepsAbout({ link, lines, dark })`; edit `lines` to change the copy.
- **Analytics**: each page loads `/analytics.js`.
- **Drafts**: pages carry `noindex, nofollow` and are not in the sitemap or llms.txt yet. Remove the meta and add them there when the hub goes live.
- **Paths**: links and scripts use absolute `/tools/...` paths because `vercel.json` sets `trailingSlash: false`, which would break relative paths.
