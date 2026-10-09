// Homepage ("Overzicht") copy that has no other home in the site's data.
// The page claims every dimension on it is real: when a number changes here,
// check it against the project's MDX page (src/pages/projects/) first.

/** /projects groups every project by where it stands, so a lighter treatment reads as paused, not as less. */
export type Group = 'running' | 'paused' | 'done';
export const groups: { id: Group; label: string }[] = [
  { id: 'running', label: 'Running' },
  { id: 'paused', label: 'Paused' },
  { id: 'done', label: 'Done' },
];

export interface Detail {
  /** Also selects the drawing in src/components/overzicht/drawings/. */
  id: 'henk' | 'finance' | 'homelab' | 'bible' | 'pytaiga' | 'sandbox';
  title: string;
  text: string;
  /** Strongest first: the homepage shows the first, /projects the first two. */
  dims: { value: string; label: string }[];
  /** Its one line and status, for where it is listed rather than drawn. */
  what: string;
  status: string;
  group: Group;
  caseStudy: string;
  code?: string;
}

/** ANNA's levels below the room, as the homepage labels them; /projects labels its plate the same way. */
export const annaLevels = [
  { id: 'identity', name: '−1 Identity', text: 'Entra ID, profile, history, memories. Everything is per user.' },
  { id: 'claude', name: '−2 Claude', text: 'Two backends behind one interface: Claude Code streaming as a subprocess, or the Anthropic API.' },
  { id: 'connectors', name: '−3 MCP connectors', text: 'Loket for leave, ClockWise for hours, plus ANNA\'s own tools for memory, reminders and documents.' },
  { id: 'ops', name: '−4 Running it', text: 'Health checks, a log analyser, alerts before tokens expire, an admin portal.' },
];

/** ANNA on /projects, where it leads the set; its drawing is the homepage's section, turned. */
export const annaLead = {
  id: 'anna',
  title: 'ANNA',
  text: 'Anamata\'s AI assistant in Microsoft Teams: per-user memory, documents and MCP connectors, in production',
  status: 'In development since Dec 2025',
  caseStudy: '/projects/AnnaAssistant',
};

/** The two drawn in full on the homepage; the others are its cards. */
export const homeDrawn: Detail['id'][] = ['henk', 'finance'];

export const details: Detail[] = [
  {
    id: 'henk',
    title: 'Henk, homelab agent',
    text: 'A security-first agent on the Claude Agent SDK that turns infrastructure alerts into Signal conversations. Its default-deny toolset refused a live prompt-injection payload, and it replays events exactly once across hard container kills.',
    dims: [
      { value: '4', label: 'egress ports, zero inbound' },
      { value: '3,660', label: 'tests, SDK mocked out' },
    ],
    what: 'Security-first homelab agent on the Claude Agent SDK, talking over Signal',
    status: 'Running since Jul 2026',
    group: 'running',
    caseStudy: '/projects/Henk',
    code: 'https://github.com/enhulsman/henk',
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
    status: 'Running since Jul 2025',
    group: 'running',
    caseStudy: '/projects/FinanceBot',
  },
  {
    id: 'homelab',
    title: 'Homelab infrastructure',
    text: 'Three devices on a Tailscale mesh, fronted by Cloudflare tunnels, so no home device has a public port. Prometheus watches all of them, DNS resolves recursively with DNSSEC on every box, and backups cross devices every night.',
    dims: [
      { value: '4', label: 'machines, one mesh' },
      { value: '7', label: 'scrape targets' },
      { value: '19', label: 'alert rules, in Grafana' },
    ],
    what: 'Three devices on a Tailscale mesh behind Cloudflare tunnels, with Prometheus, recursive DNS and nightly cross-device backups',
    status: 'Operating since Jun 2025',
    group: 'running',
    caseStudy: '/projects/HomelabInfrastructure',
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
    status: 'Online since Apr 2026',
    group: 'paused',
    caseStudy: '/projects/BibleTui',
    code: 'https://github.com/enhulsman/bible-tui',
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
    status: 'Merged Jan 2026',
    group: 'done',
    caseStudy: '/projects/PytaigaMcp',
    code: 'https://github.com/talhaorak/pytaiga-mcp',
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
    status: 'Released Feb 2026, now retired',
    group: 'done',
    caseStudy: '/projects/ClaudeSandbox',
    code: 'https://github.com/enhulsman/claude-sandbox',
  },
];

/** The projects without a drawing yet, each with a project page; they show as cards. */
export interface Card { title: string; href: string; what: string; status: string; group: Group; }
export const register: Card[] = [
  { title: 'Encrypted Chat TUI', href: '/projects/EncryptedChatTUI', what: 'Self-hosted terminal chat in Rust: Tokio, a typed ndjson protocol, checked SQL', status: 'Started Aug 2024', group: 'paused' },
  { title: 'This site', href: '/projects/ResumePage', what: 'Static-first Astro portfolio on Cloudflare Workers', status: 'Online since Aug 2025', group: 'running' },
];

/** Every project as a card, the drawn ones included, in /projects' group order. */
export const asCards = (): Card[] => groups.flatMap(g => [
  ...details.filter(d => d.group === g.id).map(d => ({ title: d.title, href: d.caseStudy, what: d.what, status: d.status, group: d.group })),
  ...register.filter(r => r.group === g.id),
]);

/** The skills, as a drawing's materials schedule. */
export const materials: [string, string][] = [
  ['Languages', 'Python, Bash, Java, TypeScript, Rust'],
  ['AI and agents', 'AI deployment, AI agents, MCP, Claude, Claude Agent SDK'],
  ['Infrastructure', 'Linux, Docker, Kubernetes, Git, CI/CD, Prometheus, Grafana, Cloudflare'],
  ['Frameworks', 'React, Astro'],
  ['Methods', 'Tests first, specs, Scrum, DevOps, IaC, monitoring'],
];

export const specification: [string, string][] = [
  ['Education', 'BSc Computer Science, Vrije Universiteit Amsterdam, 2020 – 2023, GPA 8.0'],
  ['Certified', 'Professional Scrum Master I, Pega CPSA 8.8 and CPBA 8.8 (2023), Cambridge Proficiency (2018)'],
  ['Speaks', 'Dutch (native), English (fluent)'],
];

/** About, as the drawing's general notes. The terminal sits on the first sheet, beside the photo. */
export const notes = [
  'I\'m a Forward Deployed Engineer at Anamata, where I own ANNA, our AI assistant in Microsoft Teams, and much of what we build around it.',
  'At 2 meters tall, I have a good overview of both the codebase and the room it gets deployed in.',
  'Most of that work is Python: connecting ANNA to the tools teams already use, and keeping it secure and reliable in production.',
  'I came to AI coding agents as a sceptic. Now they write a lot of my code, and I still build like one: tests first, a spec for anything bigger, and nothing ships that I can\'t explain.',
  'In my free time I work on personal projects like a self-hosted chat TUI in Rust, and contribute to open source when I can.',
  'I\'m a big Formula 1 fan. There\'s something satisfying about both well-tuned race cars and well-optimized code.',
];
