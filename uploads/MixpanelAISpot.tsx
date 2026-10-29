import * as React from "react";

/**
 * Mixpanel AI — Agent chat focus view
 * Self-contained React component. No external assets or dependencies: the whole
 * design is native JSX + inline styles, so it's a few KB and works offline.
 *
 * Behavior: on mount it plays a short story — a proactive Mixpanel AI alert, the
 * user asking for a root-cause analysis, the finding, a request to build a board,
 * and finally a generated board card. The conversation auto-scrolls to the newest
 * beat. Restarts whenever `playKey` changes.
 *
 * It scales to FIT whatever box you give it (never cropped, never upscaled past
 * 1:1). Drop it in and give the wrapper a width/height via `style`.
 *
 * Fonts: uses Apercu Pro if available, else falls back to Helvetica Neue → Arial.
 */

const DESIGN = 488;
const FONT = "'Apercu Pro','Helvetica Neue',Helvetica,Arial,sans-serif";

// Spark glyph path (filled, even-odd — has the inner cutout)
const SPARK =
  "M 9.992 0 C 10.262 0.007 10.476 0.228 10.494 0.498 C 10.74 4.234 13.727 7.221 17.463 7.466 C 17.738 7.485 17.962 7.706 17.962 7.982 L 17.962 10.09 L 17.948 10.09 C 17.897 10.311 17.699 10.478 17.463 10.493 C 13.727 10.739 10.74 13.726 10.494 17.462 C 10.477 17.717 10.285 17.925 10.038 17.955 L 10.038 17.961 L 7.983 17.961 C 7.707 17.961 7.486 17.737 7.467 17.462 C 7.222 13.726 4.235 10.739 0.499 10.493 C 0.263 10.478 0.065 10.311 0.014 10.09 L 0 10.09 L 0 7.982 C 0 7.706 0.224 7.485 0.499 7.466 C 4.235 7.221 7.222 4.234 7.467 0.498 C 7.485 0.228 7.7 0.007 7.969 0 L 9.992 0 Z M 8.981 1.353 C 8.952 1.353 8.928 1.374 8.925 1.403 C 8.48 5.348 5.349 8.476 1.404 8.922 C 1.376 8.926 1.354 8.95 1.354 8.979 C 1.354 9.008 1.376 9.032 1.404 9.036 C 5.349 9.482 8.478 12.612 8.924 16.557 C 8.928 16.585 8.952 16.607 8.98 16.607 C 9.009 16.607 9.033 16.585 9.036 16.557 C 9.482 12.612 12.612 9.483 16.557 9.037 C 16.586 9.033 16.608 9.009 16.608 8.979 C 16.608 8.95 16.586 8.926 16.557 8.922 C 12.612 8.476 9.482 5.347 9.036 1.403 C 9.033 1.374 9.009 1.353 8.981 1.353 Z";

const CSS = `
@keyframes mxsEnterUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes mxsCardPop{from{opacity:0;transform:translateY(8px) scale(.94)}to{opacity:1;transform:none}}
@keyframes mxsFlip{0%,30%{transform:rotate(0deg)}62%,100%{transform:rotate(360deg)}}
@keyframes mxsShimmer{0%{background-position:200% 50%}100%{background-position:0% 50%}}`;

let sparkSeq = 0;
function Spark({ size = 16 }: { size?: number }) {
  const id = React.useMemo(() => "mxs-spark-" + sparkSeq++, []);
  return (
    <span style={{ display: "block", width: size, height: size, flex: "0 0 auto", perspective: 240 }}>
      <span style={{ display: "block", width: size, height: size, transformStyle: "preserve-3d", animation: "mxsFlip 2.6s ease-in-out infinite" }}>
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id={id} gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat">
              <stop offset="0" stopColor="#C956FF" />
              <stop offset="0.5" stopColor="#FF834E" />
              <stop offset="1" stopColor="#C956FF" />
              <animate attributeName="x1" values="0;1" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="x2" values="1;2" dur="2.2s" repeatCount="indefinite" />
            </linearGradient>
          </defs>
          <path d={SPARK} fill={`url(#${id})`} fillRule="evenodd" />
        </svg>
      </span>
    </span>
  );
}

