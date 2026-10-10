// Homepage ("Overzicht") copy that has no other home in the site's data.
// The page claims every dimension on it is real: when a number changes here,
// check it against the project's MDX page (src/pages/projects/) first.
// A project's dates, date label, code link, stack and description live in its page's
// frontmatter, not here: src/lib/projects.ts joins them to these listings.
import { education, spokenLanguages } from './resume.ts';

/** /projects groups every project by where it stands, so a lighter treatment reads as paused, not as less. */
export type Group = 'running' | 'paused' | 'done';
export const groups: { id: Group; label: string }[] = [
  { id: 'running', label: 'Running' },
  { id: 'paused', label: 'Paused' },
  { id: 'done', label: 'Done' },
];

export interface DetailListing {
  /** Also selects the drawing in src/components/overzicht/drawings/. */
  id: 'henk' | 'finance' | 'homelab' | 'bible' | 'pytaiga' | 'sandbox';
  title: string;
  text: string;
  /** Strongest first: the homepage shows the first, /projects the first two. */
  dims: { value: string; label: string }[];
  /** Its one line, for where it is listed rather than drawn. */
  what: string;
  group: Group;
  /** Its page in src/pages/projects/. */
  href: string;
}

/** ANNA's levels below the room, as the homepage labels them; /projects labels its plate the same way. */
export const annaLevels = [
  { id: 'identity', name: '−1 Identity', text: 'Entra ID, profile, history, memories. Everything is per user.' },
  { id: 'claude', name: '−2 Claude', text: 'Two backends behind one interface: Claude Code streaming as a subprocess, or the Anthropic API.' },
  { id: 'connectors', name: '−3 MCP connectors', text: 'Loket for leave, ClockWise for hours, plus ANNA\'s own tools for memory, reminders and documents.' },
  { id: 'ops', name: '−4 Operations', text: 'Health checks, a log analyser, alerts before tokens expire, an admin portal.' },
];

/** ANNA on /projects, where it leads the set; its drawing is the homepage's section, turned. */
export const annaLead = {
  id: 'anna',
  title: 'ANNA',
  text: 'Anamata\'s AI assistant in Microsoft Teams: per-user memory, documents and MCP connectors, in production',
  href: '/projects/AnnaAssistant',
};

/** The two drawn in full on the homepage; the others are its cards. */
export const homeDrawn: DetailListing['id'][] = ['henk', 'finance'];

export const details: DetailListing[] = [
  {
    id: 'henk',
    title: 'Henk, homelab agent',
    text: 'A security-first agent on the Claude Agent SDK that turns infrastructure alerts into Signal conversations. Its default-deny toolset refused a live prompt-injection payload, and it replays events exactly once across hard container kills.',
    dims: [
      { value: '4', label: 'egress ports, zero inbound' },
      { value: '3,660', label: 'tests, SDK mocked out' },
    ],
    what: 'Security-first homelab agent on the Claude Agent SDK, talking over Signal',
    group: 'running',
    href: '/projects/Henk',
  },
  {
    id: 'finance',
    title: 'Finance Bot',
    text: 'A Discord bot that turns our bank exports into a monthly household budget. About 40 rules handle the predictable transactions, Claude handles the rest, and anything it isn\'t sure of is written flagged instead of guessed.',
    dims: [
      { value: '0.75', label: 'confidence; below it, a row is flagged' },
      { value: '~40', label: 'rules before Claude is asked' },
      { value: '40', label: 'transactions per Claude batch' },
    ],
    what: 'Discord bot that turns bank exports into a categorized budget, with Claude for the hard cases',
    group: 'running',
    href: '/projects/FinanceBot',
  },
  {
    id: 'homelab',
    title: 'Homelab infrastructure',
    text: 'Three servers and my workstation on a Tailscale mesh, fronted by Cloudflare tunnels, so no home device has a public port. Prometheus watches the servers, DNS resolves recursively with DNSSEC on each of them, and backups cross devices every night.',
    dims: [
      { value: '4', label: 'machines, one mesh' },
      { value: '7', label: 'scrape targets' },
      { value: '19', label: 'alert rules, in Grafana' },
    ],
    what: 'Three servers and a workstation on a Tailscale mesh behind Cloudflare tunnels, with Prometheus, recursive DNS and nightly cross-device backups',
    group: 'running',
    href: '/projects/HomelabInfrastructure',
  },
  {
    id: 'bible',
    title: 'bible-tui',
    text: 'A terminal Bible reader in Rust with three translations built in. The same UI code runs in the browser: the web port is 102 lines, and the three bugs it surfaced are fixed on a fork of its web backend.',
    dims: [
      { value: '102', label: 'lines to put it in the browser' },
      { value: '3', label: 'translations, nothing leaves the device' },
      { value: '13.3 MB', label: 'of WASM, scripture included' },
    ],
    what: 'Terminal Bible reader in Rust, running in the browser on the same UI code',
    group: 'paused',
    href: '/projects/BibleTui',
  },
  {
    id: 'pytaiga',
    title: 'pytaiga-mcp',
    text: 'A merged pull request to an open-source MCP server for Taiga: credentials masked everywhere with SecretStr, one helper in place of duplicated error handling, response filtering that takes a story list from about 50 fields to 5, and the project\'s first test suite.',
    dims: [
      { value: '11', label: 'tests, the first' },
      { value: '3', label: 'Python versions in CI' },
      { value: '50 → 5', label: 'fields per story in a list' },
    ],
    what: 'A merged pull request to an open-source MCP server for Taiga',
    group: 'done',
    href: '/projects/PytaigaMcp',
  },
  {
    id: 'sandbox',
    title: 'Claude Sandbox',
    text: 'An OS-level sandbox around Claude Code, independent of its built-in protections: kernel isolation, a filtering egress proxy, and an analysis of every session afterwards. Pure stdlib Python and awk, packaged with Nix for Linux and macOS.',
    dims: [
      { value: '3,700', label: 'lines of shell and Python' },
      { value: '0–100', label: 'risk score per session' },
      { value: '13+', label: 'kinds of sensitive path hidden' },
    ],
    what: 'An OS-level sandbox around Claude Code: kernel isolation, a filtering egress proxy and a risk score per session',
    group: 'done',
    href: '/projects/ClaudeSandbox',
  },
];

