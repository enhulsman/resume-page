// Employment status types
type EmploymentStatus = 'available' | 'employed-open';

const site = {
  name: 'Ezra Hulsman',
  role: 'DevOps / Pega Engineer',
  company: 'Anamata',
  location: 'Utrecht, NL 🇳🇱',
  quote: '"Proverbs 3:5-7 NIV"',
  quoteUrl: "https://www.bible.com/bible/111/PRO.3.NIV#:~:text=Trust%20in%20the,and%20shun%20evil.", 
  summary: 'Linux-first DevOps Engineer who automates manual workflows with Python & Bash to speed deployments and reduce friction — driven to continuously improve systems and skills.',
  contactMessage: `Send a message and I'll get back to you soon. Whether it's about work opportunities, requesting my full CV, open source projects, or just to chat about Formula 1!`,

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

  // Homepage project showcase cards
  projects: [
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
