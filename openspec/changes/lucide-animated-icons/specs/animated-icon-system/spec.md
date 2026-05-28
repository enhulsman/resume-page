## ADDED Requirements

### Requirement: AnimatedIcon wrapper component
The system SHALL provide a React component `AnimatedIcon` at `src/components/AnimatedIcon.tsx` that renders a Lucide Animated icon by name with configurable size and trigger mode. The component SHALL use a static import map to resolve icon names to their corresponding Lucide Animated components.

#### Scenario: Render icon by name
- **WHEN** `<AnimatedIcon name="mailbox" />` is rendered
- **THEN** the component renders the Lucide Animated `mailbox` icon as a valid SVG element

#### Scenario: Unknown icon name
- **WHEN** `<AnimatedIcon name="nonexistent-icon" />` is rendered
- **THEN** the component renders nothing (no error thrown, no broken layout)

### Requirement: Size variants
The system SHALL support three size presets passed as the numeric `size` prop to the underlying Lucide Animated component: `sm` (16px), `md` (20px), and `lg` (24px), defaulting to `md`. The default Lucide Animated size of 28px MUST NOT be used.

#### Scenario: Default size
- **WHEN** `<AnimatedIcon name="mailbox" />` is rendered without a `size` prop
- **THEN** the rendered SVG has dimensions 20×20px

#### Scenario: Explicit size
- **WHEN** `<AnimatedIcon name="mailbox" size="lg" />` is rendered
- **THEN** the rendered SVG has dimensions 24×24px

### Requirement: Hover trigger mode
The system SHALL let the Lucide Animated component's built-in hover behavior work when `trigger="hover"` (the default). The wrapper MUST NOT add its own mouseenter/mouseleave handlers that could conflict with the built-in behavior.

#### Scenario: Hover animation
- **WHEN** user hovers over an `<AnimatedIcon name="mailbox" trigger="hover" />` element
- **THEN** the icon's entrance animation plays (via built-in mouseenter → startAnimation)
- **WHEN** user moves the cursor away
- **THEN** the icon returns to its idle state (via built-in mouseleave → stopAnimation)

### Requirement: Scroll trigger mode
The system SHALL play the icon's animation once when the element enters the viewport when `trigger="scroll"`. The wrapper SHALL use `useRef<IconHandle>()` to obtain the imperative handle and call `ref.current.startAnimation()` from an IntersectionObserver callback.

#### Scenario: Scroll-triggered animation
- **WHEN** an `<AnimatedIcon name="user" trigger="scroll" />` element enters the viewport
- **THEN** `startAnimation()` is called on the icon's ref handle, playing the animation once
- **WHEN** the element leaves and re-enters the viewport
- **THEN** the animation does NOT replay (IntersectionObserver disconnects after first trigger)

#### Scenario: No opacity toggle on scroll
- **WHEN** an `<AnimatedIcon trigger="scroll" />` is rendered but not yet in the viewport
- **THEN** the icon is visible as a static SVG (opacity is always 1, never 0)

### Requirement: Click trigger mode
The system SHALL play the icon's animation once when clicked, when `trigger="click"`. The wrapper SHALL call `ref.current.startAnimation()` in an onClick handler.

#### Scenario: Click animation
- **WHEN** user clicks an `<AnimatedIcon name="github" trigger="click" />` element
- **THEN** `startAnimation()` is called on the icon's ref handle

### Requirement: Reduced motion support
The system SHALL disable all animation triggers when the user's OS has `prefers-reduced-motion: reduce` enabled. For hover trigger, the wrapper SHALL suppress the built-in hover behavior. For scroll/click triggers, `startAnimation()` SHALL NOT be called. Icons render as static SVGs in this state.

#### Scenario: Reduced motion preference active
- **WHEN** `prefers-reduced-motion: reduce` is set and user hovers over an animated icon
- **THEN** no animation plays; the icon remains in its static idle state

#### Scenario: Reduced motion toggle at runtime
- **WHEN** the user toggles reduced motion preference while the page is open
- **THEN** animation behavior updates without a page reload

### Requirement: Color inheritance
The system SHALL use `currentColor` for all icon strokes, inheriting color from the parent element's CSS `color` property.

#### Scenario: Gold accent color
- **WHEN** an animated icon is placed inside an element with `color: #d4a030`
- **THEN** the icon's strokes render in `#d4a030`

### Requirement: Astro island hydration
The system SHALL render a valid static SVG during SSR (before React hydration), with no layout shift when the island hydrates. If the SSR output does not have correct dimensions, the wrapper SHALL provide a container with explicit dimensions to prevent layout shift.

#### Scenario: Pre-hydration render
- **WHEN** the page loads before hydration
- **THEN** animated icons render as visible SVG elements with correct dimensions (no empty placeholder, no layout shift on hydration)

#### Scenario: Post-hydration transition
- **WHEN** the React island hydrates
- **THEN** the icon gains interactivity (hover/click/scroll triggers activate) without visual flicker

### Requirement: Motion dependency isolation
The `motion` library SHALL be used only within animated icon components and their wrapper. It MUST NOT be imported or used in GSAP-animated components or non-icon contexts.

#### Scenario: No Motion in GSAP components
- **WHEN** the project is built
- **THEN** no file outside `src/components/AnimatedIcon.tsx` and `src/components/ui/` imports from `motion`

### Requirement: Standalone and nested usage
The `AnimatedIcon` component SHALL be usable both as a standalone Astro island (`<AnimatedIcon client:visible />`) and as a child inside a parent React island (imported directly without `client:` directive).

#### Scenario: Standalone island usage
- **WHEN** `<AnimatedIcon name="user" trigger="scroll" client:visible />` is used in an Astro component
- **THEN** it renders and hydrates as an independent React island

#### Scenario: Nested usage inside React island
- **WHEN** `<AnimatedIcon name="mailbox" />` is rendered inside a parent React component (e.g., `InfoStripIcons.tsx`)
- **THEN** it renders correctly as a regular React child, sharing the parent's React root
