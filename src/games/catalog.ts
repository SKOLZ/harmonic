export interface LessonEntry {
  id: number;
  title: string;
  section: string;
  order: number;
}

/**
 * Ordered lesson catalog. Chain order = array order; the unlock rule reads
 * position, so later tasks only append entries here.
 */
export const catalog: LessonEntry[] = [
  { id: 10, title: "The Staff, Clefs, and Ledger Lines", section: "The Basics", order: 1 },
  { id: 11, title: "Note Duration", section: "The Basics", order: 2 },
  { id: 12, title: "Measures and Time Signature", section: "The Basics", order: 3 },
  { id: 13, title: "Rest Duration", section: "The Basics", order: 4 },
  { id: 14, title: "Dots and Ties", section: "The Basics", order: 5 },
  { id: 20, title: "Steps and Accidentals", section: "The Basics", order: 6 },
];

/**
 * Look up a single entry by lesson id. Lesson modules call this at load time,
 * so a module wired to a lesson the catalog does not list fails at import —
 * a wiring bug — rather than at play time.
 */
export function requireLessonEntry(id: number): LessonEntry {
  const entry = catalog.find((item) => item.id === id);
  if (entry === undefined) {
    throw new Error(`requireLessonEntry: lesson ${id} is not in the catalog`);
  }
  return entry;
}
