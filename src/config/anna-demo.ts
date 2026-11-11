// ANNA at work, as Anamata's public site shows her: copied verbatim, with permission, from
// anna-site app/page.tsx, the English `scenarios` entry with id 'week' and the demo's `record`
// heading. Do not reword here: tests/glass-anna-window.test.mjs checks each string against the site.
export const annaDemo = {
  recordHeading: 'What Anna did',
  who: 'Joris',
  person:
    'Close my week. Same split as last week, except Thursday was all on the Rotterdam migration.',
  answer:
    'On it. I’ll build the sheet from last week’s split and Thursday’s tickets, then show you before I submit.',
  steps: [
    'Read last week’s hoursheet: 3 projects, 40 h',
    'Pulled Thursday’s tickets on the Rotterdam migration: 4 tickets, 8 h',
    'Drafted week 43: 38 h across 3 projects',
    'Found Wednesday 14:00–16:00 in your calendar: Rotterdam migration, on site. Not in the sheet yet.',
  ],
  sources: ['Time tracking', 'Ticket board', 'Calendar'],
  question:
    'Week 43 is ready: 38 h over 3 projects. Wednesday 14:00–16:00 is in your calendar as the Rotterdam migration but not in the sheet. Shall I add those 2 h and submit the week for approval?',
  reply: 'Yes, and submit it.',
  result:
    'Submitted. Week 43 is with your manager for approval. If it’s still open on Friday at 16:00, I’ll remind you both here.',
  record: [
    'Hoursheet week 43 written: 40 h',
    'Submitted for approval',
    'Reminder set: Friday 16:00',
  ],
};
