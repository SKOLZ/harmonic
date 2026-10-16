import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildScale,
  buildTriad,
  chordInversion,
  degreeNote,
  detectTriadQuality,
  identifyInversion,
  inversionFigure,
  midiNumber,
  noteFromLetterAndAlteration,
  parseNote,
  pitchClass,
  romanNumeral,
  scientificName,
  semitoneIndex,
  type Note,
  type ScaleType,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson121, lesson121Pool } from "./lesson121";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The example progressions the site plays in lesson 121 (musictheory.net
 * `lesson121.js` `sounds`), in playback order. Example 1 is i–VI–{ii6}–V–i in
 * C minor, with the {ii6} slide's chord replaced by a Neapolitan sixth on the
 * repeat (241). Example 2 is i–iv–i6/4–V–i with the iv replaced (461).
 */
const SITE_SOUNDS = {
  "example1-i": [48, 55, 63, 72],
  "example1-VI": [44, 56, 63, 72],
  /** The chord the site's slide labels `{ii6}` in example 1. */
  "example1-labelled-ii6": [41, 56, 65, 74],
  "example1-V": [43, 55, 62, 71],
  "example1-i-repeat": [48, 55, 63, 72],
  /** Its replacement: the Neapolitan sixth (F–Ab–Db). */
  "example1-n6": [41, 56, 65, 73],
  "example2-i": [48, 55, 60, 63],
  "example2-iv": [41, 56, 60, 65],
  "example2-i64": [43, 55, 60, 63],
  "example2-V": [43, 55, 59, 62],
  "example2-i-repeat": [48, 55, 60, 63],
  /** Its replacement: the Neapolitan sixth (F–Ab–Db–F). */
  "example2-n6": [41, 56, 61, 65],
} as const;

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

/**
 * The site's Neapolitan sixth of C minor, derived independently of any lesson
 * module: degree 2 of C natural minor (D), lowered one half step on the same
 * letter (Db), major triad, first inversion, lifted.
 */
function neapolitanSixthVoicing(): Note[] {
  const second = degreeNote(buildScale(parseNote("C4"), "naturalMinor"), 2);
  const lowered = noteFromLetterAndAlteration(
    second.letter,
    second.octave ?? 4,
    semitoneIndex(second) - 1,
  );
  return ascendingVoicing(chordInversion(buildTriad(lowered, "major"), 1));
}

/** A diatonic triad of C in `scaleType`, in `rotations` inversions, lifted. */
function diatonicVoicing(scaleType: ScaleType, degree: number, rotations: number): Note[] {
  const scale = buildScale(parseNote("C4"), scaleType);
  // degreeNote wraps above the scale's top octave for high degrees, so lift
  // into one ascending stack before rotating.
  const triad = ascendingVoicing([
    degreeNote(scale, degree),
    degreeNote(scale, degree + 2),
    degreeNote(scale, degree + 4),
  ]);
  return ascendingVoicing(chordInversion(triad, rotations));
}

/** Numeric inversion index `inversionFigure` expects, keyed by the core's label. */
const INVERSION_NUM: Readonly<Record<"rootPosition" | "first" | "second" | "third", number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
  third: 3,
};

/** The numeral the core derives for an inverted diatonic triad. */
function symbolOf(root: Note, notes: readonly Note[], quality: TriadQuality, degree: number): string {
  const inversion = identifyInversion(root, notes);
  return romanNumeral(quality, degree) + inversionFigure("triad", INVERSION_NUM[inversion]);
}

/** Note name without octave, e.g. Ab4 → Ab, the way rules spell chords. */
function noteName(note: Note): string {
  return scientificName(note).replace(/\d+$/, "");
}

interface StaffExpectation {
  answer: string;
  notes: readonly string[];
  options: readonly string[];
}

const N6_OPTIONS = {
  a: "ii°6",
  b: "The Neapolitan sixth",
  c: "iv",
  d: "V",
} as const;

const SITE_CHORDS: Record<string, StaffExpectation> = {
  "l121-staff-n6-close": {
    answer: N6_OPTIONS.b,
    notes: ["F4", "Ab4", "Db5"],
    options: [N6_OPTIONS.a, N6_OPTIONS.b, N6_OPTIONS.c, N6_OPTIONS.d],
  },
  "l121-staff-n6-wide": {
    answer: N6_OPTIONS.b,
    notes: ["F4", "Ab4", "Db5", "F5"],
    options: [N6_OPTIONS.b, N6_OPTIONS.c, "ii6", N6_OPTIONS.d],
  },
  "l121-staff-iio6": {
    answer: N6_OPTIONS.a,
    notes: ["F4", "Ab4", "D5"],
    options: ["ii6", N6_OPTIONS.c, N6_OPTIONS.a, N6_OPTIONS.d],
  },
  "l121-staff-ii6": {
    answer: "ii6",
    notes: ["F4", "A4", "D5"],
    options: ["ii6", N6_OPTIONS.a, "IV", N6_OPTIONS.d],
  },
  "l121-staff-iv": {
    answer: N6_OPTIONS.c,
    notes: ["F4", "Ab4", "C5"],
    options: ["IV", N6_OPTIONS.c, N6_OPTIONS.a, "N6"],
  },
  "l121-staff-iv-major": {
    answer: "IV",
    notes: ["F4", "A4", "C5"],
    options: [N6_OPTIONS.c, "N6", "IV", N6_OPTIONS.d],
  },
  "l121-staff-v": {
    answer: N6_OPTIONS.d,
    notes: ["G4", "B4", "D5"],
    options: [N6_OPTIONS.d, N6_OPTIONS.c, "ii6", N6_OPTIONS.a],
  },
};

