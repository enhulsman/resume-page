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


  // Side pieces made for fun: the homepage's "Other sheets, drawn for fun"
  sidePieces: [
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
