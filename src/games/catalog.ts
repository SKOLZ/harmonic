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
  { id: 43, title: "Diatonic Triads", section: "Diatonic Chords", order: 23 },
  { id: 44, title: "Roman Numeral Analysis: Triads", section: "Diatonic Chords", order: 24 },
  { id: 46, title: "Diatonic Seventh Chords", section: "Diatonic Chords", order: 25 },
  { id: 49, title: "Roman Numeral Analysis: Seventh Chords", section: "Diatonic Chords", order: 26 },
  { id: 50, title: "Composing with Minor Scales", section: "Diatonic Chords", order: 27 },
  { id: 51, title: "Voicing Chords", section: "Diatonic Chords", order: 28 },
  { id: 52, title: "Analysis: O Canada", section: "Diatonic Chords", order: 29 },
  { id: 53, title: "Nonharmonic Tones", section: "Chord Progressions", order: 30 },
  { id: 55, title: "Phrases and Cadences", section: "Chord Progressions", order: 31 },
  { id: 56, title: "Circle Progressions", section: "Chord Progressions", order: 32 },
  { id: 57, title: "Common Chord Progressions", section: "Chord Progressions", order: 33 },
  { id: 60, title: "Triads in First Inversion", section: "Chord Progressions", order: 34 },
  { id: 61, title: "Triads in Second Inversion", section: "Chord Progressions", order: 35 },
  { id: 62, title: "Analysis: Auld Lang Syne", section: "Chord Progressions", order: 36 },
  { id: 120, title: "Building Neapolitan Chords", section: "Neapolitan Chords", order: 37 },
  { id: 121, title: "Using Neapolitan Chords", section: "Neapolitan Chords", order: 38 },
  { id: 122, title: "Analysis: Moonlight Sonata", section: "Neapolitan Chords", order: 39 },
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
