import type { Section, SectionType } from './config';

export interface SectionInfo {
  label: string;
  description: string;
}

export const SECTION_INFO: Record<SectionType, SectionInfo> = {
  title: { label: 'Title page', description: 'Title and owner details in case it gets lost' },
  index: { label: 'Index', description: 'Table of contents: topic and page number' },
  year: { label: 'Year calendar', description: '12 months on one page' },
  'future-log': { label: 'Future log', description: 'Half a year of plans on a spread' },
  months: { label: 'Monthly calendar', description: 'Grid of weeks with ISO numbers' },
  weeks: { label: 'Weeks', description: 'A week on a spread, a box per day' },
  daily: { label: 'Daily pages', description: 'Date, three priorities and room for notes' },
  birthdays: {
    label: 'Birthday calendar',
    description: 'Perpetual: months without weekdays, for every year',
  },
  habits: { label: 'Habit tracker', description: 'Days of the month × habits to tick' },
  pixels: { label: 'Year in pixels', description: 'A square for every day of the year' },
  'one-line': {
    label: 'One line a day',
    description: 'The same day over several years, a line per year',
  },
  workout: { label: 'Workout log', description: 'Exercises, sets, reps, weight' },
  budget: { label: 'Expenses', description: 'Expense table and monthly summary' },
  todo: { label: 'To-do list', description: 'Checkboxes to tick' },
  packing: { label: 'Packing list', description: 'Groups of items with checkboxes' },
  shopping: { label: 'Shopping list', description: 'Store departments, checkboxes and quantity' },
  reading: { label: 'Books', description: 'Title, author and a rating in circles' },
  watchlist: { label: 'Movies and series', description: 'To watch: title, year, rating' },
  contacts: { label: 'Contacts', description: 'Name, phone, e-mail, address' },
  cornell: { label: 'Cornell notes', description: 'Cues, notes and summary' },
  meeting: { label: 'Meeting notes', description: 'Topic, attendees, notes and actions' },
  project: { label: 'Project', description: 'Goal, deadline, steps and notes' },
  travel: { label: 'Travel journal', description: 'Place, weather, route and a ticket box' },
  tasting: { label: 'Tasting notes', description: 'Coffee, wine, tea, beer: flavours and rating' },
  meals: { label: 'Meal plan', description: 'A week of meals and a shopping list' },
  notes: { label: 'Note pages', description: 'Plain pages with the chosen grid' },
};

export interface SectionCategory {
  id: string;
  label: string;
  types: SectionType[];
}

// Categories organise the list in the panel; the page order in the notebook is set separately.
export const SECTION_CATEGORIES: SectionCategory[] = [
  { id: 'basics', label: 'Basics', types: ['title', 'index', 'notes'] },
  {
    id: 'calendar',
    label: 'Calendar',
    types: ['year', 'future-log', 'months', 'weeks', 'daily', 'birthdays'],
  },
  {
    id: 'trackers',
    label: 'Trackers',
    types: ['habits', 'pixels', 'one-line', 'workout', 'budget'],
  },
  {
    id: 'lists',
    label: 'Lists',
    types: ['todo', 'packing', 'shopping', 'reading', 'watchlist', 'contacts'],
  },
  { id: 'work', label: 'Work and study', types: ['cornell', 'meeting', 'project'] },
  { id: 'hobby', label: 'Travel and home', types: ['travel', 'tasting', 'meals'] },
];

// days of the month in a leap year (one line a day includes 29 February)
const LEAP_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function oneLineDays(startMonth: number, count: number): number {
  let days = 0;
  for (let i = 0; i < count; i++) days += LEAP_DAYS[(startMonth - 1 + i) % 12]!;
  return days;
}

// Approximate page count of a section (without blank pages that align to a spread).
export function estimatePages(s: Section): number {
  switch (s.type) {
    case 'title':
    case 'year':
    case 'pixels':
      return 1;
    case 'future-log':
      return 2;
    case 'weeks':
      return 2 * s.count;
    case 'months':
    case 'habits':
    case 'budget':
    case 'daily':
    case 'meals':
      return s.count;
    case 'birthdays':
      return 12 / s.perPage;
    case 'one-line':
      return Math.ceil(oneLineDays(s.startMonth, s.count) / s.perPage);
    case 'index':
    case 'todo':
    case 'cornell':
    case 'travel':
    case 'reading':
    case 'notes':
    case 'packing':
    case 'shopping':
    case 'workout':
    case 'contacts':
    case 'tasting':
    case 'watchlist':
    case 'project':
    case 'meeting':
      return s.pages;
  }
}
