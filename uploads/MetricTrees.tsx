import { useRef, useLayoutEffect } from "react"

const KF = `@keyframes mt-fadeIn{from{opacity:0}to{opacity:1}}@keyframes mt-enterUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}@keyframes mt-cardPop{from{opacity:0;transform:translateY(8px) scale(.94)}to{opacity:1;transform:none}}@keyframes mt-sparkflip{0%,30%{transform:rotate(0deg)}62%,100%{transform:rotate(360deg)}}@keyframes mt-sparkshimmer{0%{background-position:200% 50%}100%{background-position:0% 50%}}@keyframes mt-popIn{from{opacity:0;transform:scale(.94) translateY(5px)}to{opacity:1;transform:none}}@keyframes mt-drift1{0%{transform:translate(0,0);animation-timing-function:cubic-bezier(.22,.61,.36,1)}9%{transform:translate(34px,-16px);animation-timing-function:linear}30%{transform:translate(34px,-16px);animation-timing-function:cubic-bezier(.22,.61,.36,1)}40%{transform:translate(56px,14px);animation-timing-function:linear}60%{transform:translate(56px,14px);animation-timing-function:cubic-bezier(.22,.61,.36,1)}69%{transform:translate(20px,26px);animation-timing-function:linear}88%{transform:translate(20px,26px);animation-timing-function:cubic-bezier(.22,.61,.36,1)}100%{transform:translate(0,0)}}`

const FONT = "'Apercu Pro','Helvetica Neue',Helvetica,Arial,sans-serif"
const MONO = "'Apercu Mono',ui-monospace,monospace"

// nested-square metric glyph (Insights purple)
const ICON = `<span style="width:18px;height:18px;position:relative;flex:0 0 auto;"><span style="position:absolute;left:2px;top:2px;width:14px;height:14px;border-radius:1.5px;background:rgba(120,86,255,0.24);box-shadow:inset 0 0 0 0.5px rgb(120,86,255);"></span><span style="position:absolute;left:5.5px;top:5.5px;width:7px;height:7px;border-radius:0.75px;background:rgba(120,86,255,0.4);box-shadow:inset 0 0 0 0.5px rgb(120,86,255);"></span></span>`

const chip = (label: string, val: string, color: string, first?: boolean) =>
    `<div style="flex:1 1 0;border-radius:5px;${first ? "background:#FFFFFF;box-shadow:0 0 6px rgba(31,32,35,0.15);" : ""}display:flex;flex-direction:column;gap:1px;justify-content:center;align-items:center;"><span style="font-size:10px;font-weight:500;line-height:1;color:#2A2A2F;">${label}</span><span style="font-family:${MONO};font-size:10px;line-height:1;color:${color};">${val}</span></div>`

const card = (delay: string, label: string, value: string, chips: string, hl?: boolean) =>
    `<div style="${hl ? "position:relative;" : ""}width:196px;height:176px;border-radius:7px;background:#FFFFFF;box-shadow:${hl ? "inset 0 0 0 1.5px #7856FF,0 0 0 4px rgba(120,86,255,0.14),0 6px 20px -8px rgba(31,32,35,0.16)" : "inset 0 0 0 1px #E9E9E9,0 6px 20px -8px rgba(31,32,35,0.16)"};padding:10px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;flex:0 0 auto;animation:mt-enterUp .45s ease-out ${delay}s both;"><div style="display:flex;gap:5px;align-items:center;">${ICON}<span style="font-size:11px;font-weight:500;line-height:1.15;color:#2A2A2F;">${label}</span></div><div style="display:flex;flex-direction:column;gap:2px;align-items:center;"><span style="font-size:38px;font-weight:700;line-height:1;letter-spacing:-0.04em;color:#2A2A2F;">${value}</span></div><div style="height:34px;border-radius:6px;background:#F6F6F6;padding:1px;box-sizing:border-box;display:flex;gap:1px;">${chips}</div></div>`

