# Fix Plan: lucide-animated-icons Spec Rework

Based on scrutinizer findings (verdict: NEEDS REWORK). Each fix addresses a specific issue.

---

## Fix 1: Icon Name Corrections (CRITICAL)

**Issue:** 7/20 icon names don't exist in the Lucide Animated registry.

**Verified replacements** (each confirmed via registry JSON returning 200):

| Original (404) | Replacement (verified) | Rationale |
|---|---|---|
| `mail` | `mailbox` | `mail` doesn't exist; `mailbox` has animated flag, `mail-check` also available but semantically means "sent" |
| `code` | `folder-code` | `code` and `code-xml` don't exist; `folder-code` animates code brackets in folder — good for Programming category |
| `server` | `cloud-cog` | `server` doesn't exist; `cloud-cog` has rotating gear on cloud — fits Pega Platform better than a plain server |
| `cloud` | `cloud-cog` | `cloud` doesn't exist; reuse `cloud-cog` — but this was for "Infrastructure" which is now merged (see Fix 6) |
| `database` | `database-backup` | `database` doesn't exist; `database-backup` has rotating arrow animation |
| `monitor` | `monitor-check` | `monitor` doesn't exist; `monitor-check` confirmed |
| `briefcase` | `briefcase-business` | `briefcase` doesn't exist; `briefcase-business` confirmed |
| `circle-x` | `ban` | `circle-x`, `x-circle`, `circle-alert`, `triangle-alert` all 404; `ban` exists and conveys error/stop semantically |

**Files to update:**
- `design.md` — icon-to-location mapping table
- `specs/interactive-icon-locations/spec.md` — all scenario icon name references
- `tasks.md` — task 1.3 install list

---

## Fix 2: Wrapper Component API Redesign (CRITICAL)

**Issue:** Spec assumed Tailwind class-based sizing and generic trigger prop. Actual API uses `size` number prop (default 28px) and imperative `startAnimation()`/`stopAnimation()` via `useImperativeHandle` ref.

**Verified API (from registry JSON source):**
- Props: `size?: number` (default 28), all SVG props forwarded, `className` supported
- Ref handle: `{ startAnimation(): void; stopAnimation(): void }`
- Hover: built-in (mouseenter/mouseleave wired internally)
- No built-in scroll or click trigger — must be added by wrapper

**Changes to `specs/animated-icon-system/spec.md`:**

1. **Size variants requirement:** Change from Tailwind classes to pixel values:
   - `sm` = 16px, `md` = 20px, `lg` = 24px
   - Wrapper passes `size={16|20|24}` to the underlying component, NOT `className="w-4 h-4"`

2. **Hover trigger requirement:** Rewrite to clarify the wrapper does NOT add mouse handlers — it lets the component's built-in hover behavior work. The wrapper for `trigger="hover"` is passthrough.

3. **Scroll trigger requirement:** Wrapper creates a `useRef<IconHandle>()`, sets up IntersectionObserver, calls `ref.current.startAnimation()` when element enters viewport. No opacity manipulation.

4. **Click trigger requirement:** Wrapper calls `ref.current.startAnimation()` in an onClick handler.

5. **Add new requirement: Icon registry pattern.** The wrapper uses a static import map (not dynamic imports) to resolve `name` → component. Each icon is imported at the top of `AnimatedIcon.tsx`. This means the wrapper bundles all icons it imports — acceptable for island-batched usage but the design should acknowledge this.

**Changes to `design.md`:**
- Decision #2 (trigger modes): Update to describe imperative handle API
- Decision #6 (size system): Change from Tailwind classes to pixel values

---

## Fix 3: Island Batching Strategy (MAJOR)

**Issue:** Per-icon islands creates ~50 React roots. Design doc even acknowledges this as a risk but tasks ignore it.

