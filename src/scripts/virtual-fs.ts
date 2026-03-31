// Virtual filesystem — in-memory tree built from TerminalData

import type { TerminalData } from './interactive-terminal';

// Sentinel markers — VFS stores these, cat maps them to formatters
export const SENTINEL_EXPERIENCE = '__FORMAT_EXPERIENCE__';
export const SENTINEL_SKILLS = '__FORMAT_SKILLS__';
export const SENTINEL_EDUCATION = '__FORMAT_EDUCATION__';
export const SENTINEL_CERTS = '__FORMAT_CERTS__';
export const SENTINEL_PROJECT_PREFIX = '__FORMAT_PROJECT_';

interface FsNode {
  type: 'file' | 'dir';
  content?: string; // files only
  children?: Map<string, FsNode>; // dirs only
  writable?: boolean;
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export class VirtualFS {
  private root: FsNode;

  constructor(data: TerminalData) {
    const s = data.site;

    // Build /home/ezra/projects/
    const projectDir: Map<string, FsNode> = new Map();
    data.projects.forEach((p, i) => {
      projectDir.set(slugify(p.title), {
        type: 'file',
        content: `${SENTINEL_PROJECT_PREFIX}${i}__`,
      });
    });

    // Build /home/ezra/
    const allSkills = [...s.skills.languages, ...s.skills.tools, ...s.skills.frameworks];
    const stack = allSkills.join(':');
    const homeDir: Map<string, FsNode> = new Map([
      ['.profile', { type: 'file', content: `${s.name} — ${s.role} @ ${s.company}\n${s.location}` }],
      ['.vimrc', { type: 'file', content: '" EZ Tech Support approved config\nset number\nset relativenumber\nset tabstop=4\nset shiftwidth=4\nset expandtab\nset autoindent\nset mouse=a\ncolorscheme desert\n" exit vim? just close the terminal' }],
      ['.bashrc', { type: 'file', content: `# why are you reading my bashrc?\n# I use zsh btw\nexport EDITOR=nvim\nexport VISUAL=code\nexport STACK="${stack}"\necho "welcome back, ${s.name.split(' ')[0].toLowerCase()}"` }],
      ['.zshrc', { type: 'file', content: [
        `# ${s.name.split(' ')[0]}'s zsh config`,
        'export EDITOR=nvim',
        'export VISUAL=code',
        '',
        '# 1-letter shorthands',
        "alias v='nvim'",
        "alias q='exit'",
        "alias g='git'",
        "alias p='python3'",
        "alias d='sudo docker'",
        '',
        '# ls replacements (eza on real machine)',
        "alias ll='ls -al'",
        "alias la='ls -a'",
        "alias l='ls'",
        '',
        '# navigation',
        "alias ..='cd ..'",
        "alias home='cd ~'",
        "alias cls='clear'",
        '',
        '# git shorthands',
        "alias gs='git status'",
        "alias gp='git push'",
        "alias gpl='git pull'",
        '',
        '# refresh',
        "alias cl='clear'",
        "alias cln='clear && neofetch'",
        '',
        '# portfolio extras',
        "alias hire='sudo hire-me'",
        "alias please='sudo'",
        "alias motd='cat /etc/motd'",
        "alias cpuinfo='cat /proc/cpuinfo'",
        "alias about='cat .profile'",
      ].join('\n') }],
      ['resume', { type: 'file', content: SENTINEL_EXPERIENCE }],
      ['skills', { type: 'file', content: SENTINEL_SKILLS }],
      ['education', { type: 'file', content: SENTINEL_EDUCATION }],
      ['certs', { type: 'file', content: SENTINEL_CERTS }],
      ['projects', { type: 'dir', children: projectDir }],
    ]);

    // Employment status message
    const empMsg = typeof s.employment.message === 'string'
      ? s.employment.message
      : (s.employment.message as Record<string, string>)[s.employment.status] || 'Open to connect';

    // Build /etc/
    const etcDir: Map<string, FsNode> = new Map([
      ['role', { type: 'file', content: `${s.role} @ ${s.company}` }],
      ['hostname', { type: 'file', content: 'hulsman' }],
      ['motd', { type: 'file', content: `${empMsg}\n\nContact: ${s.social.email}\nGitHub:  ${s.social.GitHub.replace('https://', '')}` }],
      ['passwd', { type: 'file', content: 'ezra:x:1000:1000:EZ Tech Support:/home/ezra:/bin/zsh' }],
      ['os-release', { type: 'file', content: 'PRETTY_NAME="hulsman.dev 6.0-portfolio"\nID=hulsman\nVERSION_ID=6.0\nHOME_URL="https://hulsman.dev"\nBUILT_WITH="Astro, TypeScript, Tailwind, GSAP"\nMAINTAINER="ezra"' }],
      ['environment', { type: 'file', content: 'EDITOR=nvim\nVISUAL=code\nSHELL=/bin/zsh\nLANG=en_NL.UTF-8\nTZ=Europe/Amsterdam\nFUEL=water\nBACKUP_FUEL=fanta' }],
    ]);

    // Dynamic uptime in seconds from career start
    const careerStart = s.careerStart || '2023-09-01';
    const uptimeSecs = Math.floor((Date.now() - new Date(careerStart).getTime()) / 1000);

    // Build /proc/
    const procDir: Map<string, FsNode> = new Map([
      ['height', { type: 'file', content: '2.00m — good overview of server racks' }],
      ['uptime', { type: 'file', content: `${uptimeSecs} 0` }],
      ['version', { type: 'file', content: 'hulsman.dev 6.0-portfolio (ezra@hulsman) TypeScript 5.0 Astro 5.18' }],
      ['cpuinfo', { type: 'file', content: [
        'processor\t: 0',
        'model name\t: ENH Ryzen\u2122 9 2000X @ 2.00 GHz',
        'cores\t\t: 1 (but multithreaded)',
        `clock\t\t: ${Math.floor(uptimeSecs / 3600)} hours clocked`,
        'fuel\t\t: water (backup: fanta)',
        `cache\t\t: ${allSkills.length} skills cached`,
        `bugs\t\t: ${data.projects.length}+ side projects, most never shipped`,
        'flags\t\t: devops linux docker k8s ci coffee_resistant',
      ].join('\n') }],
      ['gpuinfo', { type: 'file', content: [
        'model\t\t: CaffeineForce RTX 4070 Ti',
        'driver\t\t: imagination/latest',
        'vram\t\t: enough for too many browser tabs',
        'cuda cores\t: N/A (runs on pure willpower)',
        'temperature\t: cool under pressure',
      ].join('\n') }],
      ['loadavg', { type: 'file', content: `0.42 0.38 0.35 ${data.projects.length}/${data.projects.length + 12} side-projects` }],
      ['meminfo', { type: 'file', content: [
        `MemTotal:\t${allSkills.length * 128} MB of domain knowledge`,
        `MemFree:\t${Math.max(0, 64 - data.projects.length * 8)} MB (linux ricing takes the rest)`,
        `Buffers:\t${data.experience.length * 3} open terminal sessions`,
        `Cached:\t\t${data.certifications.length} certifications`,
        `SwapTotal:\t${Math.floor(uptimeSecs / 86400)} days of experience`,
      ].join('\n') }],
    ]);

    // Build /tmp/ (writable)
    const tmpDir: Map<string, FsNode> = new Map();

    // Build root
    this.root = {
      type: 'dir',
      children: new Map([
        ['home', {
          type: 'dir',
          children: new Map([
            ['ezra', { type: 'dir', children: homeDir }],
          ]),
        }],
        ['etc', { type: 'dir', children: etcDir }],
        ['proc', { type: 'dir', children: procDir }],
        ['tmp', { type: 'dir', children: tmpDir, writable: true }],
      ]),
    };
  }

  /** Resolve a user path to an absolute path string */
  resolvePath(input: string, cwd: string, home: string): string {
    let p = input;
    if (p === '~' || p.startsWith('~/')) {
      p = home + p.slice(1);
    }
    if (!p.startsWith('/')) {
      p = cwd + '/' + p;
    }
    // Normalize . and ..
    const parts = p.split('/').filter(Boolean);
    const resolved: string[] = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') { resolved.pop(); continue; }
      resolved.push(part);
    }
    return '/' + resolved.join('/');
  }

