## Why

The resume-page uses 5 static custom SVG icons across interactive elements (info strip, contact CTA, header, project cards). These feel inert on hover/click — a missed opportunity for micro-interaction polish. Lucide Animated provides 428+ hover-triggered animated React icons via shadcn CLI, letting us add professional motion feedback to every interactive icon without hand-animating SVGs. The site already has rich GSAP scroll animations; animated icons fill the gap in hover/click micro-interactions.

## What Changes

- Install `motion` as a dependency (Lucide Animated's animation engine) and set up shadcn infrastructure (path aliases, `cn()` utility)
- Add 12 Lucide Animated icon components via shadcn registry (`npx shadcn@latest add "https://lucide-animated.com/r/<icon>.json"`)
- Create an `AnimatedIcon.tsx` React wrapper component that handles trigger modes (hover/scroll/click), size presets (16/20/24px via numeric `size` prop), `prefers-reduced-motion`, `currentColor` stroke inheritance, and imperative ref handle integration
- Replace static SVG icons in interactive locations with animated React islands, batched per-section (~15 islands total)
- **Phase 1 (High Impact):** Info strip links, Contact CTA icons, Header professional links, Project card external links
- **Phase 2 (Medium Impact):** Section header accent icons, Footer social links
- **Phase 3 (Polish):** Theme toggle icons (inside existing React component)
- Deprecate (not delete) the 5 existing custom SVG icon components after animated replacements are confirmed

**Out of scope** (dropped after review): skill category icons (SkillsSection is a marquee with no category headers), contact form state icons (vanilla DOM, not React), experience timeline role icons (poor ROI for decoration-only React islands).

## Capabilities

### New Capabilities
- `animated-icon-system`: React wrapper component, Motion integration, icon registry, size/color/trigger conventions, reduced-motion handling, Astro island hydration pattern
- `interactive-icon-locations`: Icon placement across site locations (info strip, contact CTA, header, project cards, section headers, footer, theme toggle)

### Modified Capabilities

## Impact

- **Dependencies:** Adds `motion` (~16 kB gzip) alongside existing GSAP — no conflict. Adds `clsx` + `tailwind-merge` for shadcn `cn()` utility. May add `@radix-ui/react-slot` if required by any installed icon.
- **Bundle:** 12 icons as tree-shakeable React components. Motion is the main new cost. ~15 batched islands hydrate independently — non-interactive pages pay nothing.
- **Architecture:** Introduces batched React islands in components that are currently pure Astro (InfoStrip, ContactCTA, Header, ProjectsShowcase, Footer). Icons are grouped into per-section batch components (e.g., `InfoStripIcons.tsx`) to minimize React roots. ThemeToggle is already React — icons imported directly.
- **Files affected:** `src/components/InfoStrip.astro`, `ContactCTA.astro`, `Header.astro`, `ProjectsShowcase.astro`, `Footer.astro`, `ThemeToggle.tsx`, section header components, plus new files: `src/components/ui/` (Lucide Animated copies), `src/components/AnimatedIcon.tsx`, batch island components (`InfoStripIcons.tsx`, `ContactCTAIcons.tsx`, `HeaderIcons.tsx`, `FooterIcons.tsx`), and `src/lib/utils.ts`.
- **SSR/Hydration:** Requires verification spike before Phase 1 — SSR behavior of Motion's `motion.svg` in Astro islands is unconfirmed. Gate task ensures no layout shift before proceeding.
- **Accessibility:** Wrapper disables animation triggers when `prefers-reduced-motion: reduce` is active, falling back to static SVG render.
