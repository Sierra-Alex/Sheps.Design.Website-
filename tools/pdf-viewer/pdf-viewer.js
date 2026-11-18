/*!
 * <pdf-viewer> — an embeddable PDF viewer web component built on PDF.js.
 *
 * Usage:
 *   <script type="module" src="pdf-viewer.js"></script>
 *   <pdf-viewer src="/files/report.pdf" style="height: 720px"></pdf-viewer>
 *
 * Attributes:
 *   src            URL of a PDF or an image (PNG, JPG, GIF, WebP, AVIF, SVG).
 *                  Several, comma-separated, become one document:
 *                  src="cover.png, brochure.pdf, back.png"
 *                  (files must be same-origin or CORS-enabled)
 *   page           Initial page number (default 1)
 *   zoom           "fit-width" (default), "fit-page", or a number like 1.25
 *   view           "scroll" (default) or "book" — two-page spreads with page turns
 *   filename       Name used for the download button (default: from src)
 *   no-toolbar     Hide the toolbar
 *   no-download    Hide the download button
 *   no-text        Disable the selectable text layer
 *   pdfjs-base     Base URL for self-hosted pdf.min.mjs / pdf.worker.min.mjs
 *
 * JS API:
 *   el.goToPage(n), el.next(), el.prev(), el.setZoom(1.5 | "fit-width"),
 *   el.load(source | [sources]) — URLs, Files/Blobs, ArrayBuffers or Uint8Arrays,
 *   PDFs and images mixed freely; el.page, el.pageCount
 *
 * Events:
 *   pdf-loaded  { detail: { pageCount } }
 *   page-change { detail: { page, pageCount } }
 *   zoom-change { detail: { zoom, mode } }
 *   pdf-error   { detail: { error } }
 *
 * Theming (CSS custom properties, set on the element or any ancestor):
 *   --pdfv-bg, --pdfv-toolbar-bg, --pdfv-toolbar-fg, --pdfv-border,
 *   --pdfv-accent, --pdfv-radius, --pdfv-font, --pdfv-page-gap,
 *   --pdfv-page-shadow, --pdfv-control-hover
 */

