import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildSeventh,
  buildScale,
  buildTriad,
  chordInversion,
  degreeNote,
  identifyInversion,
  inversionFigure,
  letterIndex,
  midiNumber,
  noteFromLetterAndAlteration,
  parseNote,
  pitchClass,
  romanNumeral,
  romanNumeralSeventh,
  scientificName,
  semitoneIndex,
  type Letter,
  type Note,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson122, lesson122Pool } from "./lesson122";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/** The key signature C# minor shares with its relative major, E. */
const KEY_SIGNATURE = "E";

/**
 * The four chords the site names in the Moonlight Sonata slides
 * (musictheory.net `lesson122.js`), each written exactly as its slide spells
 * it (letter names, no octave — the voicing is ours, the pitch classes the
 * site's): measures 49–51, "G#–B#–D#–F#", "C#–E–G#", "D–F#–A", "G#–B#–F#".
 */
const SITE_SLIDE_CHORDS = {
  "l122-staff-m49a": ["G#", "B#", "D#", "F#"],
  "l122-staff-m49a-low": ["G#", "B#", "D#", "F#"],
  "l122-staff-m49b": ["C#", "E", "G#"],
  "l122-staff-m49b-wide": ["C#", "E", "G#"],
  "l122-staff-m50a": ["D", "F#", "A"],
  "l122-staff-m50a-wide": ["D", "F#", "A"],
  "l122-staff-m50b": ["G#", "B#", "F#"],
} as const;

/** Degree of a letter within the C#-minor analysis key (tonic letter C). */
function degreeInKey(letter: Letter, tonic: Letter): number {
  return (((letterIndex(letter) - letterIndex(tonic)) % 7 + 7) % 7) + 1;
}