const pin = (left: number, top: number, anim: string, color: string, name: string) =>
    `<div style="position:absolute;left:${left}px;top:${top}px;animation:${anim};"><svg width="16" height="16" viewBox="0 0 20 20" style="display:block;"><path d="M 1.636 0.228 C 1.49 0.108 1.312 0.031 1.124 0.008 C 0.936 -0.016 0.745 0.015 0.573 0.096 C 0.402 0.177 0.257 0.305 0.155 0.465 C 0.054 0.625 0 0.811 0 1 L 0 14.998 C 0 15.925 1.15 16.353 1.756 15.653 L 5.28 11.58 C 5.421 11.418 5.595 11.287 5.791 11.198 C 5.986 11.109 6.199 11.062 6.414 11.062 L 12.006 11.062 C 12.944 11.062 13.366 9.886 12.642 9.29 L 1.636 0.228 Z" fill="${color}" transform="matrix(0.966,-0.259,0.259,0.966,3.15,4.014)"></path></svg><span style="position:absolute;left:15px;top:8px;height:20px;border-radius:20px;background:${color};color:#FFFFFF;font-size:11px;line-height:1;display:flex;align-items:center;padding:0 7px;box-sizing:border-box;white-space:nowrap;">${name}</span></div>`

const CONNECTOR = `<svg width="444" height="88" viewBox="0 0 444 88" fill="none" style="flex:0 0 auto;"><path d="M222,0 L226.5,7 L217.5,7 Z" fill="#8F8F91" style="animation:mt-fadeIn .4s ease-out 1.5s both;"></path><path d="M222,7 L222,40" stroke="#8F8F91" stroke-width="1.2" stroke-dasharray="3 3" style="animation:mt-fadeIn .6s ease-out 1.4s both;"></path><path d="M222,40 C222,70 98,60 98,88" stroke="#8F8F91" stroke-width="1.2" stroke-dasharray="3 3" style="animation:mt-fadeIn .6s ease-out 1.4s both;"></path><path d="M222,40 C222,70 346,60 346,88" stroke="#8F8F91" stroke-width="1.2" stroke-dasharray="3 3" style="animation:mt-fadeIn .6s ease-out 1.4s both;"></path></svg>`

const CALLOUT = `<div style="position:absolute;top:176px;left:-24px;z-index:30;width:224px;border-radius:8px;background:rgba(255,255,255,0.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 0 10px 0 rgba(0,0,0,0.1);display:flex;gap:8px;padding:10px 12px 10px 8px;box-sizing:border-box;transform-origin:top center;animation:mt-cardPop .5s cubic-bezier(.34,1.4,.5,1) 1.5s both;"><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-start;flex:1 1 auto;min-width:0;"><div style="display:flex;gap:6px;align-items:center;"><span style="display:block;width:16px;height:16px;flex:0 0 auto;perspective:240px;"><span style="display:block;width:16px;height:16px;transform-style:preserve-3d;animation:mt-sparkflip 2.6s ease-in-out infinite;"><svg width="16" height="16" viewBox="0 0 18 18" fill="none" style="display:block;"><defs><linearGradient id="mtSpark" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0" spreadMethod="repeat"><stop offset="0" stop-color="#C956FF"></stop><stop offset="0.5" stop-color="#FF834E"></stop><stop offset="1" stop-color="#C956FF"></stop><animate attributeName="x1" values="0;1" dur="2.2s" repeatCount="indefinite"></animate><animate attributeName="x2" values="1;2" dur="2.2s" repeatCount="indefinite"></animate></linearGradient></defs><path d="M 9.992 0 C 10.262 0.007 10.476 0.228 10.494 0.498 C 10.74 4.234 13.727 7.221 17.463 7.466 C 17.738 7.485 17.962 7.706 17.962 7.982 L 17.962 10.09 L 17.948 10.09 C 17.897 10.311 17.699 10.478 17.463 10.493 C 13.727 10.739 10.74 13.726 10.494 17.462 C 10.477 17.717 10.285 17.925 10.038 17.955 L 10.038 17.961 L 7.983 17.961 C 7.707 17.961 7.486 17.737 7.467 17.462 C 7.222 13.726 4.235 10.739 0.499 10.493 C 0.263 10.478 0.065 10.311 0.014 10.09 L 0 10.09 L 0 7.982 C 0 7.706 0.224 7.485 0.499 7.466 C 4.235 7.221 7.222 4.234 7.467 0.498 C 7.485 0.228 7.7 0.007 7.969 0 L 9.992 0 Z M 8.981 1.353 C 8.952 1.353 8.928 1.374 8.925 1.403 C 8.48 5.348 5.349 8.476 1.404 8.922 C 1.376 8.926 1.354 8.95 1.354 8.979 C 1.354 9.008 1.376 9.032 1.404 9.036 C 5.349 9.482 8.478 12.612 8.924 16.557 C 8.928 16.585 8.952 16.607 8.98 16.607 C 9.009 16.607 9.033 16.585 9.036 16.557 C 9.482 12.612 12.612 9.483 16.557 9.037 C 16.586 9.033 16.608 9.009 16.608 8.979 C 16.608 8.95 16.586 8.926 16.557 8.922 C 12.612 8.476 9.482 5.347 9.036 1.403 C 9.033 1.374 9.009 1.353 8.981 1.353 Z" fill="url(#mtSpark)" fill-rule="evenodd"></path></svg></span></span><span style="font-family:${FONT};font-size:12px;font-weight:500;line-height:1;letter-spacing:-0.1px;background:linear-gradient(90deg,#C956FF,#FF834E,#C956FF);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:mt-sparkshimmer 2.2s linear infinite;">Mixpanel AI</span></div><span style="font-size:11px;font-weight:400;line-height:1.4;color:#626266;">I've created a Website signups metric and added it to your company KPI tree.</span><div style="display:flex;gap:6px;align-items:center;align-self:stretch;"><span style="height:20px;border-radius:4px;background:#F0EDFF;display:flex;align-items:center;padding:0 7px;box-sizing:border-box;flex:0 0 auto;"><span style="font-size:12px;font-weight:500;line-height:1;color:#5B3FD6;white-space:nowrap;">Website signups</span></span><span style="font-size:12px;font-weight:400;line-height:1;color:#8F8F91;white-space:nowrap;">→ ARR</span></div></div></div>`

