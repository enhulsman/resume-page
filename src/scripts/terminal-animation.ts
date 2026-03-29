/**
 * Terminal typing animation for the About section.
 *
 * Reads `data-prompt` and `data-lines` from the given element, then types
 * each command character-by-character with randomized speed. Output lines
 * appear instantly after each command finishes.
 *
 * Dispatches `terminal-animation-complete` on the element when done.
 * Click anywhere on the element to skip the animation instantly.
 */

interface Line {
  type: 'cmd' | 'out';
  text: string;
}

interface Command {
  cmd: string;
  output: string[];
}

function makePrompt(promptStr: string): string {
  return (
    `<span style="color:rgb(120,165,145)">${promptStr}</span>` +
    `<span class="text-theme-muted">:</span>` +
    `<span style="color:rgb(140,145,80)">~</span>` +
    `<span class="text-theme-primary"> $ </span>`
  );
}

function makeCursor(typing: boolean): string {
  return `<span class="terminal-cursor${typing ? ' typing' : ''}" style="display:inline-block;width:8px;height:1.1em;vertical-align:text-bottom;background:var(--color-accent-primary)"></span>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseCommands(lines: Line[]): Command[] {
  const commands: Command[] = [];
  let current: Command | null = null;

  for (const line of lines) {
    if (line.type === 'cmd') {
      if (current) commands.push(current);
      current = { cmd: line.text, output: [] };
    } else if (line.type === 'out' && current) {
      current.output.push(line.text);
    }
  }
  if (current) commands.push(current);

  return commands;
}

function renderAllInstantly(
  body: HTMLElement,
  commands: Command[],
  promptStr: string,
): void {
  let html = '';
  for (const cmd of commands) {
    html += `<div>${makePrompt(promptStr)}<span class="text-theme-primary">${cmd.cmd}</span></div>`;
    for (const out of cmd.output) {
      html += `<div class="text-theme-secondary">${out}</div>`;
    }
    html += '<div class="h-1"></div>';
  }
  html += `<div>${makePrompt(promptStr)}${makeCursor(false)}</div>`;
  body.innerHTML = html;
}

export function initTerminalAnimation(body: HTMLElement): void {
  const prefersReduced = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;
  const promptStr = body.getAttribute('data-prompt') || 'user@host';
  const lines: Line[] = JSON.parse(
    body.getAttribute('data-lines') || '[]',
  );

  const commands = parseCommands(lines);

  // ---- Reduced motion: instant render ----
  if (prefersReduced) {
    renderAllInstantly(body, commands, promptStr);
    body.dispatchEvent(new CustomEvent('terminal-animation-complete'));
    return;
  }

  // ---- Animated path ----
  body.innerHTML = '';

  let cmdIndex = 0;
  let cursorLine: HTMLDivElement | null = null;
  let animationComplete = false;

  // Track all pending timeouts so we can cancel on skip
  const pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  function track(fn: () => void, delay: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      pendingTimeouts.delete(id);
      fn();
    }, delay);
    pendingTimeouts.add(id);
    return id;
  }

  function cancelAll(): void {
    for (const id of pendingTimeouts) {
      clearTimeout(id);
    }
    pendingTimeouts.clear();
  }

  function scrollToBottom(): void {
    body.scrollTop = body.scrollHeight;
  }

  function appendHTML(html: string): void {
    const el = document.createElement('div');
    el.innerHTML = html;
    while (el.firstChild) body.appendChild(el.firstChild);
  }

  function ensureCursor(typing: boolean): void {
    if (cursorLine && cursorLine.parentNode) {
      cursorLine.remove();
    }
    cursorLine = document.createElement('div');
    cursorLine.innerHTML = makePrompt(promptStr) + makeCursor(typing);
    body.appendChild(cursorLine);
    scrollToBottom();
  }

  function finish(): void {
    if (animationComplete) return;
    animationComplete = true;
    body.dispatchEvent(new CustomEvent('terminal-animation-complete'));
  }

  // ---- Skip on click ----
  function handleSkip(): void {
    if (animationComplete) return;

    cancelAll();

    // Render everything that hasn't been rendered yet
    // First, clear the body and re-render all commands instantly
    renderAllInstantly(body, commands, promptStr);
    scrollToBottom();
    finish();
  }

  body.addEventListener('click', handleSkip, { once: true });

  // ---- Typing engine ----
  function typeCommand(index: number): void {
    if (index >= commands.length) {
      ensureCursor(false);
      finish();
      return;
    }

    const cmd = commands[index];

    // Show idle cursor before typing starts
    ensureCursor(false);

    let charIdx = 0;
    const typingSpeed = 40 + Math.random() * 30;

    function typeChar(): void {
      if (animationComplete) return;

      if (charIdx < cmd.cmd.length) {
        const typed = escapeHtml(cmd.cmd.substring(0, charIdx + 1));
        if (cursorLine) {
          cursorLine.innerHTML =
            makePrompt(promptStr) +
            `<span class="text-theme-primary">${typed}</span>` +
            makeCursor(true);
        }
        charIdx++;
        scrollToBottom();

        const delay = typingSpeed + (Math.random() - 0.5) * 30;
        track(typeChar, delay);
      } else {
        // Command fully typed — finalize the line
        if (cursorLine) {
          cursorLine.innerHTML =
            makePrompt(promptStr) +
            `<span class="text-theme-primary">${escapeHtml(cmd.cmd)}</span>`;
          cursorLine = null;
        }

        // Brief pause after "enter", then show output
        track(() => {
          if (animationComplete) return;

          for (const out of cmd.output) {
            appendHTML(
              `<div class="text-theme-secondary">${escapeHtml(out)}</div>`,
            );
          }
          appendHTML('<div class="h-1"></div>');

          cmdIndex = index + 1;

          // Show new prompt with idle cursor
          ensureCursor(false);

          if (cmdIndex < commands.length) {
            // Pause before typing next command
            track(() => {
              startTypingOnCurrentLine(cmdIndex);
            }, 500 + Math.random() * 400);
          } else {
            finish();
          }
        }, 150);
      }
    }

    // Start typing after an idle pause
    track(typeChar, 400 + Math.random() * 300);
  }

  /**
   * Start typing on the cursor line that's already visible (used for
   * commands after the first, where the prompt is already showing).
   */
  function startTypingOnCurrentLine(index: number): void {
    if (animationComplete) return;
    if (index >= commands.length) return;

    const cmd = commands[index];
    let charIdx = 0;
    const typingSpeed = 40 + Math.random() * 30;

    // Switch cursor to typing mode
    if (cursorLine) {
      cursorLine.innerHTML = makePrompt(promptStr) + makeCursor(true);
    }

    function typeChar(): void {
      if (animationComplete) return;

      if (charIdx < cmd.cmd.length) {
        const typed = escapeHtml(cmd.cmd.substring(0, charIdx + 1));
        if (cursorLine) {
          cursorLine.innerHTML =
            makePrompt(promptStr) +
            `<span class="text-theme-primary">${typed}</span>` +
            makeCursor(true);
        }
        charIdx++;
        scrollToBottom();

        const delay = typingSpeed + (Math.random() - 0.5) * 30;
        track(typeChar, delay);
      } else {
        // Finalize
        if (cursorLine) {
          cursorLine.innerHTML =
            makePrompt(promptStr) +
            `<span class="text-theme-primary">${escapeHtml(cmd.cmd)}</span>`;
          cursorLine = null;
        }

        track(() => {
          if (animationComplete) return;

          for (const out of cmd.output) {
            appendHTML(
              `<div class="text-theme-secondary">${escapeHtml(out)}</div>`,
            );
          }
          appendHTML('<div class="h-1"></div>');

          cmdIndex = index + 1;
          ensureCursor(false);

          if (cmdIndex < commands.length) {
            track(() => {
              startTypingOnCurrentLine(cmdIndex);
            }, 500 + Math.random() * 400);
          } else {
            finish();
          }
        }, 150);
      }
    }

    track(typeChar, 100);
  }

  // ---- Start on scroll into view ----
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        typeCommand(0);
      }
    },
    { threshold: 0.3 },
  );
  observer.observe(body);
}