  /** Resolve a path to its FsNode */
  private resolve(absPath: string): FsNode | null {
    if (absPath === '/') return this.root;
    const parts = absPath.split('/').filter(Boolean);
    let node: FsNode = this.root;
    for (const part of parts) {
      if (node.type !== 'dir' || !node.children) return null;
      const child = node.children.get(part);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  readFile(absPath: string): string | { error: string } {
    const node = this.resolve(absPath);
    if (!node) return { error: `cat: ${absPath}: No such file or directory` };
    if (node.type === 'dir') return { error: `cat: ${absPath}: Is a directory` };
    return node.content ?? '';
  }

  listDir(absPath: string): { name: string; isDir: boolean }[] | { error: string } {
    const node = this.resolve(absPath);
    if (!node) return { error: `ls: cannot access '${absPath}': No such file or directory` };
    if (node.type !== 'dir' || !node.children) return { error: `ls: ${absPath}: Not a directory` };
    const entries: { name: string; isDir: boolean }[] = [];
    for (const [name, child] of node.children) {
      entries.push({ name, isDir: child.type === 'dir' });
    }
    return entries;
  }

  isDir(absPath: string): boolean {
    const node = this.resolve(absPath);
    return node !== null && node.type === 'dir';
  }

  isFile(absPath: string): boolean {
    const node = this.resolve(absPath);
    return node !== null && node.type === 'file';
  }

  writeFile(absPath: string, content: string): string | null {
    if (!absPath.startsWith('/tmp')) {
      return `touch: cannot create '${absPath}': Permission denied`;
    }
    const parts = absPath.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    let node: FsNode = this.root;
    for (const part of parts) {
      if (node.type !== 'dir' || !node.children) return `touch: cannot create '${absPath}': No such file or directory`;
      const child = node.children.get(part);
      if (!child) return `touch: cannot create '${absPath}': No such file or directory`;
      node = child;
    }
    if (node.type !== 'dir' || !node.children) return `touch: cannot create '${absPath}': Not a directory`;
    if (!node.children.has(fileName)) {
      node.children.set(fileName, { type: 'file', content });
    } else {
      const existing = node.children.get(fileName)!;
      if (existing.type === 'dir') return `touch: cannot create '${absPath}': Is a directory`;
      existing.content = content;
    }
    return null;
  }

  mkdir(absPath: string): string | null {
    if (!absPath.startsWith('/tmp')) {
      return `mkdir: cannot create directory '${absPath}': Permission denied`;
    }
    const parts = absPath.split('/').filter(Boolean);
    const dirName = parts.pop()!;
    let node: FsNode = this.root;
    for (const part of parts) {
      if (node.type !== 'dir' || !node.children) return `mkdir: cannot create directory '${absPath}': No such file or directory`;
      const child = node.children.get(part);
      if (!child) return `mkdir: cannot create directory '${absPath}': No such file or directory`;
      node = child;
    }
    if (node.type !== 'dir' || !node.children) return `mkdir: cannot create directory '${absPath}': Not a directory`;
    if (node.children.has(dirName)) return `mkdir: cannot create directory '${absPath}': File exists`;
    node.children.set(dirName, { type: 'dir', children: new Map(), writable: true });
    return null;
  }

  /** Tab completion: return matching names for a partial path */
  completePath(partial: string, cwd: string, home: string, dirsOnly: boolean): string[] {
    // Determine the directory to look in and the prefix to match
    let dirPath: string;
    let prefix: string;

    if (partial.includes('/')) {
      const lastSlash = partial.lastIndexOf('/');
      const dirPart = partial.slice(0, lastSlash) || '/';
      prefix = partial.slice(lastSlash + 1);
      dirPath = this.resolvePath(dirPart, cwd, home);
    } else {
      dirPath = this.resolvePath('.', cwd, home);
      prefix = partial;
    }

    const entries = this.listDir(dirPath);
    if ('error' in entries) return [];

    const inputDirPart = partial.includes('/') ? partial.slice(0, partial.lastIndexOf('/') + 1) : '';

    return entries
      .filter((e) => {
        if (dirsOnly && !e.isDir) return false;
        return e.name.toLowerCase().startsWith(prefix.toLowerCase());
      })
      .map((e) => inputDirPart + e.name + (e.isDir ? '/' : ''));
  }
}
