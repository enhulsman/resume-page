## ADDED Requirements

### Requirement: Shimmer gradient visible during entrance animation
The hero name (first name and last name) SHALL display the animated shimmer gradient during the SplitType scramble + blur-reveal entrance, not only after the entrance completes. The gradient MUST be visually identical to the post-entrance `.hero-name-shimmer` gradient.

#### Scenario: Gradient appears during scramble resolution
- **WHEN** the scramble animation reaches approximately 75% character resolution
- **THEN** the shimmer gradient begins fading in over the name text, reaching full opacity by the time the scramble completes

#### Scenario: Gradient is continuous across full name width
- **WHEN** the shimmer gradient is visible during the entrance
- **THEN** the gradient spans the full width of each name line as a single continuous sweep (not repeated per character)

#### Scenario: Proxy cross-fade prevents text doubling
- **WHEN** the overlay transitions from opacity 0 to 1
- **THEN** the SplitType character spans simultaneously transition from opacity 1 to 0, driven by a single proxy interpolation value, and the sum of overlay opacity and character span opacity SHALL NOT exceed 1 at any rendered frame

### Requirement: Overlay elements present in server-rendered HTML
Overlay elements SHALL be present in the initial Astro-rendered HTML (not dynamically created via JavaScript) to ensure CSS animation phase alignment with the original name elements. Both original and overlay elements MUST have the `.hero-name-shimmer` class applied from page load so their `@keyframes shimmer` animations start from the same point in the document timeline.

#### Scenario: Animation phase alignment at handoff
- **WHEN** `SplitType.revert()` completes and the overlay is removed
- **THEN** the original element's shimmer animation phase SHALL match the overlay's phase at the moment of removal, with no visible jump or restart in the gradient position

### Requirement: Seamless handoff from overlay to native gradient
The transition from the overlay gradient to the native CSS `background-clip: text` gradient SHALL be imperceptible — no flash, no opacity pop, no color shift.

#### Scenario: SplitType revert does not cause visual discontinuity
- **WHEN** `SplitType.revert()` is called and the overlay is removed
- **THEN** the native `.hero-name-shimmer` gradient on the original element is visually identical to the overlay at the moment of removal, with no perceptible change in color, opacity, or animation phase

#### Scenario: Overlay cleanup after entrance
- **WHEN** the entrance animation completes
- **THEN** the overlay elements are removed from the DOM and the original elements carry the shimmer gradient natively

#### Scenario: Atomic handoff with no simultaneous gradient rendering
- **WHEN** the overlay is removed and webkitTextFillColor is cleared on the original element
- **THEN** both operations SHALL occur in the same synchronous execution context (same onComplete callback, no async gap), and if the cross-fade tween is still active, it SHALL be force-completed before handoff proceeds

### Requirement: Reduced-motion path unchanged
The overlay approach SHALL NOT affect the reduced-motion experience.

#### Scenario: Reduced motion removes server-rendered overlays
- **WHEN** `prefers-reduced-motion: reduce` is active
- **THEN** overlay elements present in the server-rendered HTML are removed from the DOM during initialization, no animation tweens reference them, and the name text displays with the static gradient (no shimmer animation) as it does currently

### Requirement: Overlay does not intercept pointer events
The overlay elements SHALL NOT interfere with any interactive elements or the dot grid canvas pointer behavior.

#### Scenario: Clicks pass through overlay
- **WHEN** the overlay is visible during the entrance animation
- **THEN** pointer events pass through the overlay to underlying elements (`pointer-events: none` on overlay)