const PDFJS_VERSION = "4.10.38";
let PDF_FILE = "pdf.min.mjs", WORKER_FILE = "pdf.worker.min.mjs";
export function setPdfjsFiles(a, b) { PDF_FILE = a; WORKER_FILE = b; }
const DEFAULT_PDFJS_BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build`;

const pdfjsCache = new Map();
function loadPdfjs(base) {
  base = base.replace(/\/$/, "");
  if (!pdfjsCache.has(base)) {
    pdfjsCache.set(
      base,
      import(`${base}/${PDF_FILE}`).then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = `${base}/${WORKER_FILE}`;
        return lib;
      })
    );
  }
  return pdfjsCache.get(base);
}

const IMG_EXT = /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:[?#]|$)/i;

function sniffImage(b) {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  if (b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  return null;
}

// Work out whether a source is an image or a PDF, without loading all of it.
async function classify(src) {
  if (typeof src === "string") {
    const url = new URL(src, document.baseURI).href;
    const name = /^data:/i.test(src) ? "" : decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() || "");
    const kind = /^data:image\//i.test(src) || IMG_EXT.test(url) ? "image" : "pdf";
    return { kind, url, name };
  }
  let blob;
  if (src instanceof Blob) blob = src;
  else {
    const bytes = src instanceof ArrayBuffer ? new Uint8Array(src) : src;
    blob = new Blob([bytes], { type: sniffImage(bytes) || "application/pdf" });
  }
  let type = blob.type;
  if (!type || type === "application/octet-stream") {
    type = sniffImage(new Uint8Array(await blob.slice(0, 16).arrayBuffer())) || "application/pdf";
  }
  const name = src.name || "";
  if (type.startsWith("image/")) return { kind: "image", url: URL.createObjectURL(blob), objectUrl: true, blob, name, type };
  return { kind: "pdf", data: new Uint8Array(await blob.arrayBuffer()), blob, name, type: "application/pdf" };
}

// A page object with the same shape PDF.js pages have, backed by an image.
async function imagePage(url) {
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  const w = img.naturalWidth || 1000, h = img.naturalHeight || 1000;
  return {
    isImage: true,
    getViewport: ({ scale = 1 }) => ({ width: w * scale, height: h * scale, scale }),
    render({ canvasContext: ctx, viewport, transform }) {
      let cancelled = false;
      const promise = Promise.resolve().then(() => {
        if (cancelled) throw Object.assign(new Error("cancelled"), { name: "RenderingCancelledException" });
        ctx.save();
        if (transform) ctx.setTransform(...transform);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, viewport.width, viewport.height);
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, viewport.width, viewport.height);
        ctx.restore();
      });
      return { promise, cancel: () => (cancelled = true) };
    },
  };
}

const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];
const PAGE_PADDING = 24; // px of breathing room around pages when fitting

const icons = {
  prev: '<path d="M15 18l-6-6 6-6"/>',
  next: '<path d="M9 18l6-6-6-6"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  fit: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  shrink: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5V20"/>',
  scroll: '<rect x="6" y="3" width="12" height="8" rx="1"/><rect x="6" y="13" width="12" height="8" rx="1"/>',
};
const svg = (name) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

const template = document.createElement("template");
template.innerHTML = /* html */ `
<style>
  :host {
    --_bg: var(--pdfv-bg, #eceef1);
    --_tb-bg: var(--pdfv-toolbar-bg, #ffffff);
    --_tb-fg: var(--pdfv-toolbar-fg, #1d2330);
    --_border: var(--pdfv-border, #d9dce3);
    --_accent: var(--pdfv-accent, #3b5bfd);
    --_radius: var(--pdfv-radius, 10px);
    --_font: var(--pdfv-font, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif);
    --_gap: var(--pdfv-page-gap, 16px);
    --_shadow: var(--pdfv-page-shadow, 0 1px 3px rgb(0 0 0 / 0.12), 0 4px 16px rgb(0 0 0 / 0.06));
    --_hover: var(--pdfv-control-hover, rgb(0 0 0 / 0.06));

    display: flex;
    flex-direction: column;
    position: relative;
    height: 600px;
    min-height: 240px;
    overflow: hidden;
    border: 1px solid var(--_border);
    border-radius: var(--_radius);
    background: var(--_bg);
    font-family: var(--_font);
    color: var(--_tb-fg);
    box-sizing: border-box;
    contain: layout paint;
  }
  :host(:fullscreen) { border-radius: 0; border: 0; height: 100vh; }
  * { box-sizing: border-box; }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 8px;
    background: var(--_tb-bg);
    border-bottom: 1px solid var(--_border);
    flex: none;
    font-size: 13px;
    user-select: none;
  }
  :host([no-toolbar]) .toolbar { display: none; }
  .group { display: flex; align-items: center; gap: 2px; }
  .spacer { flex: 1; }
  .divider { width: 1px; height: 20px; background: var(--_border); margin: 0 6px; }

  button {
    all: unset;
    display: inline-grid;
    place-items: center;
    min-width: 32px;
    height: 32px;
    padding: 0 6px;
    border-radius: calc(var(--_radius) - 4px);
    cursor: pointer;
    color: inherit;
    font: inherit;
  }
  button:hover:not(:disabled) { background: var(--_hover); }
  button:focus-visible, input:focus-visible, select:focus-visible {
    outline: 2px solid var(--_accent);
    outline-offset: 1px;
  }
  button:disabled { opacity: 0.35; cursor: default; }
  :host([no-download]) .download, .download[hidden] { display: none; }

  .page-input {
    width: 3.2em;
    height: 28px;
    text-align: center;
    border: 1px solid var(--_border);
    border-radius: calc(var(--_radius) - 4px);
    background: transparent;
    color: inherit;
    font: inherit;
    -moz-appearance: textfield;
  }
  .page-input::-webkit-inner-spin-button, .page-input::-webkit-outer-spin-button { -webkit-appearance: none; }
  .count { padding: 0 6px; opacity: 0.7; white-space: nowrap; }

  .zoom-select {
    height: 28px;
    border: 1px solid var(--_border);
    border-radius: calc(var(--_radius) - 4px);
    background: transparent;
    color: inherit;
    font: inherit;
    padding: 0 4px;
    cursor: pointer;
  }

  .body { flex: 1; position: relative; min-height: 0; display: flex; flex-direction: column; }
  :host([view="book"]) .viewport { display: none; }
  :host([view="book"]) .zoom-group { display: none; }

  /* ---------- book view ---------- */
  .book { position: absolute; inset: 0; display: none; overflow: hidden; user-select: none; -webkit-user-select: none; touch-action: pan-y; cursor: grab; outline: none; }
  .book:active { cursor: grabbing; }
  :host([view="book"]) .book { display: block; }
  .spread { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); perspective: 2600px; }
  .paper { position: absolute; top: 0; width: var(--pw); height: 100%; background: #fff; overflow: hidden; }
  .paper canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .paper:not(.none) { box-shadow: var(--_shadow); }
  .paper.none { background: transparent; }
  .paper.l::after, .paper.r::after { content: ""; position: absolute; inset: 0; pointer-events: none; }
  .paper.l::after { background: linear-gradient(to left, rgb(0 0 0 / .16), rgb(0 0 0 / .04) 5%, transparent 14%); }
  .paper.r::after { background: linear-gradient(to right, rgb(0 0 0 / .16), rgb(0 0 0 / .04) 5%, transparent 14%); }
  .leaf { position: absolute; top: 0; width: var(--pw); height: 100%; transform-origin: left center; transform-style: preserve-3d; z-index: 2; will-change: transform; }
  .face { left: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
  .face.back { transform: rotateY(180deg); }
  .shade { position: absolute; inset: 0; pointer-events: none; opacity: 0; z-index: 1; background: linear-gradient(to left, rgb(0 0 0 / .24), rgb(0 0 0 / .05)); }
  .face.back .shade { background: linear-gradient(to right, rgb(0 0 0 / .24), rgb(0 0 0 / .05)); }

  .viewport {
    flex: 1;
    overflow: auto;
    position: relative;
    outline: none;
    overscroll-behavior: contain;
  }
  .pages {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--_gap);
    padding: var(--_gap);
    min-width: min-content;
  }
  .page {
    position: relative;
    background: #fff;
    box-shadow: var(--_shadow);
    flex: none;
  }
  .page canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
  .page.loading::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgb(0 0 0 / 0.03), transparent);
    background-size: 200% 100%;
    animation: shimmer 1.2s infinite;
  }
  @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

  /* PDF.js text layer (selectable / searchable text) */
  .textLayer {
    position: absolute; text-align: initial; inset: 0; overflow: clip; opacity: 1;
    line-height: 1; text-size-adjust: none; -webkit-text-size-adjust: none;
    forced-color-adjust: none; transform-origin: 0 0; caret-color: CanvasText; z-index: 0;
  }
  .textLayer :is(span, br) {
    color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%;
  }
  .textLayer > :not(.markedContent), .textLayer .markedContent span:not(.markedContent) { z-index: 1; }
  .textLayer span.markedContent { top: 0; height: 0; }
  .textLayer ::selection { background: color-mix(in srgb, var(--_accent), transparent 70%); }
  .textLayer br::selection { background: transparent; }
  .textLayer .endOfContent {
    display: block; position: absolute; inset: 100% 0 0; z-index: 0; cursor: default; user-select: none;
  }
  .textLayer.selecting .endOfContent { top: 0; }

  .status {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    text-align: center;
    padding: 24px;
    font-size: 14px;
    opacity: 0.75;
    pointer-events: none;
  }
  .status[hidden] { display: none; }

  @media (max-width: 520px) {
    .hide-sm { display: none; }
  }
</style>

<div class="toolbar" part="toolbar" role="toolbar" aria-label="PDF controls">
  <div class="group">
    <button class="prev" title="Previous page" aria-label="Previous page">${svg("prev")}</button>
    <input class="page-input" type="number" min="1" value="1" aria-label="Page number" />
    <span class="count">/ –</span>
    <button class="next" title="Next page" aria-label="Next page">${svg("next")}</button>
  </div>
  <div class="spacer"></div>
  <div class="group zoom-group">
    <button class="zoom-out" title="Zoom out" aria-label="Zoom out">${svg("minus")}</button>
    <select class="zoom-select hide-sm" aria-label="Zoom level">
      <option value="fit-width">Fit width</option>
      <option value="fit-page">Fit page</option>
      ${[0.5, 0.75, 1, 1.25, 1.5, 2, 3].map((z) => `<option value="${z}">${Math.round(z * 100)}%</option>`).join("")}
      <option value="custom" hidden></option>
    </select>
    <button class="zoom-in" title="Zoom in" aria-label="Zoom in">${svg("plus")}</button>
  </div>
  <div class="spacer"></div>
  <div class="group">
    <button class="view" title="Book view" aria-label="Switch to book view">${svg("book")}</button>
    <button class="download" title="Download" aria-label="Download">${svg("download")}</button>
    <button class="fullscreen" title="Full screen" aria-label="Full screen">${svg("expand")}</button>
  </div>
</div>
<div class="body">
  <div class="viewport" part="viewport" tabindex="0">
    <div class="pages"></div>
  </div>
  <div class="book" part="book" tabindex="0" aria-roledescription="book" aria-label="Book view. Click or drag a page edge to turn it."></div>
</div>
<div class="status" part="status">Loading…</div>
`;

class PdfViewer extends HTMLElement {
  static observedAttributes = ["src", "page", "zoom", "view"];

  #lib = null;
  #doc = null;
  #loadTask = null;
  #pages = []; // { el, canvas, textEl, pdfPage, baseW, baseH, rendered, renderTask }
  #scale = 1;
  #zoomMode = "fit-width";
  #current = 1;
  #io = null;
  #ro = null;
  #loadId = 0;
  #blobUrl = null;
  #suppressScroll = false;
  #bk = { si: 0, single: false, pw: 0, ph: 0, spreads: [], cache: new Map(), anim: 0, busy: false, pending: 0, drag: null, wheel: 0 };

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.appendChild(template.content.cloneNode(true));
    const $ = (s) => root.querySelector(s);
    this.$ = {
      viewport: $(".viewport"),
      body: $(".body"),
      book: $(".book"),
      view: $(".view"),
      pages: $(".pages"),
      status: $(".status"),
      prev: $(".prev"),
      next: $(".next"),
      input: $(".page-input"),
      count: $(".count"),
      zoomIn: $(".zoom-in"),
      zoomOut: $(".zoom-out"),
      zoomSelect: $(".zoom-select"),
      download: $(".download"),
      fullscreen: $(".fullscreen"),
    };
    this.#bindUI();
  }

  // ---------- lifecycle ----------
  connectedCallback() {
    const z = this.getAttribute("zoom");
    if (z) this.#zoomMode = this.#parseZoom(z);

    this.#ro = new ResizeObserver(() => {
      if (!this.#doc) return;
      if (this.#isBook) { if (!this.#bk.busy) this.#layoutBook(); }
      else if (String(this.#zoomMode).startsWith("fit")) this.#applyZoom(this.#zoomMode, true);
    });
    this.#ro.observe(this.$.body);
    this.#syncViewButton();

    this.#io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) this.#renderPage(Number(e.target.dataset.index));
        }
      },
      { root: this.$.viewport, rootMargin: "100% 0px" }
    );

    if (this.getAttribute("src") && !this.#doc && !this.#loadTask) this.load(this.getAttribute("src"));
    else if (!this.getAttribute("src")) this.#setStatus("No file selected");
  }

  disconnectedCallback() {
    this.#ro?.disconnect();
    this.#io?.disconnect();
  }

  attributeChangedCallback(name, oldVal, val) {
    if (oldVal === val || !this.isConnected) return;
    if (name === "src" && val) this.load(val);
    if (name === "page" && val) this.goToPage(Number(val));
    if (name === "zoom" && val) this.setZoom(val);
    if (name === "view") this.#applyView();
  }

  // ---------- public API ----------
  get page() { return this.#current; }
  get pageCount() { return this.#doc?.numPages ?? 0; }
  get zoom() { return this.#scale; }
  next() { this.#isBook ? this.#flip(1) : this.goToPage(this.#current + 1); }
  prev() { this.#isBook ? this.#flip(-1) : this.goToPage(this.#current - 1); }

  setZoom(z) {
    if (!this.#doc) { this.#zoomMode = this.#parseZoom(z); return; }
    this.#applyZoom(this.#parseZoom(z));
  }

  goToPage(n, smooth = false) {
    if (!this.#doc) return;
    n = Math.min(Math.max(1, Math.round(n) || 1), this.#doc.numPages);
    if (this.#isBook) {
      const bk = this.#bk, target = this.#spreadOf(n);
      if (target === bk.si) return this.#setCurrent(n, true);
      if (Math.abs(target - bk.si) === 1 && !bk.busy) return this.#flip(target - bk.si);
      bk.si = target; return this.#renderSpread();
    }
    const target = this.#pages[n - 1].el;
    const gap = parseFloat(getComputedStyle(this.$.pages).paddingTop) || 0;
    this.$.viewport.scrollTo({ top: target.offsetTop - gap, behavior: smooth ? "smooth" : "auto" });
    this.#setCurrent(n);
  }

  async load(source) {
    const id = ++this.#loadId;
    this.#reset();
    this.#setStatus("Loading…");
    try {
      const doc = await this.#openSources(source, id);
      if (!doc) return;
      if (id !== this.#loadId) { doc.destroy(); return; }
      this.#doc = doc;
      this.$.download.hidden = doc.entries.length !== 1;
      await this.#buildPages();
      if (id !== this.#loadId) return;
      this.#setStatus(null);
      this.$.count.textContent = `/ ${doc.numPages}`;
      this.$.input.max = doc.numPages;
      this.#current = Number(this.getAttribute("page")) || 1;
      if (this.#isBook) this.#layoutBook();
      else {
        this.#applyZoom(this.#zoomMode, true);
        if (this.#current > 1) this.goToPage(this.#current);
        else this.#setCurrent(1, true);
      }
      this.dispatchEvent(new CustomEvent("pdf-loaded", { detail: { pageCount: doc.numPages } }));
    } catch (error) {
      if (id !== this.#loadId) return;
      const msg =
        error?.name === "PasswordException" ? "This PDF is password-protected." :
        error?.name === "InvalidPDFException" ? "This file isn't a valid PDF." :
        error?.name === "EncodingError" ? "Couldn't read this image." :
        "Couldn't load this file. Check the URL and that the server allows cross-origin requests.";
      this.#setStatus(msg);
      this.dispatchEvent(new CustomEvent("pdf-error", { detail: { error } }));
      console.error("[pdf-viewer]", error);
    } finally {
      if (id === this.#loadId) this.#loadTask = null;
    }
  }

  // ---------- internals ----------
  async #openSources(source, id) {
    let list = Array.isArray(source) ? source : [source];
    if (typeof source === "string" && !/^data:/i.test(source) && source.includes(",")) {
      list = source.split(",").map((s) => s.trim()).filter(Boolean);
    }
    const pages = [], pdfDocs = [], entries = [];
    const destroy = () => {
      pdfDocs.forEach((d) => d.destroy());
      entries.forEach((e) => e.objectUrl && URL.revokeObjectURL(e.url));
    };
    try {
      for (const src of list) {
        const e = await classify(src);
        entries.push(e);
        if (e.kind === "image") {
          pages.push(await imagePage(e.url));
        } else {
          this.#lib ??= await loadPdfjs(this.getAttribute("pdfjs-base") || DEFAULT_PDFJS_BASE);
          this.#loadTask = this.#lib.getDocument({ ...(e.data ? { data: e.data } : { url: e.url }), isEvalSupported: false });
          const d = await this.#loadTask.promise;
          pdfDocs.push(d);
          for (let i = 1; i <= d.numPages; i++) pages.push(await d.getPage(i));
        }
        if (id !== this.#loadId) { destroy(); return null; }
      }
    } catch (err) {
      destroy();
      throw err;
    }
    if (!pages.length) throw new Error("No pages to show");
    return { numPages: pages.length, getPage: async (i) => pages[i - 1], destroy, entries, pdfDocs };
  }

  #reset() {
    this.#loadTask?.destroy();
    this.#io?.disconnect();
    for (const p of this.#pages) p.renderTask?.cancel();
    this.#pages = [];
    this.#doc?.destroy();
    this.#doc = null;
    this.$.pages.replaceChildren();
    cancelAnimationFrame(this.#bk.anim);
    Object.assign(this.#bk, { si: 0, pw: 0, spreads: [], busy: false, pending: 0, drag: null });
    this.#bk.cache.clear();
    this.$.book.replaceChildren();
    this.$.count.textContent = "/ –";
    this.#current = 1;
    this.$.input.value = 1;
    if (this.#blobUrl) { URL.revokeObjectURL(this.#blobUrl); this.#blobUrl = null; }
  }

  async #buildPages() {
    const doc = this.#doc;
    // Fetch first page to estimate sizes; fetch the rest's sizes in parallel.
    const pdfPages = await Promise.all(Array.from({ length: doc.numPages }, (_, i) => doc.getPage(i + 1)));
    const frag = document.createDocumentFragment();
    pdfPages.forEach((pdfPage, i) => {
      const vp = pdfPage.getViewport({ scale: 1 });
      const el = document.createElement("div");
      el.className = "page loading";
      el.dataset.index = i;
      el.setAttribute("part", "page");
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", `Page ${i + 1}`);
      frag.appendChild(el);
      this.#pages.push({ el, pdfPage, baseW: vp.width, baseH: vp.height, rendered: 0, renderTask: null, canvas: null, textEl: null });
    });
    this.$.pages.appendChild(frag);
    this.#pages.forEach((p) => this.#io.observe(p.el));
  }

  #parseZoom(z) {
    if (z === "fit-width" || z === "fit-page") return z;
    const n = parseFloat(z);
    return Number.isFinite(n) && n > 0 ? Math.min(Math.max(n, 0.1), 6) : "fit-width";
  }

  #computeScale(mode) {
    if (typeof mode === "number") return mode;
    const first = this.#pages[0];
    if (!first) return 1;
    const vw = this.$.viewport.clientWidth - PAGE_PADDING * 2;
    const vh = this.$.viewport.clientHeight - PAGE_PADDING * 2;
    const maxW = Math.max(...this.#pages.map((p) => p.baseW));
    const wScale = vw / maxW;
    if (mode === "fit-page") return Math.max(0.1, Math.min(wScale, vh / first.baseH));
    return Math.max(0.1, Math.min(wScale, 4));
  }

  #applyZoom(mode, keepPage = true) {
    const scale = this.#computeScale(mode);
    this.#zoomMode = mode;
    const pageBefore = this.#current;
    const vp = this.$.viewport;
    // Preserve relative scroll position within the current page
    const curEl = this.#pages[pageBefore - 1]?.el;
    const relY = curEl ? (vp.scrollTop - curEl.offsetTop) / (curEl.offsetHeight || 1) : 0;

    if (Math.abs(scale - this.#scale) > 0.001 || !this.#pages[0]?.el.style.width) {
      this.#scale = scale;
      for (const p of this.#pages) {
        p.el.style.width = `${Math.floor(p.baseW * scale)}px`;
        p.el.style.height = `${Math.floor(p.baseH * scale)}px`;
        p.el.style.setProperty("--scale-factor", scale);
        if (p.rendered) p.rendered = -1; // mark stale; keep old canvas visible until re-render
      }
      if (keepPage && curEl) {
        this.#suppressScroll = true;
        vp.scrollTop = curEl.offsetTop + relY * curEl.offsetHeight;
        requestAnimationFrame(() => (this.#suppressScroll = false));
      }
      // Re-render whatever is visible now
      this.#io.disconnect();
      this.#pages.forEach((p) => this.#io.observe(p.el));
    }
    this.#syncZoomUI();
  }

  async #renderPage(i) {
    const p = this.#pages[i];
    if (!p || p.rendered === 1 || p.renderTask) return;
    const scale = this.#scale;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const viewport = p.pdfPage.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    const ctx = canvas.getContext("2d", { alpha: false });
    p.renderTask = p.pdfPage.render({
      canvasContext: ctx,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
    });
    try {
      await p.renderTask.promise;
    } catch (e) {
      p.renderTask = null;
      if (e?.name !== "RenderingCancelledException") console.error("[pdf-viewer]", e);
      return;
    }
    p.renderTask = null;
    if (scale !== this.#scale) { p.rendered = -1; return this.#renderPage(i); }

    p.canvas?.remove();
    p.textEl?.remove();
    p.el.prepend(canvas);
    p.canvas = canvas;
    p.el.classList.remove("loading");
    p.rendered = 1;

    if (!this.hasAttribute("no-text") && p.pdfPage.streamTextContent) {
      const textEl = document.createElement("div");
      textEl.className = "textLayer";
      p.el.appendChild(textEl);
      p.textEl = textEl;
      try {
        const tl = new this.#lib.TextLayer({
          textContentSource: p.pdfPage.streamTextContent(),
          container: textEl,
          viewport,
        });
        await tl.render();
        const end = document.createElement("div");
        end.className = "endOfContent";
        textEl.appendChild(end);
      } catch { /* text layer is best-effort */ }
    }
  }

  #onScroll = () => {
    if (!this.#doc || this.#suppressScroll) return;
    const vp = this.$.viewport;
    const probe = vp.scrollTop + vp.clientHeight * 0.35;
    // Binary search for the page under the probe line
    let lo = 0, hi = this.#pages.length - 1, found = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const el = this.#pages[mid].el;
      if (el.offsetTop <= probe) { found = mid; lo = mid + 1; } else hi = mid - 1;
    }
    this.#setCurrent(found + 1);
  };

  #setCurrent(n, force = false) {
    if (n === this.#current && !force) return;
    this.#current = n;
    if (this.shadowRoot.activeElement !== this.$.input) this.$.input.value = n;
    const bk = this.#isBook && this.#bk.spreads.length ? this.#bk : null;
    this.$.prev.disabled = bk ? bk.si <= 0 : n <= 1;
    this.$.next.disabled = bk ? bk.si >= bk.spreads.length - 1 : n >= this.pageCount;
    this.dispatchEvent(new CustomEvent("page-change", { detail: { page: n, pageCount: this.pageCount } }));
  }

  #syncZoomUI() {
    const sel = this.$.zoomSelect;
    const custom = sel.querySelector('option[value="custom"]');
    if (typeof this.#zoomMode === "string") {
      sel.value = this.#zoomMode;
    } else {
      const match = [...sel.options].find((o) => Number(o.value) === this.#zoomMode);
      if (match) sel.value = match.value;
      else { custom.textContent = `${Math.round(this.#scale * 100)}%`; sel.value = "custom"; }
    }
    this.$.zoomOut.disabled = this.#scale <= ZOOM_STEPS[0] + 0.001;
    this.$.zoomIn.disabled = this.#scale >= ZOOM_STEPS.at(-1) - 0.001;
    this.dispatchEvent(new CustomEvent("zoom-change", { detail: { zoom: this.#scale, mode: this.#zoomMode } }));
  }

  #step(dir) {
    const s = this.#scale;
    const next = dir > 0 ? ZOOM_STEPS.find((z) => z > s + 0.01) : [...ZOOM_STEPS].reverse().find((z) => z < s - 0.01);
    if (next) this.#applyZoom(next);
  }

  #setStatus(msg) {
    this.$.status.hidden = !msg;
    if (msg) this.$.status.textContent = msg;
  }

  async #download() {
    const doc = this.#doc, e = doc?.entries?.[0];
    if (!e || doc.entries.length !== 1) return;
    let href = null;
    if (e.blob) href = this.#blobUrl ??= URL.createObjectURL(e.blob);
    else if (e.kind === "pdf") {
      try {
        const bytes = await doc.pdfDocs[0].getData();
        href = this.#blobUrl ??= URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      } catch { href = e.url; }
    } else href = e.url;
    if (!href) return;
    const ext = e.kind === "pdf" ? "pdf"
      : (e.type?.split("/")[1] || e.name.split(".").pop() || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
    let name = this.getAttribute("filename") || e.name || "document";
    if (!/\.[a-z0-9]{2,5}$/i.test(name)) name += "." + ext;
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  }


  // ---------- book view ----------
  get #isBook() { return this.getAttribute("view") === "book"; }

  #syncViewButton() {
    const book = this.#isBook;
    this.$.view.innerHTML = svg(book ? "scroll" : "book");
    this.$.view.title = book ? "Scroll view" : "Book view";
    this.$.view.setAttribute("aria-label", book ? "Switch to scroll view" : "Switch to book view");
  }

  #applyView() {
    this.#syncViewButton();
    if (!this.#doc) return;
    const page = this.#current;
    if (this.#isBook) this.#layoutBook();
    else {
      cancelAnimationFrame(this.#bk.anim);
      this.#bk.busy = false;
      requestAnimationFrame(() => { this.#applyZoom(this.#zoomMode, false); this.goToPage(page); });
    }
  }

  #spreadOf(n) { return this.#bk.single ? n - 1 : Math.floor(n / 2); }

  #layoutBook() {
    const bk = this.#bk, box = this.$.book;
    const W = box.clientWidth, H = box.clientHeight;
    if (!W || !H || !this.#pages.length) return;
    const first = this.#pages[0], aspect = first.baseW / first.baseH, pad = 28;
    const single = W < 640 || this.#pages.length === 1;
    const cols = single ? 1 : 2;
    let ph = H - pad * 2, pw = ph * aspect;
    if (pw * cols > W - pad * 2) { pw = (W - pad * 2) / cols; ph = pw / aspect; }
    pw = Math.max(40, Math.floor(pw)); ph = Math.max(40, Math.floor(ph));
    if (pw !== bk.pw || single !== bk.single) bk.cache.clear();
    Object.assign(bk, { pw, ph, single });
    const n = this.#pages.length, spreads = [];
    if (single) for (let i = 1; i <= n; i++) spreads.push([i]);
    else { spreads.push([null, 1]); for (let i = 2; i <= n; i += 2) spreads.push([i, i + 1 <= n ? i + 1 : null]); }
    bk.spreads = spreads;
    bk.si = Math.min(this.#spreadOf(this.#current || 1), spreads.length - 1);
    this.#renderSpread();
  }

  #pageCanvas(n) {
    const bk = this.#bk;
    let c = bk.cache.get(n);
    if (c) return c;
    const p = this.#pages[n - 1];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vp = p.pdfPage.getViewport({ scale: bk.pw / p.baseW });
    c = document.createElement("canvas");
    c.width = Math.floor(vp.width * dpr);
    c.height = Math.floor(vp.height * dpr);
    bk.cache.set(n, c);
    p.pdfPage.render({ canvasContext: c.getContext("2d"), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null })
      .promise.catch(() => {});
    return c;
  }

  // n: page number, 0 = blank paper (back of a sheet), null = nothing
  #paper(n, side) {
    const el = document.createElement("div");
    el.className = `paper ${side}`;
    if (n === null || n === undefined) el.classList.add("none");
    else if (n > 0) el.appendChild(this.#pageCanvas(n));
    return el;
  }

  #mount(statics, faces) {
    const bk = this.#bk;
    const sp = document.createElement("div");
    sp.className = "spread";
    sp.style.setProperty("--pw", bk.pw + "px");
    sp.style.width = bk.pw * (bk.single ? 1 : 2) + "px";
    sp.style.height = bk.ph + "px";
    statics.forEach((n, i) => {
      const el = this.#paper(n, bk.single ? "s" : i ? "r" : "l");
      el.style.left = (bk.single ? 0 : i * bk.pw) + "px";
      sp.appendChild(el);
    });
    let leaf = null;
    if (faces) {
      leaf = document.createElement("div");
      leaf.className = "leaf";
      leaf.style.left = (bk.single ? 0 : bk.pw) + "px";
      const front = this.#paper(faces[0], bk.single ? "s" : "r");
      const back = this.#paper(faces[1], bk.single ? "s" : "l");
      front.classList.add("face", "front");
      back.classList.add("face", "back");
      for (const f of [front, back]) { const sh = document.createElement("i"); sh.className = "shade"; f.appendChild(sh); }
      leaf.append(front, back);
      sp.appendChild(leaf);
    }
    this.$.book.replaceChildren(sp);
    return leaf;
  }

  #renderSpread() {
    const bk = this.#bk, s = bk.spreads[bk.si];
    if (!s) return;
    this.#mount(bk.single ? [s[0]] : [s[0], s[1]], null);
    this.#setCurrent(s.find((x) => x), true);
    // Pre-render neighbours, drop far-away pages
    for (const d of [1, -1, 2]) for (const n of bk.spreads[bk.si + d] || []) if (n) this.#pageCanvas(n);
    for (const n of bk.cache.keys()) if (Math.abs(this.#spreadOf(n) - bk.si) > 3) bk.cache.delete(n);
  }

  // A turn always runs between spreads A and B = A + 1; angle 0 shows A, -180 shows B.
  #beginFlip(dir) {
    const bk = this.#bk;
    const A = dir > 0 ? bk.si : bk.si - 1, B = A + 1;
    if (A < 0 || B >= bk.spreads.length) return null;
    const a = bk.spreads[A], b = bk.spreads[B];
    const leaf = bk.single ? this.#mount([b[0]], [a[0], 0]) : this.#mount([a[0], b[1]], [a[1], b[0]]);
    const f = { A, B, dir, leaf, angle: 0, shades: leaf.querySelectorAll(".shade") };
    this.#setAngle(f, dir > 0 ? 0 : -180);
    return f;
  }

  #setAngle(f, a) {
    f.angle = a;
    f.leaf.style.transform = `rotateY(${a}deg)`;
    const p = -a / 180;
    f.shades[0].style.opacity = Math.min(1, p * 1.8);
    f.shades[1].style.opacity = Math.min(1, (1 - p) * 1.8);
  }

  #animate(f, target, done) {
    cancelAnimationFrame(this.#bk.anim);
    const from = f.angle, dur = Math.max(140, 620 * (Math.abs(target - from) / 180)), t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      this.#setAngle(f, from + (target - from) * ease(t));
      if (t < 1) this.#bk.anim = requestAnimationFrame(step);
      else done();
    };
    this.#bk.anim = requestAnimationFrame(step);
  }

  #flip(dir) {
    const bk = this.#bk;
    if (!this.#doc || !bk.spreads.length) return;
    if (bk.busy) { bk.pending = dir; return; }
    const f = this.#beginFlip(dir);
    if (!f) return;
    bk.busy = true;
    this.#animate(f, dir > 0 ? -180 : 0, () => this.#endFlip(f));
  }

  #endFlip(f) {
    const bk = this.#bk;
    bk.si = f.angle <= -90 ? f.B : f.A;
    bk.busy = false;
    this.#renderSpread();
    if (bk.pending) { const d = bk.pending; bk.pending = 0; this.#flip(d); }
  }

  #onBookDown = (e) => {
    const bk = this.#bk;
    if (!this.#doc || bk.busy || e.button > 0) return;
    const r = this.$.book.querySelector(".spread")?.getBoundingClientRect();
    if (!r) return;
    const clickDir = e.clientX < r.left + r.width / 2 ? -1 : 1;
    bk.drag = { x0: e.clientX, id: e.pointerId, clickDir, side: bk.single ? 0 : clickDir, f: null, moved: false };
    this.$.book.setPointerCapture?.(e.pointerId);
  };

  #onBookMove = (e) => {
    const bk = this.#bk, d = bk.drag;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    if (!d.moved && Math.abs(dx) < 6) return;
    d.moved = true;
    if (!d.f) {
      d.f = this.#beginFlip(d.side || (dx < 0 ? 1 : -1));
      if (!d.f) { bk.drag = null; return; }
      bk.busy = true;
    }
    const span = bk.pw * 1.4;
    const p = Math.min(1, Math.max(0, d.f.dir > 0 ? -dx / span : 1 - dx / span));
    this.#setAngle(d.f, -180 * p);
  };

  #onBookUp = (e) => {
    const bk = this.#bk, d = bk.drag;
    if (!d || e.pointerId !== d.id) return;
    bk.drag = null;
    if (!d.f) { if (!d.moved) this.#flip(d.clickDir); return; }
    const p = -d.f.angle / 180;
    const complete = d.f.dir > 0 ? p > 0.25 : p < 0.75;
    const target = (d.f.dir > 0) === complete ? -180 : 0;
    this.#animate(d.f, target, () => this.#endFlip(d.f));
  };

  #bindUI() {
    const $ = this.$;
    $.prev.onclick = () => this.prev();
    $.next.onclick = () => this.next();
    $.input.onchange = () => this.goToPage(Number($.input.value));
    $.input.onkeydown = (e) => { if (e.key === "Enter") { this.goToPage(Number($.input.value)); $.input.blur(); } };
    $.input.onblur = () => ($.input.value = this.#current);
    $.zoomIn.onclick = () => this.#step(1);
    $.zoomOut.onclick = () => this.#step(-1);
    $.zoomSelect.onchange = () => {
      if ($.zoomSelect.value !== "custom") this.#applyZoom(this.#parseZoom($.zoomSelect.value));
    };
    $.download.onclick = () => this.#doc && this.#download();
    $.fullscreen.onclick = () => {
      if (document.fullscreenElement === this) document.exitFullscreen();
      else this.requestFullscreen?.().catch(() => {});
    };
    document.addEventListener("fullscreenchange", () => {
      const on = document.fullscreenElement === this;
      $.fullscreen.innerHTML = svg(on ? "shrink" : "expand");
      $.fullscreen.title = on ? "Exit full screen" : "Full screen";
    });
    $.viewport.addEventListener("scroll", this.#onScroll, { passive: true });
    $.view.onclick = () => this.setAttribute("view", this.#isBook ? "scroll" : "book");
    $.book.addEventListener("pointerdown", this.#onBookDown);
    $.book.addEventListener("pointermove", this.#onBookMove);
    $.book.addEventListener("pointerup", this.#onBookUp);
    $.book.addEventListener("pointercancel", this.#onBookUp);
    $.book.addEventListener("wheel", (e) => {
      if (!this.#doc) return;
      e.preventDefault();
      const bk = this.#bk, d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      bk.wheel += d;
      clearTimeout(bk.wheelT); bk.wheelT = setTimeout(() => (bk.wheel = 0), 180);
      if (Math.abs(bk.wheel) > 60 && !bk.busy) { this.#flip(Math.sign(bk.wheel)); bk.wheel = 0; }
    }, { passive: false });

    // Keyboard shortcuts when the viewer has focus
    this.addEventListener("keydown", (e) => {
      if (e.target === $.input || !this.#doc) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); this.#step(1); }
      else if (mod && e.key === "-") { e.preventDefault(); this.#step(-1); }
      else if (mod && e.key === "0") { e.preventDefault(); this.#applyZoom("fit-width"); }
      else if (!mod && (e.key === "PageDown" || (e.key === "ArrowRight" && !e.shiftKey))) { e.preventDefault(); this.next(); }
      else if (!mod && (e.key === "PageUp" || (e.key === "ArrowLeft" && !e.shiftKey))) { e.preventDefault(); this.prev(); }
      else if (e.key === "Home" && !mod) { e.preventDefault(); this.goToPage(1); }
      else if (e.key === "End" && !mod) { e.preventDefault(); this.goToPage(this.pageCount); }
    });

    // Ctrl/⌘ + wheel or trackpad pinch to zoom
    $.viewport.addEventListener(
      "wheel",
      (e) => {
        if (!(e.ctrlKey || e.metaKey) || !this.#doc) return;
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.01);
        const next = Math.min(Math.max(this.#scale * factor, ZOOM_STEPS[0]), ZOOM_STEPS.at(-1));
        this.#applyZoom(Math.round(next * 100) / 100);
      },
      { passive: false }
    );
  }
}

if (!customElements.get("pdf-viewer")) customElements.define("pdf-viewer", PdfViewer);
export default PdfViewer;
