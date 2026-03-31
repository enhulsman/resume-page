// Interactive Terminal — powers the portfolio terminal after typing animation
// Vanilla TypeScript, no framework dependencies. Imported by Astro <script>.

import { esc, makePromptHtml, makeCursorHtml, scrollToBottom, measureCharWidth, updateTitleDimensions } from './terminal-utils';
import { VirtualFS, SENTINEL_EXPERIENCE, SENTINEL_SKILLS, SENTINEL_EDUCATION, SENTINEL_CERTS, SENTINEL_PROJECT_PREFIX } from './virtual-fs';
import { ShellEnv } from './shell-env';
import { parseLine } from './shell-parser';
import type { ParsedCommand } from './shell-parser';
import { getCurrentTheme, setTheme } from '../lib/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TerminalProject {
  title: string;
  description: string;
  tech: string[];
  github?: string;
  link?: string;
}

interface TerminalExperience {
  role: string;
  client: string;
  startDate: string;
  endDate?: string;
  summary: string;
  group: string;
}

interface TerminalEducation {
  degree: string;
  institution: string;
  startYear: number;
  endYear: number;
  gpa?: string;
  result?: string;
}

interface TerminalCertification {
  name: string;
  institution: string;
  year: number;
  credential?: string;
}

interface TerminalSkillCategory {
  label: string;
  items: string[];
}

interface TerminalSite {
  name: string;
  role: string;
  company: string;
  location: string;
  skills: { languages: string[]; tools: string[]; frameworks: string[] };
  social: { email: string; GitHub: string; LinkedIn: string };
  employment: { status: string; message: string };
  careerStart: string;
}

export interface TerminalData {
  prompt: string;
  site: TerminalSite;
  projects: TerminalProject[];
  experience: TerminalExperience[];
  education: TerminalEducation[];
  certifications: TerminalCertification[];
  skills: TerminalSkillCategory[];
}

type CommandResult = string | string[] | { html: string } | { error: string } | null;

interface CommandContext {
  stdin?: string;
  piped: boolean;
  fs: VirtualFS;
  env: ShellEnv;
}

interface Command {
  handler: (args: string[], ctx: CommandContext) => CommandResult;
  description: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Terminal ────────────────────────────────────────────────────────────────

export class InteractiveTerminal {
  private body: HTMLElement;
  private data: TerminalData;
  private commands: Map<string, Command> = new Map();
  private history: string[] = [];
  private historyIndex = -1;
  private currentInput = '';
  private savedInput = '';
  private cursorPos = 0;
  private active = false;
  private animating = false;
  private animationCleanup: (() => void) | null = null;
  private hiddenInput!: HTMLInputElement;
  private composing = false;
  private firstCommand = true;
  private resizeTimer: ReturnType<typeof setTimeout> | null = null;
  private projectSlugs: string[];
  private inputLineEl: HTMLElement | null = null;
  private fs: VirtualFS;
  private env: ShellEnv;
  private aliases: Map<string, string> = new Map();

  constructor(body: HTMLElement, data: TerminalData) {
    this.body = body;
    this.data = data;
    this.projectSlugs = data.projects.map((p) => slugify(p.title));
    this.fs = new VirtualFS(data);
    this.env = new ShellEnv(data);
    this.loadAliases();
    this.registerCommands();
    this.createHiddenInput();
    this.bindEvents();
    updateTitleDimensions(this.data.prompt, this.body);
  }

  private loadAliases(): void {
    const home = this.env.get('HOME');
    const content = this.fs.readFile(home + '/.zshrc');
    if (typeof content !== 'string') return;
    this.aliases.clear();
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*alias\s+([A-Za-z0-9._-]+)=['"](.+)['"]\s*$/);
      if (m) this.aliases.set(m[1], m[2]);
    }
  }

  // ─── Activation ──────────────────────────────────────────────────────────

  activate(): void {
    if (this.active) return;
    this.active = true;

    const animCursor = this.body.querySelector('.terminal-cursor');
    if (animCursor) {
      const parentLine = animCursor.closest('div');
      if (parentLine && parentLine.parentNode === this.body) {
        parentLine.remove();
      }
    }

    const cardWrapper = this.body.parentElement;
    const inputStillInDOM = cardWrapper
      ? cardWrapper.contains(this.hiddenInput)
      : this.body.contains(this.hiddenInput);
    if (!inputStillInDOM) {
      this.createHiddenInput();
      this.bindInputEvents();
    }

    this.appendPromptLine();
    this.appendHint();
    updateTitleDimensions(this.data.prompt, this.body);
  }

  private appendHint(): void {
    const hint = document.createElement('span');
    hint.className = 'terminal-hint';
    hint.style.opacity = '0.15';
    hint.style.fontSize = '11px';
    hint.style.transition = 'opacity 0.6s ease';
    hint.style.marginLeft = '4px';
    hint.textContent = 'this is a real shell \u2014 type help for more';
    const inputLine = this.getInputLineEl();
    if (inputLine) inputLine.appendChild(hint);
    setTimeout(() => { hint.style.opacity = '0'; }, 1000);
    setTimeout(() => { if (hint.parentNode) hint.remove(); }, 1500);
  }

  // ─── Hidden input (mobile support) ──────────────────────────────────────

  private createHiddenInput(): void {
    const input = document.createElement('input');
    input.id = 'terminal-input';
    input.type = 'text';
    input.autocomplete = 'off';
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Terminal input');
    Object.assign(input.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      fontSize: '16px',
      zIndex: '2',
      color: 'transparent',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      caretColor: 'transparent',
      padding: '0',
      margin: '0',
      pointerEvents: 'none',
    });
    input.addEventListener('focus', () => {
      requestAnimationFrame(() => scrollToBottom(this.body));
    });
    const cardWrapper = this.body.parentElement;
    if (cardWrapper) {
      cardWrapper.style.position = 'relative';
      cardWrapper.appendChild(input);
    } else {
      this.body.style.position = 'relative';
      this.body.appendChild(input);
    }
    this.hiddenInput = input;
  }

  // ─── Events ──────────────────────────────────────────────────────────────

