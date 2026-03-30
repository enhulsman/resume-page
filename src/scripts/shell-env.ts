// Shell environment — Map<string, string> wrapper for variable expansion

import type { TerminalData } from './interactive-terminal';

export class ShellEnv {
  private vars: Map<string, string>;

  constructor(data: TerminalData) {
    const s = data.site;
    const stack = [
      ...s.skills.languages,
      ...s.skills.tools,
      ...s.skills.frameworks,
    ].join(':');

    this.vars = new Map([
      ['USER', 'ezra'],
      ['HOME', '/home/ezra'],
      ['HOSTNAME', 'hulsman'],
      ['SHELL', '/bin/zsh'],
      ['PWD', '/home/ezra'],
      ['STACK', stack],
      ['ROLE', s.role],
      ['COMPANY', s.company],
      ['LOCATION', s.location],
    ]);
  }

  get(key: string): string {
    return this.vars.get(key) ?? '';
  }

  set(key: string, value: string): string | null {
    if (key === 'HOME') return 'export: HOME is read-only';
    this.vars.set(key, value);
    return null;
  }

  getAll(): Record<string, string> {
    return Object.fromEntries(this.vars);
  }

  entries(): [string, string][] {
    return [...this.vars.entries()];
  }
}