/** The nine text answers, each the site's own stated fact. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l121-text-inversion": "First inversion",
  "l121-text-name": "A Neapolitan sixth",
  "l121-text-bass-share":
    "A first-inversion ii° (ii in major) or a root-position iv (IV in major)",
  "l121-text-function": "Predominant",
  "l121-text-others": "Root position and second inversion",
  "l121-text-replace-ii": "The ii°6 chord",
  "l121-text-replace-iv": "The iv chord",
  "l121-text-bass-degree": "The fourth scale degree",
  "l121-text-substitute": "They share the same bass note",
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
  return lesson121Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson121Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson121Pool.find((round) => round.id === id);
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

describe("lesson 121 question pool", () => {
  it("holds 16 rounds: 7 staff, 9 text, all ids unique", () => {
    expect(lesson121Pool).toHaveLength(16);
    expect(staffRounds()).toHaveLength(7);
    expect(textRounds()).toHaveLength(9);
    const ids = lesson121Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson121.entry.id).toBe(121);
    expect(lesson121.entry.title).toBe("Using Neapolitan Chords");
    expect(lesson121.entry.section).toBe("Neapolitan Chords");
  });

  it("validates every pool round", () => {
    for (const round of lesson121Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson121.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson121.generateRounds(createRng(42))).toEqual(
      lesson121.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson121.generateRounds(createRng(1));
    const second = lesson121.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson121.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("engraves every staff chord as one stacked chord head", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = engrave(id, prompt);
      const staveNotes = [...host.querySelectorAll("g")].filter(
        (group) => group.getAttribute("class") === "vf-stavenote",
      );
      expect(staveNotes, `staff round ${id}`).toHaveLength(1);
    }
  });

  it("marks every staff prompt simultaneous with no key signature", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
      expect(prompt.keySignature, `staff round ${id}`).toBeUndefined();
      expect(prompt.clef, `staff round ${id}`).toBe("treble");
    }
  });

  it("derives every staff voicing from the core exactly as the pool states it", () => {
    const derived: Record<string, Note[]> = {
      "l121-staff-n6-close": neapolitanSixthVoicing(),
      "l121-staff-n6-wide": [
        ...neapolitanSixthVoicing(),
        { ...neapolitanSixthVoicing()[0]!, octave: 5 },
      ],
      "l121-staff-iio6": diatonicVoicing("naturalMinor", 2, 1),
      "l121-staff-ii6": diatonicVoicing("major", 2, 1),
      "l121-staff-iv": diatonicVoicing("naturalMinor", 4, 0),
      "l121-staff-iv-major": diatonicVoicing("major", 4, 0),
      "l121-staff-v": diatonicVoicing("major", 5, 0),
    };
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_CHORDS[id];
      expect(expected, `round ${id} is not one of the site's shared-bass chords`).toBeDefined();
      expect(prompt.notes, `staff round ${id} notes`).toEqual(
        derived[id]!.map((note) => scientificName(note)),
      );
      expect(answerOf(id), `staff round ${id} answer`).toBe(expected.answer);
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...expected.options]);
      const rule = roundById(id).rule;
      expect(rule, `staff round ${id} rule chord`).toContain(
        prompt.notes.map((name) => noteName(parseNote(name))).join("–"),
      );
    }
  });

  it("analyses every staff chord exactly as the site's chords read in C", () => {
    // The Neapolitan sixth: first inversion of the major triad on D's
    // lowered, so Db — the site's "Neapolitan sixth" of both examples.
    for (const id of ["l121-staff-n6-close", "l121-staff-n6-wide"]) {
      const prompt = roundById(id).prompt as Extract<PromptSpec, { kind: "staff" }>;
      const notes = prompt.notes.map((name) => parseNote(name));
      // The wide voicing doubles the bass F; the triad itself is the first
      // three tones, rotated back to root position for quality detection.
      const quality = detectTriadQuality(
        ascendingVoicing(chordInversion(notes.slice(0, 3), 2)),
      );
      expect(quality, `${id} must be a major triad`).toBe("major");
      expect(identifyInversion(parseNote("Db4"), notes), `${id} inversion`).toBe("first");
    }
    // The stand-ins the site names: ii°6 (minor), ii6 (major), iv, IV, V.
    expect(
      symbolOf(
        parseNote("D4"),
        diatonicVoicing("naturalMinor", 2, 1),
        "diminished",
        2,
      ),
    ).toBe("ii°6");
    expect(symbolOf(parseNote("D4"), diatonicVoicing("major", 2, 1), "minor", 2)).toBe("ii6");
    expect(symbolOf(parseNote("F4"), diatonicVoicing("naturalMinor", 4, 0), "minor", 4)).toBe("iv");
    expect(symbolOf(parseNote("F4"), diatonicVoicing("major", 4, 0), "major", 4)).toBe("IV");
    expect(symbolOf(parseNote("G4"), diatonicVoicing("major", 5, 0), "major", 5)).toBe("V");
    // …and the pool's answers must be those same symbols.
    expect(answerOf("l121-staff-iio6")).toBe("ii°6");
    expect(answerOf("l121-staff-ii6")).toBe("ii6");
    expect(answerOf("l121-staff-iv")).toBe("iv");
    expect(answerOf("l121-staff-iv-major")).toBe("IV");
    expect(answerOf("l121-staff-v")).toBe("V");
  });

  it("proves from the site's own sound data that example 1's stand-in is ii°6", () => {
    // The slide writes `{ii6}`, but the sounded chord 121 = [41, 56, 65, 74]
    // is F–Ab–D: a DIMINISHED supertonic triad in first inversion — ii°6 in
    // C minor, matching the lesson's earlier `{iio}` spelling.
    const site = SITE_SOUNDS["example1-labelled-ii6"];
    const bass = site[0]!;
    expect(bass % 12, "the bass is F").toBe(pitchClass(parseNote("F4")));
    // The supertonic triad of C natural minor, stacked directly from the scale
    // (diatonicTriads eagerly stacks all seven degrees, and degree 4+ wraps).
    const scale = buildScale(parseNote("C4"), "naturalMinor");
    const triad = [
      degreeNote(scale, 2),
      degreeNote(scale, 4),
      degreeNote(scale, 6),
    ];
    expect(
      detectTriadQuality(ascendingVoicing(triad)),
      "the supertonic triad of C natural minor",
    ).toBe("diminished");
    const sitePcs = new Set(site.map((midi) => midi % 12));
    const triadPcs = new Set(triad.map((note) => pitchClass(note)));
    expect(sitePcs, "site's sounded chord is the diminished ii°").toEqual(triadPcs);
    expect(symbolOf(triad[0]!, diatonicVoicing("naturalMinor", 2, 1), "diminished", 2)).toBe(
      "ii°6",
    );
  });

  it("ties the pool's Neapolitan sixth to the site's replacement chords", () => {
    const n6 = roundById("l121-staff-n6-close").prompt as Extract<PromptSpec, { kind: "staff" }>;
    const n6Pcs = new Set(n6.notes.map((name) => pitchClass(parseNote(name))));
    // Both replacements sound exactly our Neapolitan sixth's pitch classes…
    expect(
      new Set(SITE_SOUNDS["example1-n6"].map((midi) => midi % 12)),
      "example 1 replacement",
    ).toEqual(n6Pcs);
    expect(
      new Set(SITE_SOUNDS["example2-n6"].map((midi) => midi % 12)),
      "example 2 replacement",
    ).toEqual(n6Pcs);
    // …on the same F bass as the chords they replace (121 and 341).
    expect(SITE_SOUNDS["example1-n6"][0]).toBe(SITE_SOUNDS["example1-labelled-ii6"][0]);
    expect(SITE_SOUNDS["example2-n6"][0]).toBe(SITE_SOUNDS["example2-iv"][0]);
  });

  it("keeps the correct answer in different positions across the pool", () => {
    const indices = new Set(
      lesson121Pool.map((round) => {
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
    // The bass the site names is the subdominant degree: F in C minor.
    const bass = degreeNote(buildScale(parseNote("C4"), "naturalMinor"), 4);
    expect(scientificName(bass)).toBe("F4");
  });

  it("states the site's facts in every rule", () => {
    for (const round of lesson121Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson121Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/Neapolitan sixth/);
    expect(rules).toMatch(/first inversion is normally used/i);
    expect(rules).toMatch(/root position and second inversion/i);
    expect(rules).toMatch(/predominant/);
    expect(rules).toMatch(/substitutes/);
    expect(rules).toMatch(/ii°6/);
    expect(rules).toMatch(/iv chord/);
    expect(rules).toMatch(/fourth scale degree/);
    expect(rules).toMatch(/same bass/);
  });

  it("describes every staff prompt structurally, never with pitch names", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = engrave(id, prompt);
      const label = host.querySelector(".prompt--staff")!.getAttribute("aria-label") ?? "";
      expect(label, `staff round ${id}`).toContain(
        `Staff notation, treble clef, ${prompt.notes.length} notes`,
      );
      expect(label).not.toMatch(/[A-G][#b]/);
    }
  });
});