  private bindEvents(): void {
    this.bindInputEvents();

    window.addEventListener('resize', () => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => updateTitleDimensions(this.data.prompt, this.body), 200);
    });
  }

  private bindInputEvents(): void {
    this.hiddenInput.addEventListener('focus', () => {
      if (!this.active) {
        this.hiddenInput.blur();
      }
    });

    this.hiddenInput.addEventListener('input', () => {
      if (this.composing) return;
      this.syncFromHiddenInput();
    });
    this.hiddenInput.addEventListener('compositionstart', () => {
      this.composing = true;
    });
    this.hiddenInput.addEventListener('compositionend', () => {
      this.composing = false;
      this.syncFromHiddenInput();
    });

    this.hiddenInput.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
      if (!['Enter', 'Tab', 'Escape'].includes(e.key)) {
        setTimeout(() => this.syncFromHiddenInput(), 0);
      }
    });

    const focusInput = () => {
      if (!this.active || this.animating) return;
      this.hiddenInput.focus({ preventScroll: true });
    };

    this.body.addEventListener('click', focusInput);

    let touchStartY = 0;
    this.body.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    this.body.addEventListener('touchend', (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      if (Math.abs(touchEndY - touchStartY) < 10) {
        focusInput();
      }
    }, { passive: true });

    const cardWrapper = this.body.parentElement;
    if (cardWrapper) {
      cardWrapper.addEventListener('click', focusInput);
    }
  }

  private syncFromHiddenInput(): void {
    if (!this.active || this.animating) return;
    this.currentInput = this.hiddenInput.value;
    this.cursorPos = this.hiddenInput.selectionStart ?? this.currentInput.length;
    requestAnimationFrame(() => {
      this.renderCurrentLine();
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.active) return;

    if (e.key === 'Escape') {
      this.hiddenInput.blur();
      this.body.blur();
      return;
    }

    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (this.animating && this.animationCleanup) {
        this.animationCleanup();
        return;
      }
      // Freeze current input line as output
      const inputLine = this.getInputLineEl();
      if (inputLine) {
        inputLine.innerHTML =
          `<span class="terminal-prompt">${makePromptHtml(this.data.prompt, this.env.get('PWD'), this.env.get('HOME'))}</span>${esc(this.currentInput)}^C`;
        inputLine.classList.remove('terminal-input-line');
        inputLine.classList.add('terminal-output-line');
        inputLine.removeAttribute('aria-live');
      }
      this.inputLineEl = null;
      this.currentInput = '';
      this.cursorPos = 0;
      this.hiddenInput.value = '';
      this.appendPromptLine();
      return;
    }

    if (this.animating) return;

    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      this.clearTerminal();
      this.appendPromptLine();
      return;
    }

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.executeCurrentInput();
        break;
      case 'Tab':
        e.preventDefault();
        this.tabComplete();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.historyUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.historyDown();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (this.cursorPos > 0) this.cursorPos--;
        this.renderCurrentLine();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (this.cursorPos < this.currentInput.length) this.cursorPos++;
        this.renderCurrentLine();
        break;
    }
  }

  private syncToHiddenInput(): void {
    this.hiddenInput.value = this.currentInput;
    this.hiddenInput.setSelectionRange(this.cursorPos, this.cursorPos);
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  private renderCurrentLine(): void {
    const line = this.getInputLineEl();
    if (!line) return;

    const before = esc(this.currentInput.slice(0, this.cursorPos));
    const cursorChar = this.cursorPos < this.currentInput.length ? esc(this.currentInput[this.cursorPos]) : ' ';
    const after = esc(this.currentInput.slice(this.cursorPos + 1));

    line.innerHTML =
      `<span class="terminal-prompt">${makePromptHtml(this.data.prompt, this.env.get('PWD'), this.env.get('HOME'))}</span>` +
      `<span class="terminal-cmd">${before}</span><span class="terminal-cursor">${cursorChar}</span><span class="terminal-cmd">${after}</span>`;

    scrollToBottom(this.body);
  }

  private getInputLineEl(): HTMLElement | null {
    return this.inputLineEl;
  }

  private appendPromptLine(): void {
    const div = document.createElement('div');
    div.className = 'terminal-input-line';
    div.setAttribute('aria-live', 'polite');
    this.body.appendChild(div);
    this.inputLineEl = div;
    this.currentInput = '';
    this.cursorPos = 0;
    this.historyIndex = -1;
    this.savedInput = '';
    this.hiddenInput.value = '';
    this.renderCurrentLine();
    scrollToBottom(this.body);
  }

  private appendToOutput(html: string): void {
    const div = document.createElement('div');
    div.className = 'terminal-output-line';
    div.innerHTML = html;
    const inputLine = this.getInputLineEl();
    if (inputLine) {
      this.body.insertBefore(div, inputLine);
    } else {
      this.body.appendChild(div);
    }
  }

  private appendOutputLines(lines: string[]): void {
    for (const line of lines) {
      this.appendToOutput(esc(line));
    }
  }

  // ─── Execution ───────────────────────────────────────────────────────────

  private executeCurrentInput(): void {
    const raw = this.currentInput.trim();

    if (this.firstCommand) {
      this.firstCommand = false;
      const hint = this.body.querySelector('.terminal-hint');
      if (hint) hint.remove();
    }

    const inputLine = this.getInputLineEl();
    if (inputLine) {
      inputLine.innerHTML =
        `<span class="terminal-prompt">${makePromptHtml(this.data.prompt, this.env.get('PWD'), this.env.get('HOME'))}</span>${esc(this.currentInput)}`;
      inputLine.classList.remove('terminal-input-line');
      inputLine.classList.add('terminal-output-line');
      inputLine.removeAttribute('aria-live');
    }
    this.inputLineEl = null;

    if (raw.length > 0) {
      if (this.history.length === 0 || this.history[this.history.length - 1] !== raw) {
        this.history.push(raw);
      }
    }

    if (raw.length > 0) {
      this.executeParsed(raw);
    }

    this.appendPromptLine();
  }

  private expandAliases(raw: string): string {
    // Split by operators, expand first word of each segment, rejoin
    // Handles: cmd1 && cmd2 ; cmd3 | cmd4
    return raw.replace(/(^|[;&|]\s*|&&\s*)(\S+)/g, (match, prefix, cmd) => {
      const alias = this.aliases.get(cmd);
      return alias ? prefix + alias : match;
    });
  }

  private executeParsed(raw: string): void {
    const expanded = this.expandAliases(raw);
    const parsed = parseLine(expanded, this.env.getAll());
    if ('error' in parsed) {
      this.renderResult({ error: parsed.error });
      return;
    }

    let prevFailed = false;
    for (const group of parsed.groups) {
      // && skips if previous group failed
      if (group.operator === '&&' && prevFailed) continue;
      // ; always executes (reset prevFailed tracking)

      const result = this.executePipeline(group.pipeline);
      prevFailed = result !== null && typeof result === 'object' && 'error' in result;
      this.renderResult(result);
    }
  }

  private executePipeline(pipeline: ParsedCommand[]): CommandResult {
    let stdin: string | undefined;
    let lastResult: CommandResult = null;

    for (let i = 0; i < pipeline.length; i++) {
      const stage = pipeline[i];
      const isLast = i === pipeline.length - 1;
      const ctx: CommandContext = {
        stdin,
        piped: !isLast,
        fs: this.fs,
        env: this.env,
      };

      const cmd = this.commands.get(stage.name.toLowerCase());
      if (!cmd) {
        lastResult = { error: `${stage.name}: command not found` };
      } else {
        lastResult = cmd.handler(stage.args, ctx);
      }

      if (!isLast) {
        // Convert result to plain text for piping
        stdin = this.resultToText(lastResult);
        // If error in mid-pipe, render it and pass empty string
        if (lastResult !== null && typeof lastResult === 'object' && 'error' in lastResult) {
          this.renderResult(lastResult);
          stdin = '';
        }
        lastResult = null; // Don't render intermediate results
      }
    }

    return lastResult;
  }

  private resultToText(result: CommandResult): string {
    if (result === null || result === undefined) return '';
    if (typeof result === 'string') return result;
    if (Array.isArray(result)) return result.join('\n');
    if ('error' in result) return '';
    if ('html' in result) {
      // Strip HTML tags for plain text piping
      const tmp = document.createElement('div');
      tmp.innerHTML = result.html;
      return tmp.textContent ?? '';
    }
    return '';
  }

  private renderResult(result: CommandResult): void {
    if (result === null || result === undefined) return;
    if (typeof result === 'string') {
      this.appendToOutput(esc(result));
    } else if (Array.isArray(result)) {
      this.appendOutputLines(result);
    } else if ('error' in result) {
      this.appendToOutput(`<span class="terminal-error">${esc(result.error)}</span>`);
    } else if ('html' in result) {
      this.appendRawHTML(result.html);
    }
  }

  private appendRawHTML(html: string): void {
    const div = document.createElement('div');
    div.className = 'terminal-output-line';
    div.innerHTML = html;
    const inputLine = this.getInputLineEl();
    if (inputLine) {
      this.body.insertBefore(div, inputLine);
    } else {
      this.body.appendChild(div);
    }
  }

  // ─── History ─────────────────────────────────────────────────────────────

  private historyUp(): void {
    if (this.history.length === 0) return;
    if (this.historyIndex === -1) {
      this.savedInput = this.currentInput;
      this.historyIndex = this.history.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    }
    this.currentInput = this.history[this.historyIndex];
    this.cursorPos = this.currentInput.length;
    this.syncToHiddenInput();
    this.renderCurrentLine();
  }

  private historyDown(): void {
    if (this.historyIndex === -1) return;
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.currentInput = this.history[this.historyIndex];
    } else {
      this.historyIndex = -1;
      this.currentInput = this.savedInput;
    }
    this.cursorPos = this.currentInput.length;
    this.syncToHiddenInput();
    this.renderCurrentLine();
  }

  // ─── Tab Completion ──────────────────────────────────────────────────────

  private tabComplete(): void {
    const input = this.currentInput;
    const spaceIdx = input.indexOf(' ');

    if (spaceIdx === -1) {
      const partial = input.toLowerCase();
      const cmdNames = new Set([...this.commands.keys(), ...this.aliases.keys()]);
      const matches = [...cmdNames].filter((k) => k.startsWith(partial));
      this.applyCompletion(matches, input, '');
    } else {
      const cmdName = input.slice(0, spaceIdx).toLowerCase();
      // Find the last non-flag token to complete
      const afterCmd = input.slice(spaceIdx + 1);
      const lastSpaceIdx = afterCmd.lastIndexOf(' ');
      const lastToken = lastSpaceIdx === -1 ? afterCmd : afterCmd.slice(lastSpaceIdx + 1);
      // Skip if the user is mid-flag (typing a dash)
      if (lastToken.startsWith('-')) return;
      const prefix = input.slice(0, input.length - lastToken.length);
      const candidates = this.getArgCandidates(cmdName, lastToken);
      this.applyCompletion(candidates, lastToken, prefix);
    }
  }

  private getArgCandidates(cmd: string, partial: string): string[] {
    const p = partial.toLowerCase();

    // Resolve alias to get the real command for completion context
    const alias = this.aliases.get(cmd);
    const resolved = alias ? alias.split(/\s+/)[0] : cmd;

    const dirCmds = ['cd', 'mkdir'];

    if (dirCmds.includes(resolved)) {
      return this.fs.completePath(partial, this.env.get('PWD'), this.env.get('HOME'), true);
    }

    if (resolved === 'open') {
      const routes = [
        'resume', 'contact', 'projects/',
        ...this.projectSlugs.map((s) => `projects/${s}`),
      ];
      return routes.filter((x) => x.toLowerCase().startsWith(p));
    }

    if (resolved === 'man' || resolved === 'help') {
      return Array.from(this.commands.keys()).filter((k) => k.startsWith(p));
    }

    if (resolved === 'sudo') {
      const subcmds = ['hire-me'];
      return subcmds.filter((s) => s.startsWith(p));
    }

    if (resolved === 'theme') {
      const options = ['dark', 'light', 'toggle'];
      return options.filter((x) => x.startsWith(p));
    }

    // Default: filesystem completion (files + dirs)
    return this.fs.completePath(partial, this.env.get('PWD'), this.env.get('HOME'), false);
  }

  private applyCompletion(matches: string[], partial: string, prefix: string): void {
    if (matches.length === 0) return;

    if (matches.length === 1) {
      this.currentInput = prefix + matches[0] + (matches[0].endsWith('/') ? '' : ' ');
      this.cursorPos = this.currentInput.length;
      this.syncToHiddenInput();
      this.renderCurrentLine();
    } else {
      let lcp = matches[0];
      for (const m of matches.slice(1)) {
        let i = 0;
        while (i < lcp.length && i < m.length && lcp[i].toLowerCase() === m[i].toLowerCase()) i++;
        lcp = lcp.slice(0, i);
      }

      if (lcp.length > partial.length) {
        this.currentInput = prefix + lcp;
        this.cursorPos = this.currentInput.length;
        this.syncToHiddenInput();
        this.renderCurrentLine();
        return;
      }

      const inputLine = this.getInputLineEl();
      if (inputLine) {
        inputLine.innerHTML =
          `<span class="terminal-prompt">${makePromptHtml(this.data.prompt, this.env.get('PWD'), this.env.get('HOME'))}</span>${esc(this.currentInput)}`;
        inputLine.classList.remove('terminal-input-line');
        inputLine.classList.add('terminal-output-line');
        inputLine.removeAttribute('aria-live');
      }
      this.inputLineEl = null;
      this.appendToOutput(esc(matches.join('  ')));
      this.appendPromptLine();
      this.currentInput = prefix + lcp;
      this.cursorPos = this.currentInput.length;
      this.syncToHiddenInput();
      this.renderCurrentLine();
    }
  }

  // ─── Clear ───────────────────────────────────────────────────────────────

  private clearTerminal(): void {
    const children = Array.from(this.body.children);
    for (const child of children) {
      if (child !== this.hiddenInput) child.remove();
    }
    this.inputLineEl = null;
    updateTitleDimensions(this.data.prompt, this.body);
  }

  // ─── Unknown command ─────────────────────────────────────────────────────

  private unknownCommand(cmd: string): { error: string } {
    const responses = [
      `${cmd}: command not found. Nice try.`,
      `${cmd}: command not found. Have you tried 'help'?`,
      `${cmd}: command not found. That's not in my repertoire... yet.`,
      `bash: ${cmd}: No such file or directory`,
      `${cmd}: command not found. 404 in terminal form.`,
      `${cmd}: permission denied (just kidding — it doesn't exist)`,
    ];
    return { error: responses[Math.floor(Math.random() * responses.length)] };
  }

  // ─── Commands ────────────────────────────────────────────────────────────

  private registerCommands(): void {
    const d = this.data;
    const s = d.site;

    this.commands.set('help', {
      description: 'List available commands',
      handler: (args) => {
        if (args.length > 0) {
          return this.manPage(args[0]);
        }
        return this.helpOutput();
      },
    });

    this.commands.set('clear', {
      description: 'Clear terminal',
      handler: () => {
        this.clearTerminal();
        return null;
      },
    });

    this.commands.set('ls', {
      description: 'List directory contents',
      handler: (args, ctx) => {
        const flags = args.filter((a) => a.startsWith('-')).join('');
        const showAll = flags.includes('a');
        const showLong = flags.includes('l');
        const target = args.find((a) => !a.startsWith('-')) || '.';
        const absPath = ctx.fs.resolvePath(target, ctx.env.get('PWD'), ctx.env.get('HOME'));
        const entries = ctx.fs.listDir(absPath);
        if ('error' in entries) return entries;
        let filtered = showAll ? entries : entries.filter((e) => !e.name.startsWith('.'));
        if (filtered.length === 0) return null;
        if (showLong) {
          const lines = filtered.map((e) => {
            const perm = e.isDir ? 'drwxr-xr-x' : '-rw-r--r--';
            const name = e.isDir
              ? `<span class="terminal-accent">${esc(e.name)}/</span>`
              : esc(e.name);
            return `<div>${esc(perm)}  ezra ezra  ${name}</div>`;
          });
          return { html: lines.join('') };
        }
        const formatted = filtered.map((e) =>
          e.isDir ? `<span class="terminal-accent">${esc(e.name)}/</span>` : esc(e.name)
        );
        return { html: formatted.join('  ') };
      },
    });

    this.commands.set('cd', {
      description: 'Change directory',
      handler: (args, ctx) => {
        const target = args[0] || '~';
        const absPath = ctx.fs.resolvePath(target, ctx.env.get('PWD'), ctx.env.get('HOME'));
        if (!ctx.fs.isDir(absPath)) {
          return { error: `cd: ${target}: No such directory` };
        }
        ctx.env.set('PWD', absPath);
        // Hint for navigable routes
        const home = ctx.env.get('HOME');
        const rel = absPath.startsWith(home + '/') ? absPath.slice(home.length + 1) : null;
        const navigable = ['resume', 'projects'];
        if (rel && navigable.some((r) => rel === r || rel.startsWith(r + '/'))) {
          return `Changed directory to ${absPath.startsWith(home) ? '~' + absPath.slice(home.length) : absPath}. Use 'open ${rel}' to navigate in browser.`;
        }
        return null;
      },
    });

    this.commands.set('open', {
      description: 'Open page in browser',
      handler: (args) => {
        const path = args[0];
        if (!path || path === '~' || path === '/') {
          setTimeout(() => { window.location.href = '/'; }, 300);
          return 'Navigating to /...';
        }
        // URLs
        if (path.startsWith('http://') || path.startsWith('https://')) {
          window.open(path, '_blank');
          return `Opening ${path}...`;
        }
        // Named routes
        const routes: Record<string, string> = { resume: '/resume', contact: '/contact', projects: '/projects' };
        if (routes[path]) {
          setTimeout(() => { window.location.href = routes[path]; }, 300);
          return `Navigating to ${routes[path]}...`;
        }
        if (path.startsWith('projects/')) {
          const slug = path.slice('projects/'.length);
          const idx = this.projectSlugs.indexOf(slug.toLowerCase());
          if (idx !== -1) {
            const proj = this.data.projects[idx];
            const target = proj.link || `/projects/${slug}`;
            setTimeout(() => { window.location.href = target; }, 300);
            return `Navigating to ${target}...`;
          }
          return { error: `open: ${path}: No such page` };
        }
        return { error: `open: ${path}: cannot open — not a web page` };
      },
    });

    this.commands.set('pwd', {
      description: 'Print working directory',
      handler: (_args, ctx) => ctx.env.get('PWD'),
    });

    this.commands.set('whoami', {
      description: 'Print current user',
      handler: (_args, ctx) => ctx.env.get('USER'),
    });

    this.commands.set('hostname', {
      description: 'Print hostname',
      handler: (args, ctx) => {
        if (args.includes('-f')) return ctx.env.get('HOSTNAME') + '.dev';
        return ctx.env.get('HOSTNAME');
      },
    });

    this.commands.set('cat', {
      description: 'Display file contents',
      handler: (args, ctx) => {
        // stdin passthrough: cat with no args but stdin
        if (args.length === 0) {
          if (ctx.stdin !== undefined) return ctx.stdin;
          return 'usage: cat <file>';
        }
        const absPath = ctx.fs.resolvePath(args[0], ctx.env.get('PWD'), ctx.env.get('HOME'));
        const content = ctx.fs.readFile(absPath);
        if (typeof content === 'object' && 'error' in content) return content;
        // Handle sentinels
        return this.resolveSentinel(content, ctx.piped);
      },
    });

    this.commands.set('uptime', {
      description: 'Show system uptime',
      handler: (args) => {
        const up = this.uptimeString();
        if (args.includes('-p')) return `up ${up}`;
        return `up ${up}, load average: 0.42, 0.38, 0.35`;
      },
    });

    this.commands.set('echo', {
      description: 'Print text to terminal',
      handler: (args) => args.join(' '),
    });

    this.commands.set('neofetch', {
      description: 'System info with ASCII art',
      handler: () => ({ html: this.neofetchOutput() }),
    });

    this.commands.set('date', {
      description: 'Print current date/time',
      handler: () => new Date().toString(),
    });

    this.commands.set('uname', {
      description: 'Print system information',
      handler: (args) => {
        if (args.includes('-a')) return 'hulsman.dev 6.0-portfolio aarch64 Astro/5.16';
        return 'hulsman.dev';
      },
    });

    this.commands.set('history', {
      description: 'Show command history',
      handler: () => {
        if (this.history.length === 0) return 'No history yet.';
        return this.history.map((h, i) => `  ${String(i + 1).padStart(4)}  ${h}`);
      },
    });

    this.commands.set('man', {
      description: 'Show manual for a command',
      handler: (args) => {
        if (args.length === 0) return 'What manual page do you want?';
        return this.manPage(args[0]);
      },
    });

    this.commands.set('exit', {
      description: 'Exit terminal',
      handler: () => "There is no escape. Just kidding \u2014 scroll up!",
    });

    this.commands.set('logout', {
      description: 'Logout from terminal',
      handler: () => "There is no escape. Just kidding \u2014 scroll up!",
    });

    this.commands.set('nvim', {
      description: 'Neovim editor',
      handler: (args) => args.length === 0
        ? 'nvim: this terminal is too cool for a text editor'
        : `nvim: cannot open '${args[0]}' — read-only portfolio (try cat instead)`,
    });

    this.commands.set('vim', {
      description: 'Vi IMproved',
      handler: () => 'You meant nvim, right? (aliased)',
    });

    this.commands.set('nano', {
      description: 'Nano editor',
      handler: () => '...really? On this machine we use nvim.',
    });

    this.commands.set('python3', {
      description: 'Python interpreter',
      handler: () => "Python 3.12.0 — but there's no REPL here. Try echo instead.",
    });

    this.commands.set('git', {
      description: 'Version control',
      handler: (args) => {
        if (args[0] === 'status') return 'On branch main\nnothing to commit, portfolio is clean';
        if (args[0] === 'log') return 'Too many commits to count. Check GitHub instead.';
        return `git: '${args[0] || ''}' is not a git command. Try 'open' to visit GitHub.`;
      },
    });

    this.commands.set('docker', {
      description: 'Container runtime',
      handler: () => 'Cannot connect to the Docker daemon. This is a browser, not a server.',
    });

    this.commands.set('sudo', {
      description: 'Execute with elevated privileges',
      handler: (args) => {
        const subCmd = args.join(' ');
        if (subCmd === 'hire-me') {
          return { html: this.sudoHireMe() };
        }
        return `sudo: ${subCmd || '???'}: command not found`;
      },
    });

    this.commands.set('cowsay', {
      description: 'Have a cow say something',
      handler: (args) => {
        const text = args.join(' ') || 'moo';
        return { html: `<pre style="line-height:1.2">${esc(this.cowsayText(text))}</pre>` };
      },
    });

    this.commands.set('fortune', {
      description: 'Print a random dev quote',
      handler: () => this.fortuneQuote(),
    });

    this.commands.set('sl', {
      description: 'Steam locomotive',
      handler: () => {
        this.runTrainAnimation();
        return null;
      },
    });

    this.commands.set('matrix', {
      description: 'Enter the matrix',
      handler: () => {
        this.runMatrixAnimation();
        return null;
      },
    });

    // ─── New commands ───────────────────────────────────────────────────

    this.commands.set('grep', {
      description: 'Pattern match lines',
      handler: (args, ctx) => {
        const pattern = args[0];
        if (!pattern) return { error: 'usage: grep <pattern> [file]' };
        let text: string;
        if (args.length > 1) {
          const absPath = ctx.fs.resolvePath(args[1], ctx.env.get('PWD'), ctx.env.get('HOME'));
          const content = ctx.fs.readFile(absPath);
          if (typeof content === 'object' && 'error' in content) return content;
          const resolved = this.resolveSentinel(content, true);
          text = typeof resolved === 'string' ? resolved : '';
        } else if (ctx.stdin !== undefined) {
          text = ctx.stdin;
        } else {
          return { error: 'usage: grep <pattern> [file]' };
        }
        const caseInsensitive = args.includes('-i');
        const re = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseInsensitive ? 'i' : '');
        const matches = text.split('\n').filter((line) => re.test(line));
        return matches.length > 0 ? matches.join('\n') : null;
      },
    });

    this.commands.set('tr', {
      description: 'Translate characters',
      handler: (args, ctx) => {
        if (args.length < 2 || ctx.stdin === undefined) return { error: 'usage: tr <from> <to> (reads stdin)' };
        const from = args[0];
        const to = args[1];
        let result = ctx.stdin;
        for (let i = 0; i < from.length; i++) {
          const replacement = i < to.length ? to[i] : to[to.length - 1];
          result = result.split(from[i]).join(replacement);
        }
        return result;
      },
    });

    this.commands.set('head', {
      description: 'Show first N lines',
      handler: (args, ctx) => {
        let n = 10;
        let text: string | undefined;
        const nIdx = args.indexOf('-n');
        if (nIdx !== -1 && args[nIdx + 1]) {
          n = parseInt(args[nIdx + 1], 10) || 10;
          args = args.filter((_, i) => i !== nIdx && i !== nIdx + 1);
        }
        if (args.length > 0) {
          const absPath = ctx.fs.resolvePath(args[0], ctx.env.get('PWD'), ctx.env.get('HOME'));
          const content = ctx.fs.readFile(absPath);
          if (typeof content === 'object' && 'error' in content) return content;
          const resolved = this.resolveSentinel(content, true);
          text = typeof resolved === 'string' ? resolved : '';
        } else if (ctx.stdin !== undefined) {
          text = ctx.stdin;
        } else {
          return { error: 'usage: head [-n N] [file]' };
        }
        return text.split('\n').slice(0, n).join('\n');
      },
    });

    this.commands.set('tail', {
      description: 'Show last N lines',
      handler: (args, ctx) => {
        let n = 10;
        let text: string | undefined;
        const nIdx = args.indexOf('-n');
        if (nIdx !== -1 && args[nIdx + 1]) {
          n = parseInt(args[nIdx + 1], 10) || 10;
          args = args.filter((_, i) => i !== nIdx && i !== nIdx + 1);
        }
        if (args.length > 0) {
          const absPath = ctx.fs.resolvePath(args[0], ctx.env.get('PWD'), ctx.env.get('HOME'));
          const content = ctx.fs.readFile(absPath);
          if (typeof content === 'object' && 'error' in content) return content;
          const resolved = this.resolveSentinel(content, true);
          text = typeof resolved === 'string' ? resolved : '';
        } else if (ctx.stdin !== undefined) {
          text = ctx.stdin;
        } else {
          return { error: 'usage: tail [-n N] [file]' };
        }
        const lines = text.split('\n');
        return lines.slice(-n).join('\n');
      },
    });

    this.commands.set('wc', {
      description: 'Count lines, words, chars',
      handler: (args, ctx) => {
        let text: string;
        if (args.length > 0 && !args[0].startsWith('-')) {
          const absPath = ctx.fs.resolvePath(args[0], ctx.env.get('PWD'), ctx.env.get('HOME'));
          const content = ctx.fs.readFile(absPath);
          if (typeof content === 'object' && 'error' in content) return content;
          const resolved = this.resolveSentinel(content, true);
          text = typeof resolved === 'string' ? resolved : '';
        } else if (ctx.stdin !== undefined) {
          text = ctx.stdin;
        } else {
          return { error: 'usage: wc [file]' };
        }
        const lines = text.split('\n').length;
        const words = text.split(/\s+/).filter(Boolean).length;
        const chars = text.length;
        if (args.includes('-l')) return `${lines}`;
        if (args.includes('-w')) return `${words}`;
        if (args.includes('-c')) return `${chars}`;
        return `  ${lines}  ${words}  ${chars}`;
      },
    });

    this.commands.set('sort', {
      description: 'Sort lines',
      handler: (args, ctx) => {
        let text: string;
        if (args.length > 0 && !args[0].startsWith('-')) {
          const absPath = ctx.fs.resolvePath(args[0], ctx.env.get('PWD'), ctx.env.get('HOME'));
          const content = ctx.fs.readFile(absPath);
          if (typeof content === 'object' && 'error' in content) return content;
          const resolved = this.resolveSentinel(content, true);
          text = typeof resolved === 'string' ? resolved : '';
        } else if (ctx.stdin !== undefined) {
          text = ctx.stdin;
        } else {
          return { error: 'usage: sort [file]' };
        }
        const lines = text.split('\n');
        lines.sort();
        if (args.includes('-r')) lines.reverse();
        return lines.join('\n');
      },
    });

    this.commands.set('env', {
      description: 'Print environment variables',
      handler: (_args, ctx) => {
        return ctx.env.entries().map(([k, v]) => `${k}=${v}`);
      },
    });

    this.commands.set('export', {
      description: 'Set environment variable',
      handler: (args, ctx) => {
        if (args.length === 0) return ctx.env.entries().map(([k, v]) => `${k}=${v}`);
        const match = args[0].match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (!match) return { error: `export: invalid identifier: ${args[0]}` };
        const err = ctx.env.set(match[1], match[2]);
        if (err) return { error: err };
        return null;
      },
    });

    this.commands.set('alias', {
      description: 'List or set aliases',
      handler: (args) => {
        if (args.length === 0) {
          if (this.aliases.size === 0) return 'No aliases defined.';
          return [...this.aliases.entries()].map(([k, v]) => `${k}='${v}'`);
        }
        const m = args[0].match(/^([A-Za-z0-9._-]+)=(.+)$/);
        if (!m) return { error: `usage: alias name='command'` };
        this.aliases.set(m[1], m[2].replace(/^['"]|['"]$/g, ''));
        return null;
      },
    });

    this.commands.set('source', {
      description: 'Reload shell config',
      handler: (args, ctx) => {
        const target = args[0] || '~/.zshrc';
        const absPath = ctx.fs.resolvePath(target, ctx.env.get('PWD'), ctx.env.get('HOME'));
        const content = ctx.fs.readFile(absPath);
        if (typeof content === 'object' && 'error' in content) return content;
        this.loadAliases();
        return `Reloaded ${target}`;
      },
    });

    this.commands.set('touch', {
      description: 'Create file',
      handler: (args, ctx) => {
        if (args.length === 0) return { error: 'usage: touch <file>' };
        const absPath = ctx.fs.resolvePath(args[0], ctx.env.get('PWD'), ctx.env.get('HOME'));
        const err = ctx.fs.writeFile(absPath, '');
        if (err) return { error: err };
        return null;
      },
    });

    this.commands.set('mkdir', {
      description: 'Create directory',
      handler: (args, ctx) => {
        if (args.length === 0) return { error: 'usage: mkdir <dir>' };
        const absPath = ctx.fs.resolvePath(args[0], ctx.env.get('PWD'), ctx.env.get('HOME'));
        const err = ctx.fs.mkdir(absPath);
        if (err) return { error: err };
        return null;
      },
    });

    this.commands.set('theme', {
      description: 'Switch theme (dark/light/toggle)',
      handler: (args: string[], ctx: CommandContext) => {
        const current = getCurrentTheme();

        if (args.length === 0) {
          return `Current theme: ${current}`;
        }

        const target = args[0].toLowerCase();
        if (target === 'toggle') {
          const next = current === 'dark' ? 'light' : 'dark';
          setTheme(next);
          return `Switched to ${next} theme`;
        }
        if (target === 'dark' || target === 'light') {
          if (target === current) return `Already using ${current} theme`;
          setTheme(target as 'dark' | 'light');
          return `Switched to ${target} theme`;
        }

        return { error: `Unknown theme: ${target}. Usage: theme [dark|light|toggle]` };
      },
    });
  }

  // ─── Sentinel resolver ────────────────────────────────────────────────────

  private resolveSentinel(content: string, piped: boolean): CommandResult {
    if (content === SENTINEL_EXPERIENCE) return piped ? this.experienceText() : this.formatExperience();
    if (content === SENTINEL_SKILLS) return piped ? this.skillsText() : this.formatSkills();
    if (content === SENTINEL_EDUCATION) return piped ? this.educationText() : this.formatEducation();
    if (content === SENTINEL_CERTS) return piped ? this.certsText() : this.formatCerts();
    if (content.startsWith(SENTINEL_PROJECT_PREFIX)) {
      const idx = parseInt(content.slice(SENTINEL_PROJECT_PREFIX.length).replace(/__$/, ''), 10);
      if (!isNaN(idx) && idx < this.data.projects.length) {
        return piped ? this.projectText(this.data.projects[idx]) : this.formatProject(this.data.projects[idx]);
      }
    }
    return content;
  }

  // ─── Content formatters (HTML) ──────────────────────────────────────────

  private formatExperience(): { html: string } {
    const divs = this.data.experience.map((exp) => {
      const period = exp.endDate ? `${exp.startDate}\u2013${exp.endDate}` : `${exp.startDate}\u2013present`;
      return `<div><span class="terminal-accent">${esc(exp.role)}</span> @ ${esc(exp.client)} <span class="terminal-dim">(${period})</span></div><div>  ${esc(exp.summary)}</div><div>&nbsp;</div>`;
    });
    return { html: divs.join('') };
  }

  private formatSkills(): { html: string } {
    const divs = this.data.skills.map((cat) =>
      `<div><span class="terminal-accent">${esc(cat.label)}</span>: ${esc(cat.items.join(', '))}</div>`
    );
    return { html: divs.join('') };
  }

  private formatEducation(): { html: string } {
    const divs = this.data.education.map((edu) => {
      const period = `${edu.startYear}\u2013${edu.endYear}`;
      const extra = [edu.result, edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join(', ');
      let html = `<div><span class="terminal-accent">${esc(edu.degree)}</span> @ ${esc(edu.institution)} <span class="terminal-dim">(${period})</span></div>`;
      if (extra) html += `<div>  ${esc(extra)}</div>`;
      html += `<div>&nbsp;</div>`;
      return html;
    });
    return { html: divs.join('') };
  }

  private formatCerts(): { html: string } {
    const divs = this.data.certifications.map((c) =>
      `<div><span class="terminal-accent">${esc(c.name)}</span> \u2014 ${esc(c.institution)} (${c.year})` +
      (c.credential ? ` <span class="terminal-dim">[${esc(c.credential)}]</span>` : '') + `</div>`
    );
    return { html: divs.join('') };
  }

  private formatProject(p: TerminalProject): { html: string } {
    const divs = [
      `<div><span class="terminal-accent">${esc(p.title)}</span></div>`,
      `<div>${esc(p.description)}</div>`,
      `<div>Tech: ${esc(p.tech.join(', '))}</div>`,
    ];
    if (p.github) divs.push(`<div>GitHub: ${esc(p.github)}</div>`);
    if (p.link) divs.push(`<div>Link: ${esc(p.link)}</div>`);
    return { html: divs.join('') };
  }

  // ─── Content formatters (plain text for pipes) ──────────────────────────

  private experienceText(): string {
    return this.data.experience.map((exp) => {
      const period = exp.endDate ? `${exp.startDate}\u2013${exp.endDate}` : `${exp.startDate}\u2013present`;
      return `${exp.role} @ ${exp.client} (${period})\n  ${exp.summary}`;
    }).join('\n\n');
  }

  private skillsText(): string {
    return this.data.skills.map((cat) => `${cat.label}: ${cat.items.join(', ')}`).join('\n');
  }

  private educationText(): string {
    return this.data.education.map((edu) => {
      const period = `${edu.startYear}\u2013${edu.endYear}`;
      const extra = [edu.result, edu.gpa ? `GPA: ${edu.gpa}` : ''].filter(Boolean).join(', ');
      let line = `${edu.degree} @ ${edu.institution} (${period})`;
      if (extra) line += `\n  ${extra}`;
      return line;
    }).join('\n\n');
  }

  private certsText(): string {
    return this.data.certifications.map((c) => {
      let line = `${c.name} \u2014 ${c.institution} (${c.year})`;
      if (c.credential) line += ` [${c.credential}]`;
      return line;
    }).join('\n');
  }

  private projectText(p: TerminalProject): string {
    const lines = [p.title, p.description, `Tech: ${p.tech.join(', ')}`];
    if (p.github) lines.push(`GitHub: ${p.github}`);
    if (p.link) lines.push(`Link: ${p.link}`);
    return lines.join('\n');
  }

  // ─── Help ────────────────────────────────────────────────────────────────

  private helpOutput(): { html: string } {
    const sections: [string, string[]][] = [
      ['Navigation', ['help', 'clear', 'ls', 'cd', 'pwd', 'open', 'theme']],
      ['Environment', ['env', 'export', 'echo', 'alias', 'source']],
      ['Files', ['cat', 'head', 'tail', 'wc', 'sort', 'grep', 'tr', 'touch', 'mkdir']],
      ['Info', ['whoami', 'hostname', 'uptime', 'neofetch', 'date', 'uname']],
      ['Meta', ['history', 'man', 'exit']],
    ];

    const divs: string[] = [];
    divs.push(`<div>Welcome to the interactive terminal. This is a real shell with pipes, variables, and a virtual filesystem. Not all commands are listed here \u2014 some are for you to find. Have fun!</div>`);
    for (const [section, cmds] of sections) {
      divs.push(`<div>&nbsp;</div>`);
      divs.push(`<div><span class="terminal-accent">${esc(section)}</span></div>`);
      for (const cmd of cmds) {
        const baseName = cmd.split(' ')[0];
        const command = this.commands.get(baseName);
        const desc = command ? command.description : '';
        divs.push(`<div>  <span class="terminal-cmd">${esc(cmd.padEnd(24))}</span><span class="terminal-dim">${esc(desc)}</span></div>`);
      }
    }
    divs.push(`<div>&nbsp;</div>`);
    divs.push(`<div><span class="terminal-dim">Tab to auto-complete \u2022 \u2191/\u2193 for history \u2022 Ctrl+C to cancel \u2022 Esc to unfocus</span></div>`);
    return { html: divs.join('') };
  }

  private manPage(cmd: string): CommandResult {
    const command = this.commands.get(cmd.toLowerCase());
    if (!command) return `No manual entry for ${cmd}`;
    return `${cmd} \u2014 ${command.description}`;
  }

  // ─── Uptime helper ──────────────────────────────────────────────────────

  private uptimeString(): string {
    const start = new Date(this.data.site.careerStart || '2023-09-01');
    const days = Math.floor((Date.now() - start.getTime()) / 86400000);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    const rem = days - years * 365 - months * 30;
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (rem > 0) parts.push(`${rem} day${rem !== 1 ? 's' : ''}`);
    return parts.join(', ') + ', 0 unplanned restarts';
  }

  // ─── neofetch ────────────────────────────────────────────────────────────

  private neofetchOutput(): string {
    const s = this.data.site;
    const artOptions: string[][] = [
      [ // Original EH circle
        "",
        "     .---.      ",
        "    /     \\     ",
        "   |  E H  |    ",
        "    \\     /     ",
        "  ___'---'___   ",
        " /           \\  ",
        "|             | ",
        " \\___________/  ",
      ],
      [ // Bible - credits to Joan G. Stark for the art
        "",
        "",
        "      _______  ",
        "     /       /_",
        "    /  -/-  / /",
        "   /   /   / / ",
        "  /_______/ /  ",
        " ((______| /   ",
        "  `\"\"\"\"\"\"\"`     ",
      ],
      [ // Server rack
        "",
        "  .------------.",
        ".------------./|",
        "| [==] o o o | |",
        "| [==] o o o | |",
        "|------------| |",
        "| [====] o o | |",
        "| [====] o o | |",
        "|------------| |",
        "'------------'/ ",
      ],
      [ // Arch logo for the fun of it
        "",
        "       .        ",
        "      / \\      ",
        "     /   \\     ",
        "    /^.   \\    ",
        "   /  .-.  \\   ",
        "  /  (   ) _\\  ",
        " / _.~   ~._^\\ ",
        "/.^         ^.\\",
      ],
      [ // Windmill (Dutch) - credits to Philipp Schwartz for the art
        "",
        "     /\\     /\\       ",
        "    '. \\   / ,'      ",
        "      `.\\-/,'        ",
        "       ( X   )       ",
        "       ,'/ \\`.\\      ",
        "    .' /   \\ `,      ",
        "     \\/-----\\/'.     ",
        "______ |_H___|PhS____",
      ],
      [ // Docker whale
        "",
        "              ##        .     ",
        "        ## ## ##       ==     ",
        "     ## ## ## ##      ===     ",
        " /\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\\___/ ===   ",
        "{~~ ~~~~ ~~~ ~~~~ ~~ ~ /  ===-",
        " \\______ o          __/      ",
        "   \\    \\        __/         ",
        "    \\____\\______/            ",
      ],
    ];
    const rawArt = artOptions[Math.floor(Math.random() * artOptions.length)];
    const artWidth = Math.max(...rawArt.map((l) => l.length));
    // Pad art to match info length for side-by-side alignment
    const art = rawArt.map((l) => l.padEnd(artWidth));
    while (art.length < 12) art.push(' '.repeat(artWidth));
    const uptime = this.uptimeString().replace(', 0 unplanned restarts', '');
    const info = [
      `<span class="terminal-accent">${esc(this.data.prompt)}</span>`,
      '<span class="terminal-dim">\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</span>',
      `<span class="terminal-accent">OS:</span> hulsman.dev 6.0-portfolio`,
      `<span class="terminal-accent">Uptime:</span> ${esc(uptime)}`,
      `<span class="terminal-accent">Shell:</span> zsh 5.9`,
      `<span class="terminal-accent">Terminal:</span> Alacritty / Kitty`,
      `<span class="terminal-accent">CPU:</span> ENH Ryzen\u2122 9 2000X @ 2.00 GHz`,
      `<span class="terminal-accent">GPU:</span> CaffeineForce RTX 4070 Ti`,
      `<span class="terminal-accent">Role:</span> ${esc(s.role)}`,
      `<span class="terminal-accent">Company:</span> ${esc(s.company)}`,
      `<span class="terminal-accent">Location:</span> ${esc(s.location)}`,
      `<span class="terminal-accent">Contact:</span> ${esc(s.social.email)}`,
    ];

    // Calculate if side-by-side fits: art + gap + longest info line
    const cw = measureCharWidth(this.body);
    const cols = Math.floor(this.body.clientWidth / cw);
    const maxInfoLen = Math.max(...info.map((l) => l.replace(/<[^>]*>/g, '').length));

    if (cols >= artWidth + 3 + maxInfoLen) {
      // Wide: side-by-side
      const lines = art.map((artLine, i) => {
        const infoLine = i < info.length ? info[i] : '';
        return `${esc(artLine)}   ${infoLine}`;
      });
      return `<div style="line-height:1.2;white-space:pre;font-family:inherit">${lines.join('\n')}</div>`;
    }

    // Narrow: stacked layout
    const artHtml = `<div style="line-height:1.2;white-space:pre;font-family:inherit">${art.map((l) => esc(l)).join('\n')}</div>`;
    const infoHtml = info.map((l) => `<div>${l}</div>`).join('');
    return artHtml + infoHtml;
  }

  // ─── sudo hire-me ────────────────────────────────────────────────────────

  private sudoHireMe(): string {
    const s = this.data.site;
    const status = typeof s.employment.message === 'string'
      ? s.employment.message
      : (s.employment.message as Record<string, string>)[s.employment.status] || 'Open to connect';
    const email = s.social.email;
    const github = s.social.GitHub.replace('https://', '');
    return [
      '<div><span class="terminal-dim">[sudo] password for visitor: ********</span></div>',
      '<div><span class="terminal-accent">Access granted.</span></div>',
      '<div>&nbsp;</div>',
      `<div><span class="terminal-accent">STATUS:</span> ${esc(status)}</div>`,
      `<div><span class="terminal-accent">EMAIL:</span>  ${esc(email)}</div>`,
      `<div><span class="terminal-accent">GITHUB:</span> ${esc(github)}</div>`,
      '<div>&nbsp;</div>',
      "<div>Seriously though, let's talk! \ud83e\udd1d</div>",
    ].join('');
  }

  // ─── cowsay ──────────────────────────────────────────────────────────────

  private cowsayText(text: string): string {
    const MAX = 40;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
      if (word.length > MAX) {
        if (line) { lines.push(line); line = ''; }
        for (let i = 0; i < word.length; i += MAX) {
          lines.push(word.slice(i, i + MAX));
        }
        continue;
      }
      if (line.length + (line ? 1 : 0) + word.length > MAX) {
        lines.push(line);
        line = word;
      } else {
        line = line ? line + ' ' + word : word;
      }
    }
    if (line) lines.push(line);

    const width = Math.max(...lines.map((l) => l.length));
    const top = ' ' + '_'.repeat(width + 2);
    const bot = ' ' + '-'.repeat(width + 2);

    let bubble: string;
    if (lines.length === 1) {
      bubble = `${top}\n< ${lines[0].padEnd(width)} >\n${bot}`;
    } else {
      const mid = lines.map((l, i) => {
        const pad = l.padEnd(width);
        if (i === 0) return `/ ${pad} \\`;
        if (i === lines.length - 1) return `\\ ${pad} /`;
        return `| ${pad} |`;
      });
      bubble = `${top}\n${mid.join('\n')}\n${bot}`;
    }

    const cow = [
      '        \\   ^__^',
      '         \\  (oo)\\_______',
      '            (__)\\       )\\/\\',
      '                ||----w |',
      '                ||     ||',
    ].join('\n');

    return `${bubble}\n${cow}`;
  }

  // ─── fortune ─────────────────────────────────────────────────────────────

  private fortuneQuote(): string {
    const quotes = [
      '"Any sufficiently advanced technology is indistinguishable from magic." — Arthur C. Clarke',
      '"There are only two hard things in CS: cache invalidation and naming things." — Phil Karlton',
      '"It works on my machine." — Every developer ever',
      '"The best code is no code at all." — Jeff Atwood',
      '"First, solve the problem. Then, write the code." — John Johnson',
      '"Talk is cheap. Show me the code." — Linus Torvalds',
      '"Premature optimization is the root of all evil." — Donald Knuth',
      '"Weeks of coding can save you hours of planning." — Unknown',
      '"A good programmer looks both ways before crossing a one-way street." — Unknown',
      '"In theory, theory and practice are the same. In practice, they are not." — Albert Einstein',
      '"chmod 777 fixes everything." — A sysadmin who has given up',
      '"It\'s not a bug, it\'s a feature." — Every PM ever',
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  // ─── sl (steam locomotive) ───────────────────────────────────────────────

  private runTrainAnimation(): void {
    this.animating = true;
    this.body.setAttribute('aria-busy', 'true');

    const train = [
      '    ====        ________',
      '---/    \\------|________|',
      '  O      O    OO      OO',
      ' ~~~~~~~~~~~~~~~~~~~~~~~~',
    ];
    const trainWidth = Math.max(...train.map((l) => l.length));
    const charWidth = measureCharWidth(this.body);
    const containerWidth = Math.floor(this.body.clientWidth / charWidth);
    let pos = -trainWidth;

    const container = document.createElement('div');
    container.className = 'terminal-animation';
    container.style.whiteSpace = 'pre';
    container.style.lineHeight = '1.2';
    container.style.overflow = 'visible';
    container.style.fontFamily = 'inherit';
    const inputLine = this.getInputLineEl();
    if (inputLine) inputLine.style.display = 'none';
    this.body.appendChild(container);
    scrollToBottom(this.body);

    const interval = setInterval(() => {
      pos += 2;
      if (pos > containerWidth) {
        clearInterval(interval);
        finish();
        return;
      }
      const padding = Math.max(0, pos);
      const frame = train.map((line) => {
        const shifted = ' '.repeat(padding) + line;
        return esc(shifted.slice(0, containerWidth));
      }).join('\n');
      container.innerHTML = frame;
      scrollToBottom(this.body);
    }, 50);

    const finish = () => {
      clearInterval(interval);
      container.remove();
      if (inputLine) inputLine.style.display = '';
      this.animating = false;
      this.animationCleanup = null;
      this.body.removeAttribute('aria-busy');
      this.renderCurrentLine();
    };

    this.animationCleanup = finish;
  }

  // ─── matrix ──────────────────────────────────────────────────────────────

  private runMatrixAnimation(): void {
    this.animating = true;
    this.body.setAttribute('aria-busy', 'true');

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*';
    const cw = measureCharWidth(this.body);
    const cols = Math.floor(this.body.clientWidth / cw);
    const rows = Math.floor(this.body.clientHeight / (cw * 1.6));

    const container = document.createElement('div');
    container.className = 'terminal-animation terminal-matrix';
    container.style.whiteSpace = 'pre';
    container.style.lineHeight = '1.2';
    container.style.fontFamily = 'inherit';
    container.style.color = '#0f0';
    container.style.overflow = 'hidden';

    const existing = Array.from(this.body.children).filter((c) => c !== this.hiddenInput);
    for (const el of existing) (el as HTMLElement).style.display = 'none';
    this.body.appendChild(container);

    const interval = setInterval(() => {
      const frame: string[] = [];
      for (let r = 0; r < rows; r++) {
        let row = '';
        for (let c = 0; c < cols; c++) {
          row += Math.random() > 0.7 ? chars[Math.floor(Math.random() * chars.length)] : ' ';
        }
        frame.push(row);
      }
      container.textContent = frame.join('\n');
    }, 80);

    const endTimer = setTimeout(() => finish(), 3000);

    const finish = () => {
      clearInterval(interval);
      clearTimeout(endTimer);
      container.remove();
      for (const el of existing) (el as HTMLElement).style.display = '';
      this.clearTerminal();
      this.appendPromptLine();
      this.animating = false;
      this.animationCleanup = null;
      this.body.removeAttribute('aria-busy');
    };

    this.animationCleanup = finish;
  }
}
