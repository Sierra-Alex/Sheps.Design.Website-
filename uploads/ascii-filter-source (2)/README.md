# ASCII Filter — source package

Live, editable version of the ASCII effect. Nothing is baked: the filter renders from the raw media every frame.

## Files
- ascii-filter.dc.html — the entire tool: UI template + render/export logic (class Component, in the <script data-dc-script> block).
- support.js — runtime that mounts the .dc.html file ({{ }} holes, <sc-if>, <sc-for>). Leave as-is unless changing the runtime.
- ascii-project.json — every current setting (settings) + path to the media (media).
- media/medium-spot.mp4 — the original, unfiltered video.
- embed.html — how to place the live render on a site (iframe of the tool in embed mode).

## Run
Needs a local server (fetching the JSON/media fails on file://):
```
npx serve .      # or: python3 -m http.server
```
- Editor with this project loaded: /ascii-filter.dc.html?project=ascii-project.json
- Output only (no UI, autoplay loop): /ascii-filter.dc.html?project=ascii-project.json&embed=1
- Without ?project, the editor restores its last browser session instead.

## Iterating
- Change the look: edit ascii-project.json → reload. Keys match the tool's state (cols, fontSize, ramp, stops, windows, flares, revealOn, tiltOn…).
- Or tweak in the editor UI, then hit Source package again to regenerate this folder.
- Swap media: drop a new file into media/ and update media in the JSON.
- Render pipeline: compute() (glyph grid) → paint() (canvas: glyphs, reveal windows, flares, data overlay) → draw().
- Embed mode: this.embed (from ?embed=1 in componentDidMount) and the notEmbed template flag.

## Putting it on a website
Copy this folder into the site (e.g. /ascii/) and use the iframe from embed.html, adjusting the src path.
For a native (non-iframe) integration, port compute() + paint() into the site's own canvas component and feed it settings from the JSON.