const MARKUP = `<div style="position:relative;width:488px;height:488px;overflow:visible;border-radius:16px;background:rgba(250,250,250,0.5);box-shadow:inset 0 0 0 0.5px rgba(255,255,255,0.2),0 0 0 0.5px rgba(255,255,255,0.2),inset -2px -2px 4px 0 rgba(0,0,0,0.05),inset 2px 2px 2px 0 #FFFFFF,0 8px 40px 0 rgba(0,0,0,0.1);box-sizing:border-box;padding:4px;display:flex;flex-direction:column;align-items:flex-start;font-family:${FONT};"><div style="position:relative;height:480px;align-self:stretch;flex-shrink:0;overflow:visible;border-radius:12px;background:#FFFFFF;display:flex;flex-direction:column;box-sizing:border-box;">
${CALLOUT}
<div style="position:absolute;inset:0;border-radius:12px;overflow:hidden;">
<div style="position:absolute;left:0;right:0;top:0;bottom:0;background-image:radial-gradient(#E4E4E7 1px, transparent 1px);background-size:20px 20px;animation:mt-fadeIn .5s ease-out both;"></div>
<div style="position:absolute;left:50%;top:18px;transform:translateX(-50%);width:444px;display:flex;flex-direction:column;align-items:center;gap:2px;">
${card(".6", "Annual Recurring Revenue", "$1.2M", chip("MoM", "↑3.9%", "#219464", true) + chip("YoY", "↑12.3%", "#219464"))}
${CONNECTOR}
<div style="display:flex;gap:52px;flex:0 0 auto;">
${card(".95", "Activated accounts", "48.2K", chip("WoW", "↑0.7%", "#219464", true) + chip("YoY", "↓3.1%", "#E34F2F"))}
${card("1.1", "Website signups", "18.4K", chip("WoW", "↑2.6%", "#219464", true) + chip("MoM", "↑9.4%", "#219464"), true)}
</div>
</div>
${pin(342, 70, "mt-popIn .35s ease-out 2.1s both,mt-drift1 15s ease-in-out 2.4s infinite", "rgb(178,88,110)", "Priya")}
${pin(238, 248, "mt-popIn .4s ease-out 5.4s both,mt-drift1 16s ease-in-out 5.8s infinite", "#0D7EA0", "Dana")}
</div>
</div></div>`

export default function Metric_Trees_Product_Spot() {
    const wrap = useRef<HTMLDivElement>(null)
    const inner = useRef<HTMLDivElement>(null)
    useLayoutEffect(() => {
        const w = wrap.current, b = inner.current; if (!w || !b) return
        const fit = () => {
            const cw = w.clientWidth; if (!cw) return
            const s = Math.min(1, cw / 488)
            b.style.transformOrigin = "top center"
            b.style.transform = s < 1 ? `scale(${s})` : "none"
            w.style.height = (488 * s) + "px"
        }
        fit(); requestAnimationFrame(fit)
        const ro = new ResizeObserver(fit); ro.observe(w)
        window.addEventListener("resize", fit)
        return () => { ro.disconnect(); window.removeEventListener("resize", fit) }
    }, [])
    return (
        <div ref={wrap} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <style>{KF}</style>
            <div ref={inner} style={{ width: 488, height: 488 }} dangerouslySetInnerHTML={{ __html: MARKUP }} />
        </div>
    )
}
