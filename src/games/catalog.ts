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
  { id: 15, title: "Simple and Compound Meter", section: "Rhythm and Meter", order: 7 },
  { id: 16, title: "Odd Meter", section: "Rhythm and Meter", order: 8 },
  { id: 21, title: "The Major Scale", section: "Scales and Key Signatures", order: 9 },
  { id: 22, title: "The Minor Scales", section: "Scales and Key Signatures", order: 10 },
  { id: 23, title: "Scale Degrees", section: "Scales and Key Signatures", order: 11 },
  { id: 24, title: "Key Signatures", section: "Scales and Key Signatures", order: 12 },
  { id: 25, title: "Key Signature Calculation", section: "Scales and Key Signatures", order: 13 },
  { id: 30, title: "Generic Intervals", section: "Intervals", order: 14 },
  { id: 31, title: "Specific Intervals", section: "Intervals", order: 15 },
  { id: 32, title: "Writing Intervals", section: "Intervals", order: 16 },
  { id: 33, title: "Interval Inversion", section: "Intervals", order: 17 },
  { id: 40, title: "Introduction to Chords", section: "Chords", order: 18 },
  { id: 42, title: "Triad Inversion", section: "Chords", order: 19 },
  { id: 45, title: "Seventh Chords", section: "Chords", order: 20 },
  { id: 48, title: "More Seventh Chords", section: "Chords", order: 21 },
  { id: 47, title: "Seventh Chord Inversion", section: "Chords", order: 22 },
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
