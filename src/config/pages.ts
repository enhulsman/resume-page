// The inner pages' own words (openspec stone-inner-pages, "Copy comes only from config"): the labels
// the layouts and pages typed into their markup, moved here verbatim, and the labels approved for the
// stone inner pages (Ezra, 2026-11-10: "On this page", "Other writing", "View larger", "Close",
// "New message", "Made for fun"). No word changed on the move. Headings that already live elsewhere
// stay there: a page's `h1` is its link label in siteNav, the résumé's name is site.name, /contact's
// heading is siteNav.cta.label, the groups are home.ts' `groups`.

export const pageWords = {
  /** Project pages and posts (src/components/stone/Article.astro and the two layouts). */
  article: {
    stack: 'Stack',
    code: 'Code',
    preview: 'Preview',
    date: 'Date',
    updated: 'Updated',
    reading: 'Reading',
    /** After a post's reading time: "4 min". */
    min: 'min',
    contents: 'On this page',
    otherWriting: 'Other writing',
    viewLarger: 'View larger',
    close: 'Close',
  },
  /** /projects: the line under its heading, ANNA's link to her page, the side pieces' heading. */
  projects: {
    line: 'Detailed write-ups for selected work.',
    caseStudy: 'Case study',
    madeForFun: 'Made for fun',
  },
  /** /blog: the line under its heading. */
  blog: {
    line: 'Notes on infrastructure, tooling, and the occasional detour.',
  },
  /** /resume. */
  resume: {
    /** Joins the role to the company: "Forward Deployed Engineer at Anamata". */
    at: 'at',
    actions: {
      cv: 'Request my full CV',
      email: 'Email me',
      linkedin: 'LinkedIn',
      github: 'GitHub',
    },
    experience: 'Experience',
    /** The first group's heading: "Consultant via Anamata (2023 – present)", the company a link. */
    consulting: { before: 'Consultant via', href: 'https://anamata.nl', since: '2023' },
    prior: 'Prior Experience',
    skills: 'Skills',
    languages: 'Languages',
    education: 'Education',
    certifications: 'Certifications',
    gpa: 'GPA',
    /** A current role's end: "2025 – present". */
    present: 'present',
  },
  /** /contact: the form's window, labels, button, states and messages. */
  contact: {
    window: 'New message',
    name: 'Name',
    email: 'Email',
    message: 'Message',
    /** The honeypot's label, never seen by a person. */
    website: 'Website',
    send: 'Send Message',
    sending: 'Sending...',
    sent: 'Thank you! Your message has been sent successfully. I\'ll get back to you soon.',
    waiting: 'Verification is still loading. Please wait a moment and try again.',
    failed: 'Something went wrong. Please try again.',
    offline: 'Network error. Please check your connection and try again.',
  },
};