**Changes to `design.md`:**
- Add Decision #8: "Batch icons into per-section React islands"
- Define batch boundaries:
  - `InfoStripIcons.tsx` — 1 island, 4 icons (client:idle)
  - `ContactCTAIcons.tsx` — 1 island, 3 icons (client:visible)
  - `HeaderIcons.tsx` — 1 island for desktop, 1 for mobile, 4 icons each (client:idle)
  - `ProjectCardIcons.tsx` — 1 island per card, 2 icons each (client:visible)
  - `SectionHeaderIcon.tsx` — individual islands OK here (1 icon each, 5 total, client:visible)
  - `FooterIcons.tsx` — 1 island, 2 icons (client:visible)
  - `ThemeToggle.tsx` — already React, just import icons directly (0 new islands)
  - Contact form — see Fix 8
  - Experience timeline — individual islands (client:visible)

- Total: ~15 islands instead of ~50

**Changes to `tasks.md`:**
- Tasks 3.2–3.5 rewritten to create batch components, not individual `<AnimatedIcon>` islands
- Add sub-tasks for creating each batch wrapper file

**Changes to `specs/animated-icon-system/spec.md`:**
- Add requirement: "AnimatedIcon SHALL be usable as both a standalone island AND as a child inside a parent React island"

---

## Fix 4: SSR Verification Spike (MAJOR)

**Issue:** Claim that icons render as static SVG pre-hydration is unverified. Components wrap SVG in a `<div>` and use `motion.path` — SSR behavior unknown.

**Changes to `tasks.md`:**
- Add task 1.5 (before Phase 1): "SSR verification spike — install `mailbox` icon, render in a test Astro page with `client:visible`, run `astro build`, inspect HTML output for static SVG at correct dimensions. If SSR output is empty or wrong size, add explicit container sizing to wrapper."
- Task 1.5 is a gate: if SSR doesn't work, the wrapper needs a fallback strategy (e.g., render a static Lucide React icon server-side, swap to animated on hydration)

**Changes to `specs/animated-icon-system/spec.md`:**
- Soften the "Pre-hydration render" scenario: "WHEN the page loads before hydration, THEN animated icons render as visible SVG elements with correct dimensions, OR the wrapper provides a container with explicit dimensions to prevent layout shift"

---

## Fix 5: Skill Category Mapping (MAJOR)

**Issue:** Spec maps 6 categories; actual config has 4: Programming, Pega Platform, Methods & Practices, Infrastructure & Tools.

**Corrected mapping:**

| Category | Icon |
|---|---|
| Programming | `folder-code` |
| Pega Platform | `cloud-cog` |
| Methods & Practices | `git-branch` |
| Infrastructure & Tools | `wrench` |

**But wait — SkillsSection.astro doesn't render category labels.** It's a marquee of individual skill tags with no category headers visible. The skill category icons have no visible rendering target.

**Decision:** Drop skill category icons entirely from this change. The SkillsSection is a marquee — there are no category cards or labels to attach icons to. This removes `folder-code` from the install list (unless used elsewhere) and simplifies Phase 2.

**Files to update:**
- `design.md` — remove 6 skill category rows from mapping table
- `specs/interactive-icon-locations/spec.md` — remove "Skill category icons" requirement
- `tasks.md` — remove task 4.3

---

## Fix 6: shadcn Infrastructure Setup (MAJOR)

**Issue:** No `@/` path alias, no `components.json`, no `src/lib/utils.ts`. Every installed icon imports `cn` from `@/lib/utils`.

**Changes to `tasks.md` — expand task 1.2:**
- 1.2a: Add `"paths": { "@/*": ["./src/*"] }` to `tsconfig.json` compilerOptions
- 1.2b: Install `clsx` and `tailwind-merge` dependencies
- 1.2c: Create `src/lib/utils.ts` with `cn()` helper function
- 1.2d: Create `components.json` pointing to `src/components/ui`, using existing Tailwind config
- 1.2e: Verify by installing one icon and running `astro build`

**Changes to `design.md`:**
- Add Decision #9: "shadcn infrastructure setup" documenting the path alias and utils requirement

---

## Fix 7: Header Desktop/Mobile Duplication (MINOR)

**Issue:** Header.astro has duplicate icon markup for desktop and mobile views.

