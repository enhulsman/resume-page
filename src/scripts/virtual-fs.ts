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
    const homeDir: Map<string, FsNode> = new Map([
      ['.profile', { type: 'file', content: `${s.name} — ${s.role} @ ${s.company}\n${s.location}` }],
      ['resume', { type: 'file', content: SENTINEL_EXPERIENCE }],
      ['skills', { type: 'file', content: SENTINEL_SKILLS }],
      ['education', { type: 'file', content: SENTINEL_EDUCATION }],
      ['certs', { type: 'file', content: SENTINEL_CERTS }],
      ['projects', { type: 'dir', children: projectDir }],
    ]);

    // Build /etc/
    const etcDir: Map<string, FsNode> = new Map([
      ['role', { type: 'file', content: `${s.role} @ ${s.company}` }],
    ]);

    // Build /proc/
    const procDir: Map<string, FsNode> = new Map([
      ['height', { type: 'file', content: '2.00m — good overview of server racks' }],
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
