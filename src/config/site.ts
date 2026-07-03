// Employment status types
type EmploymentStatus = 'available' | 'employed-open';

const site = {
  name: 'Ezra Hulsman',
  role: 'DevOps / Pega Engineer',
  company: 'Anamata',
  location: 'Utrecht, NL 🇳🇱',
  quote: '"Proverbs 3:5-7 NIV"',
  quoteUrl: "https://www.bible.com/bible/111/PRO.3.NIV#:~:text=Trust%20in%20the,and%20shun%20evil.", 
  summary: 'Linux-first DevOps Engineer who automates manual workflows with Python & Bash to speed deployments and reduce friction, driven to continuously improve systems and skills.',
  contactMessage: `Send a message and I'll get back to you soon. Whether it's about work opportunities, requesting my full CV, open source projects, or just to chat about Formula 1!`,

  // Cloudflare Turnstile public site key for the contact form. Leave empty to disable the
  // widget (the honeypot + scoped CORS still protect the endpoint). When provisioned, also set
  // the matching secret: npx wrangler secret put TURNSTILE_SECRET
  turnstileSiteKey: '',

  skills: {
    languages: ['Python', 'Bash', 'Java', 'TypeScript'],
    tools: ['Linux', 'Docker', 'K8s', 'Git', 'CI/CD'],
    frameworks: ['React', 'Pega', 'Astro'],
  },

  interests: [
    'Formula 1 🏁', 'Open Source', 'System Tinkering', 'All things Raspberry Pi'
  ],

  careerStart: '2023-09-01',

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
    I'm a DevOps Engineer at Anamata where I work on infrastructure automation and Pega development. 
    At 2 meters tall, I have a good overview of both server racks and code architecture.

    I spend most of my time writing Python and Rust, setting up CI/CD pipelines, and making sure systems 
    don't break at 3 AM. I genuinely enjoy the challenge of building reliable infrastructure and creating 
    tools that make mine and other developers' lives easier.

    In my free time, I work on personal projects like a self-hosted chat TUI in Rust and contribute
    to open source when I can. I'm also a big Formula 1 fan - there's something satisfying about both 
    well-tuned race cars and well-optimized code.
  `,

  // SOURCE OF TRUTH: this array feeds the About-section terminal ONLY (the `ls projects/`
  // and `cat projects/<name>` data in AboutSection.astro / virtual-fs).
  // The homepage showcase cards come from MDX frontmatter `showcase: true` (ProjectsShowcase.astro);
  // the /projects gallery order comes from MDX `order`. Nothing reads a `featured` flag.
  projects: [
    {
      title: 'Claude Sandbox',
      description: 'OS-level sandbox that keeps Claude Code isolated from your filesystem, network, and credentials, even if its own protections fail. Cross-platform via Nix, with a domain-filtering proxy and post-session risk scoring.',
      tech: ['Nix', 'Python', 'Bash', 'Linux'],
      github: 'https://github.com/enhulsman/claude-sandbox',
      link: '/projects/ClaudeSandbox',
    },
    {
      title: 'Anna Assistant',
      description: 'AI assistant living inside Microsoft Teams that unifies a consultancy\'s internal tools behind a single conversational interface. 22 MCP tool integrations, used daily by 30 employees.',
      tech: ['Python', 'Bot Framework', 'Claude', 'MCP'],
      link: '/projects/AnnaAssistant',
    },
    {
      title: 'Homelab Infrastructure',
      description: 'Four devices (Pi 5, Hetzner VPS, Pi 2, WSL workstation) connected by Tailscale, monitored by Prometheus, backed up cross-device nightly. Hardened with a 7-phase zero-trust plan.',
      tech: ['Docker', 'Prometheus', 'Grafana', 'Tailscale', 'Cloudflare', 'Bash', 'Linux'],
      link: '/projects/HomelabInfrastructure',
    },
    {
      title: 'Finance Bot',
      description: 'Discord bot that turns Dutch bank CSV exports into a categorized Google Sheets budget. Regex rules handle the predictable transactions, Claude handles the rest, with an anonymization layer in between.',
      tech: ['Python', 'discord.py', 'Claude', 'Google Sheets API'],
      link: '/projects/FinanceBot',
    },
    {
      title: 'pytaiga-mcp',
      description: 'Open-source PR that got reviewed and merged, adding security hardening, the first test suite, and a refactoring that cut 14% of the server code.',
      tech: ['Python', 'MCP', 'pytest', 'CI/CD'],
      github: 'https://github.com/talhaorak/pytaiga-mcp',
      link: '/projects/PytaigaMcp',
    },
    {
      title: 'Encrypted Chat TUI',
      description: 'Terminal chat system in Rust, built as a Cargo workspace with typed protocols and compile-time SQL. Encryption is the goal, not yet the state.',
      tech: ['Rust', 'Tokio', 'PostgreSQL', 'Docker'],
      github: 'https://github.com/enhulsman',
      link: '/projects/EncryptedChatTUI',
    },
    {
      title: 'Portfolio Site',
      description: 'The site you\'re looking at. Astro, GSAP scroll animations, and a 42-command interactive terminal hidden in the About section.',
      tech: ['Astro', 'TypeScript', 'Tailwind', 'GSAP'],
      link: '/projects/ResumePage',
    },
  ],

  // SEO and social media configuration
  seo: {
    author: 'Ezra Hulsman',
    keywords: 'DevOps Engineer, Pega Developer, Python, Rust, Infrastructure Automation, CI/CD, Kubernetes, Docker, Linux',
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
