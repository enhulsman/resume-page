// The project listings joined to their pages, for components. Vite-only (import.meta.glob);
// the logic and its tests are in src/lib/projects.ts.
import { buildProjects } from './projects.ts';

export const { annaLead, details, register, cards, terminal } = buildProjects(
  import.meta.glob('../pages/projects/*.mdx', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>,
);
export type { Detail, Card } from './projects.ts';
