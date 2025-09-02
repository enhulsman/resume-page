// Employment status types
type EmploymentStatus = 'available' | 'employed-open';

const site = {
  name: 'Ezra Hulsman',
  role: 'DevOps / Pega Engineer',
  company: 'Anamata',
  location: 'Utrecht, NL 🇳🇱',
  quote: '"Proverbs 3:5-7 NIV"',
  summary: 'Linux-first Junior DevOps Engineer who automates manual workflows with Python & Bash to speed deployments and reduce friction — driven to continuously improve systems and skills.',
  contactMessage: `Send a message and I'll get back to you soon. Whether it's about work opportunities, open source projects, or just to chat about Formula 1!`,
  
  skills: {
    languages: ['Python', 'Rust', 'Bash', 'Java', 'TS/JS'],
    tools: ['Linux', 'Docker', 'K8s', 'Git', 'CI/CD'],
    frameworks: ['React', 'Pega', 'Astro'],
  },
  
  interests: [
    'Formula 1 🏁', 'Open Source', 'System Tinkering', 'All things Raspberry Pi'
  ],

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
    GitHub: 'https://github.com/arc891', // Capitalized brands to keep correct casing
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

    In my free time, I work on personal projects like HackrsChat (a Rust-based chat app) and contribute 
    to open source when I can. I'm also a big Formula 1 fan - there's something satisfying about both 
    well-tuned race cars and well-optimized code.
  `,
};

export default site;
