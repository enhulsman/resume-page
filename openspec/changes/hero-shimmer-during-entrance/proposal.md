## Why

The hero name text stays flat solid gold throughout the entire scramble + blur-reveal entrance animation (~1.5s). The shimmer gradient only appears after `SplitType.revert()` completes, followed by a 0.5s cross-fade. This makes the entrance feel static compared to the rest of the page, and the delayed shimmer pop is visually jarring. The gradient (gold → cream → copper → gold) is a significant part of the hero's visual identity and should be present during the entrance, not bolted on afterward.

The root cause is a CSS rendering constraint: `background-clip: text` on the parent cannot show its gradient through SplitType's `inline-block` child spans — the child spans create their own paint context, leaving the parent's clipped background with no text to clip to.

## What Changes

- Add absolutely-positioned overlay `<span>` elements for each name line (first name, last name) that carry the `.hero-name-shimmer` gradient styling
- Fade the overlay in during the latter portion of the scramble timeline (~70-80% progress), so the gradient bleeds through as characters resolve
- Remove the overlay after `SplitType.revert()` when the original element's native gradient takes over
- Remove or shorten the existing post-revert 0.5s `webkitTextFillColor` cross-fade (no longer needed — the overlay handles the transition)

## Capabilities

### New Capabilities
- `hero-shimmer-overlay`: Cloned overlay approach for showing the shimmer gradient during SplitType-based entrance animation, with seamless handoff to the native CSS gradient after revert

### Modified Capabilities

## Impact

- `src/components/HeroSection.astro`: Minor DOM addition — wrapper or overlay spans within the `<h1>`
- `src/scripts/hero-animations.ts`: Timeline changes — overlay fade-in tween, overlay removal in `onComplete`, removal of the existing `webkitTextFillColor` cross-fade
- No new dependencies, no API changes, no breaking changes
- Reduced-motion path unchanged (no animation, gradient shows statically)
