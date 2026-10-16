import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildSeventh,
  buildTriad,
  identifyInversion,
  inversionFigure,
  letterAt,
  letterIndex,
  parseNote,
  pitchClass,
  romanNumeral,
  romanNumeralSeventh,
  type SeventhQuality,
  type TriadQuality,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson62, lesson62Pool } from "./lesson62";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The seven chords the site reads out of the Auld Lang Syne excerpt, each
 * with its note list exactly as the slide writes it (bass first) and the
 * analysis symbol the site states. Unlike lesson 52, this lesson names no
 * inversions: every symbol it writes is unfigured, so the test also proves
 * the core finds root position in every voicing.
 */
const SITE_CHORDS: Record<
  string,
  {
    notes: readonly string[];
    root: string;
    quality: TriadQuality | SeventhQuality;
    seventh: boolean;
    /** The site's stated analysis — also the round's correct answer. */
    siteSymbol: string;
    /**
     * The numeral the core must derive from the voicing. Absent for the
     * skipped chord, whose answer is the site's phrase rather than a symbol.
     */
    derivedSymbol?: string;
    options: readonly string[];
  }
> = {
  "l62-staff-i-measure1": {
    notes: ["F4", "A4", "C5"],
    root: "F4",
    quality: "major",
    seventh: false,
    siteSymbol: "I",
    derivedSymbol: "I",
    options: ["I", "IV", "V", "vi"],
  },
  "l62-staff-i-measure2": {
    notes: ["F4", "C5", "F5"],
    root: "F4",
    quality: "major",
    seventh: false,
    siteSymbol: "I",
    derivedSymbol: "I",
    options: ["IV6", "I", "ii", "I6"],
  },
  "l62-staff-i-measure4": {
    notes: ["F4", "A4", "F5"],
    root: "F4",
    quality: "major",
    seventh: false,
    siteSymbol: "I",
    derivedSymbol: "I",
    options: ["vi", "IV", "I", "V6"],
  },
  "l62-staff-v": {
    notes: ["C4", "C5", "E5", "G5"],
    root: "C4",
    quality: "major",
    seventh: false,
    siteSymbol: "V",
    derivedSymbol: "V",
    options: ["vi", "ii6", "V7", "V"],
  },
  "l62-staff-iv": {
    notes: ["Bb3", "Bb4", "F5", "D6"],
    root: "Bb3",
    quality: "major",
    seventh: false,
    siteSymbol: "IV",
    derivedSymbol: "IV",
    options: ["IV", "ii", "V", "IV6"],
  },
  "l62-staff-v7-skipped2": {
    // The site: "the bottom three notes are the root, third, and seventh of a
    // C dominant seventh chord. Only the G (the fifth) is missing" and "we can
    // analyze it as V7 with a nonharmonic A" — so the A is NOT a chord tone.
    notes: ["C4", "Bb4", "E5", "A5"],
    root: "C4",
    quality: "dominantSeventh",
    seventh: true,
    siteSymbol: "V7",
    derivedSymbol: "V7",
    options: ["V", "V7", "vi7", "IV7"],
  },
  "l62-staff-skip-neighbors": {
    // The first skipped chord; its analysis is a phrase, not a numeral.
    notes: ["C4", "C5", "D5", "F5"],
    root: "C4",
    quality: "major",
    seventh: false,
    siteSymbol: "A continuation of the V with two neighboring tones",
    options: ["A ii chord in first inversion", "A IV chord with a suspension", "A continuation of the V with two neighboring tones", "A diminished seventh chord"],
  },
};

/** The eight text answers, each the site's own conclusion. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l62-text-key": "F major or D minor",
  "l62-text-first-step": "Determine the key",
  "l62-text-conclude": "We are most likely in that key, F major",
  "l62-text-repeat": "There is no need to write it again",
  "l62-text-skip-first": "Skip it for now",
  "l62-text-fifth-omitted": "The fifth",
  "l62-text-escape": "An escape tone",
  "l62-text-resolve": "V chords commonly resolve to I",
};

/** Degree of a root letter within the F major scale (letters F–E are 1–7). */
function degreeOfFMajor(letter: string): number {
  return (((letterIndex(letter as never) - letterIndex("F")) % 7 + 7) % 7) + 1;
}

