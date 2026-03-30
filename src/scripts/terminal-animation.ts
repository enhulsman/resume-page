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

import { esc, makePromptHtml, makeCursorHtml, scrollToBottom, updateTitleDimensions } from './terminal-utils';

interface Line {
  type: 'cmd' | 'out';
  text: string;
}

interface Command {
  cmd: string;
  output: string[];
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
    html += `<div>${makePromptHtml(promptStr)}<span class="text-theme-primary">${cmd.cmd}</span></div>`;
    for (const out of cmd.output) {
      html += `<div class="text-theme-secondary">${out}</div>`;
    }
    html += '<div class="h-1"></div>';
  }
  html += `<div>${makePromptHtml(promptStr)}${makeCursorHtml(false)}</div>`;
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

  if (prefersReduced) {
    renderAllInstantly(body, commands, promptStr);
    body.dispatchEvent(new CustomEvent('terminal-animation-complete'));
    return;
  }

  body.innerHTML = '';

  let cmdIndex = 0;
  let cursorLine: HTMLDivElement | null = null;
  let animationComplete = false;

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
    cursorLine.innerHTML = makePromptHtml(promptStr) + makeCursorHtml(typing);
    body.appendChild(cursorLine);
    scrollToBottom(body);
  }

  function finish(): void {
    if (animationComplete) return;
    animationComplete = true;
    body.dispatchEvent(new CustomEvent('terminal-animation-complete'));
  }

  function handleSkip(): void {
    if (animationComplete) return;
    cancelAll();
    renderAllInstantly(body, commands, promptStr);
    scrollToBottom(body);
    finish();
  }

  body.addEventListener('click', handleSkip, { once: true });

  /**
   * Type a command character-by-character. When `reuseExisting` is true,
   * the cursor line already exists (subsequent commands); otherwise a new
   * cursor line is created first (initial command).
   */
  function typeCommand(index: number, reuseExisting: boolean): void {
    if (animationComplete) return;
    if (index >= commands.length) {
      if (!reuseExisting) ensureCursor(false);
      finish();
      return;
    }

    const cmd = commands[index];

    if (!reuseExisting) {
      ensureCursor(false);
    } else if (cursorLine) {
      cursorLine.innerHTML = makePromptHtml(promptStr) + makeCursorHtml(true);
    }

    let charIdx = 0;
    const typingSpeed = 40 + Math.random() * 30;

    function typeChar(): void {
      if (animationComplete) return;

      if (charIdx < cmd.cmd.length) {
        const typed = esc(cmd.cmd.substring(0, charIdx + 1));
        if (cursorLine) {
          cursorLine.innerHTML =
            makePromptHtml(promptStr) +
            `<span class="text-theme-primary">${typed}</span>` +
            makeCursorHtml(true);
        }
        charIdx++;
        scrollToBottom(body);

        const delay = typingSpeed + (Math.random() - 0.5) * 30;
        track(typeChar, delay);
      } else {
        if (cursorLine) {
          cursorLine.innerHTML =
            makePromptHtml(promptStr) +
            `<span class="text-theme-primary">${esc(cmd.cmd)}</span>`;
          cursorLine = null;
        }

        track(() => {
          if (animationComplete) return;

          for (const out of cmd.output) {
            appendHTML(
              `<div class="text-theme-secondary">${esc(out)}</div>`,
            );
          }
          appendHTML('<div class="h-1"></div>');
          updateTitleDimensions(promptStr, body);

          cmdIndex = index + 1;
          ensureCursor(false);

          if (cmdIndex < commands.length) {
            track(() => {
              typeCommand(cmdIndex, true);
            }, 500 + Math.random() * 400);
          } else {
            finish();
          }
        }, 150);
      }
    }

    const initialDelay = reuseExisting ? 100 : 400 + Math.random() * 300;
    track(typeChar, initialDelay);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        observer.disconnect();
        typeCommand(0, false);
      }
    },
    { threshold: 0.3 },
  );
  observer.observe(body);
}
