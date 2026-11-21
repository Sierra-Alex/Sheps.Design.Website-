// Newsletter Bookshelf (from newsletter-bookshelf.zip), adapted for the DC runtime:
// React comes in as a global, createPortal from window.ReactDOM, CommonJS export.

const createPortal = (node: any, el: any) => (window as any).ReactDOM.createPortal(node, el)

type NewsletterBookshelfItem = {
    id: string | number
    title: string
    date?: string
    href?: string
    /** Spine / cover colour (hex). */
    color?: string
    /** Short line shown on a text cover. */
    blurb?: string
    /** Image URL used as the full front cover. */
    cover?: string
    /** Cover width / height, e.g. 0.6522. Defaults to 0.7. */
    coverRatio?: number
    /** Overrides the shelf brand on this book. */
    brand?: string
    /** Series line set on an image cover with its title and blurb in silver (e.g. "Product Analytics Series · 01"). */
    series?: string
}

type NewsletterBookshelfProps = {
    items: NewsletterBookshelfItem[] | string
    brand?: string
    onSelect?: (item: NewsletterBookshelfItem) => void
    ink?: string
    height?: number
    /** Fill the parent: books centred vertically, grey filler books to the edges, shelf runs to the bottom. */
    fill?: boolean
}

declare global { interface Window { mixpanel?: { track: (event: string, props?: Record<string, unknown>) => void } } }

// NewsletterBookshelf — newsletter editions stand on a shelf as book spines.
// Hover or focus a spine to lift it. Click it and the book flies forward to the
// centre of the screen, turning to show a large cover. Click anywhere or press
// Esc to send it back to the shelf.
//
// Props
//   items    Array (or JSON string) of { id, title, date, href?, color?, blurb?,
//            cover? (image URL shown as the full cover), coverRatio? (width / height, default 0.7),
//            brand? (overrides the shelf brand on this book) }
//   brand    Short label printed on every spine and cover (e.g. "Sheps.Studio")
//   onSelect Optional (item) => void, called when a book is brought forward
//   ink      Text colour on light books (default #131313)
//   height   Height of every book on the shelf in px (default 360); width and text scale with it

const NB_FONT = "'Inter',sans-serif"
const NB_PALETTE = ["#E9E4E1", "#CAE9DF", "#131313", "#DEEB2C", "#F7F3F1", "#2A2A2A"]
const NB_KF = "@keyframes nb-rise{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}@font-face{font-family:'ABC Arizona Text';src:url('src/assets/fonts/ABCArizonaText-Light.otf') format('opentype');font-weight:300;font-style:normal;font-display:swap}"
const NB_SERIF = "'ABC Arizona Text', Georgia, serif"   // series titles (Bits and Pieces)
const NB_EASE = "cubic-bezier(0.65, 0, 0.25, 1)"
const NB_DUR = 750
const NB_BASE = 260   // book height the spine typography is designed at

function nbHash(s: string): number {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
    return h >>> 0
}

function nbIsDark(hex: string): boolean {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || "").trim())
    if (!m) return false
    let c = m[1]; if (c.length === 3) c = c.split("").map((x) => x + x).join("")
    const n = parseInt(c, 16)
    const lin = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
    return L < 0.25
}

function nbItems(items: NewsletterBookshelfItem[] | string | undefined): NewsletterBookshelfItem[] {
    if (Array.isArray(items)) return items
    if (typeof items === "string") { try { const v = JSON.parse(items); return Array.isArray(v) ? v : [] } catch (e) { return [] } }
    return []
}

function nbBrand(brand: string) {
    return String(brand).split(".").map((part, k, arr) => (
        <React.Fragment key={k}>{part}{k < arr.length - 1 ? "." : ""}{k < arr.length - 1 ? <wbr /> : null}</React.Fragment>
    ))
}

// Size and colour of one book, derived from its id so it never changes between renders.
type NbBookDims = { bg: string; dark: boolean; bh: number; bw: number; lines: number; sc: number; fg: string; sub: string }

function nbBook(item: NewsletterBookshelfItem, i: number, height: number, ink: string): NbBookDims {
    const h = nbHash(String(item.id || item.title || i))
    const bg = item.color || NB_PALETTE[i % NB_PALETTE.length]
    const dark = nbIsDark(bg)
    const sc = height / NB_BASE                         // everything scales with height, keeping the ratio
    const bh = height                                   // every book the same height
    const room = Math.max(60, NB_BASE - 96)
    const lines = Math.min(3, Math.max(1, Math.ceil((String(item.title || "").length * 7.4) / room)))
    const bw = Math.round(Math.max(56 + (h >> 5) % 14, 30 + lines * 17) * 0.5625 * sc)   // spine width factor (narrowed 25% twice at Alex's request)
    return {
        bg, dark, bh, bw, lines, sc,
        fg: dark ? "#F7F3F1" : ink,
        sub: dark ? "rgba(247,243,241,0.6)" : "rgba(19,19,19,0.55)",
    }
}

