import {
  buildScale,
  buildTriad,
  chordInversion,
  degreeNote,
  midiNumber,
  noteFromLetterAndAlteration,
  semitoneIndex,
  type Note,
  type ScaleType,
} from "../lib/theory";

/**
 * Shared Neapolitan derivations for lessons 120–122 (musictheory.net section
 * "Neapolitan Chords").
 *
 * SCOPE NOTE (reported to the parent, not fixed here): these helpers are
 * core-warranted — every future Neapolitan lesson would re-derive exactly
 * this chain — but this writer's allowed edit surface is `src/games/**`
 * only, so they live beside the lesson modules. When `src/lib/theory` opens
 * for edits, move this file there (recommended home: `chord.ts` or a new
 * `neapolitan.ts` beside it); the lesson modules then change only their
 * import path.
 *
 * The chain, all backed by core primitives so a wrong spelling or a
 * whole-step "lowering" fails at generation instead of shipping:
 * 1. degree 2 of the scale (the supertonic);
 * 2. that degree lowered by exactly one half step, same letter
 *    (`noteFromLetterAndAlteration` on the same letter, one semitone down);
 * 3. the major triad built on it — the site: "a major triad that is built on
 *    a special note";
 * 4. its first inversion, lifted so the written voicing ascends — the site:
 *    "first inversion is normally used … called a *Neapolitan sixth*".
 *
 * `chordInversion` is pure modulo rotation, so the rotated top can land below
 * the new bass (a D4 wrapped under an F4); `ascendingVoicing` lifts such
 * tones an octave at a time until the order strictly ascends — the same
 * pattern lesson 56 uses for inverted voicings.
 */
export interface NeapolitanDerivation {
  /** Degree 2 of the scale, the supertonic, as spelled by the scale. */
  second: Note;
  /** The supertonic lowered one half step, same letter — the Neapolitan's root. */
  lowered: Note;
  /** Root-position major triad on `lowered` — the Neapolitan chord. */
  triad: Note[];
}

/** Derive the Neapolitan of `root` in `scaleType` from the scale itself. */
export function deriveNeapolitan(root: Note, scaleType: ScaleType): NeapolitanDerivation {
  if (root.octave === undefined) {
    throw new Error("deriveNeapolitan requires a root with an octave");
  }
  const second = degreeNote(buildScale(root, scaleType), 2);
  const lowered = noteFromLetterAndAlteration(
    second.letter,
    second.octave ?? root.octave,
    semitoneIndex(second) - 1,
  );
  if (semitoneIndex(second) - semitoneIndex(lowered) !== 1) {
    throw new Error(
      `deriveNeapolitan: lowering ${second.letter} by one semitone did not stay one half step below the degree`,
    );
  }
  return { second, lowered, triad: buildTriad(lowered, "major") };
}

/** The Neapolitan's root: degree 2 lowered one half step, same letter. */
export function loweredSecondDegree(root: Note, scaleType: ScaleType): Note {
  return deriveNeapolitan(root, scaleType).lowered;
}

/** Root-position Neapolitan triad (major) of the given key. */
export function neapolitanTriad(root: Note, scaleType: ScaleType): Note[] {
  return deriveNeapolitan(root, scaleType).triad;
}

/**
 * Lift a (possibly rotated) chord so its written order is strictly ascending:
 * any tone that does not sit above its predecessor moves up an octave.
 */
export function ascendingVoicing(notes: readonly Note[]): Note[] {
  if (notes.length === 0) {
    throw new Error("ascendingVoicing requires a non-empty chord");
  }
  const voiced = [...notes];
  for (let index = 1; index < voiced.length; index += 1) {
    const tone = voiced[index]!;
    const below = voiced[index - 1]!;
    if (midiNumber(tone) <= midiNumber(below)) {
      voiced[index] = { ...tone, octave: (tone.octave ?? 0) + 1 };
    }
  }
  return voiced;
}

/** The Neapolitan in first inversion — the Neapolitan sixth. */
export function neapolitanSixth(root: Note, scaleType: ScaleType): Note[] {
  return ascendingVoicing(chordInversion(neapolitanTriad(root, scaleType), 1));
}