const shimmerText: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: "-0.1px",
  background: "linear-gradient(90deg,#C956FF,#FF834E,#C956FF)",
  backgroundSize: "200% 100%",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  animation: "mxsShimmer 2.2s linear infinite",
};

const bodyText: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.45,
  letterSpacing: "-0.1px",
  color: "#2A2A2F",
  fontWeight: 400,
  textWrap: "pretty" as any,
};

const userBubble: React.CSSProperties = {
  alignSelf: "flex-end",
  maxWidth: "88%",
  flex: "0 0 auto",
  background: "rgba(79,68,224,0.1)",
  borderRadius: "14px 14px 2px 14px",
  padding: "11px 13px",
  boxSizing: "border-box",
  animation: "mxsEnterUp .4s ease-out both",
};

const statusRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flex: "0 0 auto",
  margin: 2,
  animation: "mxsEnterUp .4s ease-out both",
};

// story timeline: [delayMs, step]
const SEQ: [number, number][] = [
  [500, 1], [2200, 2], [3200, 3], [4600, 4], [5900, 5], [6900, 6], [7700, 7],
];

export default function MixpanelAISpot(props: { style?: React.CSSProperties; playKey?: string | number }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const stackRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [step, setStep] = React.useState(0);

  // fit-to-container
  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const cw = el.clientWidth;
      if (!cw) return;
      const s = Math.min(1, cw / DESIGN);
      el.style.height = DESIGN * s + "px";
      setScale(s);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, []);

  // story timeline
  React.useEffect(() => {
    setStep(0);
    const timers = SEQ.map(([ms, s]) => setTimeout(() => setStep(s), ms));
    return () => timers.forEach(clearTimeout);
  }, [props.playKey]);

  // auto-scroll the stack so the newest beat stays in view
  React.useLayoutEffect(() => {
    const vp = scrollRef.current, st = stackRef.current;
    if (!vp || !st) return;
    const off = Math.max(0, st.offsetHeight - vp.clientHeight);
    st.style.transform = `translateY(${-off}px)`;
  }, [step]);

  return (
    <div ref={wrapRef} style={{ width: "100%", display: "flex", justifyContent: "center", ...props.style }}>
      <style>{CSS}</style>
      <div style={{ width: DESIGN, height: DESIGN, flex: "0 0 auto", transformOrigin: "top center", transform: `scale(${scale})`, fontFamily: FONT }}>
        {/* beveled casing */}
        <div style={{ position: "relative", width: 488, height: 488, borderRadius: 16, background: "rgba(250,250,250,0.5)", boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.2),0 0 0 0.5px rgba(255,255,255,0.2),inset -2px -2px 4px 0 rgba(0,0,0,0.05),inset 2px 2px 2px 0 #FFFFFF,0 8px 40px 0 rgba(0,0,0,0.1)", boxSizing: "border-box", padding: 4, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          {/* inner white card */}
          <div style={{ position: "relative", height: 480, alignSelf: "stretch", flexShrink: 0, borderRadius: 12, background: "#FFFFFF", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
            <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", padding: 12, boxSizing: "border-box", minHeight: 0 }}>

              {/* conversation viewport */}
              <div ref={scrollRef} style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden", paddingRight: 2 }}>
                <div ref={stackRef} style={{ display: "flex", flexDirection: "column", gap: 12, transition: "transform .55s cubic-bezier(.4,0,.2,1)", willChange: "transform" }}>

                  {/* 1 · proactive alert */}
                  {step >= 1 && (
                    <div style={{ flex: "0 0 auto", borderRadius: 10, padding: "11px 12px", boxSizing: "border-box", background: "linear-gradient(135deg,rgba(201,86,255,0.10),rgba(255,131,78,0.10))", boxShadow: "inset 0 0 0 1px rgba(201,86,255,0.28)", animation: "mxsEnterUp .45s ease-out both" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                        <Spark />
                        <span style={shimmerText}>Mixpanel AI</span>
                      </div>
                      <p style={bodyText}>Heads up — signups dropped 18% week over week, dragging down your Activation KPI. Want me to dig into it?</p>
                    </div>
                  )}

                  {/* 2 · user */}
                  {step >= 2 && (
                    <div style={userBubble}>
                      <p style={bodyText}>Yes — run a root cause analysis on what's driving the drop.</p>
                    </div>
                  )}

                  {/* 3 · thinking */}
                  {step === 3 && (
                    <div style={statusRow}>
                      <Spark />
                      <span style={shimmerText}>Running root cause analysis…</span>
                    </div>
                  )}

                  {/* 4 · result */}
                  {step >= 4 && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 9, flex: "0 0 auto", margin: 2, animation: "mxsEnterUp .4s ease-out both" }}>
                      <span style={{ flex: "0 0 auto", width: 5, height: 5, borderRadius: "50%", background: "#626266", marginTop: 7 }} />
                      <p style={bodyText}>Found it. The drop starts the day the redesigned signup page shipped — conversion on that step fell from 62% to 44%.</p>
                    </div>
                  )}

                  {/* 5 · user */}
                  {step >= 5 && (
                    <div style={userBubble}>
                      <p style={bodyText}>Got it. Build me a board to track this.</p>
                    </div>
                  )}

                  {/* 6 · building */}
                  {step === 6 && (
                    <div style={statusRow}>
                      <Spark />
                      <span style={shimmerText}>Building your board…</span>
                    </div>
                  )}

                  {/* 7 · generated board */}
                  {step >= 7 && (
                    <div style={{ flex: "0 0 auto", borderRadius: 10, background: "#FFFFFF", boxShadow: "inset 0 0 0 1px #E9E9E9", overflow: "hidden", boxSizing: "border-box", animation: "mxsCardPop .45s cubic-bezier(.34,1.3,.5,1) both" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "9px 11px", borderBottom: "1px solid #E9E9E9" }}>
                        <span style={{ width: 26, height: 26, borderRadius: 6, background: "rgba(120,86,255,0.18)", display: "block", flex: "0 0 auto" }} />
                        <span style={{ fontSize: 12, fontWeight: 400, letterSpacing: "-0.1px", color: "#8F8F91" }}>Open board</span>
                      </div>
                      <div style={{ position: "relative", height: 78, padding: "6px 0 0", boxSizing: "border-box" }}>
                        <svg width="100%" height="100%" viewBox="0 0 300 78" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                          <defs>
                            <linearGradient id="mxs-board-area" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0" stopColor="#7856FF" stopOpacity="0.24" />
                              <stop offset="1" stopColor="#7856FF" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d="M0 48 L60 42 L120 48 L165 54 L225 42 L300 20 L300 78 L0 78 Z" fill="url(#mxs-board-area)" />
                          <path d="M0 48 L60 42 L120 48 L165 54 L225 42 L300 20" fill="none" stroke="#7856FF" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                        </svg>
                        <span style={{ position: "absolute", left: "55%", top: "69.2%", transform: "translate(-50%,-50%)", width: 9, height: 9, borderRadius: "50%", background: "#7856FF", boxShadow: "0 0 0 2px #FFFFFF" }} />
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* composer */}
              <div style={{ alignSelf: "stretch", flex: "0 0 auto", marginTop: 10, background: "#F6F6F6", borderRadius: 8, padding: "11px 12px 9px", boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: 60, animation: "mxsEnterUp .4s ease-out .1s both" }}>
                <span style={{ fontSize: 12, lineHeight: 1.43, letterSpacing: "-0.1px", color: "#8F8F91", fontWeight: 400, flex: "1 1 auto" }}>Ask a follow-up…</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 7 }}>
                  <span style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "#8F8F91" }}>
                    <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M9 4.5V13.5M4.5 9H13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </span>
                  <span style={{ width: 24, height: 24, border: "1px solid #626266", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 8, height: 8, background: "#8F8F91", borderRadius: 1.5, display: "block" }} />
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