/** Numeric inversion index `inversionFigure` expects, keyed by the core's label. */
const INVERSION_NUM: Readonly<Record<"rootPosition" | "first" | "second" | "third", number>> = {
  rootPosition: 0,
  first: 1,
  second: 2,
  third: 3,
};

/** The analysis symbol the core derives for an F-major chord of either kind. */
function symbolOf(root: string, quality: TriadQuality | SeventhQuality, seventh: boolean, notes: readonly string[]): string {
  const rootNote = parseNote(root);
  const inversion = identifyInversion(
    rootNote,
    notes.map((note) => parseNote(note)),
  );
  const degree = degreeOfFMajor(rootNote.letter);
  if (seventh) {
    // `romanNumeralSeventh` already carries the seventh's suffix — its own
    // contract states dominantSeventh/5 → "V7" — so a root-position seventh
    // takes no extra figure. This lesson states no seventh inversions.
    expect(inversion, `${root} seventh must be in root position`).toBe("rootPosition");
    return romanNumeralSeventh(quality as SeventhQuality, degree);
  }
  return (
    romanNumeral(quality as TriadQuality, degree) +
    inversionFigure("triad", INVERSION_NUM[inversion])
  );
}

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
  return lesson62Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson62Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson62Pool.find((round) => round.id === id);
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