const NB_MIXPANEL_LOGO = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20467%20111%22%3E%3Cpath%20d%3D%22M0%2085.9656H27.9842V82.9835H25.8828C21.7926%2082.9835%2020.8076%2081.864%2020.8076%2077.7718V40.773C23.6595%2035.9282%2027.4964%2032.8238%2032.3277%2032.8238C38.3974%2032.8238%2042.1123%2037.2923%2042.1123%2045.74V77.7812C42.1123%2081.8828%2041.1179%2082.9929%2037.1591%2082.9929H34.9263V85.975H62.2914V82.9929H60.3119C56.2217%2082.9929%2055.2367%2081.8734%2055.2367%2077.7812V44.3666C55.2367%2043.2471%2055.2367%2042.1276%2055.1147%2041.0176C57.8353%2036.0505%2061.9255%2032.8238%2066.7568%2032.8238C72.8265%2032.8238%2076.5415%2037.2923%2076.5415%2045.74V77.7812C76.5415%2081.8828%2075.5471%2082.9929%2071.5882%2082.9929H69.3554V85.975H96.7205V82.9929H94.863C90.6508%2082.9929%2089.6658%2081.8734%2089.6658%2077.7812V44.3666C89.6658%2031.8266%2082.6111%2024.8746%2072.3293%2024.8746C64.6554%2024.8746%2057.9666%2029.0985%2054.3736%2037.5369C52.2722%2029.3431%2046.0806%2024.8746%2037.9002%2024.8746C30.5922%2024.8746%2024.2786%2028.8445%2020.8076%2036.7937V26.361H0V29.3431H2.47664C6.68882%2029.3431%207.67385%2030.4626%207.67385%2034.5547V77.7718C7.67385%2081.8734%206.67944%2082.9835%202.47664%2082.9835H0V85.9656ZM113.185%2016.4269C117.641%2016.4269%20121.356%2012.7016%20121.356%208.23315C121.356%203.76468%20117.641%200.0393982%20113.185%200.0393982C108.728%200.0393982%20105.014%203.76468%20105.014%208.23315C105.014%2012.7016%20108.728%2016.4269%20113.185%2016.4269ZM99.3191%2085.9656H126.806V82.9835H124.949C120.858%2082.9835%20119.873%2081.864%20119.873%2077.7718V26.361H99.0658V29.3431H101.542C105.755%2029.3431%20106.74%2030.4626%20106.74%2034.5547V77.7718C106.74%2081.8734%20105.745%2082.9835%20101.542%2082.9835H99.3097V85.9656H99.3191ZM146.873%2050.9517H154.8C152.82%2049.7099%20152.079%2047.9695%20151.085%2044.7428L148.111%2033.6893C146.751%2028.7222%20145.634%2026.361%20140.184%2026.361H128.795V29.3431H130.408C133.748%2029.3431%20134.123%2030.5849%20135.118%2034.3102L137.716%2043.9997C139.077%2048.7221%20141.188%2050.9517%20146.882%2050.9517H146.873ZM165.203%2050.9517H173.131C178.825%2050.9517%20180.804%2048.7127%20182.174%2043.9997L184.773%2034.3102C185.767%2030.5849%20186.255%2029.3431%20189.482%2029.3431H191.096V26.361H179.829C174.256%2026.361%20173.14%2028.5999%20171.902%2033.6893L168.928%2044.7428C167.933%2048.0918%20167.183%2049.7099%20165.203%2050.9517ZM154.8%2061.3843H165.203V50.9517H154.8V61.3843ZM128.795%2085.975H140.184C145.634%2085.975%20146.751%2083.6138%20148.111%2078.6467L151.085%2067.5931C152.079%2064.3664%20152.82%2062.6261%20154.8%2061.3843H146.873C141.178%2061.3843%20139.067%2063.6233%20137.707%2068.3363L135.108%2078.0258C134.114%2081.7511%20133.748%2082.9929%20130.399%2082.9929H128.786V85.975H128.795ZM179.81%2085.975H191.077V82.9929H189.463C186.246%2082.9929%20185.748%2081.7511%20184.754%2078.0258L182.155%2068.3363C180.795%2063.6139%20178.816%2061.3843%20173.112%2061.3843H165.203C167.183%2062.6261%20167.905%2064.2442%20168.9%2067.5931L171.874%2078.6467C173.112%2083.7361%20174.228%2085.975%20179.801%2085.975H179.81ZM192.69%20110.81H221.416V107.828H218.442C214.483%20107.828%20213.489%20106.709%20213.489%20102.616V78.9007C217.082%2084.2441%20223.151%2087.4708%20230.328%2087.4708C243.828%2087.4708%20254.597%2075.5517%20254.597%2054.9403C254.597%2036.3139%20244.447%2024.8935%20231.313%2024.8935C223.639%2024.8935%20217.194%2029.3619%20213.479%2037.3111V26.3798H192.672V29.3619H195.148C199.239%2029.3619%20200.346%2030.4814%20200.346%2034.5736V102.607C200.346%20106.709%20199.229%20107.819%20195.148%20107.819H192.672V110.801L192.69%20110.81ZM226.622%2032.5792C234.671%2032.5792%20241.238%2040.1521%20241.238%2055.1755C241.238%2071.563%20235.169%2080.5094%20226.876%2080.5094C221.547%2080.5094%20216.847%2077.6496%20213.498%2072.6825V41.883C216.716%2035.7965%20221.303%2032.5698%20226.622%2032.5698V32.5792ZM274.176%2087.2168C282.225%2087.2168%20288.66%2083.3692%20293.492%2074.6768V76.0409C293.492%2083.4915%20298.201%2086.7182%20305.997%2086.7182C308.352%2086.7182%20311.326%2086.4736%20313.305%2085.8527V82.7483C312.311%2082.9929%20311.569%2083.1246%20310.828%2083.1246C307.732%2083.1246%20306.738%2081.2619%20306.738%2078.2798V46.4832C306.738%2031.8266%20298.567%2024.8746%20284.824%2024.8746C275.658%2024.8746%20266.746%2029.0985%20261.052%2033.567L263.031%2037.0477C268.979%2032.9461%20274.795%2030.5943%20281.109%2030.5943C289.28%2030.5943%20293.492%2035.0627%20293.492%2045.4954V48.2235L278.257%2054.1878C264.391%2059.898%20259.307%2065.2413%20259.307%2073.3128C259.307%2081.3842%20265.001%2087.2168%20274.166%2087.2168H274.176ZM272.318%2070.0767C272.318%2063.8679%20275.911%2059.3994%20283.219%2056.1727L293.501%2051.7042V71.0739C289.664%2076.4172%20285.208%2079.5216%20280.377%2079.5216C275.546%2079.5216%20272.328%2076.1726%20272.328%2070.0861L272.318%2070.0767ZM315.782%2085.975H344.019V82.9929H341.664C337.574%2082.9929%20336.589%2081.8734%20336.589%2077.7812V40.8953C339.441%2035.9282%20343.644%2032.8238%20348.597%2032.8238C355.033%2032.8238%20359.123%2037.2923%20359.123%2045.74V77.7812C359.123%2081.8828%20358.128%2082.9929%20354.17%2082.9929H351.815V85.975H379.921V82.9929H377.444C373.232%2082.9929%20372.247%2081.8734%20372.247%2077.7812V44.3666C372.247%2031.8266%20364.817%2024.8746%20354.292%2024.8746C346.618%2024.8746%20340.173%2028.8445%20336.58%2036.7937V26.361H315.772V29.3431H318.249C322.461%2029.3431%20323.446%2030.4626%20323.446%2034.5547V77.7718C323.446%2081.8734%20322.452%2082.9835%20318.249%2082.9835H315.772V85.9656L315.782%2085.975ZM412.117%2087.4613C420.289%2087.4613%20427.972%2083.7361%20433.544%2079.2676L431.687%2076.5395C426.733%2080.1425%20421.161%2081.7511%20415.964%2081.7511C403.337%2081.7511%20395.907%2072.8142%20395.907%2055.4295V53.1906H435.036C434.792%2036.4268%20424.51%2025.0063%20409.528%2025.0063C394.546%2025.0063%20382.529%2038.5434%20382.529%2056.4267C382.529%2076.0503%20393.674%2087.4708%20412.127%2087.4708L412.117%2087.4613ZM409.641%2028.1013C417.071%2028.1013%20421.649%2036.1728%20422.399%2049.8322H396.151C397.267%2036.0505%20402.464%2028.1013%20409.65%2028.1013H409.641ZM437.747%2085.9656H466.472V82.9835H463.62C459.53%2082.9835%20458.545%2081.864%20458.545%2077.7718V1.52575H437.738V4.50786H440.214C444.304%204.50786%20445.411%205.62733%20445.411%209.7195V77.7718C445.411%2081.8734%20444.295%2082.9835%20440.214%2082.9835H437.738V85.9656H437.747Z%22%20fill%3D%22%23000%22%2F%3E%3C%2Fsvg%3E"

