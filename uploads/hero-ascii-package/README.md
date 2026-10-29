# hero — ASCII video embed

Files:
- hero-ascii.mp4 — looping ASCII video, 2030×2034, 5.0s, 4.0 MB
- hero-ascii-poster.webp — first frame, shown while the video loads
- embed.html — working preview of the tag below

## Instructions for Claude
Copy hero-ascii.mp4 and hero-ascii-poster.webp into the project (same folder as the page, or update the paths). Place this element where the image should appear. Keep autoplay + muted + playsinline so it plays on mobile. It fills its container's width; wrap it in a sized container with overflow:hidden to crop.

```html
<video src="hero-ascii.mp4" poster="hero-ascii-poster.webp" autoplay muted loop playsinline aria-label="hero"
  width="2030" height="2034" style="display:block; width:100%; height:auto; object-fit:cover"></video>
```
