## 1. DOM Structure

- [x] 1.1 Add `<span>` wrapper with `position: relative; display: block` around each name `<span>` in `HeroSection.astro`. Must be `<span>` not `<div>` (phrasing content constraint in `<h1>`). Verify no visual change to static layout (line-height, spacing).
- [x] 1.2 Add overlay `<span>` as sibling inside each wrapper — same text content, `.hero-name-shimmer` class, `position: absolute; inset: 0; pointer-events: none; opacity: 0`, `aria-hidden="true"`. Must be in the static Astro template (server-rendered), not dynamically created. Add code comment explaining the static-DOM requirement (animation phase sync invariant).

## 2. Animation Timeline

- [x] 2.1 Query overlay elements in `hero-animations.ts` and set initial `opacity: 0` via GSAP.
- [x] 2.2 For each name's GSAP tween, compose a wrapper `onUpdate` function that: (a) calls the existing `scrambleOnUpdate` logic (function signature unchanged), (b) checks `this.progress() >= 0.75` with a one-shot boolean flag, (c) when triggered, initiates a single proxy tween `{ t: 0 }` → `{ t: 1 }` with `ease: 'linear'`, `duration: 0.25s`, whose `onUpdate` sets overlay opacity to `t` and SplitType chars opacity to `1 - t`. Store the proxy tween reference in a variable accessible to the main timeline's `onComplete` closure. The 0.75 threshold is a tuning parameter — verify visually in task 5.1. Must use regular `function` (not arrow) for correct `this` binding from GSAP.
- [x] 2.3 Remove the existing post-revert `webkitTextFillColor` cross-fade tween from `onComplete`.
- [x] 2.4 Guard overlay animation with the same null checks that protect SplitType logic.

## 3. Handoff and Cleanup

- [x] 3.1 In `onComplete`, execute atomically in sequence: (1) if cross-fade proxy tween is still active, force-complete via `.progress(1)`, (2) `SplitType.revert()`, (3) `first.style.removeProperty('-webkit-text-fill-color')`, (4) `last.style.removeProperty('-webkit-text-fill-color')`, (5) `firstOverlay.remove()`, (6) `lastOverlay.remove()`. All synchronous, same callback, no async gap.
- [x] 3.2 Verify CSS `@keyframes shimmer` animation phase sync between overlay and original at moment of removal. Mechanism: both elements in DOM since page load with same `.hero-name-shimmer` class — same document timeline. This invariant breaks if overlays are ever dynamically created.

## 4. Reduced Motion

- [x] 4.1 In the existing `prefers-reduced-motion` early-return block of `initHeroAnimations`, query overlay elements and remove them from the DOM (they are server-rendered but not needed for static display). Verify no regression to existing reduced-motion behavior.

## 5. Visual Verification

- [ ] 5.1 Screenshot the entrance animation with Playwright to confirm gradient is visible during scramble. Verify the 0.75 threshold looks correct — tune if needed.
- [ ] 5.2 Verify no flash or pop at handoff AND no text doubling during cross-fade. At 400% zoom, overlay and chars should not both be visible at significant combined opacity.
- [ ] 5.3 Verify overlay does not block pointer events (dot grid interaction works during entrance).
- [ ] 5.4 Verify wrapper `<span>` does not alter static name layout — compare screenshots of the `<h1>` before and after adding wrappers, with no animation running.