/** Lift a (possibly rotated) chord so its written order is strictly ascending. */
function ascendingVoicing(notes: readonly Note[]): Note[] {
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

/** Measure 49's V7 in first inversion: G# dominant seventh, B# in the bass. */
function v65Voicing(rootOctave = 4): Note[] {
  const seventh = buildSeventh(parseNote(`G#${rootOctave}`), "dominantSeventh");
  return ascendingVoicing(chordInversion(seventh, 1));
}

/**
 * The Neapolitan sixth of C# minor, derived independently of any module: the
 * second scale degree of C# natural minor (D#), lowered one half step on the
 * same letter (D), major triad, first inversion, lifted.
 */
function neapolitanSixthVoicing(): Note[] {
  const second = degreeNote(buildScale(parseNote("C#4"), "naturalMinor"), 2);
  const lowered = noteFromLetterAndAlteration(
    second.letter,
    second.octave ?? 4,
    semitoneIndex(second) - 1,
  );
  return ascendingVoicing(chordInversion(buildTriad(lowered, "major"), 1));
}

/** The G# dominant seventh chord with only root, third and seventh sounding. */
function v7WithoutFifth(): Note[] {
  return buildSeventh(parseNote("G#4"), "dominantSeventh").filter((_, index) => index !== 2);
}

/** Note name without octave, e.g. F#4 → F#, the way slides write chords. */
function noteName(note: Note): string {
  return scientificName(note).replace(/\d+$/, "");
}

const ANSWERS = {
  v65: "A G# dominant seventh chord in first inversion",
  i: "A C# minor triad",
  n6: "The Neapolitan sixth chord in C# minor",
  v7missing: "A G# dominant seventh chord with a missing fifth",
} as const;

interface StaffExpectation {
  answer: string;
  options: readonly string[];
}

const SITE_CHORDS: Record<string, StaffExpectation> = {
  "l122-staff-m49a": {
    answer: ANSWERS.v65,
    options: [
      "A G# dominant seventh chord in root position",
      ANSWERS.v65,
      "A C# minor seventh chord",
      "A D# major triad",
    ],
  },
  "l122-staff-m49a-low": {
    answer: ANSWERS.v65,
    options: [
      "A D# dominant seventh chord",
      "A C# minor seventh chord",
      ANSWERS.v65,
      "A G# dominant seventh chord in root position",
    ],
  },
  "l122-staff-m49b": {
    answer: ANSWERS.i,
    options: [
      "An E minor triad",
      ANSWERS.i,
      "A G# major triad",
      "A D# diminished triad",
    ],
  },
  "l122-staff-m49b-wide": {
    answer: ANSWERS.i,
    options: [
      ANSWERS.i,
      "An A major triad",
      "A G# dominant seventh chord",
      "A D# minor triad",
    ],
  },
  "l122-staff-m50a": {
    answer: ANSWERS.n6,
    options: [
      "A II major triad in first inversion",
      "A IV chord",
      "The subdominant seventh",
      ANSWERS.n6,
    ],
  },
  "l122-staff-m50a-wide": {
    answer: ANSWERS.n6,
    options: [
      ANSWERS.n6,
      "A diminished seventh chord",
      "A half-diminished seventh chord",
      "A Neapolitan chord in root position",
    ],
  },
  "l122-staff-m50b": {
    answer: ANSWERS.v7missing,
    options: [
      ANSWERS.v7missing,
      "A G# dominant seventh chord in root position",
      "An F# dominant seventh chord",
      "A C# minor seventh chord",
    ],
  },
};

/** The eight text answers, each the site's own stated fact. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l122-text-measures": "Measures 49-51",
  "l122-text-key": "C# minor",
  "l122-text-why-reveal": "Because the analysis starts in the middle of the piece",
  "l122-text-lowest-49": "B#",
  "l122-text-missing-50": "The fifth",
  "l122-text-m50-identify": ANSWERS.n6,
  "l122-text-why-neapolitan": "D is the lowered second degree of C# minor",
  "l122-text-m51": ANSWERS.i,
};

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length > 0) cleanups.pop()?.();
  document.body.replaceChildren();
});

function isStaffRound(
  round: Round,
): round is Round & { prompt: Extract<PromptSpec, { kind: "staff" }> } {
  return round.prompt.kind === "staff";
}

function staffRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "staff" }> }> {
  return lesson122Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson122Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson122Pool.find((round) => round.id === id);
  expect(found, `round ${id} is missing from the pool`).toBeDefined();
  return found!;
}

function answerOf(id: string): string {
  const answer = roundById(id).answer;
  expect(answer.kind).toBe("choices");
  const choices = answer as Extract<Round["answer"], { kind: "choices" }>;
  return choices.options[choices.correctIndex]!;
}

function engrave(id: string, prompt: PromptSpec): HTMLElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispose = render(() => StaffPrompt({ prompt }), host);
  cleanups.push(() => {
    dispose();
    host.remove();
  });
  expect(host.querySelector("svg"), `staff prompt ${id} did not engrave`).not.toBeNull();
  return host;
}

describe("lesson 122 question pool", () => {
  it("holds 15 rounds: 7 staff, 8 text, all ids unique", () => {
    expect(lesson122Pool).toHaveLength(15);
    expect(staffRounds()).toHaveLength(7);
    expect(textRounds()).toHaveLength(8);
    const ids = lesson122Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson122.entry.id).toBe(122);
    expect(lesson122.entry.title).toBe("Analysis: Moonlight Sonata");
    expect(lesson122.entry.section).toBe("Neapolitan Chords");
  });

  it("validates every pool round", () => {
    for (const round of lesson122Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson122.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson122.generateRounds(createRng(42))).toEqual(
      lesson122.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson122.generateRounds(createRng(1));
    const second = lesson122.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson122.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("engraves every analysed chord as one stacked chord head", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = engrave(id, prompt);
      const staveNotes = [...host.querySelectorAll("g")].filter(
        (group) => group.getAttribute("class") === "vf-stavenote",
      );
      expect(staveNotes, `staff round ${id}`).toHaveLength(1);
    }
  });

  it("marks every staff prompt simultaneous under the revealed C# minor signature", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
      expect(prompt.keySignature, `staff round ${id}`).toBe(KEY_SIGNATURE);
      expect(prompt.clef, `staff round ${id}`).toBe("treble");
    }
  });

  it("voices every staff chord from the core exactly as the site describes it", () => {
    const derived: Record<string, Note[]> = {
      "l122-staff-m49a": v65Voicing(4),
      "l122-staff-m49a-low": v65Voicing(3),
      "l122-staff-m49b": buildTriad(parseNote("C#4"), "minor"),
      "l122-staff-m49b-wide": [
        parseNote("C#4"),
        parseNote("G#4"),
        parseNote("C#5"),
        parseNote("E5"),
      ],
      "l122-staff-m50a": neapolitanSixthVoicing(),
      "l122-staff-m50a-wide": [
        ...neapolitanSixthVoicing(),
        { ...neapolitanSixthVoicing()[0]!, octave: 5 },
      ],
      "l122-staff-m50b": v7WithoutFifth(),
    };
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_CHORDS[id];
      expect(expected, `round ${id} is not one of the site's Moonlight chords`).toBeDefined();
      expect(prompt.notes, `staff round ${id} notes`).toEqual(
        derived[id]!.map((note) => scientificName(note)),
      );
      // The slide's own spelling is the pitch-class oracle: same letters and
      // accidentals, whatever octave or voicing order the round uses.
      const slideNames = new Set(SITE_SLIDE_CHORDS[id as keyof typeof SITE_SLIDE_CHORDS]);
      const voicedNames = new Set(prompt.notes.map((name) => noteName(parseNote(name))));
      expect(voicedNames, `staff round ${id} pitch classes vs site slide`).toEqual(slideNames);
      expect(answerOf(id), `staff round ${id} answer`).toBe(expected.answer);
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...expected.options]);
      expect(roundById(id).rule, `staff round ${id} rule chord`).toContain(
        prompt.notes.map((name) => noteName(parseNote(name))).join("–"),
      );
    }
  });

  it("reads measure 49's first inversion exactly as the site states it", () => {
    for (const id of ["l122-staff-m49a", "l122-staff-m49a-low"]) {
      const prompt = roundById(id).prompt as Extract<PromptSpec, { kind: "staff" }>;
      const notes = prompt.notes.map((name) => parseNote(name));
      const inversion = identifyInversion(parseNote("G#4"), notes);
      expect(inversion, `${id} inversion`).toBe("first");
      // The site: "Since the B# is the lowest note, the chord is in first
      // inversion." Core numerals: V7 in first inversion figures as V6/5 —
      // note romanNumeralSeventh already carries the "7", so the figure
      // replaces it rather than stacking on top of it.
      const v7 = romanNumeralSeventh("dominantSeventh", degreeInKey("G", "C"));
      expect(v7).toBe("V7");
      const v65 = v7.slice(0, -1) + inversionFigure("seventh", 1);
      expect(v65).toBe("V6/5");
      expect(romanNumeral("major", degreeInKey("G", "C")) + inversionFigure("seventh", 1)).toBe(
        v65,
      );
      expect(roundById(id).rule, id).toContain(v65);
      expect(prompt.notes[0]!.startsWith("B#"), `${id} bass must be B#`).toBe(true);
    }
  });

  it("reads measures 49b and 51 as the C# minor triad i", () => {
    const closeRound = roundById("l122-staff-m49b");
    const close = closeRound.prompt as Extract<PromptSpec, { kind: "staff" }>;
    const notes = close.notes.map((name) => parseNote(name));
    expect(identifyInversion(parseNote("C#4"), notes)).toBe("rootPosition");
    const iSymbol = romanNumeral("minor", degreeInKey("C", "C"));
    expect(iSymbol).toBe("i");
    expect(closeRound.rule).toContain(iSymbol);
    const wide = roundById("l122-staff-m49b-wide").prompt as Extract<PromptSpec, { kind: "staff" }>;
    expect(identifyInversion(parseNote("C#4"), wide.notes.map((name) => parseNote(name)))).toBe(
      "rootPosition",
    );
    // The slide lists C#–E–G#; the wide voicing must hold exactly those classes.
    const triadPcs = new Set(buildTriad(parseNote("C#4"), "minor").map((note) => pitchClass(note)));
    for (const name of wide.notes) {
      expect(triadPcs.has(pitchClass(parseNote(name))), name).toBe(true);
    }
  });

  it("reads measure 50's Neapolitan sixth from the lowered second degree", () => {
    const second = degreeNote(buildScale(parseNote("C#4"), "naturalMinor"), 2);
    expect(scientificName(second)).toBe("D#4");
    const lowered = noteFromLetterAndAlteration(
      second.letter,
      second.octave ?? 4,
      semitoneIndex(second) - 1,
    );
    expect(scientificName(lowered)).toBe("D4");
    const triad = buildTriad(lowered, "major");
    for (const id of ["l122-staff-m50a", "l122-staff-m50a-wide"]) {
      const prompt = roundById(id).prompt as Extract<PromptSpec, { kind: "staff" }>;
      const notes = prompt.notes.map((name) => parseNote(name));
      expect(identifyInversion(lowered, notes), `${id} inversion`).toBe("first");
      const triadPcs = new Set(triad.map((note) => pitchClass(note)));
      for (const tone of notes) {
        expect(triadPcs.has(pitchClass(tone)), `${id} tone ${scientificName(tone)}`).toBe(true);
      }
      expect(roundById(id).rule, id).toContain("Neapolitan sixth");
    }
  });

  it("reads measure 50's second half as V7 missing its fifth", () => {
    const round = roundById("l122-staff-m50b");
    const prompt = round.prompt as Extract<PromptSpec, { kind: "staff" }>;
    const seventh = buildSeventh(parseNote("G#4"), "dominantSeventh");
    const withoutFifth = new Set(seventh.filter((_, index) => index !== 2).map((note) => pitchClass(note)));
    const voiced = new Set(prompt.notes.map((name) => pitchClass(parseNote(name))));
    expect(voiced, "root, third and seventh only").toEqual(withoutFifth);
    expect(prompt.notes).not.toContain("D#5");
    expect(
      identifyInversion(parseNote("G#4"), prompt.notes.map((name) => parseNote(name))),
    ).toBe("rootPosition");
    expect(round.rule).toContain(romanNumeralSeventh("dominantSeventh", degreeInKey("G", "C")));
  });

  it("keeps the correct answer in different positions across the pool", () => {
    const indices = new Set(
      lesson122Pool.map((round) => {
        const answer = round.answer as Extract<Round["answer"], { kind: "choices" }>;
        return answer.correctIndex;
      }),
    );
    expect(indices.size).toBeGreaterThanOrEqual(3);
  });

  it("pins the site's text conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's facts in every rule", () => {
    for (const round of lesson122Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson122Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/Moonlight Sonata/);
    expect(rules).toMatch(/49-51/);
    expect(rules).toMatch(/C# minor/);
    expect(rules).toMatch(/middle of the piece/);
    expect(rules).toMatch(/lowest note/);
    expect(rules).toMatch(/missing its fifth/);
    expect(rules).toMatch(/Neapolitan sixth/);
    expect(rules).toMatch(/lowered second degree/);
    expect(rules).toMatch(/V6\/5/);
    expect(rules).toMatch(/V7/);
    expect(rules).toMatch(/ i in C# minor/);
  });

  it("describes every staff prompt structurally, never with pitch names", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = engrave(id, prompt);
      const label = host.querySelector(".prompt--staff")!.getAttribute("aria-label") ?? "";
      expect(label, `staff round ${id}`).toContain(
        `Staff notation, treble clef, 4 accidentals, ${prompt.notes.length} notes`,
      );
      expect(label).not.toMatch(/[A-G][#b]/);
    }
  });
});
