# Design Brief: Resume Page

**Aesthetic:** Neon Dashboard (Evolved) — deep purple-dark with rich gold accents
**Created:** 2026-05-12
**WCAG Level:** AA

## Design Intent

A premium dark portfolio that feels confident and polished without being flashy. The deeper purple-black base lets the richer gold accent own the page — gold foil on dark paper. The teal secondary adds visual range for interactive states and data without competing with the gold identity. Every surface should feel layered and intentional.

## Palette

### Dark Mode (Primary)
| Token | Hex | Role |
|---|---|---|
| background | `#141018` | Page background — deeper purple-black |
| surface | `#1e1b28` | Cards, nav, elevated areas |
| surfaceRaised | `#2a2636` | Hover states, active surfaces |
| text | `#f0ead6` | Primary text — warm cream |
| textMuted | `#9a9488` | Secondary/tertiary text |
| primary | `#d4a030` | Gold accent — CTAs, highlights, headings |
| primaryHover | `#e2b445` | Gold hover state |
| secondary | `#2dd4a8` | Teal complement — links, status, data |
| border | `rgba(255,255,255,0.10)` | Default borders |

### Light Mode (Derived)
| Token | Hex | Role |
|---|---|---|
| background | `#fcfaf5` | Warm white |
| surface | `#f5f2eb` | Warm off-white cards |
| text | `#1a1a1a` | Near-black text |
| primary | `#b8882a` | Darker gold for light backgrounds |

## Typography

**Heading:** Syne (400-800, variable) | **Body:** Outfit (300-700, variable) | **Mono:** JetBrains Mono (400-500)

All self-hosted as WOFF2 with `font-display: swap`.

### Type Scale (Fluid Headings)
| Token | Value |
|---|---|
| 6xl (h1) | `clamp(2.25rem, 5vw, 3.75rem)` |
| 5xl (h2) | `clamp(1.875rem, 4vw, 3rem)` |
| 4xl (h3) | `clamp(1.5rem, 3vw, 2.25rem)` |
| 3xl (h4) | `clamp(1.5rem, 3vw, 1.875rem)` |
| base | `1rem` (16px) |
| sm | `0.875rem` (14px) |

## References

- LazyWeb search: dark portfolio gold accent — achira.ai (gold nav accents on dark), niccolomiranda.com (dramatic dark with accent lighting)
- LazyWeb search: dark resume premium — raycast.com (dark hero + CTA structure), termius.com (premium dark marketing)
- 21st.dev: Hero 03 (portfolio hero with social links), Starfall Portfolio Landing (project grid), Modern Timeline (experience section)

## Component Inventory

| Component | Direction | Notes |
|---|---|---|
| Nav | Fixed top bar | Backdrop blur on surface, bottom border-subtle |
| Hero | Centered text | Dot grid overlay, gold text glow on heading, wide letter-spacing |
| Info Strip | Horizontal badges | Status indicators with alpha backgrounds |
| About | Centered prose | contentWidth (768px), relaxed line-height |
| Project Cards | Image-top cards | Hover-lift with gold glow, border transitions to primary alpha |
| Experience Timeline | Vertical left-aligned | Gold connector line, circle nodes |
| Skills Badges | Inline pills | Primary alpha background, full radius |
| Contact CTA | Centered banner | Gold gradient border, prominent button |
| Footer | Minimal centered | Top border, muted text |
| Theme Toggle | Icon button | 44px touch target, spring easing |

## Animation Style

**Natural** — smooth and balanced (200-300ms, ease-in-out)

| Pattern | Duration | Easing | Properties |
|---|---|---|---|
| fade-up (scroll reveal) | 800ms | power3.out (GSAP) | opacity 0→1, y 40→0 |
| hover-lift (cards) | 250ms | ease-in-out | translateY -4px, shadow upgrade |
| hover-scale (buttons) | 200ms | ease-out | scale 1.02 |
| gold-pulse (accents) | 2000ms | ease-in-out | box-shadow pulse, infinite |
| stagger-children | 500ms + 100ms stagger | power3.out | opacity + y reveal |

All animations respect `prefers-reduced-motion: reduce` — GSAP checks this before applying scroll triggers.

## Implementation Notes

- **Palette shift is subtle** — background goes from `#1c1a23` → `#141018` (deeper), gold from `#c9942b` → `#d4a030` (richer). Apply to existing CSS custom properties in `global.css`.
- **Teal secondary (`#2dd4a8`)** is new — use for link hover states, status indicators, and data accents. Don't replace gold in primary CTAs.
- **Light mode** derives from the same warmth — cream whites, not cool whites. Gold darkens to `#b8882a` for contrast on light backgrounds.
- **Shadows** shift from current amber glow to gold glow (aligned with new primary `#d4a030`).
- **Fluid type** replaces fixed heading sizes — update Tailwind config or CSS custom properties with `clamp()` values.
- **Border radius** stays subtle (4-8px for cards/containers, full for pills/badges).
