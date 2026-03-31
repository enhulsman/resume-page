// Shell parser — wraps shell-quote for tokenization and pipeline splitting

import { parse } from 'shell-quote';

export interface ParsedCommand {
  name: string;
  args: string[];
}

export interface ParsedGroup {
  operator: '&&' | ';' | null; // null for first group
  pipeline: ParsedCommand[];
}

export interface ParsedLine {
  groups: ParsedGroup[];
}

interface OpToken {
  op: string;
}

interface GlobToken {
  op: 'glob';
  pattern: string;
}

interface CommentToken {
  comment: string;
}

type ShellToken = string | OpToken | GlobToken | CommentToken;

function isOp(t: ShellToken): t is OpToken {
  return typeof t === 'object' && 'op' in t && !('comment' in t);
}

function isComment(t: ShellToken): t is CommentToken {
  return typeof t === 'object' && 'comment' in t;
}

/** Normalize shell-quote tokens to strings or operator markers */
function normalizeTokens(raw: ShellToken[]): (string | '|' | '&&' | ';')[] {
  const result: (string | '|' | '&&' | ';')[] = [];
  for (const t of raw) {
    if (isComment(t)) break; // Everything after # is ignored
    if (isOp(t)) {
      if (t.op === '|' || t.op === '&&' || t.op === ';') {
        result.push(t.op as '|' | '&&' | ';');
      } else if (t.op === 'glob' && 'pattern' in t) {
        result.push((t as GlobToken).pattern);
      } else if (t.op === '(' || t.op === ')') {
        return ['__ERROR__', 'subshell syntax not supported'];
      } else {
        // Unknown op — coerce to string
        result.push(t.op);
      }
    } else if (typeof t === 'string') {
      result.push(t);
    } else {
      // Unknown object type — coerce
      result.push(String(t));
    }
  }
  return result;
}

export function parseLine(raw: string, env: Record<string, string>): ParsedLine | { error: string } {
  if (!raw.trim()) return { groups: [] };

  let tokens: ShellToken[];
  try {
    tokens = parse(raw, env) as ShellToken[];
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `syntax error: ${msg}` };
  }

  const normalized = normalizeTokens(tokens);

  // Check for parser-level error
  if (normalized.length >= 2 && normalized[0] === '__ERROR__') {
    return { error: normalized[1] };
  }

  // Split by && and ; into groups, then by | into pipelines
  const groups: ParsedGroup[] = [];
  let currentTokens: string[] = [];
  let currentPipeline: ParsedCommand[] = [];
  let currentOperator: '&&' | ';' | null = null;

  function flushCommand() {
    if (currentTokens.length > 0) {
      currentPipeline.push({
        name: currentTokens[0],
        args: currentTokens.slice(1),
      });
      currentTokens = [];
    }
  }

  function flushGroup() {
    flushCommand();
    if (currentPipeline.length > 0) {
      groups.push({ operator: currentOperator, pipeline: currentPipeline });
      currentPipeline = [];
    }
  }

  for (const t of normalized) {
    if (t === '|') {
      flushCommand();
    } else if (t === '&&' || t === ';') {
      flushGroup();
      currentOperator = t;
    } else {
      currentTokens.push(t);
    }
  }
  flushGroup();

  return { groups };
}
