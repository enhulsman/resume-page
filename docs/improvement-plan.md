# Portfolio & Projects Improvement Plan

**Created:** 2026-07-02 · **Author:** Claude (Fable 5) + Ezra, from a full portfolio review session
**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[?]` blocked on a decision (see §0)

## How to use this document (read this first, future session)

This plan was produced after a full review of the live portfolio (`hulsman.dev`, this repo) and an
inventory of every project in `~/Coding`. It is designed so that any Claude session (Fable, Opus, or
Sonnet) can pick up **one workstream at a time** and complete it without re-deriving context.

Rules for implementers:

1. **Pick one workstream (§A–§H), not the whole plan.** Each is sized for roughly one session.
2. **Read the task's "How" fully before editing** — file paths and code directions are already resolved.
3. **Verify facts against the actual repos before writing any case-study prose.** The outlines in §B
   cite facts from a repo survey done 2026-07-02; confirm each claim by reading the project's README/code.
   Never invent metrics.
4. Respect the standing project rules: dev server on **port 4321 only** (kill stale ones), verify visual
   changes with **Playwright screenshots** (light + dark, desktop + 390px mobile), commits via the
   **git-commit-handler agent** with no AI attribution, and don't restart the dev server for code changes.
5. Update the checkbox status in THIS file as you complete tasks, and update `site-structure-overview.html`
   only if you change routes.
6. Tasks marked `[?]` need a user decision first — ask at session start, in one batch, then proceed.

**Suggested session grouping** (see §9 for the full playbook):

| Session | Workstreams | Suitable model |
|---|---|---|
| 1 | §A production fixes + §D SEO | Sonnet or Opus (mechanical, well-specified) |
| 2 | §B case studies (bible-tui, tailscale-acl-gitops) | Opus/Fable + user (voice check) |
| 3 | §C resume-page UX polish | Opus (visual verification needed) |
| 4 | §F Launchpad rescue | Fable + user, joint design session |
| 5 | §G Hackrschat and/or §E writing section | per task |

---

## §0 — Decisions: ALL RESOLVED with Ezra, 2026-07-03. Do not re-ask; implement as recorded.

| ID | Question (short) | **DECISION** |
|---|---|---|
| D1 | `/resume.pdf` | **Keep everything gated.** Delete placeholder; 301 `/resume.pdf → /resume`. No PDF ships to prod; CI PDF step may remain as a private artifact for Ezra's own use, or be removed. |
| D2 | Staffing engagement end date | **It is genuinely ongoing on a 0-hour (on-call) basis.** Keep `Present`; add an engagement qualifier rendered next to the date range: `2023 — Present · on-call`. See revised A4. |
| D3 | tailscale-acl-gitops visibility | **Extract the semantic ACL comparator (+ tests) into a standalone public repo** under `enhulsman` (working name `tailscale-acl-semdiff`); policy repo stays private; case study links the tool. See B2. |
| D4 | Homepage showcase lineup | **Claude Sandbox, Anna Assistant, bible-tui, Homelab Infrastructure.** Finance Bot → gallery only. |
| D5 | AI-infra positioning | **Light touch:** one rotating hero subtitle ("AI-integrated infrastructure" or similar) + one summary sentence. No wholesale rebrand. Exact wording still needs Ezra's voice check before shipping (D-3). |
| D6 | Encrypted Chat TUI page | **Keep in `/projects` gallery** with honest-WIP framing; remove the dead GitHub-profile link (B3). §G1 investment stays optional. |
| D7 | Writing section | **SKIPPED for now.** §E is parked entirely — do not build. Revisit only if Ezra brings it up. |
| D8 | Deploy strategy | **Ezra believes deploys are already automated by Cloudflare on push to main** (Workers Builds Git integration, configured dashboard-side — invisible to repo inspection, consistent with the repo having no deploy step). A0 is now a VERIFY-AND-DOCUMENT task, not a build task. |

---

## §1 — Review findings this plan is based on (compressed reference)

**Site strengths (do not regress):** distinctive warm-amber identity in light+dark; honest, technically
deep MDX case studies (Claude Sandbox is the gold standard); working 40+-command interactive terminal;
`prefers-reduced-motion` respected across components; clean mobile (no h-overflow); config-driven content
(`src/config/site.ts`, `src/config/resume.ts`).

**Defects found (fixed by §A/§D):**
1. `public/resume.pdf` is a **plaintext placeholder** ("(add your resume PDF file here)") deployed to prod.
2. **No 404 page**; `src/worker.ts:213-219` SPA-fallback serves `index.html` with HTTP 200 for every
   unknown path (soft-404s).
3. **Contact form has zero abuse protection** (no rate limit / honeypot / Turnstile), CORS `*`, and
   `worker.ts:180` leaks internal error text to clients.
4. `src/config/resume.ts:84-88` staffing role missing `endDate` → renders **three concurrent
   "Present" roles**.
5. `site.ts` `projects[].featured` is **dead code**: `ProjectsShowcase.astro` renders homepage cards
   from MDX frontmatter `showcase === true` via `import.meta.glob`; nothing reads `featured`. The
   `site.ts` `projects[]` array is consumed only by `AboutSection.astro` (terminal animation data /
   `ls projects/` output), unfiltered.
6. Unused **1.4 MB `public/avatar.png`** ships in every deploy; About photo actually loads from Gravatar
   (external dependency).
7. **No sitemap.xml, robots.txt, or JSON-LD** structured data.
8. Skills appear 4× (hero chips → marquee → categorized grid → resume page); marquee and grid duplicate
   each other in the same viewport.
9. Projects gallery is text-only cards; "Portfolio Site" is the first card (self-referential piece leads).
10. Terminal is effectively undiscoverable: a hint EXISTS (`src/scripts/interactive-terminal.ts:168-180`,
    `appendHint()` — "this is a real shell — type help for more" at opacity 0.15) but it fades out after
    ~1s, far too transient to be noticed.
11. Experience summaries are dense 4–5-line paragraphs; headline metrics get lost.

**Portfolio-strategy findings (addressed by §B/§F/§G/§H):**
- The two strongest public projects are **missing from the site**: `bible-tui` (Rust workspace, native TUI
  + WASM web build, live at bible.hulsman.dev, upstream ratzilla contributions) and `tailscale-acl-gitops`
  (policy-as-code + CI apply + hourly drift detection + semantic ACL diff tool; exemplary DevOps piece).
- Encrypted Chat TUI is the weakest current card ("Encryption is the goal, not yet the state") and its
  GitHub link points to a **profile, not a repo** — the repo lives on Ezra's non-professional account.
- Launchpad is functionally complete but measured at **5 FPS** with major aesthetic issues (full
  diagnosis in §F).
- Vaste Grond is alpha-ready (no store presence yet) — a future "shipped product" piece (§H).
- The unclaimed narrative across Anna + 3 MCP servers + Finance Bot + Claude Sandbox is
  **AI-integrated infrastructure engineering** (D5).

---

## §A — Production fixes (quick wins; one session; Sonnet-capable)

### A0 `[~]` VERIFY the deploy path, then document it (PREREQUISITE for anything prod-facing)
> **2026-07-03:** Documented in README as the Workers Builds path (per D8) + build.yml note that
> the PDF is artifact-only. **Verification still pending Ezra:** `wrangler` can't auth in this
> environment (`CLOUDFLARE_API_TOKEN` not set), so run `npx wrangler deployments list` locally or
> check the CF dashboard (Workers & Pages → worker → Settings → Builds) to confirm the trigger.
**Repo-level facts (verified):** CI (`.github/workflows/build.yml`) only builds + generates the PDF
artifact — no deploy step. `wrangler.toml [build]` runs plain `npm run build` (`astro build`).
**Ezra's claim (D8, plausible, dashboard-side and invisible to the repo):** Cloudflare **Workers
Builds** Git integration auto-deploys on push to `main`.
**How:**
1. Verify: `npx wrangler deployments list` (source column shows whether deploys come from Workers
   Builds / API vs local uploads), or a 1-minute Cloudflare-dashboard check (Workers & Pages → the
   worker → Settings → Builds). Also compare the live site against a recent main-only change.
2. If Workers Builds IS active: document it as the canonical path (README §Deployment — replace the
   "npx wrangler deploy" instruction), and note that Cloudflare's builder runs `npm run build`
   (plain `astro build`) — anything that must ship to prod has to be part of that command. Per D1
   the PDF does NOT need to ship, so no build-chain change is needed; sitemap/robots (D-1) ship
   automatically as part of `astro build`.
3. If it is NOT active: fall back to the original options — preferred: enable Workers Builds in the
   dashboard (no repo secret needed); alternative: add a deploy step to `build.yml` with a
   `CLOUDFLARE_API_TOKEN` secret from Ezra.
**Accept:** the canonical deploy trigger is verified (not assumed), written into README, and a test
push to `main` demonstrably reaches hulsman.dev.

### A1 `[x]` Fix `/resume.pdf` — GATED path per D1 (after A0)
> **Done 2026-07-03.** Worker 301-redirects `/resume.pdf → /resume`. Note: `public/resume.pdf`
> was already gitignored (never shipped via the git build), so the placeholder was never in prod;
> the redirect handles URL-guessers regardless.
**Why:** Recruiters guess this URL; today they get a plaintext placeholder.
**How (D1 decided: keep everything gated):**
1. Delete `public/resume.pdf` (the placeholder).
2. In `src/worker.ts`, add a 301 redirect `/resume.pdf → /resume` (before the assets fetch).
3. Optional tidy-up: the CI PDF-generation step (`scripts/generate-pdf.js` + http-server in
   `build.yml`) no longer serves production. Keep it as a private artifact for Ezra's own CV upkeep
   OR remove it — implementer's judgment; if kept, add a comment in `build.yml` saying it is
   artifact-only by design (D1).
**Accept:** `curl -sI https://hulsman.dev/resume.pdf` returns 301 → `/resume`; no placeholder in the
repo; `/resume` page unchanged ("Inquire about my full CV" remains the primary CTA).