/** The projects without a drawing yet, each with a project page; they show as cards. */
export interface CardListing { title: string; href: string; what: string; group: Group; /** Left off the homepage's cards. */ hideOnHome?: boolean; }
export const register: CardListing[] = [
  { title: 'Encrypted Chat TUI', href: '/projects/EncryptedChatTUI', what: 'Self-hosted terminal chat in Rust: Tokio, a typed ndjson protocol, checked SQL', group: 'paused' },
  { title: 'This site', href: '/projects/ResumePage', what: 'Static-first Astro portfolio on Cloudflare Workers', group: 'running', hideOnHome: true }, // you are on it
];

/** The skills, as a drawing's materials schedule. */
export const materials: [string, string][] = [
  ['Languages', 'Python, Bash, Java, TypeScript, Rust'],
  ['AI and agents', 'AI deployment, AI agents, MCP, Claude, Claude Agent SDK'],
  ['Infrastructure', 'Linux, Docker, Kubernetes, Git, CI/CD, Prometheus, Grafana, Cloudflare'],
  ['Frameworks', 'React, Astro'],
  ['Methods', 'Tests first, specs, Scrum, DevOps, IaC, monitoring'],
];

export const specification: [string, string][] = [
  ['Education', ((e) => `${e.degree}, ${e.institution}, ${e.startYear} – ${e.endYear}, GPA ${e.gpa}`)(education[0])],
  ['Certified', 'Professional Scrum Master I, Pega CPSA 8.8 and CPBA 8.8 (2023), Cambridge Proficiency (2018)'],
  ['Speaks', spokenLanguages.map(l => `${l.name} (${l.level.toLowerCase()})`).join(', ')],
];

/** About, as the drawing's general notes. The terminal sits on the first sheet, beside the photo. */
export const notes = [
  'Forward Deployed Engineer at Anamata. Owns ANNA, its AI assistant in Microsoft Teams, and much of what\'s built around it.',
  'At 2 meters tall, has a good overview of both the codebase and the room it\'s deployed in.',
  'Works mostly in Python, connecting ANNA to the tools teams already use and keeping it secure and reliable in production.',
  'Came to AI coding agents as a sceptic. They now write much of the code; it\'s still built tests first, with a spec for anything bigger, and nothing ships that can\'t be explained.',
  'Builds side projects in spare time, like Henk, a homelab agent, and a terminal Bible reader in Rust, and contributes to open source.',
  'Formula 1 fan: well-tuned race cars and well-optimized code are satisfying in the same way.',
];