// Spine face, drawn at scale f (1 on the shelf, larger in the forward view).
function NbSpine({ item, b, brand: shelfBrand, f }: { item: NewsletterBookshelfItem; b: NbBookDims; brand: string; f: number }) {
    const brand = item.brand || shelfBrand
    // Long single words (no dot to break at) shrink to fit the spine instead of splitting.
    const longest = Math.max(1, ...String(brand || "").split(".").map((w) => w.length + 1))
    const bs = Math.min(8, Math.max(4, (b.bw / b.sc - 8) / (longest * 0.9)))
    const tight = b.lines > 1
    const ts = (tight ? 11 : 13) * f, ds = (tight ? 8 : 9) * f
    if (item.series) {
        // Series spine: small edition number up top, title in Arizona, Mixpanel wordmark running up the foot
        const L = b.bh / b.sc * 0.13 * f, T = L / 4.207
        return (
            <React.Fragment>
                {item.date ? <span style={{ fontSize: 6.5 * f, fontWeight: 500, letterSpacing: "0.08em", lineHeight: 1, color: b.sub, flex: "none" }}>{item.date}</span> : null}
                <span style={{ flex: "1 1 auto", minHeight: 0, alignSelf: "stretch", display: "flex", justifyContent: "center", padding: `${10 * f}px ${3 * f}px ${10 * f}px` }}>
                    <span style={{ display: "block", writingMode: "vertical-rl", transform: "rotate(180deg)", height: "100%", fontFamily: NB_SERIF, fontSize: 9.5 * f, fontWeight: 300, lineHeight: "120%", letterSpacing: "0.01em", overflow: "hidden", whiteSpace: "nowrap", flex: "none", textAlign: "end" }}>{item.title}</span>
                </span>
                <span aria-label={brand || "mixpanel"} role="img" style={{ position: "relative", width: T, height: L, flex: "none" }}>
                    <span style={{ position: "absolute", left: (T - L) / 2, top: (L - T) / 2, width: L, height: T, transform: "rotate(-90deg)", background: b.sub, WebkitMaskImage: `url("${NB_MIXPANEL_LOGO}")`, maskImage: `url("${NB_MIXPANEL_LOGO}")`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat" }}></span>
                </span>
            </React.Fragment>
        )
    }
    return (
        <React.Fragment>
            <span aria-hidden="true" style={{ width: "62%", height: Math.max(1, f), background: b.sub, flex: "none" }}></span>
            <span style={{ flex: "1 1 auto", minHeight: 0, alignSelf: "stretch", display: "flex", flexDirection: "row-reverse", alignItems: "stretch", justifyContent: "center", gap: (tight ? 3 : 4) * f, padding: `${12 * f}px ${3 * f}px ${10 * f}px` }}>
                <span style={{ display: "block", writingMode: "vertical-rl", transform: "rotate(180deg)", height: "100%", fontSize: ts, fontWeight: 600, lineHeight: tight ? "118%" : "125%", letterSpacing: "0.01em", overflow: "hidden", flex: "none", textAlign: "end" }}>{item.title}</span>
                {item.date ? <span style={{ display: "block", writingMode: "vertical-rl", transform: "rotate(180deg)", height: "100%", fontSize: ds, fontWeight: 500, letterSpacing: "0.08em", lineHeight: 1, flex: "none", color: b.sub, whiteSpace: "nowrap", textAlign: "end" }}>{item.date}</span> : null}
            </span>
            {brand ? <span style={{ fontSize: bs * f, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: b.sub, textAlign: "center", lineHeight: "120%", padding: `0 ${4 * f}px`, flex: "none", maxWidth: "100%", boxSizing: "border-box", overflowWrap: "normal", whiteSpace: "normal" }}>{nbBrand(brand)}</span> : null}
        </React.Fragment>
    )
}

const nbSpineShadow = (lift: boolean) => lift
    ? "inset 2px 0 0 rgba(255,255,255,0.18), inset -3px 0 0 rgba(0,0,0,0.12), 0 18px 28px -12px rgba(0,0,0,0.45)"
    : "inset 2px 0 0 rgba(255,255,255,0.18), inset -3px 0 0 rgba(0,0,0,0.12), 4px 0 10px -4px rgba(19,19,19,0.18), 0 8px 14px -8px rgba(19,19,19,0.22)"

// Series cover title (Bits and Pieces): Mixpanel wordmark, series line, title and blurb set in the cover's
// black top band, in brushed silver with a raised emboss. The shine slides across as the cover tilts.
function nbSilver(tilt: { x: number; y: number }): React.CSSProperties {
    return {
        backgroundImage: "linear-gradient(108deg, #7d8085 0%, #c9ccd1 14%, #f4f5f7 22%, #9a9da3 34%, #dfe1e4 46%, #ffffff 52%, #a3a6ab 62%, #d4d6da 76%, #85888d 100%)",
        backgroundSize: "260% 140%",
        backgroundPosition: `${50 + tilt.y * 5.5}% ${50 + tilt.x * 5}%`,
        transition: "background-position 0.25s ease-out",
        filter: "drop-shadow(-0.6px -0.6px 0 rgba(255,255,255,0.28)) drop-shadow(0.8px 1px 0.6px rgba(0,0,0,0.95))",
    }
}
function NbCoverTitle({ item, H, CW, tilt }: { item: NewsletterBookshelfItem; H: number; CW: number; tilt: { x: number; y: number } }) {
    const s = nbSilver(tilt)
    const text: React.CSSProperties = { ...s, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent", display: "block" }
    const lh = Math.round(H * 0.026)
    return (
        <div aria-hidden="true" style={{ position: "absolute", left: CW * 0.08, right: CW * 0.08, top: H * 0.045, height: H * 0.15, display: "flex", flexDirection: "column", fontFamily: NB_FONT, pointerEvents: "none" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: CW * 0.04 }}>
                <span style={{ ...s, display: "block", width: lh * 4.207, height: lh, WebkitMaskImage: `url("${NB_MIXPANEL_LOGO}")`, maskImage: `url("${NB_MIXPANEL_LOGO}")`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", filter: "none" }}></span>
            </div>
            <span style={{ ...text, marginTop: "auto", fontFamily: NB_SERIF, fontSize: Math.round(H * 0.0425), fontWeight: 300, lineHeight: "110%", letterSpacing: "-0.005em", paddingBottom: 2 }}>{item.title}</span>
        </div>
    )
}

// The forward view: a 3D book that starts exactly over the shelf spine, then
// flies to the centre and turns about its spine's right edge to face the cover.
function NbForward({ item, b, brand, rect, phase, onClose, frame }: { item: NewsletterBookshelfItem; b: NbBookDims; brand: string; rect: DOMRect; phase: "in" | "out"; onClose: () => void; frame?: { x: number; y: number; w: number; h: number } }) {
    // frame: fly inside this box (page coords of the frame) instead of the whole screen
    const vw = frame ? frame.w : window.innerWidth, vh = frame ? frame.h : window.innerHeight
    const ox = frame ? frame.x : 0, oy = frame ? frame.y : 0
    const H = Math.round(frame ? Math.min(vh * 0.82, (vw - 32) / (Number(item.coverRatio) || 0.7)) : Math.min(vh * 0.64, 480, (vw - 48) / (Number(item.coverRatio) || 0.7)))
    const k = H / b.bh
    const W = Math.round(b.bw * k)           // spine thickness in the forward view
    const CW = Math.round(H * (Number(item.coverRatio) || 0.7))   // cover width
    const left = Math.round((vw - CW) / 2)
    const top = Math.round((vh - H) / 2)
    const shown = phase === "in"
    // Same function list in both states so the browser interpolates each step.
    const pivot = `translate(${W}px, ${H / 2}px) rotateY(${shown ? -90 : 0}deg) translate(${-W}px, ${-H / 2}px)`
    const transform = shown
        ? `translate(${-W}px, 0px) scale(1) ${pivot}`
        : `translate(${rect.left - ox - left}px, ${rect.top - oy - top}px) scale(${1 / k}) ${pivot}`
    const face: React.CSSProperties = { position: "absolute", top: 0, height: H, background: b.bg, color: b.fg, boxSizing: "border-box", overflow: "hidden", backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", borderRadius: `${3 * k}px ${3 * k}px ${k}px ${k}px` }
    const t = `${NB_DUR}ms ${NB_EASE}`
    // Hover tilt: once the book has landed, the cover leans toward the pointer (off for reduced motion)
    const [tilt, setTilt] = React.useState({ x: 0, y: 0 })
    const [landed, setLanded] = React.useState(false)
    const calm = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    React.useEffect(() => {
        if (!shown) { setLanded(false); setTilt({ x: 0, y: 0 }); return }
        const id = setTimeout(() => setLanded(true), NB_DUR)
        return () => clearTimeout(id)
    }, [shown])
    const onTilt = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!landed || calm) return
        const r = e.currentTarget.getBoundingClientRect()
        const px = (e.clientX - r.left - (left + CW / 2)) / (CW / 2), py = (e.clientY - r.top - (top + H / 2)) / (H / 2)
        if (Math.abs(px) > 1.2 || Math.abs(py) > 1.2) { setTilt({ x: 0, y: 0 }); return }
        setTilt({ x: -py * 7, y: px * 9 })
    }

    return (
        <div role="dialog" aria-modal="true" aria-label={item.title + " (click or press Esc to put it back)"} onClick={onClose} onPointerMove={onTilt} onPointerLeave={() => setTilt({ x: 0, y: 0 })} tabIndex={-1} ref={(el: HTMLDivElement | null) => { if (el && document.activeElement !== el) el.focus({ preventScroll: true }) }}
            style={{ position: frame ? "absolute" : "fixed", inset: 0, zIndex: frame ? 5 : 9999, perspective: 1800, fontFamily: NB_FONT, cursor: "pointer", outline: "none" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundColor: "#101010", backgroundImage: "radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1.4px)", backgroundSize: "14px 14px", backgroundPosition: "7px 7px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", opacity: shown ? 1 : 0, transition: `opacity ${t}` }}></div>

            <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transformOrigin: `${left + CW / 2}px ${top + H / 2}px`, transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transition: landed ? "transform 0.25s ease-out" : "none", pointerEvents: "none" }}>
            <div style={{ position: "absolute", left, top, width: W, height: H, transformOrigin: "0 0", transformStyle: "preserve-3d", transform, transition: `transform ${t}`, pointerEvents: "none" }}>
                <div style={{ ...face, left: 0, width: W, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: `${14 * k * b.sc}px 0 ${12 * k * b.sc}px`, boxShadow: nbSpineShadow(false) }}>
                    <NbSpine item={item} b={b} brand={brand} f={k * b.sc} />
                </div>
                <div style={{
                    ...face, left: W, width: CW, transformOrigin: "0 50%", transform: "rotateY(90deg)",
                    display: "flex", flexDirection: "column", padding: `${H * 0.08}px ${CW * 0.1}px ${H * 0.07}px ${CW * 0.12}px`,
                    boxShadow: `inset ${Math.round(H * 0.025)}px 0 0 rgba(0,0,0,0.1), inset ${Math.round(H * 0.028)}px 0 0 rgba(255,255,255,0.12), 0 40px 60px -30px rgba(0,0,0,0.5)`,
                }}>
                    {item.cover ? (
                        <React.Fragment>
                            <img src={item.cover} alt="" draggable="false" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            <span aria-hidden="true" style={{ position: "absolute", inset: 0, boxShadow: `inset ${Math.round(H * 0.025)}px 0 0 rgba(0,0,0,0.18), inset ${Math.round(H * 0.028)}px 0 0 rgba(255,255,255,0.10)` }}></span>
                            {item.series ? <NbCoverTitle item={item} H={H} CW={CW} tilt={tilt} /> : null}
                        </React.Fragment>
                    ) : (
                        <React.Fragment>
                    <span style={{ fontSize: Math.round(H * 0.026), fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: b.sub }}>{item.brand || brand}</span>
                    <span aria-hidden="true" style={{ width: CW * 0.16, height: 1, background: b.sub, marginTop: H * 0.04 }}></span>
                    <span style={{ marginTop: "auto", fontSize: Math.round(H * 0.078), fontWeight: 600, lineHeight: "108%", letterSpacing: "-0.02em" }}>{item.title}</span>
                    {item.blurb ? <span style={{ marginTop: H * 0.035, fontSize: Math.round(H * 0.032), lineHeight: "145%", color: b.sub }}>{item.blurb}</span> : null}
                    <span style={{ marginTop: H * 0.06, fontSize: Math.round(H * 0.024), fontWeight: 500, letterSpacing: "0.1em", color: b.sub }}>{item.date}</span>
                        </React.Fragment>
                    )}
                </div>
            </div>
            </div>

        </div>
    )
}

// In-frame popup (fill mode): the frame dims and the cover pops up in its centre.
// Nothing outside the frame changes and the page keeps scrolling.
const NB_POP = 320
function NbPopup({ item, b, brand, box, phase, onClose }: { item: NewsletterBookshelfItem; b: NbBookDims; brand: string; box: { w: number; h: number }; phase: "in" | "out"; onClose: () => void }) {
    const ratio = Number(item.coverRatio) || 0.7
    const H = Math.round(Math.min(box.h * 0.82, (box.w - 32) / ratio))
    const CW = Math.round(H * ratio)
    const shown = phase === "in"
    const t = `${NB_POP}ms cubic-bezier(0.2, 0.8, 0.2, 1)`
    return (
        <div role="dialog" aria-modal="true" aria-label={item.title + " (click or press Esc to close)"} onClick={onClose} tabIndex={-1}
            ref={(el: HTMLDivElement | null) => { if (el && document.activeElement !== el) el.focus({ preventScroll: true }) }}
            style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: "none" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, backgroundColor: "#101010", backgroundImage: "radial-gradient(circle, rgba(255,255,255,.07) 1px, transparent 1.4px)", backgroundSize: "14px 14px", backgroundPosition: "7px 7px", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", opacity: shown ? 1 : 0, transition: `opacity ${t}` }}></div>
            <div style={{ position: "relative", width: CW, height: H, borderRadius: 3, overflow: "hidden", background: b.bg, color: b.fg, display: "flex", flexDirection: "column", boxSizing: "border-box",
                padding: item.cover ? 0 : `${H * 0.08}px ${CW * 0.1}px ${H * 0.07}px ${CW * 0.12}px`,
                boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)", opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(16px) scale(0.92)", transition: `opacity ${t}, transform ${t}` }}>
                {item.cover ? (
                    <img src={item.cover} alt="" draggable="false" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : (
                    <React.Fragment>
                        <span style={{ fontSize: Math.round(H * 0.026), fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: b.sub }}>{item.brand || brand}</span>
                        <span aria-hidden="true" style={{ width: CW * 0.16, height: 1, background: b.sub, marginTop: H * 0.04 }}></span>
                        <span style={{ marginTop: "auto", fontSize: Math.round(H * 0.078), fontWeight: 600, lineHeight: "108%", letterSpacing: "-0.02em" }}>{item.title}</span>
                        {item.blurb ? <span style={{ marginTop: H * 0.035, fontSize: Math.round(H * 0.032), lineHeight: "145%", color: b.sub }}>{item.blurb}</span> : null}
                        <span style={{ marginTop: H * 0.06, fontSize: Math.round(H * 0.024), fontWeight: 500, letterSpacing: "0.1em", color: b.sub }}>{item.date}</span>
                    </React.Fragment>
                )}
            </div>
        </div>
    )
}

// Plain grey books that pad the shelf out to the frame edges in fill mode.
const NB_FILL = ["#E1DDDC", "#D6D0CC", "#CBC5C1", "#E9E4E1", "#BFB9B5", "#D9D4D1", "#C5BFBB"]
function nbFillers(side: number, sc: number, bh: number, seed: number) {
    const out: { w: number; h: number; c: string; band: number }[] = []
    let acc = 0, k = 0
    while (k < 80) {
        const h = nbHash(seed + ":" + k)
        const w = Math.round((22 + (h % 19)) * sc)
        if (acc + w > side) break
        out.push({ w, h: Math.round(bh * (0.78 + ((h >> 8) % 23) / 100)), c: NB_FILL[(h >> 4) % NB_FILL.length], band: (h >> 12) % 3 })
        acc += w + 6; k++
    }
    return out
}

function NewsletterBookshelf({ items, brand = "", onSelect, ink = "#131313", height = 360, fill = false }: NewsletterBookshelfProps) {
    const list = nbItems(items)
    const wrap = React.useRef<HTMLDivElement>(null)
    const spines = React.useRef<Record<string, HTMLButtonElement | null>>({})
    const [seen, setSeen] = React.useState(false)
    const [box, setBox] = React.useState({ w: 0, h: 0 })
    React.useLayoutEffect(() => {
        const w = wrap.current; if (!w || !fill) return
        const fit = () => setBox({ w: w.clientWidth, h: w.clientHeight })
        fit(); const ro = new ResizeObserver(fit); ro.observe(w)
        return () => ro.disconnect()
    }, [fill])
    const [hot, setHot] = React.useState<string | number | null>(null)
    const [focus, setFocus] = React.useState<string | number | null>(null)
    const [open, setOpen] = React.useState<{ id: string | number; rect: DOMRect } | null>(null)
    const [phase, setPhase] = React.useState<"in" | "out">("out") // "out" (at shelf) | "in" (forward)

    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches

    React.useEffect(() => {   // warm cover images so they're ready before a book flies forward
        list.forEach((it) => { if (it.cover) { const im = new Image(); im.src = it.cover } })
    }, [items])

    React.useEffect(() => {
        const w = wrap.current; if (!w) return
        if (typeof IntersectionObserver === "undefined") { setSeen(true); return }
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.3 })
        io.observe(w)
        return () => io.disconnect()
    }, [])

    const close = React.useCallback(() => {
        if (!open) return
        const el = spines.current[String(open.id)]
        const r = el && el.getBoundingClientRect()
        if (r) setOpen((o) => o && { ...o, rect: r })   // fly back to wherever the spine is now
        setPhase("out")
        setTimeout(() => { setOpen(null); if (el) el.focus({ preventScroll: true }) }, reduce ? 0 : NB_DUR)
    }, [open, reduce, fill])

    React.useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
        window.addEventListener("keydown", onKey)
        // Lock scroll on <html>: this site sets overflow-x:clip on html/body, so locking
        // <body> turns it into its own scroller and the page jumps to the top.
        // In fill mode the popup lives inside the frame, so the page keeps scrolling.
        const root = document.documentElement
        const prev = root.style.overflow
        if (!fill) root.style.overflow = "hidden"
        return () => { window.removeEventListener("keydown", onKey); if (!fill) root.style.overflow = prev }
    }, [open, close, fill])

    const bringForward = (item: NewsletterBookshelfItem, id: string | number) => {
        const el = spines.current[String(id)]; if (!el || open) return
        setHot(null)
        setOpen({ id, rect: el.getBoundingClientRect() })
        setPhase("out")
        requestAnimationFrame(() => requestAnimationFrame(() => setPhase("in")))
        if (onSelect) onSelect(item)
        window.mixpanel && window.mixpanel.track("Newsletter cover revealed", { page: window.location.pathname, edition: id })
    }

    // Shelf hugs the books with a small overhang each side.
    const shelfW = list.reduce((sum, it, i) => sum + nbBook(it, i, height, ink).bw, 0) + 6 * Math.max(0, list.length - 1) + 2 * Math.round(28 * (height / NB_BASE))
    const headroom = Math.round(48 * (height / NB_BASE))   // room above the books so a lifted one is never clipped
    const sc = height / NB_BASE
    const realW = list.reduce((sum, it, i) => sum + nbBook(it, i, height, ink).bw, 0) + 6 * Math.max(0, list.length - 1)
    const side = fill ? Math.max(0, (box.w * 0.9 - realW) / 2 - 6) : 0   // fillers stop at the shelf ends
    const leftF = fill ? nbFillers(side, sc, height, 1).reverse() : []
    const rightF = fill ? nbFillers(side, sc, height, 2) : []
    const listTop = fill ? Math.max(0, Math.round(box.h / 2 - height / 2 - headroom)) : 0
    const filler = (f: { w: number; h: number; c: string; band: number }, key: string, i: number) => (
        <div key={key} aria-hidden="true" style={{ flex: "none", width: f.w, height: f.h, borderRadius: "3px 3px 1px 1px", background: "rgba(255,255,255,0.35)", border: "1px solid #E1DDDC", boxSizing: "border-box", position: "relative", opacity: seen ? 1 : 0, animation: seen && !reduce ? `nb-rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) ${0.1 + i * 0.03}s both` : "none" }}>
        </div>
    )
    const openIndex = open ? list.findIndex((it, i) => (it.id != null ? it.id : i) === open.id) : -1
    const forward = openIndex >= 0 ? (
        <NbForward item={list[openIndex]} b={nbBook(list[openIndex], openIndex, height, ink)} brand={brand} rect={open!.rect} phase={phase} onClose={close} />
    ) : null
    // Fill mode: the book flies inside the frame (no full-screen takeover).
    const fr = fill && openIndex >= 0 && wrap.current ? wrap.current.getBoundingClientRect() : null
    const portal = fill
        ? (openIndex >= 0 && fr ? <NbForward item={list[openIndex]} b={nbBook(list[openIndex], openIndex, height, ink)} brand={brand} rect={open!.rect} phase={phase} onClose={close} frame={{ x: fr.left, y: fr.top, w: fr.width, h: fr.height }} /> : null)
        : (forward && typeof document !== "undefined" ? createPortal(forward, document.body) : null)

    return (
        <div ref={wrap} style={{ position: "relative", width: "100%", fontFamily: NB_FONT, boxSizing: "border-box", ...(fill ? { height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" } : {}) }}>
            <style>{NB_KF}</style>
            <div role="list" aria-label={brand ? brand + " editions" : "Newsletter editions"} style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, minHeight: height + headroom, padding: fill ? `${headroom}px 0 0` : `${headroom}px 16px 0`, marginTop: listTop, flex: "none", overflowX: fill ? "visible" : "auto", scrollbarWidth: "none", boxSizing: "border-box" }}>
                {fill ? <div aria-hidden="true" style={{ flex: "none", width: side, display: "flex", justifyContent: "flex-end", alignItems: "flex-end", gap: 6 }}>{leftF.map((f, i) => filler(f, "l" + i, leftF.length - i))}</div> : null}
                {list.map((item, i) => {
                    const id = item.id != null ? item.id : i
                    const b = nbBook(item, i, height, ink)
                    const away = open && open.id === id
                    const lift = !open && hot === id
                    return (
                        <div key={id} role="listitem" style={{ flex: "none", opacity: seen ? 1 : 0, animation: seen && !reduce ? `nb-rise 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) ${i * 0.07}s both` : "none" }}>
                            <button type="button" ref={(el) => { spines.current[String(id)] = el }}
                                onClick={() => bringForward(item, id)}
                                onMouseEnter={() => setHot(id)} onMouseLeave={() => setHot(null)}
                                onFocus={(e) => { setHot(id); if (e.currentTarget.matches(":focus-visible")) setFocus(id) }}
                                onBlur={() => { setHot(null); setFocus(null) }}
                                aria-haspopup="dialog" aria-label={"Open " + item.title + (item.date ? ", " + item.date : "")}
                                style={{
                                    position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                                    width: b.bw, height: b.bh, padding: `${14 * b.sc}px 0 ${12 * b.sc}px`, margin: 0, border: 0, borderRadius: "3px 3px 1px 1px",
                                    background: b.bg, color: b.fg, font: "inherit", cursor: "pointer", outline: "none", boxSizing: "border-box", overflow: "hidden",
                                    boxShadow: nbSpineShadow(lift),
                                    transform: `translateY(${lift ? -18 * b.sc : 0}px)`,
                                    transition: reduce ? "none" : "transform 0.35s cubic-bezier(0.34, 1.4, 0.5, 1), box-shadow 0.35s ease",
                                    visibility: away ? "hidden" : "visible",
                                }}>
                                <NbSpine item={item} b={b} brand={brand} f={b.sc} />
                                {focus === id ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", boxShadow: "inset 0 0 0 2px " + (b.dark ? "#DEEB2C" : "#131313") }}></span> : null}
                            </button>
                        </div>
                    )
                })}
                {fill ? <div aria-hidden="true" style={{ flex: "none", width: side, display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: 6 }}>{rightF.map((f, i) => filler(f, "r" + i, i))}</div> : null}
            </div>
            <div aria-hidden="true" style={{ position: "relative", width: fill ? "90%" : shelfW, maxWidth: "100%", margin: "0 auto", height: Math.max(5, Math.round(10.2 * (height / NB_BASE)))   /* shelf ledge, 15% thinner (was 12) */, borderRadius: fill ? 0 : 2, background: "linear-gradient(180deg, #EEEAE7 0%, #E6E0DC 55%, #DCD5D0 100%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 1px 0 rgba(19,19,19,0.06), 0 4px 8px rgba(19,19,19,0.08), 0 14px 28px -6px rgba(19,19,19,0.16)" }}>
                <div style={{ position: "absolute", left: "8%", right: "8%", top: 0, height: 4, background: "radial-gradient(50% 100% at 50% 0%, rgba(19,19,19,0.16), transparent)" }}></div>
            </div>
            {portal}
        </div>
    )
}

// Hero frame for the Bits and Pieces case study: books sized from the frame height.
const BP_EDITIONS: NewsletterBookshelfItem[] = [
  { id: "fundamentals", title: "The Fundamentals", series: "Product Analytics Series · 01", date: "01", brand: "mixpanel", color: "#101010", blurb: "A guide to the questions every product team asks.", cover: "assets/case-study/bits-cover-guide.webp", coverRatio: 0.656 },
  { id: "benchmarks", title: "The Benchmarks", series: "Product Analytics Series · 02", date: "02", brand: "mixpanel", color: "#101010", blurb: "A guide to how product teams around the world analyze user behavior.", cover: "assets/case-study/bits-cover-semantic-tokens.webp", coverRatio: 0.6668 },
  { id: "maturity-model", title: "The Maturity Model", series: "Product Analytics Series · 03", date: "03", brand: "mixpanel", color: "#101010", blurb: "A guide to assessing where you are and what to do next.", cover: "assets/case-study/bits-cover-going-independent.webp", coverRatio: 0.6658 },
]

function NewsletterBookshelfHero(props: { style?: React.CSSProperties }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [height, setHeight] = React.useState(360)
  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => setHeight(Math.max(90, Math.round(el.clientHeight * 0.58)))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} style={{ width: "100%", height: "100%", ...(props.style || {}) }}>
      <NewsletterBookshelf items={BP_EDITIONS} brand="Sheps.Studio" height={height} fill />
    </div>
  )
}

module.exports = { NewsletterBookshelf, NewsletterBookshelfHero }