### A2 `[x]` Real 404 page + correct status
**Why:** Every bogus URL currently returns the homepage with HTTP 200.
**How:**
1. Create `src/pages/404.astro` using `BaseLayout`. Design: keep it on-brand — dot-grid background,
   terminal-styled block: `ezra@hulsman:~$ cd /requested/path` / `zsh: no such file or directory`,
   links to `/`, `/projects`, `/resume`. Astro emits this as `dist/404.html` automatically.
2. In `src/worker.ts`, replace the SPA fallback (lines ~213–219): for non-asset paths that 404 from
   `ASSETS`, fetch `/404.html` and return its body with **status 404**. Keep serving real static routes
   untouched. Delete the `index.html` fallback entirely — this is a fully static site; there are no
   client-side routes that need SPA behavior.
**Accept:** `curl -s -o /dev/null -w "%{http_code}" localhost/nonexistent` → `404`; page renders styled
in both themes; all real routes still 200.

### A3 `[x]` Contact form abuse protection
> **Done 2026-07-03** (honeypot always-on, scoped CORS, generic errors, `tests/worker.test.ts`).
> **Turnstile is coded but dormant** — it activates only once Ezra sets `turnstileSiteKey` in
> `site.ts` and runs `npx wrangler secret put TURNSTILE_SECRET`. Until then it's skipped gracefully.
> Per-IP KV rate limiting was intentionally skipped (needs a KV binding); honeypot+CORS suffice for now.
**Why:** Open POST endpoint + `Access-Control-Allow-Origin: *` + no rate limiting = spam and Resend
quota burn; error handler leaks internals.
**How (layered, all in `src/worker.ts` + `src/pages/contact.astro`):**
1. **Turnstile** (free, native to CF): add the widget to the contact form
   (`<div class="cf-turnstile" data-sitekey=...>` + script tag, invisible mode is fine); in the worker,
   verify `cf-turnstile-response` against `https://challenges.cloudflare.com/turnstile/v0/siteverify`
   with a `TURNSTILE_SECRET` env var (add to `Env` interface, `.dev.vars`, and
   `npx wrangler secret put TURNSTILE_SECRET`). Reject on failure with 403.
   Site key is public → can live in `site.ts` or an env-driven Astro define.