describe("lesson 62 question pool", () => {
  it("holds 15 rounds: 7 staff, 8 text, all ids unique", () => {
    expect(lesson62Pool).toHaveLength(15);
    expect(staffRounds()).toHaveLength(7);
    expect(textRounds()).toHaveLength(8);
    const ids = lesson62Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson62.entry.id).toBe(62);
  });

  it("validates every pool round", () => {
    for (const round of lesson62Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson62.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson62.generateRounds(createRng(42))).toEqual(
      lesson62.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson62.generateRounds(createRng(1));
    const second = lesson62.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson62.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("engraves every staff chord as one stacked head under the F key signature", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = engrave(id, prompt);
      const staveNotes = [...host.querySelectorAll("g")].filter(
        (group) => group.getAttribute("class") === "vf-stavenote",
      );
      expect(staveNotes, `staff round ${id}`).toHaveLength(1);
    }
  });

  it("marks every staff prompt simultaneous with the F key signature", () => {
    for (const { id, prompt } of staffRounds()) {
      expect(prompt.simultaneous, `staff round ${id}`).toBe(true);
      expect(prompt.keySignature, `staff round ${id}`).toBe("F");
      expect(prompt.clef, `staff round ${id}`).toBe("treble");
    }
  });

  it("analyses every staff chord exactly as the site does, proven by the core", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_CHORDS[id];
      expect(expected, `round ${id} is not one of the site's Auld Lang Syne chords`).toBeDefined();
      expect(prompt.notes, `staff round ${id} notes`).toEqual([...expected.notes]);
      // The site writes no figure for any of these chords, so the core must
      // find the root in the bass for every one of them.
      expect(
        identifyInversion(
          parseNote(expected.root),
          prompt.notes.map((note) => parseNote(note)),
        ),
        `staff round ${id} inversion`,
      ).toBe("rootPosition");
      // Core oracle: where the site states a numeral, the derived symbol must
      // equal it exactly; the skipped chord's answer is a phrase instead.
      if (expected.derivedSymbol !== undefined) {
        expect(
          symbolOf(expected.root, expected.quality, expected.seventh, prompt.notes),
          `staff round ${id} symbol`,
        ).toBe(expected.derivedSymbol);
      }
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...expected.options]);
      expect(answerOf(id), `staff round ${id} answer`).toBe(expected.siteSymbol);
      const rule = roundById(id).rule;
      expect(rule.toLowerCase(), `staff round ${id} rule symbol`).toContain(
        expected.siteSymbol.toLowerCase(),
      );
      expect(rule, `staff round ${id} rule key`).toMatch(/F major/);
    }
  });

  it("keeps every triad voicing on its triad's pitch classes", () => {
    for (const [id, expected] of Object.entries(SITE_CHORDS)) {
      if (expected.seventh || id === "l62-staff-skip-neighbors") continue;
      const triadSet = new Set(
        buildTriad(parseNote(expected.root), expected.quality as TriadQuality).map((note) =>
          pitchClass(note),
        ),
      );
      for (const tone of expected.notes) {
        expect(triadSet.has(pitchClass(parseNote(tone))), `${id} tone ${tone}`).toBe(true);
      }
    }
  });

  it("reads the omitted-fifth V7 exactly as the site describes it", () => {
    const prompt = roundById("l62-staff-v7-skipped2").prompt as Extract<
      PromptSpec,
      { kind: "staff" }
    >;
    const seventh = buildSeventh(parseNote("C4"), "dominantSeventh");
    const seventhSet = new Set(seventh.map((note) => pitchClass(note)));
    // Only the G — the fifth — is missing, so the voiced chord tones are the
    // dominant seventh's own pitch classes minus that fifth.
    const withoutFifth = new Set(
      seventh.filter((_, index) => index !== 2).map((note) => pitchClass(note)),
    );
    const voiced = new Set(
      prompt.notes.filter((tone) => tone !== "A5").map((tone) => pitchClass(parseNote(tone))),
    );
    expect(voiced, "bottom three are root, third, seventh").toEqual(withoutFifth);
    // The A is the nonharmonic tone: present in the voicing, absent from the chord.
    expect(prompt.notes).toContain("A5");
    expect(seventhSet.has(pitchClass(parseNote("A5")))).toBe(false);
  });

  it("reads the first skipped chord as neighbour tones beside the V chord", () => {
    const prompt = roundById("l62-staff-skip-neighbors").prompt as Extract<
      PromptSpec,
      { kind: "staff" }
    >;
    const third = buildTriad(parseNote("C4"), "major")[1]!;
    const fifth = buildTriad(parseNote("C4"), "major")[2]!;
    const tones = prompt.notes.map((note) => parseNote(note));
    // The bass and its octave double the V's root...
    expect(pitchClass(tones[0]!)).toBe(pitchClass(parseNote("C4")));
    expect(pitchClass(tones[1]!)).toBe(pitchClass(parseNote("C4")));
    // ...while the upper two sit one letter BELOW the V's third and fifth —
    // that is what makes them neighbouring tones of that V chord.
    expect(tones[2]!.letter).toBe(letterAt(letterIndex(third.letter) - 1));
    expect(tones[3]!.letter).toBe(letterAt(letterIndex(fifth.letter) - 1));
  });

  it("pins the site's key, shorthand and skipped-chord conclusions in the text rounds", () => {
    for (const [id, expected] of Object.entries(SITE_TEXT)) {
      expect(answerOf(id), id).toBe(expected);
    }
    expect(textRounds()).toHaveLength(Object.keys(SITE_TEXT).length);
  });

  it("states the site's analysis facts in every rule", () => {
    for (const round of lesson62Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson62Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/one flat/);
    expect(rules).toMatch(/F major or D minor/);
    expect(rules).toMatch(/most likely in that key/);
    expect(rules).toMatch(/no need to write it again/);
    expect(rules).toMatch(/doesn't fit nicely into a triad/);
    expect(rules).toMatch(/continuation of the V with two neighboring tones/);
    expect(rules).toMatch(/leave out the fifth/);
    expect(rules).toMatch(/escape tone/);
    expect(rules).toMatch(/commonly resolve to I/);
  });

  it("describes every staff prompt structurally, never with pitch names", () => {
    for (const { id, prompt } of staffRounds()) {
      const host = engrave(id, prompt);
      const label = host.querySelector(".prompt--staff")!.getAttribute("aria-label") ?? "";
      expect(label, `staff round ${id}`).toContain(
        `Staff notation, treble clef, 1 accidental, ${prompt.notes.length} notes`,
      );
      expect(label).not.toMatch(/[A-G][#b]/);
    }
  });
});
