# Figma build brief — Sheps.Design website

Paste this to your Figma-connected agent along with your file link. It is written as instructions.

---

## 0. Ground rules

- **Target file:** <PASTE FIGMA FILE LINK>
- **Source of truth for values:** `tokens.json` in `Sierra-Alex/sheps.studio.brand` (branch `main`). Every color, spacing, radius, type style and border must be a **bound variable or style**. Do not use raw hex or px values on layers.
- **Source of truth for copy:** `sheps-design-site-draft.md` (the copy doc). Use its text verbatim.
- Use **auto layout everywhere**: frames hug or fill, and spacing is set by gap and padding variables. No absolute positioning, except the hero ASCII art and decorative overlays.
- Name every layer semantically (for example `Section/Problem`, `Card/Bright/Orange`, not `Frame 123`).
- Build in this order: variables → text styles → components → pages. Pause for review after each step.

---

## 1. Pages to create in the file

1. `🎨 Foundations`: variable swatches, type specimen, spacing and radius scale.
2. `🧩 Components`: every component below, with all variants.
3. `🖥 Home`
4. `🖥 Agentic Systems`
5. `🖥 Case Study — Mixpanel`
6. `🔁 Shared`: footer ("Where to start" and "Nice to meet you") and the contact pop-up.
7. `📐 Diagrams`: the six Agentic Systems diagrams as static frames.

Build each screen page at three breakpoint frames side by side: **Desktop 1440**, **Tablet 808**, **Phone 402**.

---

## 2. Variables (import from tokens.json)

Create two collections that mirror the token file.

**Collection `Primitives`** (hidden from publishing):
- **Colors:** orange / Light Orange / dark-orange, sage / light-sage / dark-sage, Cream / Cream-30% / Cream-10% / cream-3% / Dark Cream, Slate / Light Slate / Slate-20% / Slate-8% / Slate-2%, Dark Grey / Base Grey / Light Grey, interactive/error.
- **Numbers:** space 4, 8, 12, 16, 24, 32, 40. Radius 4, 8. Border-width 0, 1. Font-size 12, 14, 16, 24, 36, 48, 60. Blur 4. Max-width 1520, 800. Opacity 60, 80.

**Collection `Semantics`**: every semantic token, aliased to its primitive and never to a raw value. Keep the token file's group paths as variable names, for example:
- `surface/slate`, `surface/cream`
- `text/headline/on-cream`, `text/headline/on-slate`, `text/headline/on-slate-section`, `text/body/on-cream`, `text/body/on-slate`
- `interactive/button/primary/fill-default | fill-hover | text`, plus the secondary on-slate and on-cream sets, `left-right`, `top-bottom`
- `interactive/form-field/*`, `interactive/menu/*`, `interactive/breadcrumb/*`
- `card/muted-card/on-cream | on-slate` (fill, stroke), `card/bright-card/sage | orange` (fill, text, divider), `card/bright/padding` (= **24**), `card/bright/internal-spacing`, `card/contact/*`
- `divider/on-cream`, `divider/on-slate`
- `tag/*`, `icon/*`, `stack/*`, `typography/*-stack`, `horizontal/Lg | Sm`
- The radius tokens: `button-radius`, `card-radius`, `image-radius`, `form-radius`, `nav-radius`, `tag-radius`
- `layout-grid/desktop | tablet | phone` (breakpoint, columns, margin, gutter)

Set variable **scopes** so each one only appears where it's valid: colors on fill or stroke, spacing on gap or padding, radius on corner radius.

---

## 3. Text styles

Build these text styles from the typography tokens. Every value is bound to a font-family, weight, size, line-height or letter-spacing variable.
- **Space Grotesk, Medium, line height 100%, letter spacing −4%:** H1 60, H2 48, H3 36, H4 24.
- **Inter, line height 130%, letter spacing 2%:** B1 16, B2 14 and B3 12, each in Regular and Semi-bold.
- **Component styles:** Button (Inter Medium 14), Menu (Inter Semi-bold 14), Breadcrumb active and inactive (Inter 12), Tag (Inter Medium 12).

---

## 4. Components (page `🧩 Components`)

Each component uses variables only, and each has variants for surface (`on-cream` / `on-slate`) where relevant.