2. **Honeypot:** add a visually-hidden `website` field to the form; worker rejects any submission where
   it is non-empty (return 200-shaped success to not tip off bots).
3. **CORS:** replace `*` with `https://hulsman.dev` (and `http://localhost:4321` when `url.hostname ===
   'localhost'`).
4. **Error hygiene:** `worker.ts:180` — return a generic message; keep details in `console.error` only.
5. Optional hardening (skip if time-boxed): per-IP rate limit via `request.headers.get('cf-connecting-ip')`
   + Workers KV counter with 1h TTL, max 5/h.
**Testing (per TDD rule):** the worker is plain fetch-handler logic — add `tests/worker.test.ts` cases
for: honeypot filled → success-shaped reject; missing Turnstile token → 403; valid flow (mock
`fetch` for siteverify + Resend). Any lightweight runner works; `node --test` with a fetch mock avoids
new deps. Write these before changing the worker.
**Accept:** tests pass; manual `curl -X POST` without token → 403; form still submits in a real browser
(verify via Playwright); Turnstile widget invisible or styled to match theme.

### A4 `[x]` Clarify the ongoing on-call engagement (D2 decided: it IS ongoing, 0-hour basis)
> **Done 2026-07-03.** Note appended in both components, preserving each one's native date style
> (homepage `2023 — Present · on-call`; resume `2023 – present · on-call`).
**Why:** Three unqualified "Present" roles read as a data error; the staffing engagement is genuinely
ongoing but on-call, and that distinction should be visible.
**How:**
1. `src/config/resume.ts` — extend the `Experience` interface with optional `note?: string`; set
   `note: 'on-call'` on the European staffing company entry. ("On-call" chosen over "0-hour contract":
   the Dutch 0-urencontract term doesn't translate and reads precarious to international audiences.)
2. Render the note next to the date range in BOTH `src/components/resume/ExperienceTimeline.astro`
   and the homepage `src/components/ExperienceSection.astro`: `2023 — Present · on-call` (muted style,
   same size as the range).
**Accept:** `/resume` and homepage show `2023 — Present · on-call` for the staffing role; bank role
stays plain `2025 — Present`; screenshots both themes; PDF print layout unaffected (regenerate + eyeball).

### A5 `[x]` Remove the dead `featured` flag; make sources of truth explicit
> **Done 2026-07-03.** `featured` removed; source-of-truth comments added to `site.ts` +
> `ProjectsShowcase.astro`; `order` frontmatter added (1,3,5,6,7,8,9 — gaps 2 & 4 left for
> BibleTui / TailscaleAclGitops in Session 2). **Sorting still by date** — wiring `order` into the
> gallery sort is deferred to C3 per the plan.
**The fact (verified):** `ProjectsShowcase.astro` renders homepage cards from MDX frontmatter
`showcase === true` (via `import.meta.glob`); nothing anywhere reads `site.ts` `projects[].featured`.
`site.ts projects[]` is consumed only by `AboutSection.astro` for the terminal animation /
`ls projects/` data (unfiltered).
**How:**
1. Delete every `featured` key from `site.ts` `projects[]`.
2. Add a comment atop `site.ts projects[]`: "Consumed by AboutSection terminal data ONLY. Homepage
   showcase = MDX frontmatter `showcase: true`; gallery order = MDX `order`."
3. Add a matching comment in `ProjectsShowcase.astro`.
4. Add numeric `order` frontmatter to the MDX files (used by C3; add the key now, wire sorting in C3
   or here if trivial).
**Accept:** `grep -rn "featured" src/` returns nothing; toggling `showcase` in an MDX file visibly
adds/removes a homepage card; comments in both files name the sources of truth.

### A6 `[x]` Image hygiene: drop Gravatar, fix the avatar chain
> **Done 2026-07-03.** `portrait.webp` (400px, 13 KB) replaces Gravatar in AboutSection/Header/Nav
> (Nav's import was unused); `gravatar.ts`+`md5.ts` deleted; `avatar.png` (1.4 MB) git-rm'd;
> `og-image.svg` re-pointed to the webp; `og-image.png` (tracked, face baked in) left as the social
> card. Verified via Playwright: zero gravatar.com requests, portrait loads 200.
> Note: `Header.astro` turns out to be unused (dead component) — flagged, not removed (out of scope).
**Caution (verified):** `public/avatar.png` is NOT dead — `public/og-image.svg:21` embeds it via
`<image href="/avatar.png">`. Deleting it naively breaks the OG social image. And `gravatarUrl` is used
in **three** components: `AboutSection.astro:92`, `Nav.astro` (~line 4 import; mobile-menu avatar), and
`Header.astro` (~lines 2, 22).
**How:**
1. Export the current photo as `public/images/portrait.webp` at 2× display size (~320px, ≤40 KB);
   keep `avatar.svg` as fallback.
2. Replace `gravatarUrl` in **all three** components with the local asset; then delete
   `src/lib/gravatar.ts` and `src/lib/md5.ts` (verify no remaining importers:
   `grep -rn "gravatar\|md5" src/`).
3. `og-image.svg`: either re-point the `<image href>` to a small embedded portrait (data URI is safest —
   external refs inside SVGs don't render in most social-card fetchers anyway; **check whether
   `og-image.png` was exported WITH the photo baked in**, since `seo.ogImage` points at the PNG, not
   the SVG) — then delete `avatar.png` once nothing references it (`grep -rn "avatar.png" src/ public/`).
**Accept:** zero requests to gravatar.com (Playwright network check); About/Nav/Header photos render in
both themes; OG image still shows the portrait (share-preview tool or directly open `/og-image.png`); repo drops
~1.4 MB.

### A7 `[x]` Commit the pending copy rewrites
Eight files are sitting modified (site.ts + 7 MDX copy rewrites, all reviewed as improvements during
the review session). Commit via git-commit-handler as `docs(projects): rewrite project descriptions
for clarity` (or split if the agent finds unrelated hunks). Do this FIRST in the session so later
diffs stay clean. Also decide: `site-structure-overview.html` in repo root is untracked — move to
`docs/` or delete (it looks like a one-off artifact).

---

## §B — New case studies (the highest-leverage content work)

> Voice reference: read 2–3 existing MDX files first (`ClaudeSandbox.mdx` is the tone benchmark:
> technical, first-person, honest about limitations, "why" over "what"). Also read
> `~/.claude-config/writing-style.md` if drafting with the /write skill. Frontmatter schema is
> documented in `README.md` §MDX Projects. Facts below are from the 2026-07-02 repo survey —
> **verify each against the repo before writing.**

### B1 `[ ]` bible-tui case study (top priority content task)
**Repo:** `~/Coding/bible-tui` (multi-crate Cargo workspace: `bible-core`, `bible-native`, `bible-web`).
Live demo: **bible.hulsman.dev** (Cloudflare Pages; config at `web/wrangler.jsonc`, not repo root). Check the GitHub remote
is the professional account (`git -C ~/Coding/bible-tui remote -v`) before linking.
**Why this project:** it's the strongest public piece Ezra owns — Rust systems work, a native TUI *and*
a WASM browser build from one core, a live demo, and upstream OSS contributions (`~/Coding/ratzilla`
fork carries DomBackend fixes — grid rebuild, event attachment, element dimensions — contributed
upstream; verify PR links via `git -C ~/Coding/ratzilla log`).
**Angle:** "One Rust codebase, two frontends: a terminal Bible reader that also runs in your browser."
**Draft outline (`src/pages/projects/BibleTui.mdx`):**
- Frontmatter: `showcase: true`, tech `["Rust", "ratatui", "WebAssembly", "ratzilla", "rusqlite", "Astro"]`,
  `preview: "https://bible.hulsman.dev"`, github link (pending remote check).
- Hook: vim-navigation Bible reader; born as a TUI, ported to the web without rewriting the app.
- Architecture: core/native/web crate split; what lives in `bible-core` (data model, search, bookmarks)
  vs the two shells; translation import pipeline (MyBible/Zefania/JSON → bundled KJV/WEB/Statenvertaling).
- The WASM port war story: what broke in ratzilla's DomBackend, how it was debugged, the upstream fixes
  (this is the section that proves OSS chops — cite the actual PRs).
- Design decisions: there is **no `docs/` directory** in the repo — infer decisions from
  `README.md`, `Cargo.toml` dependency choices, and commit history. Investigate: why postcard for
  serialization, the rusqlite storage backend in `bible-core`, and the vim-keybinding model (search
  `bible-core`/`bible-native` src for key handling).
- Outcome: live demo link, "runs in the terminal and at bible.hulsman.dev from the same core."
**Placement:** add to homepage showcase per D4; on `/projects` order it directly after Claude Sandbox.
**Accept:** page renders (both themes, mobile); facts verified against repo; demo link works; homepage
card appears per D4; terminal's `ls projects/` and `cat projects/<name>` data updated to include it
(check `src/scripts/virtual-fs.ts` — project data may be duplicated there; keep in sync).

### B2 `[ ]` tailscale-acl-gitops case study + comparator extraction (D3 decided)
**Repo:** `~/Coding/tailscale-acl-gitops` (active — commits as of 2026-07-02). HuJSON policy, GitHub
Actions `test` on PR / `apply` on merge, hourly drift detection comparing live tailnet policy to repo
with ntfy push alerts, Python semantic ACL comparator with its own test suite (paths:
`.github/scripts/acl_diff.py`, tests at `.github/scripts/test_acl_diff.py`), 16k README documenting
the security model (OAuth scopes, branch protection, supply-chain pinning).
**Angle:** "I run my home network like production: policy-as-code with CI/CD and drift detection." This
upgrades the Homelab story from *devices* to *operational rigor* and is the most on-brand DevOps piece.
**Sensitivity — RESOLVED (D3):** the policy repo stays private. Instead, **extract the semantic ACL
comparator into a standalone public repo** under `enhulsman` (working name `tailscale-acl-semdiff`):
copy `.github/scripts/acl_diff.py` + `.github/scripts/test_acl_diff.py`, add a README (what semantic
diffing means for HuJSON ACLs, why textual diff lies, usage), a license, and CI running the tests.
Scrub any real hostnames/tags from code comments and test fixtures — replace with generic fixtures.
The case study links this repo; prose shows only a *generalized* ACL snippet, never the real host
matrix. Bonus framing for the case study: "the policy stays private, the tooling is public" is itself
the security posture on display.
**Draft outline (`src/pages/projects/TailscaleAclGitops.mdx`):**
- Hook: an hourly cron that yells at me (ntfy) if my live firewall policy drifts from git.
- Why GitOps for a homelab: the failure mode it prevents (console click-ops, silent drift).
- Pipeline: PR → semantic diff + tests → merge → apply via Tailscale OAuth API; why *semantic* ACL
  diffing (HuJSON reordering ≠ policy change) — the Python comparator is the interesting artifact.
- Security model: least-privilege OAuth scopes, branch protection as change control, pinned actions.
- Honest limitation section (in the ClaudeSandbox tradition): e.g. apply is last-writer-wins;
  drift alert latency is 1h; single-maintainer review is a rubber stamp — mine the README for these.
- Outcome: running in production on the real tailnet since <verify start date via git log>.
**Placement (D4 decided):** `showcase: false` (gallery only); cross-link from
`HomelabInfrastructure.mdx` ("the ACL layer has its own case study →").
**Accept:** same bar as B1; no sensitive hostnames/ports in prose, diagrams, or the extracted repo's
fixtures; `tailscale-acl-semdiff` public with green CI; case study links it.

### B3 `[ ]` Encrypted Chat TUI cleanup (D6 decided: keep in gallery; near-term, independent of §G)
**How:** In `site.ts` the card's `github` field points to `https://github.com/enhulsman` (a profile,
not a repo — the code lives on the non-professional account, see §G). Remove the `github` key from
this entry now (the ProjectCard should degrade gracefully — verify). Its MDX already has
`showcase: false`, so homepage de-listing is a no-op — just confirm after A5/B1 land (per D4). Keep the honest WIP framing in the MDX — one honest-WIP
piece is personality; it just shouldn't hold a top-4 slot over finished work.
**Accept:** no dead/misleading GitHub link anywhere; homepage shows the D4 lineup.

---

## §C — Resume-page UX polish (one session; needs Playwright verification)

### C1 `[ ]` Make the existing terminal hint actually noticeable
**The fact (verified):** a hint already exists — `src/scripts/interactive-terminal.ts:168-180`,
`appendHint()` renders "this is a real shell — type help for more" at opacity 0.15 on the prompt line,
then fades it after ~1s and removes it at ~1.5s. Too transient to register. Do NOT add a second hint
elsewhere (e.g. `terminal-animation.ts`) — modify this one.
**How (changes to `appendHint()` and its call site):**
1. Persist the hint until the first keypress/command instead of the 1s fade; then fade out.
2. Restyle as a dimmed shell comment on its own line below the prompt:
   `# psst — this terminal is real. try 'help'` (comment-green or theme-muted, opacity ~0.5 —
   0.15 is illegible).
3. Show it in the reduced-motion path too (statically, no fade-in).
4. Once the user has ever run a command, suppress on subsequent appearances via a `sessionStorage` flag.
**Accept:** hint visible and legible after the intro animation until the user types; gone after first
command and not re-shown that session; present under `prefers-reduced-motion`; screenshots both themes.

### C2 `[ ]` De-duplicate the skills story
**Why:** Marquee + categorized grid duplicate the same strings in one viewport (finding #8).
**How (pick one, default first):**
- (a) Delete the marquee rows from `src/components/SkillsSection.astro`, keep the categorized grid,
  and pull the **certifications** (from `resume.ts` — PSM I, CPSA 8.8, CPBA 8.8) up into a slim strip
  where the marquee was. Certifications currently only exist on `/resume`; surfacing them on the
  homepage adds info instead of repeating it.
- (b) Keep the marquee, delete the grid, and let `/resume` own categorization.
**Accept:** each skill string appears at most twice on the homepage (hero chips + one section);
section still balances visually at 1440px and 390px; reduced-motion path unaffected.

### C3 `[ ]` Project gallery: visuals, order, links
**How, in `src/pages/projects/index.astro` + `ProjectCard.astro` + MDX frontmatter:**
1. Add optional `image` (path) + `imageAlt` frontmatter; render as a card header thumb (fixed aspect,
   `object-fit: cover`, subtle border like the ClaudeSandbox diagram treatment).
2. Produce visuals for the top cards, cheapest-first: ClaudeSandbox → reuse
   `public/images/claude-sandbox-architecture.svg`; bible-tui → real terminal screenshot (run it) or
   the web demo; Homelab → topology sketch (a simple SVG is fine; there may be one in the status-page
   repo); Anna → Teams conversation mock (redact real names). Text-only fallback stays for the rest.
3. Ordering: add numeric `order` frontmatter; sort ascending, Portfolio Site last. Suggested:
   ClaudeSandbox, BibleTui, Anna, TailscaleAclGitops, Homelab, FinanceBot, pytaiga, EncryptedChatTUI,
   ResumePage.
4. Put the `github`/`preview` links directly on gallery cards (icon row, like homepage cards have).
   **Scope note (verified):** `ProjectCard.astro`'s Props interface currently accepts only
   `title/description/href/tags` — extend it with optional `image`, `imageAlt`, `github`, `preview`
   props, extract those fields from MDX frontmatter in `src/pages/projects/index.astro`, and pass them
   through. Three files change, not one.
**Accept:** gallery screenshot shows ≥4 cards with imagery; order matches; links clickable; mobile OK.

### C4 `[ ]` Experience skimmability
**How:** In `src/config/resume.ts`, change `summary: string` to also allow `highlights?: string[]`
(2–3 bullets, each ≤1 line, leading with the metric). Render bullets in
`src/components/resume/ExperienceTimeline.astro` and the homepage `ExperienceSection.astro`; fall back
to `summary` paragraph when `highlights` absent. Draft the bullet splits from the existing summaries —
they already contain the metrics ("2.5 of 150 case types in 4 years", "~20 tenants / 80+ environments",
"daily 10–15 min report automated"); don't invent new numbers.
**Accept:** each consulting role shows its headline metric on the first line of a bullet; PDF
generation (A1) still lays out cleanly — regenerate and eyeball it.

---

## §D — SEO & metadata (bundle into Session 1)

### D-1 `[x]` Sitemap + robots (includes a latent-bug fix)
> **Done 2026-07-03.** `@astrojs/sitemap` added; `astro.config` now uses `site.seo.baseUrl` (the
> `site.url` bug is fixed — chose to reuse the existing baseUrl rather than add a third duplicate);
> `robots.txt` shipped; `dist/sitemap-index.xml` + `sitemap-0.xml` generate with absolute URLs.
**Latent bug (verified):** `astro.config.mjs:17` sets `site: site.url`, but `site.ts` has **no `.url`
property** (only `seo.baseUrl`) — so Astro's `site` has been silently `undefined` the whole time,
breaking anything that derives canonical/absolute URLs. Fix FIRST: change to
`site: 'https://hulsman.dev'` (or add a top-level `url` to `site.ts` and reference that).
Then `npx astro add sitemap` (`@astrojs/sitemap` is not yet a dependency); after A0, confirm the
sitemap ships to prod. Add `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://hulsman.dev/sitemap-index.xml
```
**Accept:** `dist/sitemap-index.xml` exists after build; robots.txt served.

### D-2 `[x]` JSON-LD structured data
> **Done 2026-07-03.** Person + WebSite `@graph` in `Metadata.astro` (one block per page);
> `SoftwareSourceCode` added in `ProjectLayout.astro` for project pages. All blocks validated as
> parseable JSON; no duplicate Person nodes.
In `src/components/Metadata.astro` (or `BaseLayout.astro` head), emit one `<script type="application/ld+json">`
built from `site.ts`: `@type: Person` (name, jobTitle, worksFor Anamata, url, sameAs: [GitHub, LinkedIn],
address Utrecht NL) + `@type: WebSite`. On `/projects/*` pages additionally emit
`@type: SoftwareSourceCode` (name, description, programmingLanguage from `tech[]`, codeRepository when
a github link exists) — ProjectLayout has the frontmatter in scope.
**Accept:** validates in Google Rich Results test (or `npx structured-data-testing-tool`); no
duplicate JSON-LD blocks per page.

### D-3 `[ ]` Positioning copy (D5 decided: light touch)
Add one rotating hero subtitle entry (the string array is `const roles = [...]` at
`src/components/HeroSection.astro:4`) such as
`"AI-integrated infrastructure"`, and extend `site.ts` `summary`/`seo.keywords` with one sentence
claiming the Anna/MCP/sandbox thread explicitly. Keep it factual, no buzzword pile.
**Accept:** Ezra has approved the exact wording (voice check — don't ship copy unseen).

---

## §E — Writing section — **PARKED per D7 (2026-07-03). Do not build.**

> Ezra decided to skip this for now (stale-blog risk outweighs the payoff without a writing habit).
> The design below is kept for whenever he revives it — do not start §E work unprompted.

**Why:** prose is the highest-signal artifact after shipped code; the site has no content that changes
over time. Material already exists — these are *repurposing* tasks, not blank-page writing.

1. **Infra:** new `src/pages/writing/` route group mirroring the projects MDX pattern (auto-discovered
   MDX + `WritingLayout.astro` derived from ProjectLayout; frontmatter: title, description, date, tags).
   Add "Writing" to nav (`Nav.astro`) and footer. Add RSS via `@astrojs/rss` at `/rss.xml`.
2. **Post #1 (ship with the section):** "Sandboxing an AI agent that can run shell commands" — condensed
   from the ClaudeSandbox case study's TOCTOU/symlink-verification material, but written as a general
   engineering essay (what's different from sandboxing ordinary software, the honest-limitations
   section). Source: `~/Coding/claude-sandbox` README + the existing MDX.
3. **Backlog (documented here, not built now):** "GitOps for a tailnet" (from B2 material);
   "Replacing a 4-year Pega VM estate with Kubernetes" (anonymize per existing resume rules — client
   stays "Nordic financial regulator").
4. Voice: draft with the `/write` skill against `writing-style.md`; user reviews before publish.
**Accept:** `/writing` lists post #1; RSS validates; nav updated; JSON-LD `BlogPosting` on post pages;
sitemap picks the route up automatically (D-1).

---

## §F — Launchpad rescue (`~/Coding/launchpad`)

> **Reserve the redesign for a joint session (user + Fable).** The perf fix (F1) is mechanical and can
> be done by any model solo; the visual redesign (F2) is exactly the kind of taste-driven work that
> failed before ("Opus was never able to make this look as clean as the resume-page") — do it with the
> user in the loop, iterating on Playwright screenshots, ideally starting from `/design-brief`.

### Diagnosis (measured 2026-07-02, so the next session doesn't re-derive it)

**Sluggishness — objectively confirmed: 5 FPS** on the CSS-aurora backdrop mode (no canvas/video active),
measured via rAF over 2s at 1440×900. Cause, by inspection:
- **72 elements with `backdrop-filter`** (every glass tile, health chip, panel).
- **7 huge, continuously-animated blurred layers behind them**: five `.blob` divs (573–1136px,
  `blur(80–120px)`, infinite `blob-drift-*` animations) + two `.aurora` layers **larger than the
  viewport** (2433×2645 and 1695×2395, `blur(60–70px)`, infinite rotate/breathe).
- Animated giant blurs *underneath* dozens of backdrop-filter surfaces force near-full-screen re-blur
  every frame. This is architectural, not a WSL artifact (WSL's missing GPU exaggerates it, but stacked
  animated blur + backdrop-filter jank on real hardware too).
- Bonus dev bug: health API rejects localhost origins (CORS pinned to `https://launch.hulsman.dev`) —
  the health widget can never work in dev.

**"Mediocre/unpolished" feel — design diagnosis:**
1. **No value hierarchy.** Everything — background, tiles, text — sits in one narrow mid-lavender tonal
   band; max contrast on screen is low. The resume-page reads "premium" because of extreme value range
   (near-black bg / cream text / one saturated accent). Launchpad reads as fog.
2. **Rainbow pastel accents.** Every tile icon has its own pastel (green, blue, pink, orange…) so there
   is no brand color; multi-accent + haze = generic dashboard.
3. **Uniform grid, no typographic scale.** ~20 identical rounded rectangles in equal columns; only the
   clock has scale, and its segmented-LCD font is a third type voice against the mono labels and
   humanist date — three voices, no system.
4. **The atmospheric asset is blurred into mush.** A space backdrop should give stars and depth; at
   blur(60–120px) it only supplies purple haze — the atmosphere budget is spent producing the fog that
   causes problem #1.

### F1 `[ ]` Performance fix (solo-able, do before any redesign)
1. Replace the live-blurred animated blobs/auroras with **pre-blurred static assets**: render each blob
   once to a PNG/WebP (or one composite layer), then animate only `transform: translate/rotate/scale`
   and `opacity` (compositor-only properties). Zero runtime `filter` on animated elements.
2. Cut `backdrop-filter` count from 72 to ≤6: apply glass to the 3–4 *panel containers*, not per-tile;
   tiles become semi-opaque solid fills (+ a baked noise texture for the glass feel).
3. Respect `prefers-reduced-motion` (pause drifts).
4. Fix health-API CORS to also allow `http://localhost:*` in dev.
**Accept:** ≥55 FPS by the same rAF measurement in the same environment; visual diff acceptable
(screenshot before/after); reduced-motion static.

### F2 `[~user]` Visual redesign (joint session — direction notes for the brief)
Goal restated from Ezra: "high-end looking page that stands out among modern clean pages."
Starting hypotheses to bring into `/design-brief` (not decisions):
- Push the background 2 stops darker (deep space navy-black) so the un-blurred starfield can actually
  read; let ONE aurora ribbon survive, sharp-ish, as the hero gesture.
- One accent family (candidate: keep violet but saturated, or steal nothing from resume-page — per the
  "each project gets its own identity" rule).
- Tile hierarchy: featured/frequent tiles larger or iconography-forward; demote the rest to a dense
  text list (launchers are lists, not galleries — cf. terminal startpages).
- One type system: either commit to the terminal/mono identity everywhere (fits `~/.launchpad` naming)
  or drop the LCD clock face; not both.
- Use LazyWeb/Refero references for "startpage/new-tab" and "glass dashboard" patterns during the session.

---

## §G — Hackrschat: make it showcaseable (or park it deliberately)

**Current state (verify):** `~/Coding/Hackrschat` — Rust, Cursive TUI client + Tokio(-style) server,
sqlx/PostgreSQL, JSON protocol; login/registration work; core chat loop incomplete; last commit
2026-02-21; 4 merged PRs; demo video exists. It is showcased on the site as "Encrypted Chat TUI" with
honest not-yet-encrypted framing.
**Recommendation:** do B3 now (cleanup), and treat G as *optional* — only invest if Ezra wants to keep
a networking/protocol Rust piece on the site alongside bible-tui (which already covers "Rust craft").

### G1 `[ ]` Definition of "legitimately showcaseable" (the finish line)
1. Core chat loop complete: rooms/channels, message persistence, live delivery to connected clients,
   history on join. (The roadmap in the repo tracks this — reconcile with it.)
2. The name stops being aspirational: TLS on the wire (rustls; self-signed OK with pinning docs) +
   authenticated sessions (the JWT plan in the repo). *Then* "Encrypted Chat TUI" is true.
3. A 60–90s asciinema/GIF demo of two clients chatting.
4. README of bible-tui quality (architecture sketch, protocol doc, run-it-yourself in 3 commands).
Effort: multiple evenings of real Rust work. Good candidate for its own goal-driven sessions
(`/goal all G1 checkboxes true`, capped).

### G2 `[ ]` Identity separation runbook (required before any public linking)
The repo lives on the non-professional (gamer-tag) GitHub account; the identities must not be linked.
**Do not use GitHub's "transfer repository"** — transfers leave a redirect and the old owner appears in
the repo's transfer/activity history. Instead:
0. **Prerequisite — talk to the collaborator FIRST**, before any history rewriting: explain the
   migration, confirm they have no objection, and ask how they want to be attributed (their commits
   will be preserved verbatim by default). This is a human conversation Ezra must have; block G2 on it.
1. Audit content for identity leaks BEFORE anything else: `git log --format='%an %ae %cn %ce' | sort -u`;
   grep full history for the gamer tag: `git log -p | grep -i '<tag>'` (README, code comments, CI
   configs, issue templates). Also check the demo video for usernames.
2. Rewrite Ezra's author/committer identities to `enhulsman <ezra@hulsman.dev>` with `git filter-repo
   --mailmap` (map every old email/name of HIS; **leave the collaborator's commits untouched** — their
   identity is theirs; confirm the collaborator has no objection and no gamer-tag linkage of their own,
   otherwise ask them for a preferred attribution).
3. Create a **fresh repo** under `enhulsman`, push the rewritten history, and re-create only sanitized
   README/docs. Old repo: make private (don't delete — it's the collaborator's history too).
4. Verify on the new repo: contributors page shows only professional identities; no gamer tag anywhere
   (`gh api repos/enhulsman/<name>/contributors`; clone fresh + grep history again).
5. Only then set the `github` link in `site.ts`/MDX.
**Accept:** all G2 checks pass on the fresh clone; site links updated; old repo private.

---

## §H — Vaste Grond: path to the "shipped product" portfolio slot

**Current state:** alpha-ready, no store presence, no real users yet. Not portfolio-blocking; do not
add to the site yet — a product case study without users undercuts the otherwise-honest catalog.
**Alpha launch checklist (own session(s), in the vaste-grond repo which has its own OpenSpec flow):**
1. Crash/error reporting (sentry-expo or equivalent) + basic analytics before testers arrive.
2. EAS builds → TestFlight + Play internal testing track.
3. Recruit the first kring (church/community network) — target ~10–20 testers; feedback channel.
4. 2–4 week feedback loop; fix the top issues; decide on payments (RevenueCat) after retention signal.
**Portfolio trigger:** write the case study when ≥1 real kring is active weekly OR a public beta listing
exists. Angle then: "product engineering end-to-end — monorepo (Workers/Hono/D1 API + Expo app +
shared types), magic-link auth, and what real users did to my assumptions."
**If the alpha is weeks (not months) away:** draft the case-study skeleton during Session 2's content
work (facts that won't change: architecture, auth design, monorepo layout) and leave the
users/outcome section open — so the trigger only requires filling in results, not a cold start.

---

## §9 — Session playbook & model guidance

- **All §0 decisions are RESOLVED (2026-07-03)** — sessions no longer need to ask anything at start
  except where a task explicitly requires a voice check (D-3, case-study prose).
- **Session 1 (next):** A7 first (clean tree), then A0 (verify the Workers-Builds claim — 5 minutes,
  unblocks the mental model for everything prod-facing), then A1–A6, D-1, D-2. Sonnet or Opus. If A0's
  dashboard check needs Ezra and he's away, pivot to A2–A6 (none depend on A0). Everything has explicit
  accept criteria; end with a `/verify`-style Playwright pass + one commit per task via
  git-commit-handler.
- **Session 2:** B1, then B2 (including the `tailscale-acl-semdiff` extraction, which needs a new
  GitHub repo — Ezra or `gh repo create`), then B3. Opus or Fable; Ezra should be present at the end
  for a voice pass on both case studies. Requires reading `~/Coding/bible-tui` and
  `~/Coding/tailscale-acl-gitops` directly.
- **Session 3:** C1–C4 + D-3 (wording needs Ezra's sign-off). Opus. Heavy Playwright verification;
  respect hero-aesthetics and reduced-motion rules.
- **Session 4:** F1 solo-able by Opus/Sonnet in the launchpad repo; F2 is a joint Fable+Ezra design
  session starting from `/design-brief`.
- **Session 5+:** §G (optional — G1 suits `/goal`), §H lives in the vaste-grond repo. §E is parked.
- **Cross-session invariant:** after each session, update checkboxes here and append a one-line log to
  the table below.

| Date | Session | Completed | Notes |
|---|---|---|---|
| 2026-07-02 | Review + planning | Plan written; scrutinize loop → APPROVED | — |
| 2026-07-03 | Decision sparring | All §0 decisions D1–D8 resolved; A0/A1/A4/B2/§E/§9 updated accordingly | D8 pending A0 verification of the Workers-Builds claim |
| 2026-07-03 | Session 1 | A1, A2, A3, A4, A5, A6, A7, D-1, D-2 all `[x]`; A0 `[~]` (docs done, deploy verification pending Ezra). 14 tests green, build clean, Playwright-verified light+dark & desktop+390px. | Follow-ups for Ezra: (1) verify Workers Builds trigger [A0], (2) provision Turnstile site key + `TURNSTILE_SECRET` to activate the coded widget [A3]. Session 2 = §B case studies. |
