## Context

The resume-page is an Astro 5 SSG site with React islands (currently only `ThemeToggle.tsx`). It uses 5 hand-crafted Astro SVG icon components (`IconArrowRight`, `IconEmail`, `IconGitHub`, `IconLinkedIn`, `IconDocument`) in interactive locations — info strip, contact CTA, header, and project cards. Scroll animations are handled by GSAP; hover/click micro-interactions on icons are absent.

Lucide Animated is a shadcn-compatible registry of 428+ animated React SVG icons powered by the `motion` library. Icons are installed via `npx shadcn@latest add "https://lucide-animated.com/r/<icon>.json"` which copies self-contained React components into `src/components/ui/`. Each icon renders valid static SVG and animates via an imperative ref handle (`startAnimation()`/`stopAnimation()`), with built-in hover animation by default.

## Goals / Non-Goals

**Goals:**
- Add hover-triggered animation to all interactive icon locations (links, buttons, CTAs)
- Add scroll-triggered animated accent icons to section headers
- Maintain SSR-first rendering — icons render as static SVG before hydration
- Respect `prefers-reduced-motion` consistently
- Keep the existing GSAP animation system untouched

**Non-Goals:**
- Replacing GSAP with Motion for scroll/timeline animations
- Animating non-icon elements with Motion
- Custom icon design — we use Lucide's existing icon set
- Removing existing custom SVG icons in this change (deprecate only)
- Skill category icons (SkillsSection is a marquee with no category headers to attach icons to)
- Contact form state icons (form uses vanilla `<script>` DOM manipulation, not React)
- Experience timeline role icons (replacing CSS dots with React islands for decoration is poor ROI)

## Decisions

### 1. Wrapper component: `AnimatedIcon.tsx`

**Decision:** Create a single React wrapper component that accepts an icon identifier, size, and trigger mode, and renders the corresponding Lucide Animated component.

**Rationale:** Each Astro component that needs an animated icon would otherwise need to import React, the specific Lucide Animated component, and handle hover/size/a11y logic independently. A wrapper centralizes this and provides a clean interface usable both as an Astro island and as a child inside a parent React island.

**Alternative considered:** Import each Lucide Animated component directly in individual React island wrappers per-location. Rejected — creates redundant boilerplate and inconsistent behavior across locations.

### 2. Icon trigger modes and imperative handle API

**Decision:** Support three trigger modes via the icons' imperative ref handle:
- `hover` — let the component's built-in hover behavior work (wrapper is passthrough, no custom mouse handlers). Default.
- `scroll` — wrapper creates a `useRef<IconHandle>()`, sets up IntersectionObserver, calls `ref.current.startAnimation()` when element enters viewport. Plays once, does not replay on re-entry.
- `click` — wrapper calls `ref.current.startAnimation()` in an onClick handler.

**Actual component API** (verified from registry source):
- Props: `size?: number` (default 28px), all SVG props forwarded, `className` supported
- Ref handle via `useImperativeHandle`: `{ startAnimation(): void; stopAnimation(): void }`
- Hover animation is wired internally (mouseenter → startAnimation, mouseleave → stopAnimation)

**Note on scroll trigger:** Per project feedback, do NOT use Motion's `whileInView` with `opacity: 0` — use a manual IntersectionObserver to call `startAnimation()`. The icon always renders visible (no opacity toggle).

### 3. Hydration directives

**Decision:** Use `client:visible` for below-fold islands (section headers, footer) and `client:idle` for above-fold islands (info strip, header, nav theme toggle).

**Rationale:** `client:visible` defers hydration until the element enters the viewport — good for below-fold since it delays Motion JS loading. `client:idle` hydrates during browser idle time — appropriate for above-fold elements where the user might hover before scrolling. Avoid `client:load` to prevent blocking initial render.

### 4. Motion as a new dependency alongside GSAP

**Decision:** Add `motion` (the standalone Motion library, ~16 kB gzip) as a project dependency. Do not remove or replace GSAP.

**Rationale:** GSAP handles scroll-driven timeline animations (hero entrance, section reveals, dot grid). Motion handles React component-level animations (icon hover/click/state). They operate in separate scopes — GSAP on DOM elements via refs, Motion on React component props. No conflict.

**Alternative considered:** Animate icons with GSAP instead. Rejected — Lucide Animated components are built on Motion internally; fighting their animation engine adds complexity for no benefit.

### 5. Icon-to-location mapping

**Decision:** Use Lucide Animated's closest semantic match for each location. All names verified against the registry (`https://lucide-animated.com/r/<name>.json` returns 200).

