// Employment status types
type EmploymentStatus = 'available' | 'employed-open';

const site = {
  name: 'Ezra Hulsman',
  url: 'https://hulsman.dev',
  role: 'Forward Deployed Engineer',
  company: 'Anamata',
  location: 'Utrecht, NL 🇳🇱',
  quote: '"Proverbs 3:5-7 NIV"',
  quoteUrl: "https://www.bible.com/bible/111/PRO.3.NIV#:~:text=Trust%20in%20the,and%20shun%20evil.", 
  summary: 'Forward Deployed Engineer building ANNA, an AI assistant in Microsoft Teams, and making it work for the people who use it. Python, AI agents and MCP, on a Linux and DevOps foundation.',
  contactMessage: `Send a message and I'll get back to you soon. Whether it's about work opportunities, requesting my full CV, open source projects, or just to chat about Formula 1!`,

  skills: {
    languages: ['Python', 'Bash', 'Java', 'TypeScript'],
    tools: ['Linux', 'Docker', 'K8s', 'Git', 'CI/CD'],
    frameworks: ['React', 'Astro', 'Claude Agent SDK'],
  },

  interests: [
    'Formula 1 🏁', 'Open Source', 'System Tinkering', 'All things Raspberry Pi'
  ],

  careerStart: '2023-09-01',

  // Cloudflare Turnstile site key (public by design; the secret lives in Worker secrets).
  turnstileSiteKey: '0x4AAAAAAE9MuQn91qx05gcz',

  employment: {
    status: 'employed-open' as EmploymentStatus,
    message: {
      'available': 'Available for new opportunities',
      'employed-open': 'Currently employed • Open to connect'
    } as Record<EmploymentStatus, string>
  },

  social: {
    email: 'info@hulsman.dev',
    website: 'https://hulsman.dev',
    GitHub: 'https://github.com/enhulsman',
    LinkedIn: 'https://www.linkedin.com/in/ezra-hulsman',
    employer: 'https://anamata.nl',
    // Twitter: 'https://twitter.com/yourname',
    // Mastodon: 'https://mastodon.social/@yourname',
  },

  about: `
    I'm a Forward Deployed Engineer at Anamata, where I own ANNA, our AI assistant in Microsoft Teams,
    and much of what we build around it. At 2 meters tall, I have a good overview of both the codebase
    and the room it gets deployed in.

    Most of that work is Python, connecting ANNA to the tools teams already use, and keeping it secure
    and reliable in production. I came to AI coding agents as a sceptic. Now they write a lot of
    my code, and I still build like one: tests first, a spec for anything bigger, and nothing ships that
    I can't explain.

    In my free time, I work on personal projects like a self-hosted chat TUI in Rust and contribute
    to open source when I can. I'm also a big Formula 1 fan - there's something satisfying about both 
    well-tuned race cars and well-optimized code.
  `,

  // Homepage project showcase cards
  projects: [
    {
      title: 'Henk — Homelab Agent',
      description: 'Security-first homelab agent on the Claude Agent SDK: default-deny toolset that refused a live prompt-injection payload, exactly-once event replay across restarts, cadence state surviving redeploys.',
      tech: ['Python', 'Claude Agent SDK', 'Docker', 'Signal', 'Tailscale'],
      github: 'https://github.com/enhulsman/henk',
      link: '/projects/Henk',
      featured: true,
    },
    {
      title: 'Claude Sandbox',
      description: 'Defense-in-depth sandbox isolating Claude Code with network namespaces, filesystem bind mounts, a domain-filtering egress proxy, and cross-platform Nix packaging.',
      tech: ['Nix', 'Python', 'Bash', 'Linux'],
      github: 'https://github.com/enhulsman/claude-sandbox',
      link: '/projects/ClaudeSandbox',
      featured: true,
    },
    {
      title: 'pytaiga-mcp',
      description: 'Merged PR adding security hardening, centralized error handling (14% code reduction), and the project\'s first test suite to a Taiga MCP server.',
      tech: ['Python', 'MCP', 'pytest', 'CI/CD'],
      github: 'https://github.com/talhaorak/pytaiga-mcp',
      link: '/projects/PytaigaMcp',
      featured: true,
    },
    {
      title: 'Encrypted Chat TUI',
      description: 'Self-hosted terminal chat system built as a Cargo workspace with Tokio async networking, a typed ndjson protocol, and compile-time checked PostgreSQL queries.',
      tech: ['Rust', 'Tokio', 'PostgreSQL', 'Docker'],
      github: 'https://github.com/enhulsman',
      link: '/projects/EncryptedChatTUI',
      featured: false,
    },
    {
      title: 'Portfolio Site',
      description: 'Config-driven portfolio with MDX auto-discovery, multi-theme support, dynamic OG images, and server-side form handling on Cloudflare Workers.',
      tech: ['Astro', 'TypeScript', 'Tailwind', 'GSAP'],
      link: '/projects/ResumePage',
      featured: false,
    },
    {
      title: 'Homelab Infrastructure',
      description: 'Three-device hybrid cloud-home infrastructure with automated cross-device backups, Prometheus monitoring and alerting, recursive DNSSEC resolution, and Cloudflare Zero Trust networking',
      tech: ['Docker', 'Prometheus', 'Grafana', 'Tailscale', 'Cloudflare', 'Bash', 'Linux'],
      link: '/projects/HomelabInfrastructure',
      featured: true,
    },
  ],

  // Side pieces made for fun: the homepage's "Other sheets, drawn for fun"
  sidePieces: [
    { url: 'https://bible.hulsman.dev', line: 'A terminal Bible reader in Rust, running in the browser' },
    { url: 'https://flag.hulsman.dev', line: '781 one-minute chess games, drawn as time' },
    { url: 'https://sleep.hulsman.dev', line: 'One night of sleep, drawn' },
    { url: 'https://wordle.hulsman.dev', line: 'A word game' },
  ],

  // SEO and social media configuration
  seo: {
    author: 'Ezra Hulsman',
    keywords: 'Forward Deployed Engineer, AI Agents, AI Deployment, Model Context Protocol, MCP, Microsoft Teams, Python, DevOps, Linux, Docker',
    robots: 'index, follow',
    ogImage: '/og-image.png',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterCreator: '',
    twitterSite: '',
    baseUrl: 'https://hulsman.dev',
  },
};

export default site;