1. **Button:** Primary (orange fill, sage on hover) and Secondary (on-slate, on-cream). States: default, hover, pressed (80% opacity), disabled (60% opacity). Padding `left-right` / `top-bottom`, radius `button-radius`.
2. **Nav bar:** logo, the Examples and Learn links, and a "Let's Chat" primary button. Surface variants cream and slate. Link hover shows a 1px underline that grows from the centre out, in the link's text colour. Radius `nav-radius`, padding `nav/internal-padding`.
3. **Tag:** orange and sage variants.
4. **Form field:** default, focus and error. Fill `form-field/fill`, stroke `form-field/stroke`, radius `form-radius`.
5. **Card / Bright:** orange and sage variants. Padding `card/bright/padding` (24), gap `internal-spacing` (16), radius `card-radius`. Inside: header row (brand icon + H2 at B2 bold + 1px divider + subhead), then body at B1 bold, max width 800.
6. **Card / Muted:** on-cream and on-slate, fill and stroke from the tokens.
7. **Image frame:** the case study image container. An outer padded frame with 24px padding top and left and none right and bottom. Stroke only on the top and left (`border-width/standard`, colour sage at 20%). Corner radius 8 / 0 / 6 / 0. Holds a figcaption label (B3) and a picture fill. Variants: Full (100% width), Half, Tall.
8. **Contents menu (sidebar):** an item has an icon + label; states are active and inactive; surfaces are on-cream and on-slate.
9. **Section header:** icon + H2 + subhead.
10. **Value prop:** brand icon + title (B1 bold) + body (B2).
11. **Work card:** client name, summary, a row of service tags; the hover state is 80% opacity.
12. **FAQ item:** collapsed and expanded.
13. **Footer / Where to start card** and **Footer / About block**.
14. **Contact pop-up:** full-screen, cream, 16px padding. Left side has the form (name, email, message, "Say Hi" button); right side has a media panel with padding 2px on the top, right and bottom and 0 on the left. Close button is the on-slate muted minus icon with no background.

---

## 5. Page layouts

Each page uses a 1520px max-width container on the layout-grid variables: 12 / 6 / 2 columns, margins 40 / 24 / 8, gutter 16. Surface backgrounds run edge to edge. Content stays inside the container.

### Home (slate surface)
1. **Hero:** H1 "Design systems…" + subhead + "Let's Chat" button on the left, ASCII video art on the right (use an image placeholder, not a live video).
2. **Value props:** three across, one column on phone.
3. **Real systems. Real brands.:** section intro + work cards (Mixpanel live, plus placeholders).
4. **Why agent ready matters.**
5. **FAQ:** "General questions asked by clients."
6. **Shared footer.**

### Agentic Systems (slate surface, contents sidebar on the left)
Sections in order, each with its diagram at 24px padding above and below:
1. **Header:** "Design systems, explained." + subhead.
2. **The cascade:** Token Architecture diagram.
3. **Why two token layers?:** Token Relationship diagram + two cards (Primitives, Semantic tokens).
4. **The agent contract:** Agent Contract diagram (three outlined cards).
5. **What's inside it:** What's Inside diagram.
6. **How it evolves:** How It Updates diagram.
7. **What you can build:** Skill Stack diagram (Design system → Your code repo → three skills).
8. **Shared footer.**

### Case Study — Mixpanel (cream surface, contents sidebar)
1. **Header:** H1 "Building an agentic design system for Mixpanel." + Client / Year / Services meta + tags.
2. **The problem:** Bright orange card, single column.
3. **Audit:** full image frame.
4. **Design:** full frame "Homepage" → three-frame block ("Button design" and "Form design" stacked beside a tall "Gradient build and shape language") → full "Product page" → full "Type scales" → full "Login page" → full "Pricing page".
5. **Token building:** full "Primitive colors Figma view" → pair of "Border radius" and "Blur".
6. **Semantic token layer:** full "Cards semantic token view" → pair of "Page spacing" and "Grid system".
7. **Components & templates:** full "Page templates" → three-frame block ("Button build with code" and "Icon semantics" stacked beside a tall "LgProductSection") → full "Heros".
8. **Agent contract:** full "Agent contract .md file".
9. **Tooling & skills:** full frames "LP page builder", "ABM page builder", "Deck builder" and "Ad builder in Figma".
10. **The result:** Bright orange card, single column.
11. **Shared footer.**

Each section is an auto-layout column: section header, body text (max width 800), then image rows. Image rows are horizontal auto layout that wraps, with a 16px gap.

---

## 6. Diagrams (page `📐 Diagrams`)

Rebuild each diagram as a static frame on the slate surface, using variables:
- **Token Architecture:** six rows (Value → Primitive → Semantic → Component → Pattern → Page), with the legend on the left.
- **Token Relationship:** Human / Agent reading Value → Primitive → Semantic. Outlined cards, no fill.
- **Agent Contract:** three outlined cards (rules.md and two others).
- **What's Inside:** the pieces of the system.
- **How It Updates:** rose-100 → Button, updating through the tokens.
- **Skill Stack:** Design system → "saved to" → Your code repo → "referenced by" → Deck builder, Landing page builder, One-pager builder.

Connectors are 1.2px dashed lines (6 on, 8 off) in Cream-20%. Highlighted cards use an orange stroke.

---

## 7. Final checks

- Run a detach and lint pass: no raw hex values, no unbound spacing, and every text layer on a text style.
- Every screen frame resizes cleanly from 1440 to 808 to 402 without overlaps.
- Components are published as a library, with descriptions that reference their token names.
- Report back a list of anything that couldn't be bound to a variable.
