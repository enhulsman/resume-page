## Context

The hero entrance animation uses SplitType to split the first/last name into per-character `<span>` elements for a scramble + blur-reveal effect. Each char span is `display: inline-block`, which creates an independent paint context — the parent's `background-clip: text` gradient has no direct text content to clip to, so the shimmer gradient is invisible while SplitType is active.

Current workaround: the parent's `-webkit-text-fill-color` is set to solid gold (overriding the transparent value needed for the gradient), chars are colored via `color: var(--color-accent-primary)`, and after `SplitType.revert()` restores direct text, a 0.5s tween fades `webkitTextFillColor` from solid gold to transparent to reveal the gradient. This creates a visible "flat → shimmer" pop after the entrance completes.

Key files: `src/components/HeroSection.astro` (DOM + CSS), `src/scripts/hero-animations.ts` (GSAP timeline).

## Goals / Non-Goals

**Goals:**
- Show the shimmer gradient during the entrance animation, not just after
- Seamless visual handoff from overlay gradient to native CSS gradient (no flash, no pop)
- Zero impact on reduced-motion path
- No new runtime dependencies

**Non-Goals:**
- Changing the shimmer gradient colors or animation speed
- Modifying the scramble/blur-reveal mechanics
- Supporting the gradient on individual SplitType char spans (rejected approach)

## Decisions

### 1. Cloned overlay with proxy-tween cross-fade

**Decision:** Use absolutely-positioned overlay spans that duplicate the name text with the `.hero-name-shimmer` class. The overlay and SplitType chars are cross-faded (not stacked) — a single proxy tween `{ t: 0 }` → `{ t: 1 }` with `ease: 'linear'` drives both opacities from one interpolation: overlay opacity = `t`, chars opacity = `1 - t`. This guarantees `overlayOpacity + charOpacity === 1` at every frame, eliminating any sub-pixel text alignment artifacts from the two different text renderings.

**Alternatives considered:**
- **Per-char gradient with offset math:** Apply gradient to each char span, calculate `background-size` (parent width × 3) and `background-position` (char's `offsetLeft`) to simulate a continuous gradient. Rejected because: (a) animating `background-position` on N elements per frame for the shimmer is expensive, (b) resize during animation breaks offset math, (c) random scramble chars with gradient looks visually inconsistent.
- **CSS `@property` + custom property animation:** Register a `@property --shimmer-pos` and have all chars reference it. Simpler than per-element JS, but still requires the per-char offset calculation, and `@property` support is not universal in older Safari.
- **Faster cross-fade (accept limitation):** Just shorten the post-revert tween to 0.15s. Rejected because the gradient difference (gold → cream → copper) is too prominent — the transition is still noticeable.
- **Stacked overlay (no cross-fade):** Fade overlay in on top of SplitType chars. Rejected because SplitType's fixed-width `inline-block` chars render differently than a plain text node — at large font sizes (`clamp(2.5rem, 11vw, 10rem)`, up to 160px), sub-pixel misalignment between the two text renderings produces visible doubling artifacts when both are simultaneously visible.

**Rationale:** The overlay requires no per-frame JS math, uses the same native CSS `@keyframes shimmer` animation that runs post-entrance, and positions trivially since both elements are `display: block` in the same `<h1>`. The proxy-tween cross-fade adds negligible complexity while mathematically preventing text doubling.

### 2. Progress-callback-based overlay triggering at ~75%

**Decision:** Each name's overlay cross-fade is triggered independently via a wrapper `onUpdate` function. The wrapper first delegates to the existing `scrambleOnUpdate` logic (function signature unchanged), then checks `this.progress() >= 0.75`. When triggered (once, via a boolean flag), it initiates the proxy tween described in Decision 1 with `duration: 0.25s`. Each name fires independently, which naturally handles the overlapping first/last name scramble timelines (`-=0.38` offset). The 0.75 threshold is a tuning starting point — verify visually.

**Rationale:** Fading in too early makes the gradient visible on still-scrambling characters (looks odd — gradient on random glyphs). Too late and it's barely different from the current post-revert approach. 75% is when the name is recognizable but the last few chars are still resolving — the gradient appearing here reads as the text "coming alive." Progress-callback-based triggering (vs. fixed timeline position) ties the overlay to actual character resolution, not elapsed time.

### 3. Atomic handoff with force-complete guard

**Decision:** In `onComplete`, execute atomically: (1) if the cross-fade proxy tween is still active (e.g., tab was backgrounded and GSAP coalesced ticks), force-complete it via `.progress(1)`, (2) `SplitType.revert()`, (3) remove `webkitTextFillColor` from original elements, (4) remove overlay elements from DOM. All synchronous in the same callback, no async gap.

**Rationale:** The overlay and native gradient are visually identical (same class, same animation phase from shared DOM lifetime). Removing the overlay is a clean cutover. The force-complete guard prevents a partial cross-fade state if `onComplete` fires before the proxy tween finishes naturally.

### 4. DOM structure: static server-rendered overlays with `<span>` wrappers

**Decision:** Wrap each name `<span>` in a `<span>` with `position: relative; display: block` (must be `<span>`, not `<div>` — `<h1>` only allows phrasing content). Add the overlay as a sibling `<span>` with `position: absolute; inset: 0; pointer-events: none; opacity: 0`. The overlay carries `.hero-name-shimmer`, duplicates the text content, and must be present in the Astro template (server-rendered HTML, not dynamically created) to ensure CSS animation phase alignment with the original element.

**Alternative:** Clone nodes in JS instead of adding them to the Astro template. Rejected because: (a) static DOM is more predictable, avoids flash-of-unstyled-clone, (b) dynamically created elements start their CSS animation from a different phase than elements present since page load, breaking the shimmer phase sync at handoff.

## Risks / Trade-offs

- **[Risk] Text alignment between overlay and SplitType chars** → Mitigated: proxy-tween cross-fade ensures combined opacity = 1 at every frame. They are never both visible at significant opacity simultaneously, eliminating sub-pixel misalignment artifacts.
- **[Risk] Overlay created dynamically breaks animation phase sync** → Mitigated: spec requires overlay in server-rendered HTML. Code comment in Astro template explains the invariant. If a future developer moves to dynamic creation, the shimmer will visibly jump at handoff.
- **[Risk] Shimmer animation phase mismatch between overlay and original** → Mitigated: both elements are in the DOM from page load with the same `.hero-name-shimmer` class, so their `@keyframes shimmer` animations share the document timeline. Phase is identical at handoff.
- **[Risk] Tab backgrounded during entrance, GSAP coalesces ticks, cross-fade incomplete at onComplete** → Mitigated: `onComplete` force-completes the cross-fade proxy tween via `.progress(1)` before proceeding with revert.
- **[Risk] Font loading shifts overlay alignment** → Pre-existing concern (SplitType measures char widths before font loads). The cross-fade means only one text representation is visible at any time, so font-swap reflow affects whichever is dominant. Not worsened by this change.
- **[Trade-off] +4 DOM elements in `<h1>` (2 wrappers + 2 overlays)** → Acceptable for a hero section with minimal DOM. Overlays are removed after entrance completes; wrappers remain but are inert.
