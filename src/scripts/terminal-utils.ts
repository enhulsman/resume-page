export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function makePromptHtml(promptStr: string): string {
  return `<span class="terminal-user">${esc(promptStr)}</span>` +
    `<span class="terminal-separator">:</span>` +
    `<span class="terminal-path">~</span>` +
    `<span class="terminal-dollar">$ </span>`;
}

export function makeCursorHtml(typing: boolean): string {
  return `<span class="terminal-cursor${typing ? ' typing' : ''}"></span>`;
}

export function scrollToBottom(el: HTMLElement): void {
  el.scrollTop = el.scrollHeight;
}

export function measureCharWidth(container: HTMLElement): number {
  const span = document.createElement('span');
  span.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:inherit';
  span.textContent = 'XXXXXXXXXXXXXXXXXXXX';
  container.appendChild(span);
  const w = span.offsetWidth / 20 || 8;
  span.remove();
  return w;
}

export function updateTitleDimensions(promptStr: string, container: HTMLElement): void {
  const titleEl = document.getElementById('terminal-title');
  if (!titleEl) return;
  const cw = measureCharWidth(container);
  const lh = parseFloat(getComputedStyle(container).lineHeight) || cw * 1.6;
  const cols = Math.floor(container.clientWidth / cw);
  const rows = Math.floor(container.clientHeight / lh);
  titleEl.textContent = `${promptStr} \u2014 zsh \u2014 ${cols}\u00d7${rows}`;
}
