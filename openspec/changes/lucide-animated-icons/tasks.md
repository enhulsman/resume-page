## 1. Setup & Dependencies

- [x] 1.1 Install `motion` dependency (`npm install motion`)
- [x] 1.2a Add `"paths": { "@/*": ["./src/*"] }` to `tsconfig.json` compilerOptions
- [x] 1.2b Install `clsx` and `tailwind-merge` (`npm install clsx tailwind-merge`)
- [x] 1.2c Create `src/lib/utils.ts` with `cn()` helper function
- [x] 1.2d Create `components.json` with paths pointing to `src/components/ui` and the project's Tailwind config
- [x] 1.2e Verify shadcn setup: install one test icon and run `astro build` — must compile without errors
- [x] 1.3 Add Lucide Animated icons via shadcn registry (12 total): `mailbox`, `github`, `linkedin`, `file-text`, `arrow-right`, `user`, `folder-open`, `briefcase-business`, `layers`, `sun`, `moon`, `monitor-check`
- [x] 1.4 Verify all 12 icons installed correctly in `src/components/ui/`
- [x] 1.5 After installing icons, check imports for `@radix-ui/react-slot` — install if any icon requires it

## 2. SSR Verification Spike (gate — must pass before Phase 1)

- [x] 2.1 Create a minimal test page: render one Lucide Animated icon (e.g., `mailbox`) in an Astro component with `client:visible` at size 20
- [x] 2.2 Run `astro build`, inspect generated HTML for static SVG output at correct dimensions — confirm no empty div or wrong-size placeholder
- [x] 2.3 Verify imperative ref handle works at runtime: call `ref.current.startAnimation()` and confirm no error (guards against React 18 / @types/react 19 mismatch)
- [x] 2.4 If SSR output is empty or incorrect size, add explicit container sizing to wrapper and re-verify
- [x] 2.5 Remove test page after spike

## 3. AnimatedIcon Wrapper Component

- [ ] 3.1 Write tests for AnimatedIcon: render by name, unknown icon fallback, size variants (16/20/24px), color inheritance, reduced-motion behavior, imperative handle integration
- [x] 3.2 Create `src/components/AnimatedIcon.tsx` with: static import map for all 12 icons, size presets (`sm`=16/`md`=20/`lg`=24), trigger modes (`hover`/`scroll`/`click`), `prefers-reduced-motion` check, ref forwarding for imperative handles
- [x] 3.3 Implement hover trigger: passthrough (no custom mouse handlers, let built-in behavior work)
- [x] 3.4 Implement scroll trigger: `useRef<IconHandle>()`, IntersectionObserver callback calls `startAnimation()` once, no opacity toggle
- [x] 3.5 Implement click trigger: onClick calls `ref.current.startAnimation()`
- [x] 3.6 Verify SSR renders valid static SVG (`astro build` output check)

## 4. Phase 1 — High Impact Locations

- [ ] 4.1 Write integration tests for info strip, contact CTA, header, and project card icon rendering
- [x] 4.2 Integrate animated icons into `InfoStrip.astro` — individual `<AnimatedIcon client:idle />` per link (file-text, mailbox, github, linkedin at md size)
- [x] 4.3 Integrate animated icons into `ContactCTA.astro` — mailbox (CTA button + social), github, linkedin at lg size with `client:visible`
- [x] 4.4 Integrate animated icons into `Header.astro` — replaced inline SVGs in BOTH desktop and mobile sections with `<AnimatedIcon>` (mailbox, github, linkedin at sm size to match existing 16px layout)
- [x] 4.5 Integrate animated icons into `ProjectsShowcase.astro` — github (md) per card + arrow-right (sm) on CTA with `client:visible`
- [x] 4.6 Visual verification: screenshot all Phase 1 locations with Playwright (static + hover states)

## 5. Phase 2 — Medium Impact Locations (SKIPPED — deferred to future change)

- [ ] ~5.1 Write tests for section header icons and footer icons~
- [ ] ~5.2 Add animated accent icons to section headers~
- [ ] ~5.3 Create FooterIcons batch component~
- [ ] ~5.4 Visual verification~

## 6. Phase 3 — Polish (SKIPPED — deferred to future change)

- [ ] ~6.1 Write tests for theme toggle icons~
- [ ] ~6.2 Import sun/moon/monitor-check into ThemeToggle.tsx~
- [ ] ~6.3 Visual verification~

## 7. Deprecation & Cleanup

- [x] 7.1 Add deprecation comments to all 5 existing icon components in `src/components/icons/`
- [x] 7.2 Verify deprecated icons still render correctly (no build errors) — ExperienceSection + resume.astro still import old icons
- [x] 7.3 Run full build (`astro build`) — 11 pages, 2.74s, no errors. AnimatedIcon bundle: 164K raw / 50.6K gzip (Motion + 12 icons)
- [x] 7.4 Verify `prefers-reduced-motion` works end-to-end across all locations
- [x] 7.5 Run full test suite, confirm all green
