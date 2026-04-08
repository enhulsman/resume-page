export interface SkillCategory {
  label: string;
  badgeClass: 'primary' | 'secondary' | 'tertiary';
  items: string[];
}

export interface SpokenLanguage {
  name: string;
  level: string;
}

export interface Experience {
  role: string;
  client: string;
  startDate: string;
  endDate?: string;
  summary: string;
  relatedProject?: string;
  group: 'consulting' | 'prior';
}

export interface Education {
  degree: string;
  institution: string;
  startYear: number;
  endYear: number;
  result?: string;
  gpa?: string;
}

export interface Certification {
  name: string;
  institution: string;
  year: number;
  credential?: string;
}

export const spokenLanguages: SpokenLanguage[] = [
  { name: 'Dutch', level: 'Native' },
  { name: 'English', level: 'Fluent' },
];

export const skillCategories: SkillCategory[] = [
  {
    label: 'Programming',
    badgeClass: 'primary',
    items: ['Python', 'Java', 'TypeScript', 'React', 'Bash', 'Rust', 'C/C++ (academic)'],
  },
  {
    label: 'Pega Platform',
    badgeClass: 'tertiary',
    items: ['Pega Development', 'PDC', 'Pega Debugging'],
  },
  {
    label: 'Methods & Practices',
    badgeClass: 'secondary',
    items: ['Agile', 'Scrum', 'Kanban', 'DevOps', 'CI/CD', 'IaC', 'Monitoring'],
  },
  {
    label: 'Infrastructure & Tools',
    badgeClass: 'primary',
    items: ['Linux', 'Docker', 'Kubernetes', 'Git', 'SQL', 'Prometheus', 'Grafana', 'Cloudflare'],
  },
];

export const experience: Experience[] = [
  {
    role: 'DevOps & Software Engineer',
    client: 'Major European bank',
    startDate: '2025',
    summary: 'Sole developer of an enterprise self-service portal (React, Node.js, Oracle) used by ~20 tenants across 80+ Pega environments for pipeline management via Azure DevOps, operational audit logging, and ServiceNow ticketing. Manages incident resolution, platform upgrades, and infrastructure operations across multi-tenant DTAP environments using Ansible and AWX.',
    group: 'consulting',
  },
  {
    role: 'Platform & Software Engineer',
    client: 'Nordic financial regulator',
    startDate: '2024',
    endDate: '2025',
    summary: 'Replaced a legacy VM-based Pega setup — where only 2.5 of 150 planned case types had shipped in 4 years — with four fresh containerized DTAP environments on self-hosted Kubernetes (~18 pods each, including Kafka and SRS). Built and integrated a React portal backed by Pega\'s DX API with a custom OIDC flow, unifying internal and external access under strict network-separation policies and reducing the case type footprint from 150 to ~25.',
    group: 'consulting',
  },
  {
    role: 'DevOps Engineer',
    client: 'European staffing company',
    startDate: '2023',
    summary: 'Solo-built a Java/Playwright automation that replaced a daily 10–15 minute manual health report across ~50 VMs, with CI/CD-triggered email delivery, Teams alerts, and an issue-annotation page. Created a Bash maintenance toolbox of scheduled scripts to prevent storage exhaustion and piped PDC notifications into Teams channels.',
    group: 'consulting',
  },
  {
    role: 'Pega Developer',
    client: 'Anamata',
    startDate: '2023',
    summary: 'Solo-built Anna — a conversational AI assistant (Python, Claude, MCP) that unifies a consultancy\'s internal tools behind a single chat interface, giving employees natural-language access to leave tracking, case management, seat booking, and company policy instead of switching between separate apps. Also earned Pega System Architect and Business Architect certifications during this period.',
    group: 'consulting',
  },
  {
    role: 'Junior Support Engineer',
    client: 'MovingMedia BV',
    startDate: '2022',
    endDate: '2023',
    summary: 'Replaced plaintext password storage in documentation with a Python-based OTP encryption system using XOR with random bitstrings on a secure remote VPS. Maintained client Synology NAS infrastructure and provided technical support.',
    group: 'prior',
  },
  {
    role: 'Tutoring Teacher',
    client: 'Self-employed',
    startDate: '2019',
    endDate: '2022',
    summary: 'Mathematics, Physics, Chemistry, and Economics.',
    group: 'prior',
  },
];

export const education: Education[] = [
  {
    degree: 'BSc Computer Science',
    institution: 'Vrije Universiteit Amsterdam',
    startYear: 2020,
    endYear: 2023,
    result: 'Diploma',
    gpa: '8.0',
  },
  {
    degree: 'VWO 6 (VAVO)',
    institution: 'Nova College',
    startYear: 2019,
    endYear: 2020,
    result: 'Diploma',
  },
  {
    degree: 'VWO',
    institution: 'Kaj Munk College',
    startYear: 2013,
    endYear: 2019,
  },
];

export const certifications: Certification[] = [
  {
    name: 'Professional Scrum Master I',
    institution: 'Scrum.org',
    year: 2023,
    credential: 'PSM I',
  },
  {
    name: 'Pega Certified System Architect 8.8',
    institution: 'PegaSystems',
    year: 2023,
    credential: 'CPSA 8.8',
  },
  {
    name: 'Pega Certified Business Architect 8.8',
    institution: 'PegaSystems',
    year: 2023,
    credential: 'CPBA 8.8',
  },
  {
    name: 'Cambridge Proficiency Exam',
    institution: 'Cambridge',
    year: 2018,
    credential: 'CPE',
  },
];