| Location | Current Icon | Lucide Animated Icon | Trigger |
|---|---|---|---|
| Info strip — Resume | IconDocument | `file-text` | hover |
| Info strip — Email | IconEmail | `mailbox` | hover |
| Info strip — GitHub | IconGitHub | `github` | hover |
| Info strip — LinkedIn | IconLinkedIn | `linkedin` | hover |
| Contact CTA — Email | inline SVG | `mailbox` | hover |
| Contact CTA — GitHub | inline SVG | `github` | hover |
| Contact CTA — LinkedIn | inline SVG | `linkedin` | hover |
| Header — Email | inline SVG | `mailbox` | hover |
| Header — GitHub | inline SVG | `github` | hover |
| Header — LinkedIn | inline SVG | `linkedin` | hover |
| Header — Resume | inline SVG | `file-text` | hover |
| Project card — GitHub | IconGitHub | `github` | hover |
| Project card — Arrow | IconArrowRight | `arrow-right` | hover |
| Section — About | none | `user` | scroll |
| Section — Projects | none | `folder-open` | scroll |
| Section — Experience | none | `briefcase-business` | scroll |
| Section — Skills | none | `layers` | scroll |
| Section — Contact | none | `mailbox` | scroll |
| Footer — GitHub | text | `github` | hover |
| Footer — LinkedIn | text | `linkedin` | hover |
| Theme toggle — Light | text | `sun` | hover |
| Theme toggle — Dark | text | `moon` | hover |
| Theme toggle — System | text | `monitor-check` | hover |

### 6. Size system

**Decision:** Three size presets mapped to pixel values passed via the component's `size` prop (not Tailwind classes — the components accept a numeric `size` prop, default 28px):
- `sm` → 16px (inline text icons, section header accents)
- `md` → 20px (info strip, nav, project cards, footer)
- `lg` → 24px (contact CTA, header hero links)

### 7. Color inheritance

**Decision:** All icons use `stroke="currentColor"` (Lucide default). The gold accent `#d4a030` is applied via parent element's `color` or Tailwind `text-gold` class, not hardcoded in the icon component.

### 8. Island batching strategy

**Decision:** Batch icons into per-section React islands rather than creating one island per icon. The wrapper `AnimatedIcon` is used inside these batch components, not as the island boundary itself.

**Batch boundaries:**
- `InfoStripIcons.tsx` — 1 island, 4 icons (`client:idle`)
- `ContactCTAIcons.tsx` — 1 island, 3 icons (`client:visible`)
- `HeaderIcons.tsx` — 1 island for desktop links, 1 for mobile links, 4 icons each (`client:idle`)
- Per project card — 1 island, 2 icons (`client:visible`)
- `SectionHeaderIcon.tsx` — individual islands per section header, 1 icon each (`client:visible`) — acceptable since there are only 5
- `FooterIcons.tsx` — 1 island, 2 icons (`client:visible`)
- `ThemeToggle.tsx` — already React, import icons directly (0 new islands)

**Total: ~15 islands** (down from ~50 if each icon were its own island).

**Rationale:** Each Astro island is a separate React root with its own hydration lifecycle. 50 islands would create measurable overhead from independent React initialization. Batching into natural component groupings reduces this significantly while keeping the code organized.

### 9. shadcn infrastructure setup

**Decision:** Set up the minimal shadcn infrastructure required for Lucide Animated icons:
- Add `"paths": { "@/*": ["./src/*"] }` to `tsconfig.json` — required because installed icons import from `@/lib/utils`
- Create `src/lib/utils.ts` with `cn()` helper (using `clsx` + `tailwind-merge`)
- Create `components.json` pointing to `src/components/ui` with the project's existing Tailwind config

**Rationale:** The project has no existing shadcn setup. Every installed Lucide Animated icon imports `cn` from `@/lib/utils`. Without the path alias and utils file, no icon will compile.

## Risks / Trade-offs

- **Bundle size increase** → Motion adds ~16 kB gzip. Mitigated by island-level code splitting — Motion only loads when an island hydrates. Monitor with `astro build` size report.
- **Island hydration overhead** → ~15 batched React islands is manageable. Each batch island shares one React root. Motion is loaded once (shared via Vite).
- **Lucide Animated icon availability** → All 12 icons verified against the registry. If any future icon is needed, verify with `curl -s -o /dev/null -w "%{http_code}" https://lucide-animated.com/r/<name>.json` before adding.
- **GSAP + Motion coexistence** → Both libraries manipulate DOM styles. Risk is minimal since they target different elements. Avoid animating the same element with both.
- **GSAP `data-reveal` timing** → Icons inside `data-reveal` parents (ContactCTA, section headers) may hydrate before GSAP reveals them. For hover-triggered icons this is fine (user can't hover invisible elements). For scroll-triggered section header icons, the IntersectionObserver fires at a similar scroll position to GSAP's ScrollTrigger — verify timing during implementation and add a small delay if needed.
- **`prefers-reduced-motion` gap** → The wrapper MUST check `window.matchMedia('(prefers-reduced-motion: reduce)')` and disable animation triggers (don't call `startAnimation()`) when active. The built-in hover behavior may also need suppression via CSS `pointer-events` or by not forwarding mouse events.
- **React 18 / @types/react 19 mismatch** → Project uses React 18.3.1 with `@types/react@^19`. Lucide Animated uses `useImperativeHandle` with `forwardRef` which works on React 18. The SSR spike must verify the imperative ref handle works at runtime. Consider aligning `@types/react` to `^18` to prevent confusing type errors.
- **SSR pre-hydration** → Lucide Animated components render `<div><svg>...</svg></div>` using Motion's `motion.svg`. Whether the SSR output is a visible SVG at correct dimensions is unverified. The SSR spike (task 1.5) is a gate — do not proceed with bulk replacement until confirmed.
