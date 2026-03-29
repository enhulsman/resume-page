// Interactive Terminal — powers the portfolio terminal after typing animation
// Vanilla TypeScript, no framework dependencies. Imported by Astro <script>.

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

type CommandResult = string | string[] | { html: string } | null;

interface Command {
  handler: (args: string[], rawInput: string) => CommandResult;
  description: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

  constructor(body: HTMLElement, data: TerminalData) {
    this.body = body;
    this.data = data;
    this.projectSlugs = data.projects.map((p) => slugify(p.title));
    this.registerCommands();
    this.createHiddenInput();
    this.bindEvents();
    // Set title bar dimensions immediately (not just on activation)
    this.updateTitleBar();
  }

  // ─── Activation ──────────────────────────────────────────────────────────

  activate(): void {
    if (this.active) return;
    this.active = true;

    // Remove the animation's cursor line (the last div with a .terminal-cursor inside)
    const animCursor = this.body.querySelector('.terminal-cursor');
    if (animCursor) {
      const parentLine = animCursor.closest('div');
      if (parentLine && parentLine.parentNode === this.body) {
        parentLine.remove();
      }
    }

    // Re-create hidden input if destroyed by animation skip (innerHTML wipe)
    const cardWrapper = this.body.parentElement;
    const inputStillInDOM = cardWrapper
      ? cardWrapper.contains(this.hiddenInput)
      : this.body.contains(this.hiddenInput);
    if (!inputStillInDOM) {
      this.createHiddenInput();
      this.bindInputEvents();
    }

    // Keep pointer-events: none so scrolling works.
    // Focus happens via click/touchend handlers below.

    this.appendPromptLine();
    this.updateTitleBar();
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
    // Position OUTSIDE the scrollable body but inside the terminal card wrapper.
    // This prevents the browser's native scroll-into-view on focused input
    // from fighting with the terminal's internal scroll.
    // The input covers the FULL terminal card so any tap directly focuses it.
    // No programmatic focus() needed — native tap-to-focus works on all platforms.
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
      pointerEvents: 'none', // Don't intercept clicks during animation — enable on activate
    });
    // On focus, scroll terminal to bottom
    input.addEventListener('focus', () => {
      requestAnimationFrame(() => this.scrollToBottom());
    });
    // Append to the card wrapper (parent of body) so it's outside the scrollable area
    // but visually covers it entirely
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
    // Bind input events on the hidden input
    this.bindInputEvents();

    // Resize → update title bar
    window.addEventListener('resize', () => {
      if (this.resizeTimer) clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => this.updateTitleBar(), 200);
    });
  }

  /** Bind events on the hidden input — called on init and after re-creation */
  private bindInputEvents(): void {
    // Prevent focus before activation (blur immediately)
    this.hiddenInput.addEventListener('focus', () => {
      if (!this.active) {
        this.hiddenInput.blur();
      }
    });

    // All character input comes through the hidden input's native behavior.
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

    // Keydown handles special keys AND acts as a sync trigger.
    // On some mobile browsers, 'input' events may not fire reliably
    // for transparent inputs. Keydown always fires though.
    this.hiddenInput.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
      // Schedule a sync after the keydown completes (input value updated by then)
      if (!['Enter', 'Tab', 'Escape'].includes(e.key)) {
        setTimeout(() => this.syncFromHiddenInput(), 0);
      }
    });

    // Focus the hidden input on click/tap. pointer-events: none stays on the input
    // so scrolling works, but these handlers focus it programmatically.
    const focusInput = () => {
      if (!this.active || this.animating) return;
      this.hiddenInput.focus({ preventScroll: true });
    };

    // Desktop: click on the terminal body
    this.body.addEventListener('click', focusInput);

    // Mobile: touchend distinguishes tap from scroll by checking movement
    let touchStartY = 0;
    this.body.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    this.body.addEventListener('touchend', (e) => {
      const touchEndY = e.changedTouches[0].clientY;
      const moved = Math.abs(touchEndY - touchStartY);
      // Only focus if it was a tap (moved < 10px), not a scroll
      if (moved < 10) {
        focusInput();
      }
    }, { passive: true });

    // Also allow the card wrapper (title bar click)
    const cardWrapper = this.body.parentElement;
    if (cardWrapper) {
      cardWrapper.addEventListener('click', focusInput);
    }
  }

  private syncFromHiddenInput(): void {
    if (!this.active || this.animating) return;
    this.currentInput = this.hiddenInput.value;
    this.cursorPos = this.hiddenInput.selectionStart ?? this.currentInput.length;
    // Use rAF to ensure the DOM update actually triggers a visual repaint on mobile
    requestAnimationFrame(() => {
      this.renderCurrentLine();
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.active) return;

    // Escape releases focus
    if (e.key === 'Escape') {
      this.hiddenInput.blur();
      this.body.blur();
      return;
    }

    // Ctrl+C cancels animation or input
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (this.animating && this.animationCleanup) {
        this.animationCleanup();
        return;
      }
      this.appendToOutput(`<span class="terminal-prompt">${this.promptHtml()}</span>${esc(this.currentInput)}^C`);
      this.currentInput = '';
      this.cursorPos = 0;
      this.hiddenInput.value = '';
      this.appendPromptLine();
      return;
    }

    if (this.animating) return;

    // Ctrl+L → clear
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      this.clearTerminal();
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
      case 'Backspace':
      case 'Delete':
        // Let the hidden input handle these natively.
        // The 'input' event will fire and syncFromHiddenInput() picks it up.
        break;
      default:
        // Let the hidden input handle all character input natively.
        // The 'input' event will fire and syncFromHiddenInput() picks it up.
        break;
    }
  }

  private syncToHiddenInput(): void {
    this.hiddenInput.value = this.currentInput;
    this.hiddenInput.setSelectionRange(this.cursorPos, this.cursorPos);
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  private promptHtml(): string {
    return `<span class="terminal-user">${esc(this.data.prompt)}</span><span class="terminal-separator">:</span><span class="terminal-path">~</span><span class="terminal-dollar">$ </span>`;
  }

  private renderCurrentLine(): void {
    const line = this.getInputLineEl();
    if (!line) return;

    const before = esc(this.currentInput.slice(0, this.cursorPos));
    const cursorChar = this.cursorPos < this.currentInput.length ? esc(this.currentInput[this.cursorPos]) : ' ';
    const after = esc(this.currentInput.slice(this.cursorPos + 1));

    line.innerHTML =
      `<span class="terminal-prompt">${this.promptHtml()}</span>` +
      `<span class="terminal-cmd">${before}</span><span class="terminal-cursor">${cursorChar}</span><span class="terminal-cmd">${after}</span>`;

    this.scrollToBottom();
  }

  private getInputLineEl(): HTMLElement | null {
    return this.body.querySelector('.terminal-input-line');
  }

  private appendPromptLine(): void {
    const div = document.createElement('div');
    div.className = 'terminal-input-line';
    div.setAttribute('aria-live', 'polite');
    this.body.appendChild(div);
    this.currentInput = '';
    this.cursorPos = 0;
    this.historyIndex = -1;
    this.savedInput = '';
    this.hiddenInput.value = '';
    this.renderCurrentLine();
    this.scrollToBottom();
  }

  private appendToOutput(html: string): void {
    const div = document.createElement('div');
    div.className = 'terminal-output-line';
    div.innerHTML = html;
    // Insert before the current input line (or at end)
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

  private scrollToBottom(): void {
    this.body.scrollTop = this.body.scrollHeight;
  }

  // ─── Execution ───────────────────────────────────────────────────────────

  private executeCurrentInput(): void {
    const raw = this.currentInput.trim();

    // Remove hint on first command
    if (this.firstCommand) {
      this.firstCommand = false;
      const hint = this.body.querySelector('.terminal-hint');
      if (hint) hint.remove();
    }

    // Freeze current input line as output
    const inputLine = this.getInputLineEl();
    if (inputLine) {
      inputLine.innerHTML =
        `<span class="terminal-prompt">${this.promptHtml()}</span>${esc(this.currentInput)}`;
      inputLine.classList.remove('terminal-input-line');
      inputLine.classList.add('terminal-output-line');
      inputLine.removeAttribute('aria-live');
    }

    if (raw.length > 0) {
      // Don't store duplicate consecutive
      if (this.history.length === 0 || this.history[this.history.length - 1] !== raw) {
        this.history.push(raw);
      }
    }

    if (raw.length > 0) {
      const parts = raw.split(/\s+/);
      const cmdName = parts[0].toLowerCase();
      const args = parts.slice(1);

      const cmd = this.commands.get(cmdName);
      if (cmd) {
        const result = cmd.handler(args, raw);
        this.renderResult(result);
      } else {
        this.renderResult(this.unknownCommand(cmdName));
      }
    }

    this.appendPromptLine();
  }

  private renderResult(result: CommandResult): void {
    if (result === null || result === undefined) return;
    if (typeof result === 'string') {
      this.appendToOutput(esc(result));
    } else if (Array.isArray(result)) {
      this.appendOutputLines(result);
    } else if (typeof result === 'object' && 'html' in result) {
      this.appendRawHTML(result.html);
    }
  }

  /** Insert raw HTML (potentially multiple divs) before the input line */
  private appendRawHTML(html: string): void {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const inputLine = this.getInputLineEl();
    while (wrapper.firstChild) {
      if (inputLine) {
        this.body.insertBefore(wrapper.firstChild, inputLine);
      } else {
        this.body.appendChild(wrapper.firstChild);
      }
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
      // Phase 1: complete command name
      const partial = input.toLowerCase();
      const matches = Array.from(this.commands.keys()).filter((k) => k.startsWith(partial));
      this.applyCompletion(matches, input, '');
    } else {
      // Phase 2: complete argument
      const cmdName = input.slice(0, spaceIdx).toLowerCase();
      const argPart = input.slice(spaceIdx + 1);
      const candidates = this.getArgCandidates(cmdName, argPart);
      this.applyCompletion(candidates, argPart, input.slice(0, spaceIdx + 1));
    }
  }

  private getArgCandidates(cmd: string, partial: string): string[] {
    const p = partial.toLowerCase();

    if (cmd === 'cat') {
      const paths = [
        'resume', 'skills', 'education', 'certs', '/etc/role', '/proc/height',
        ...this.projectSlugs.map((s) => `projects/${s}`),
      ];
      if (p.startsWith('projects/')) {
        return this.projectSlugs.map((s) => `projects/${s}`).filter((x) => x.toLowerCase().startsWith(p));
      }
      return paths.filter((x) => x.toLowerCase().startsWith(p));
    }

    if (cmd === 'cd' || cmd === 'open') {
      const routes = ['projects/', 'resume', 'contact', '~',
        ...this.projectSlugs.map((s) => `projects/${s}`)];
      return routes.filter((x) => x.toLowerCase().startsWith(p));
    }

    if (cmd === 'ls') {
      const dirs = ['projects/', 'resume/', 'contact/'];
      return dirs.filter((x) => x.toLowerCase().startsWith(p));
    }

    if (cmd === 'man' || cmd === 'help') {
      return Array.from(this.commands.keys()).filter((k) => k.startsWith(p));
    }

    return [];
  }

  private applyCompletion(matches: string[], partial: string, prefix: string): void {
    if (matches.length === 0) return;

    if (matches.length === 1) {
      this.currentInput = prefix + matches[0] + (matches[0].endsWith('/') ? '' : ' ');
      this.cursorPos = this.currentInput.length;
      this.syncToHiddenInput();
      this.renderCurrentLine();
    } else {
      // Find longest common prefix of all matches
      let lcp = matches[0];
      for (const m of matches.slice(1)) {
        let i = 0;
        while (i < lcp.length && i < m.length && lcp[i].toLowerCase() === m[i].toLowerCase()) i++;
        lcp = lcp.slice(0, i);
      }

      // If common prefix is longer than what user typed, complete to it
      if (lcp.length > partial.length) {
        this.currentInput = prefix + lcp;
        this.cursorPos = this.currentInput.length;
        this.syncToHiddenInput();
        this.renderCurrentLine();
        return;
      }

      // Otherwise show candidates
      const inputLine = this.getInputLineEl();
      if (inputLine) {
        inputLine.innerHTML =
          `<span class="terminal-prompt">${this.promptHtml()}</span>${esc(this.currentInput)}`;
        inputLine.classList.remove('terminal-input-line');
        inputLine.classList.add('terminal-output-line');
        inputLine.removeAttribute('aria-live');
      }
      this.appendToOutput(esc(matches.join('  ')));
      this.appendPromptLine();
      this.currentInput = prefix + lcp;
      this.cursorPos = this.currentInput.length;
      this.syncToHiddenInput();
      this.renderCurrentLine();
    }
  }

  // ─── Dynamic Title Bar ──────────────────────────────────────────────────

  private updateTitleBar(): void {
    const titleEl = document.getElementById('terminal-title');
    if (!titleEl) return;

    const style = window.getComputedStyle(this.body);
    const fontSize = parseFloat(style.fontSize) || 14;
    const charWidth = fontSize * 0.6;
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.6;

    const cols = Math.floor(this.body.clientWidth / charWidth);
    const rows = Math.floor(this.body.clientHeight / lineHeight);

    titleEl.textContent = `${this.data.prompt} — zsh — ${cols}\u00d7${rows}`;
  }

  // ─── Hint ────────────────────────────────────────────────────────────────

  private showHint(): void {
    const hint = document.createElement('div');
    hint.className = 'terminal-hint';
    hint.textContent = "Type 'help' for available commands";
    hint.setAttribute('aria-live', 'polite');
    const inputLine = this.getInputLineEl();
    if (inputLine) {
      this.body.insertBefore(hint, inputLine);
    } else {
      this.body.appendChild(hint);
    }
  }

  // ─── Clear ───────────────────────────────────────────────────────────────

  private clearTerminal(): void {
    // Remove all children except hidden input
    const children = Array.from(this.body.children);
    for (const child of children) {
      if (child !== this.hiddenInput) child.remove();
    }
    this.appendPromptLine();
  }

  // ─── Unknown command ─────────────────────────────────────────────────────

  private unknownCommand(cmd: string): string {
    const responses = [
      `${cmd}: command not found. Nice try.`,
      `${cmd}: command not found. Have you tried 'help'?`,
      `${cmd}: command not found. That's not in my repertoire... yet.`,
      `bash: ${cmd}: No such file or directory`,
      `${cmd}: command not found. 404 in terminal form.`,
      `${cmd}: permission denied (just kidding — it doesn't exist)`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // ─── Commands ────────────────────────────────────────────────────────────

  private registerCommands(): void {
    const d = this.data;
    const s = d.site;

    // ── Navigation ──

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
      handler: (args) => {
        const path = (args[0] || '').replace(/\/+$/, '').toLowerCase();
        if (!path || path === '~' || path === '.') {
          return { html: '<span class="terminal-dir">projects/</span>  <span class="terminal-dir">resume/</span>  <span class="terminal-dir">contact/</span>' };
        }
        if (path === 'projects') {
          return this.projectSlugs.map((s) => `  ${s}`);
        }
        return `ls: cannot access '${esc(args[0])}': No such file or directory`;
      },
    });

    this.commands.set('cd', {
      description: 'Navigate to page',
      handler: (args) => this.navigateTo(args[0]),
    });

    this.commands.set('open', {
      description: 'Open page in browser',
      handler: (args) => this.navigateTo(args[0]),
    });

    this.commands.set('pwd', {
      description: 'Print working directory',
      handler: () => '~',
    });

    // ── Info ──

    this.commands.set('whoami', {
      description: 'Print current user',
      handler: () => 'ezra',
    });

    this.commands.set('hostname', {
      description: 'Print hostname',
      handler: (args) => {
        if (args.includes('-f')) return 'hulsman.dev';
        return 'hulsman';
      },
    });

    this.commands.set('cat', {
      description: 'Display file contents',
      handler: (args) => {
        if (args.length === 0) return 'usage: cat <file>';
        return this.catFile(args[0]);
      },
    });

    this.commands.set('uptime', {
      description: 'Show system uptime',
      handler: (args) => {
        if (args.includes('-p')) return 'up 3 years, 0 unplanned restarts';
        return `up 3 years, 0 unplanned restarts, load average: 0.42, 0.38, 0.35`;
      },
    });

    this.commands.set('echo', {
      description: 'Print text to terminal',
      handler: (_args, raw) => {
        const text = raw.slice(raw.indexOf(' ') + 1);
        if (raw.indexOf(' ') === -1) return '';
        if (text === '$STACK' || text === '"$STACK"') {
          return s.skills.languages.concat(s.skills.tools, s.skills.frameworks).join(', ');
        }
        // Strip surrounding quotes
        return text.replace(/^["']|["']$/g, '');
      },
    });

    this.commands.set('neofetch', {
      description: 'System info with ASCII art',
      handler: () => ({ html: this.neofetchOutput() }),
    });

    // ── Content ──
    // (cat handles projects/*, resume, skills, education, certs via catFile)

    // ── Meta ──

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

    // ── Easter Eggs ──

    this.commands.set('sudo', {
      description: 'Execute with elevated privileges',
      handler: (_args, raw) => {
        const subCmd = raw.slice(5).trim();
        if (subCmd === 'hire-me') {
          return { html: this.sudoHireMe() };
        }
        return `sudo: ${subCmd || '???'}: command not found`;
      },
    });

    this.commands.set('cowsay', {
      description: 'Have a cow say something',
      handler: (_args, raw) => {
        const text = raw.slice(7).trim() || 'moo';
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
  }

  // ─── cat dispatcher ──────────────────────────────────────────────────────

  private catFile(path: string): CommandResult {
    const p = path.toLowerCase().replace(/^\/+/, '');
    const d = this.data;

    if (p === 'etc/role' || p === '/etc/role') {
      return `${d.site.role} @ ${d.site.company}`;
    }

    if (p === 'proc/height' || p === '/proc/height') {
      return '2.00m \u2014 good overview of server racks';
    }

    if (p === 'resume') {
      return this.formatExperience();
    }

    if (p === 'skills') {
      return this.formatSkills();
    }

    if (p === 'education') {
      return this.formatEducation();
    }

    if (p === 'certs' || p === 'certifications') {
      return this.formatCerts();
    }

    // projects/<slug>
    if (p.startsWith('projects/')) {
      const slug = p.slice('projects/'.length);
      const idx = this.projectSlugs.indexOf(slug);
      if (idx !== -1) return this.formatProject(this.data.projects[idx]);
      return `cat: projects/${slug}: No such file or directory`;
    }

    return `cat: ${path}: No such file or directory`;
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  private navigateTo(path: string | undefined): CommandResult {
    if (!path || path === '~' || path === '/' || path === '..') {
      return "You're already home.";
    }

    let target = path;
    // Resolve known routes
    if (path === 'resume') target = '/resume';
    else if (path === 'contact') target = '/contact';
    else if (path.startsWith('projects/')) {
      const slug = path.slice('projects/'.length);
      const idx = this.projectSlugs.indexOf(slug.toLowerCase());
      if (idx !== -1) {
        const proj = this.data.projects[idx];
        target = proj.link || `/projects/${slug}`;
      } else {
        return `cd: ${path}: No such directory`;
      }
    } else if (path === 'projects') {
      target = '/#projects';
    }

    if (!target.startsWith('/') && !target.startsWith('#') && !target.startsWith('http')) {
      target = '/' + target;
    }

    setTimeout(() => {
      window.location.href = target;
    }, 300);

    return `Navigating to ${target}...`;
  }

  // ─── Content formatters ──────────────────────────────────────────────────

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

  // ─── Help ────────────────────────────────────────────────────────────────

  private helpOutput(): { html: string } {
    const sections: [string, string[]][] = [
      ['Navigation', ['help', 'clear', 'ls', 'cd', 'open', 'pwd']],
      ['Info', ['whoami', 'hostname', 'cat', 'uptime', 'echo', 'neofetch']],
      ['Content', ['cat resume', 'cat skills', 'cat education', 'cat certs', 'cat projects/<slug>']],
      ['Meta', ['date', 'uname', 'history', 'man', 'exit']],
      ['Fun', ['sudo hire-me', 'cowsay', 'fortune', 'sl', 'matrix']],
    ];

    const divs: string[] = [];
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

  // ─── neofetch ────────────────────────────────────────────────────────────

  private neofetchOutput(): string {
    const s = this.data.site;
    const art = [
      "     .---.    ",
      "    /     \\   ",
      "   |  E H  |  ",
      "    \\     /   ",
      "  ___'---'___ ",
      " /           \\",
      "|             |",
      " \\___________/",
      "              ",
    ];
    const stack = s.skills.languages.join(', ');
    const info = [
      `<span class="terminal-accent">${esc(this.data.prompt)}</span>`,
      '<span class="terminal-dim">\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500</span>',
      `<span class="terminal-accent">Role:</span> ${esc(s.role)}`,
      `<span class="terminal-accent">Company:</span> ${esc(s.company)}`,
      `<span class="terminal-accent">Location:</span> ${esc(s.location)}`,
      `<span class="terminal-accent">Stack:</span> ${esc(stack)}`,
      `<span class="terminal-accent">Uptime:</span> 3 years, 0 unplanned restarts`,
      `<span class="terminal-accent">GitHub:</span> enhulsman`,
      `<span class="terminal-accent">Contact:</span> ${esc(s.social.email)}`,
    ];

    const lines = art.map((artLine, i) => {
      const infoLine = i < info.length ? info[i] : '';
      return `${esc(artLine)}   ${infoLine}`;
    });

    return `<div style="line-height:1.2;white-space:pre;font-family:inherit">${lines.join('\n')}</div>`;
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
        // Force break long words
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
    // Measure actual character width
    const measure = document.createElement('span');
    measure.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit';
    measure.textContent = 'XXXXXXXXXXXXXXXXXXXX';
    this.body.appendChild(measure);
    const charWidth = measure.offsetWidth / 20 || 8;
    measure.remove();
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
    const measureM = document.createElement('span');
    measureM.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit';
    measureM.textContent = 'XXXXXXXXXXXXXXXXXXXX';
    this.body.appendChild(measureM);
    const cw = measureM.offsetWidth / 20 || 8;
    measureM.remove();
    const cols = Math.floor(this.body.clientWidth / cw);
    const rows = Math.floor(this.body.clientHeight / (cw * 1.6));

    const container = document.createElement('div');
    container.className = 'terminal-animation terminal-matrix';
    container.style.whiteSpace = 'pre';
    container.style.lineHeight = '1.2';
    container.style.fontFamily = 'inherit';
    container.style.color = '#0f0';
    container.style.overflow = 'hidden';

    // Hide all existing content
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
      this.animating = false;
      this.animationCleanup = null;
      this.body.removeAttribute('aria-busy');
    };

    this.animationCleanup = finish;
  }
}
