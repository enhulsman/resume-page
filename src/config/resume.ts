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
  /** The shorter line the homepage's revision table shows; `summary` stays the CV's. */
  homeSummary: string;
  /** Only where the homepage words the role differently. */
  homeRole?: string;
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
    label: 'AI & Agents',
    badgeClass: 'tertiary',
    items: ['AI Deployment', 'AI Agents', 'Model Context Protocol (MCP)', 'Claude', 'Technical Consultation'],
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
  {
    label: 'Pega Platform',
    badgeClass: 'tertiary',
    items: ['Pega Development', 'PDC', 'Pega Debugging'],
  },
];

export const experience: Experience[] = [
  {
    role: 'Forward Deployed Engineer',
    client: 'Anamata',
    startDate: '2025',
    summary: 'Owns ANNA, Anamata\'s AI assistant in Microsoft Teams, end to end: Python, Claude and MCP, including connectors to the systems people already use. With it, staff request leave, log hours or search policy documents without switching apps. Half the job is engineering, the other half is working with the people who use it and looking after ANNA in production, from security to EU AI Act transparency. Also built the anamata.ai website and is laying the groundwork for rolling ANNA out to other companies.',
    homeSummary: 'Owns ANNA, Anamata\'s AI assistant in Microsoft Teams, end to end: Python, Claude and MCP, including connectors to the systems people already use. Staff request leave, log hours or search policy documents without switching apps. Also built the anamata.ai website and is laying the groundwork for rolling ANNA out to other companies.',
    relatedProject: 'AnnaAssistant',
    group: 'consulting',
  },
  {
    role: 'DevOps & Software Engineer',
    client: 'Major European bank',
    startDate: '2025',
    summary: 'Sole developer of an enterprise self-service portal (React, Node.js, Oracle) used by ~20 tenants across 80+ Pega environments for pipeline management via Azure DevOps, operational audit logging, and ServiceNow ticketing. Manages incident resolution, platform upgrades, and infrastructure operations across multi-tenant DTAP environments using Ansible and AWX.',
    homeSummary: 'Sole developer of an enterprise self-service portal (React, Node.js, Oracle) used by about 20 tenants across 80+ Pega environments, for pipelines through Azure DevOps, audit logging and ServiceNow ticketing. Incidents, upgrades and multi-tenant DTAP operations with Ansible and AWX.',
    group: 'consulting',
  },
  {
    role: 'Platform & Software Engineer',
    client: 'Nordic financial regulator',
    startDate: '2024',
    endDate: '2025',
    summary: 'Replaced a legacy VM-based Pega setup — where only 2.5 of 150 planned case types had shipped in 4 years — with four fresh containerized DTAP environments on self-hosted Kubernetes (~18 pods each, including Kafka and SRS). Built and integrated a React portal backed by Pega\'s DX API with a custom OIDC flow, unifying internal and external access under strict network-separation policies and reducing the case type footprint from 150 to ~25.',
    homeSummary: 'Replaced a legacy VM-based setup, where 2.5 of 150 planned case types had shipped in four years, with four containerized DTAP environments on self-hosted Kubernetes. Built a React portal on Pega\'s DX API with a custom OIDC flow, and cut the case types from 150 to about 25.',
    group: 'consulting',
  },
  {
    role: 'DevOps Engineer',
    client: 'European staffing company',
    startDate: '2023',
    endDate: '2024',
    summary: 'Solo-built a Java/Playwright automation that replaced a daily 10–15 minute manual health report across ~50 VMs, with CI/CD-triggered email delivery, Teams alerts, and an issue-annotation page. Created a Bash maintenance toolbox of scheduled scripts to prevent storage exhaustion and piped PDC notifications into Teams channels. Still on call for occasional work.',
    homeSummary: 'Replaced a daily 10 to 15 minute manual health report across about 50 VMs with a Java and Playwright automation, delivered by CI/CD with Teams alerts. A Bash toolbox of scheduled scripts keeps storage from running out. Still on call for occasional work.',
    group: 'consulting',
  },
  {
    role: 'Pega DevOps Engineer',
    client: 'Anamata',
    startDate: '2023',
    summary: 'Joined Anamata as a Pega DevOps Engineer, still my title on paper. The bank, regulator and staffing company roles above are that work. Earned the Pega Certified System Architect and Business Architect certifications in 2023.',
    homeSummary: 'Joined Anamata as a Pega DevOps Engineer, still my title on paper. The bank, regulator and staffing company roles above are that work. Pega Certified System Architect and Business Architect, 2023.',
    group: 'consulting',
  },
  {
    role: 'Junior Support Engineer',
    client: 'MovingMedia BV',
    startDate: '2022',
    endDate: '2023',
    summary: 'Replaced plaintext password storage in documentation with a Python encryption tool (XOR with keys from Python\'s secrets module) on a secure remote VPS. Maintained client Synology NAS infrastructure and provided technical support.',
    homeSummary: 'Replaced plaintext passwords in documentation with a Python encryption tool on a secure remote VPS. Looked after client Synology NAS infrastructure.',
    group: 'prior',
  },
  {
    role: 'Tutoring Teacher',
    client: 'Self-employed',
    startDate: '2019',
    endDate: '2022',
    summary: 'Mathematics, Physics, Chemistry, and Economics.',
    homeSummary: 'Mathematics, physics, chemistry and economics.',
    homeRole: 'Tutoring teacher',
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
