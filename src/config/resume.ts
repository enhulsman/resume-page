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
    items: ['Python', 'Java', 'React/TS/JS', 'Rust', 'C/C++', 'Bash'],
  },
  {
    label: 'Pega Platform',
    badgeClass: 'tertiary',
    items: ['Pega Development', 'PDC', 'Pega Debugging'],
  },
  {
    label: 'Methods & Practices',
    badgeClass: 'secondary',
    items: ['Agile', 'Scrum', 'DevOps', 'CI/CD'],
  },
  {
    label: 'Infrastructure & Tools',
    badgeClass: 'primary',
    items: ['Linux', 'Docker', 'Kubernetes', 'Git', 'SQL', 'Postman'],
  },
];

export const experience: Experience[] = [
  {
    role: 'Pega DevOps Engineer',
    client: 'Major European bank',
    startDate: '2025',
    summary: 'Lead developer of internal operations portal and cross-platform incident resolution.',
    group: 'consulting',
  },
  {
    role: 'Pega DevOps Engineer',
    client: 'Nordic financial regulator',
    startDate: '2024',
    endDate: '2025',
    summary: 'Infrastructure modernization and custom portal development.',
    group: 'consulting',
  },
  {
    role: 'Pega DevOps Engineer',
    client: 'European staffing company',
    startDate: '2023',
    summary: 'Technical operations, system automation, and monitoring tooling.',
    group: 'consulting',
  },
  {
    role: 'Pega Developer',
    client: 'Anamata',
    startDate: '2023',
    summary: 'Internal practice development and platform certification.',
    group: 'consulting',
  },
  {
    role: 'Junior Support Engineer',
    client: 'MovingMedia BV',
    startDate: '2022',
    endDate: '2023',
    summary: 'Technical support and internal automation tooling.',
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