**Changes to `tasks.md`:**
- Task 3.4 explicitly notes: "Replace icons in both desktop (lines ~95-131) and mobile (lines ~211-249) sections of Header.astro"
- The `HeaderIcons.tsx` batch component renders the same icons; used twice with different parent styling

---

## Fix 8: Contact Form Icon Architecture (MINOR)

**Issue:** Contact form uses vanilla `<script>` DOM manipulation, not React. Showing an animated icon on form success/error requires either converting the form to React or dynamically mounting an island.

**Decision:** Drop contact form icons from this change. The form works well with text-only status messages. A CSS transition (fade-in + scale) on the status message div achieves 80% of the visual impact without architectural complexity. If animated icons are still wanted later, the form can be converted to React as a separate change.

**Files to update:**
- `specs/interactive-icon-locations/spec.md` — remove "Contact form state icons" requirement
- `tasks.md` — remove task 5.3
- `design.md` — remove circle-check/circle-x/ban from mapping table

This also removes `circle-check` and `ban` from the install list.

---

## Fix 9: @radix-ui/react-slot Dependency (MINOR)

**Changes to `tasks.md`:**
- Add sub-task to 1.3: "After installing icons, check imports for `@radix-ui/react-slot`. Install if any icon requires it."

---

## Fix 10: GSAP data-reveal + client:visible Race Condition (NEW)

**Issue raised by scrutinizer:** ContactCTA and other sections wrap icons in `data-reveal` divs. GSAP animates these from opacity 0→1 on scroll. If an icon island inside uses `client:visible` with IntersectionObserver, the observer may fire while the parent is still invisible (GSAP hasn't revealed it yet), causing the icon animation to play invisibly.

**Changes to `design.md`:**
- Add to Risks section: "GSAP reveal timing — icons inside `data-reveal` parents may hydrate before GSAP reveals them. For scroll-triggered icons, the IntersectionObserver in the wrapper should check if the element is actually visible (opacity > 0) before triggering animation, OR use a longer `rootMargin` threshold so the icon triggers after the parent reveal."
- Simpler fix: use `trigger="hover"` for all icons inside interactive links (which are already inside revealed containers by the time users interact). Only section header icons use `trigger="scroll"`, and those `data-reveal` elements use GSAP's ScrollTrigger which fires at the same threshold — so timing should be close enough. Add an implementation note to verify.

---

## Fix 11: Scope Reduction — Phase 2/3 (ADVISORY)

**Scrutinizer's uncomfortable question:** Are section header icons, experience timeline icons, and skill category icons actually improvements to a minimal design?

**Decision:** Keep section header icons (5 small accents — low cost, nice polish). Drop skill category icons (no rendering target — Fix 5). Drop experience timeline icons (replacing CSS dots with React islands for purely decorative icons is poor ROI). Keep footer icons and theme toggle icons (genuinely interactive, low effort).

**Updated Phase breakdown:**
- Phase 1: Info strip, Contact CTA, Header, Project cards (unchanged)
- Phase 2: Section header accents, Footer icons (reduced)  
- Phase 3: Theme toggle icons (reduced — timeline and contact form dropped)

---

## Updated Icon Install List (after all fixes)

Verified icons to install (14 total, down from 20):

| Icon | Registry name | Used in |
|---|---|---|
| `mailbox` | mailbox | Info strip, ContactCTA, Header, Section–Contact |
| `github` | github | Info strip, ContactCTA, Header, Project cards, Footer |
| `linkedin` | linkedin | Info strip, ContactCTA, Header, Footer |
| `file-text` | file-text | Info strip, Header |
| `arrow-right` | arrow-right | Project cards |
| `user` | user | Section–About |
| `folder-open` | folder-open | Section–Projects |
| `briefcase-business` | briefcase-business | Section–Experience |
| `layers` | layers | Section–Skills |
| `wrench` | wrench | (dropped — skill categories removed) |
| `git-branch` | git-branch | (dropped — skill categories removed) |
| `sun` | sun | Theme toggle |
| `moon` | moon | Theme toggle |
| `monitor-check` | monitor-check | Theme toggle |

Final count: **12 icons** (removed wrench, git-branch, folder-code, cloud-cog, database-backup, circle-check, ban).
