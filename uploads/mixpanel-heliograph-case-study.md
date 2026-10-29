# Heliograph: Building an Agentic Design System for Mixpanel

**Client:** Mixpanel
**Role:** Lead Design Systems Designer
**Scope:** Design system audit → token architecture → component library → AI tooling layer

---

## The Problem

Mixpanel's product and marketing surfaces had grown faster than the design system supporting them. Components were duplicated across Figma files, color usage was inconsistent between product and web, and there was no shared source of truth that both designers and engineers — let alone AI tools — could reliably read from. Every new feature meant re-deriving decisions that should have already been settled.

The brief wasn't just "clean up the design system." It was to build one that could keep itself consistent as the company scaled — and that could be operated on by AI agents, not just humans.

---

## Audit

The work started with a full audit of the existing design surface: Figma libraries, live product UI, and the marketing site, cataloguing every color, spacing value, type style, and component variant actually in use versus what was documented. This surfaced the real gap — not a lack of design work, but a lack of *shared, enforceable structure* underneath it. The audit became the scoping document for everything that followed, prioritized by what was causing the most inconsistency and rework day-to-day.

---

## Design

With the gaps mapped, the next phase focused on the visual language itself — reconciling divergent styling across product and marketing into a single coherent system, resolving naming collisions (e.g. "primitive" being used to mean both tokens and components), and establishing the visual and structural conventions the token architecture would need to formalize.

---

## Token Building

At the base of the system: primitive tokens. Raw values — color ramps, spacing scales, type sizes — named for what they *are*, not what they're used for. This layer is deliberately dumb; it exists so nothing above it has to hard-code a hex value or a pixel number again.

---

## Semantic Token Layer

On top of the primitives sits the semantic layer — tokens named for their *job*, not their appearance. `surface`, `text`, `border`, `state`, and `emphasis` roles map onto the primitives, so a designer or an engineer (or an AI agent) can ask "what color is this warning banner" and get a token that means something, rather than a raw value they have to interpret. This layer follows a pull-not-push discipline: new semantic tokens get added only when a real use case demands them, keeping the system lean instead of over-built.

---

## Component Build & Templates

With primitives and semantics in place, components could finally be built *on* the system rather than around it — each one consuming tokens rather than overriding them. Templates assembled these components into the patterns teams actually reuse, closing the loop between the token layer and the screens people build every day.

---

## Tooling & Skills

The differentiating layer: turning the design system from a static reference into something AI tools could operate on directly. This meant building agent-legible documentation (an AGENTS.md-style contract layer describing the system's structure and rules in a format a model can act on), and packaging system knowledge into Claude skills — reusable instructions that let AI tooling apply the design system correctly instead of guessing at it. The result is a design system that doesn't just get *followed* — it gets *read* by the tools building on top of it.

---

## Outcome

*[Add specifics here once available: adoption numbers, time saved, before/after screenshots, quotes from the team, or the current state of the system now that it's been handed off.]*

---

*Note: this draft leans on the shape of the work — swap in real screenshots (audit findings, token tables, component anatomy, before/after shots) and any metrics you have before publishing. Happy to help tighten the narrative once those are in.*
