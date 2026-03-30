# Terminal Upgrade Paths

The interactive terminal in the About section currently uses a custom command registry with hardcoded responses (~1100 lines of vanilla TypeScript). This document outlines two upgrade paths for deeper realism.

## Current State (Option 1 — in progress)

**Approach:** Upgrade the existing terminal with `bash-parser` (AST-based command parsing) and `BrowserFS` (in-memory virtual filesystem).

**What this enables:**
- Real pipe chains: `echo $STACK | tr ":" "\n"` actually parses as two commands connected by a pipe
- Real environment variables: `$HOME`, `$USER`, `$STACK` stored and expanded properly
- Real filesystem: `cat`, `ls` read from a virtual fs pre-populated with portfolio content
- Proper quoting, globbing basics, and command chaining (`&&`, `;`)

**Stack:** TypeScript, bash-parser (npm), BrowserFS (npm)
**Effort:** 2-3 focused sessions
**Bundle impact:** +100-200KB
**Hosting:** No changes (still static, still Cloudflare)

---

## Option 2: Rust → WASM Shell (Standalone Project)

Build a mini shell and virtual filesystem in Rust, compile to WebAssembly, embed in the browser.

### Why a Separate Repo

This is a reusable library, not portfolio-specific. It could power any browser-based terminal. The portfolio would import the compiled WASM module like any other dependency.

**Suggested repo:** `wasm-shell` or `browser-coreutils`

### Architecture

```
wasm-shell/
├── crates/
│   ├── shell-core/        # Parser, executor, env vars, pipe infrastructure
│   ├── vfs/               # In-memory virtual filesystem (trait-based)
│   └── commands/          # Builtin command implementations
├── wasm-bridge/           # wasm-bindgen JS interop layer
├── www/                   # Browser test harness
├── Cargo.toml             # Workspace root
└── README.md
```

### Key Rust Crates

| Crate | Purpose |
|-------|---------|
| `wasm-bindgen` | Rust ↔ JavaScript FFI |
| `wasm-pack` | Build + bundle WASM for npm |
| `shell_words` | Shell word splitting |
| `getrandom` (with `js` feature) | Random number generation in WASM |
| `serde` + `serde_json` | Data serialization for fs content |

### Integration with Portfolio

```typescript
// In the portfolio's interactive-terminal.ts
import init, { WasmShell } from 'wasm-shell';

await init(); // Load WASM module
const shell = new WasmShell();

// Pre-populate filesystem
shell.write_file('/home/ezra/resume', resumeContent);
shell.write_file('/home/ezra/projects/claude-sandbox', projectContent);
shell.set_env('USER', 'ezra');
shell.set_env('HOME', '/home/ezra');

// Execute commands
const output = shell.execute('cat ~/resume | grep DevOps');
```

### Effort & Scope

- **MVP (basic shell + 10 commands):** 40-60 hours
- **With pipes, redirection, job control:** +20 hours
- **With grep, sed, awk basics:** +20 hours
- **Bundle size:** 500KB-2MB compiled WASM
- **Prerequisites:** Rust experience, wasm-pack tooling

### What Makes This Portfolio-Worthy

A Rust WASM shell is itself a project worth showcasing. It demonstrates:
- Systems programming (Rust, memory management)
- WebAssembly compilation and browser integration
- Language design (shell parsing, AST execution)
- Virtual filesystem implementation

It could be the fifth project on the portfolio — a showcase piece that powers its own demo.

---

## Option 3: Wasmer/WASI Browser Runtime

Use Wasmer's JavaScript runtime to execute pre-compiled WASI binaries directly in the browser.

### Why This Could Stay in This Repo

Unlike Option 2, this doesn't produce a new library — it's integration work. The WASI binaries are loaded on-demand as the terminal needs them. This could be a `/terminal` route or a progressive enhancement to the About section terminal.

### How It Works

```
Browser → Wasmer-JS runtime → WASI binary (e.g., compiled coreutils)
                              ↕
                         BrowserFS (virtual filesystem)
```

### Getting Started

1. Install Wasmer-JS: `npm install @aspect-build/aspect-shells`
2. Compile coreutils to WASI with `wasi-sdk`
3. Use Wasmer's filesystem API to mount BrowserFS
4. Route terminal commands through the WASI runtime

### Key Resources

- [Wasmer-JS](https://github.com/wasmerio/wasmer-js) — WASM runtime for browsers
- [WebAssembly.sh](https://webassembly.sh) — live demo of WASI shell in browser
- [WASI SDK](https://github.com/WebAssembly/wasi-sdk) — toolchain for compiling C/C++ to WASI

### Limitations

- Not all tools compile to WASI cleanly
- `neofetch` won't work (it shells out to other tools internally)
- Basic coreutils (ls, cat, echo, grep, tr, head, tail, wc) do work
- Ecosystem is still maturing

### Effort & Scope

- **Integration:** 20-30 hours
- **Bundle:** Varies (500KB-2MB depending on which binaries are included)
- **Hosting:** Static (WASM runs client-side)

---

## Comparison

| | Option 1 (JS Parser) | Option 2 (Rust WASM) | Option 3 (Wasmer) |
|-|----------------------|---------------------|-------------------|
| **Effort** | 2-3 sessions | 40-60 hours | 20-30 hours |
| **Realism** | Medium-high | High | High |
| **Originality** | High for a portfolio | Very high | Medium-high |
| **Bundle** | +100-200KB | +500KB-2MB | +500KB-2MB |
| **Hosting** | Static | Static | Static |
| **Standalone project?** | No (portfolio feature) | Yes (separate repo) | No (integration) |
| **Showcasable?** | As a feature | As its own project | As a feature |

## Recommended Path

1. **Now:** Option 1 — real parser + filesystem in the existing terminal
2. **Later:** Option 2 — build `wasm-shell` as a standalone Rust project, then integrate it back as a replacement for Option 1's JS implementation
3. **Skip** Option 3 unless you specifically want to run third-party binaries without writing them yourself
