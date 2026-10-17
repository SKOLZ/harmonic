import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { validateRound } from "../lib/rounds/validate";
import { assertNoAnswerLeak } from "../lib/rounds/noAnswerLeak";
import type { PromptSpec, Round } from "../lib/rounds/types";
import StaffPrompt from "../components/prompts/StaffPrompt";
import {
  buildScale,
  buildTriad,
  degreeNote,
  identifyInversion,
  midiNumber,
  noteFromLetterAndAlteration,
  parseNote,
  scientificName,
  semitoneIndex,
  type Note,
  type ScaleType,
} from "../lib/theory";
import { createRng } from "./rng";
import { lesson120, lesson120Pool } from "./lesson120";

const GENERIC_RULE = /^(correct|incorrect|wrong|that'?s right)/i;

/** Every draw, for many seeds, must carry both structurally required kinds. */
const GUARANTEED_SEEDS = Array.from({ length: 100 }, (_, index) => index + 1);

/**
 * The four Neapolitans the site works through, each sounding exactly the MIDI
 * the site's own `sounds` payload plays when the finished chord appears
 * (musictheory.net `lesson120.js`, frames 101 / 221 / 341 / 461):
 * C minor → Db–F–Ab (61, 65, 68), E minor → F–A–C (65, 69, 72),
 * Ab major → Bbb–Db–Fb (69, 73, 76), A major → Bb–D–F (70, 74, 77).
 */
const SITE_SOUNDS: Readonly<Record<string, readonly number[]>> = {
  "C minor": [61, 65, 68],
  "E minor": [65, 69, 72],
  "Ab major": [69, 73, 76],
  "A major": [70, 74, 77],
};

/** The site's four worked keys, in the order the lesson teaches them. */
const WORKED_KEYS = [
  { label: "C minor", root: "C", scaleType: "naturalMinor" },
  { label: "E minor", root: "E", scaleType: "naturalMinor" },
  { label: "Ab major", root: "Ab", scaleType: "major" },
  { label: "A major", root: "A", scaleType: "major" },
] as const;

/**
 * Derive the site's construction independently of any lesson module: the
 * second scale degree, that degree lowered by exactly one half step (same
 * letter, one less semitone), and the major triad built on it.
 */
function neapolitanOf(root: string, scaleType: ScaleType): {
  second: Note;
  lowered: Note;
  triad: Note[];
} {
  const scale = buildScale(parseNote(`${root}4`), scaleType);
  const second = degreeNote(scale, 2);
  const lowered = noteFromLetterAndAlteration(
    second.letter,
    second.octave ?? 4,
    semitoneIndex(second) - 1,
  );
  return { second, lowered, triad: buildTriad(lowered, "major") };
}

/** Note name without octave, e.g. Bbb4 → Bbb, the way the site writes them. */
function noteName(note: Note): string {
  return scientificName(note).replace(/\d+$/, "");
}

/** One staff round expectation: the site's key plus how the round is shaped. */
interface StaffExpectation {
  answer: string;
  root: string;
  scaleType: ScaleType;
  /** The site's second scale degree for this key, no octave ("D", "F#"). */
  second: string;
  /** The lowered second degree the site names ("Db", "F", "Bbb", "Bb"). */
  lowered: string;
  doubled: boolean;
  options: readonly string[];
}

const OPTIONS = {
  c: "The Neapolitan of C minor",
  e: "The Neapolitan of E minor",
  ab: "The Neapolitan of Ab major",
  a: "The Neapolitan of A major",
} as const;

const SITE_CHORDS: Record<string, StaffExpectation> = {
  "l120-staff-c-close": {
    answer: OPTIONS.c,
    root: "C",
    scaleType: "naturalMinor",
    second: "D",
    lowered: "Db",
    doubled: false,
    options: [OPTIONS.e, OPTIONS.c, OPTIONS.ab, OPTIONS.a],
  },
  "l120-staff-e-close": {
    answer: OPTIONS.e,
    root: "E",
    scaleType: "naturalMinor",
    second: "F#",
    lowered: "F",
    doubled: false,
    options: [OPTIONS.e, OPTIONS.c, OPTIONS.ab, OPTIONS.a],
  },
  "l120-staff-ab-close": {
    answer: OPTIONS.ab,
    root: "Ab",
    scaleType: "major",
    second: "Bb",
    lowered: "Bbb",
    doubled: false,
    options: [OPTIONS.c, OPTIONS.e, OPTIONS.a, OPTIONS.ab],
  },
  "l120-staff-a-close": {
    answer: OPTIONS.a,
    root: "A",
    scaleType: "major",
    second: "B",
    lowered: "Bb",
    doubled: false,
    options: [OPTIONS.c, OPTIONS.e, OPTIONS.ab, OPTIONS.a],
  },
  "l120-staff-c-oct": {
    answer: OPTIONS.c,
    root: "C",
    scaleType: "naturalMinor",
    second: "D",
    lowered: "Db",
    doubled: true,
    options: [OPTIONS.ab, OPTIONS.a, OPTIONS.c, OPTIONS.e],
  },
  "l120-staff-e-oct": {
    answer: OPTIONS.e,
    root: "E",
    scaleType: "naturalMinor",
    second: "F#",
    lowered: "F",
    doubled: true,
    options: [OPTIONS.c, OPTIONS.e, OPTIONS.ab, OPTIONS.a],
  },
  "l120-staff-ab-oct": {
    answer: OPTIONS.ab,
    root: "Ab",
    scaleType: "major",
    second: "Bb",
    lowered: "Bbb",
    doubled: true,
    options: [OPTIONS.c, OPTIONS.ab, OPTIONS.e, OPTIONS.a],
  },
  "l120-staff-a-oct": {
    answer: OPTIONS.a,
    root: "A",
    scaleType: "major",
    second: "B",
    lowered: "Bb",
    doubled: true,
    options: [OPTIONS.a, OPTIONS.c, OPTIONS.e, OPTIONS.ab],
  },
};

/** The twelve text answers, each the site's own stated fact. */
const SITE_TEXT: Readonly<Record<string, string>> = {
  "l120-text-chord-kind": "A major triad built on a special note",
  "l120-text-special-note": "The lowered second degree (the supertonic)",
  "l120-text-scales": "A major or minor scale",
  "l120-text-step1": "Figure out the second scale degree",
  "l120-text-step2": "Lower it by one half step",
  "l120-text-step3": "A major triad",
  "l120-text-degree-c": "D",
  "l120-text-degree-e": "F#",
  "l120-text-degree-a": "B",
  "l120-text-lower-ab": "Bbb",
  "l120-text-concl-e": "F major",
  "l120-text-concl-ab": "Bbb major",
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
  return lesson120Pool.filter(isStaffRound).map((round) => ({ id: round.id, prompt: round.prompt }));
}

function textRounds(): Array<{ id: string; prompt: Extract<PromptSpec, { kind: "text" }> }> {
  return lesson120Pool
    .filter((round): round is Round & { prompt: Extract<PromptSpec, { kind: "text" }> } =>
      round.prompt.kind === "text",
    )
    .map((round) => ({ id: round.id, prompt: round.prompt }));
}

function roundById(id: string): Round {
  const found = lesson120Pool.find((round) => round.id === id);
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

describe("lesson 120 question pool", () => {
  it("holds 20 rounds: 8 staff, 12 text, all ids unique", () => {
    expect(lesson120Pool).toHaveLength(20);
    expect(staffRounds()).toHaveLength(8);
    expect(textRounds()).toHaveLength(12);
    const ids = lesson120Pool.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lesson120.entry.id).toBe(120);
    expect(lesson120.entry.title).toBe("Building Neapolitan Chords");
    expect(lesson120.entry.section).toBe("Neapolitan Chords");
  });

  it("validates every pool round", () => {
    for (const round of lesson120Pool) {
      expect(() => validateRound(round)).not.toThrow();
    }
  });

  it("draws at least 12 rounds and every drawn round passes validateRound", () => {
    const rounds = lesson120.generateRounds(createRng(1234));
    expect(rounds.length).toBeGreaterThanOrEqual(12);
    for (const round of rounds) {
      expect(() => validateRound(round)).not.toThrow();
    }
    const ids = rounds.map((round) => round.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("produces identical rounds for the same seed", () => {
    expect(lesson120.generateRounds(createRng(42))).toEqual(
      lesson120.generateRounds(createRng(42)),
    );
  });

  it("produces different rounds for two different seeds", () => {
    const first = lesson120.generateRounds(createRng(1));
    const second = lesson120.generateRounds(createRng(2));
    expect(JSON.stringify(second)).not.toBe(JSON.stringify(first));
  });

  it("draws at least one staff and one text round for every seed tried", () => {
    for (const seed of GUARANTEED_SEEDS) {
      const kinds = new Set(lesson120.generateRounds(createRng(seed)).map((r) => r.prompt.kind));
      expect(kinds.has("staff"), `seed ${seed} drew no staff round`).toBe(true);
      expect(kinds.has("text"), `seed ${seed} drew no text round`).toBe(true);
    }
  });

  it("engraves every Neapolitan as one stacked chord head", () => {
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

  it("rebuilds every staff chord from the core exactly as the site builds it", () => {
    for (const { id, prompt } of staffRounds()) {
      const expected = SITE_CHORDS[id];
      expect(expected, `round ${id} is not one of the site's four worked Neapolitans`).toBeDefined();
      const { second, lowered, triad } = neapolitanOf(expected.root, expected.scaleType);
      // The site's stated second degree and lowered degree, spelled the same way.
      expect(noteName(second), `staff round ${id} second degree`).toBe(expected.second);
      expect(noteName(lowered), `staff round ${id} lowered degree`).toBe(expected.lowered);
      expect(
        semitoneIndex(second) - semitoneIndex(lowered),
        `staff round ${id} must lower by one half step`,
      ).toBe(1);
      const close = triad.map((note) => scientificName(note));
      const expectedNotes = expected.doubled
        ? [...close, scientificName({ ...triad[0]!, octave: (triad[0]!.octave ?? 4) + 1 })]
        : close;
      expect(prompt.notes, `staff round ${id} notes`).toEqual(expectedNotes);
      // The site's own sounded MIDI is the oracle for the close voicings; the
      // doubled rounds are the same chord with the root again an octave up.
      const siteMidi = SITE_SOUNDS[expected.answer.replace("The Neapolitan of ", "")];
      expect(siteMidi, expected.answer).toBeDefined();
      const midi = prompt.notes.map((name) => midiNumber(parseNote(name)));
      expect(midi, `staff round ${id} midi`).toEqual(
        expected.doubled ? [...siteMidi!, siteMidi![0]! + 12] : [...siteMidi!],
      );
      // Root position: the Neapolitan's own root is the lowest note.
      expect(
        identifyInversion(lowered, prompt.notes.map((note) => parseNote(note))),
        `staff round ${id} inversion`,
      ).toBe("rootPosition");
      const answer = roundById(id).answer as Extract<Round["answer"], { kind: "choices" }>;
      expect(answer.options, `staff round ${id} options`).toEqual([...expected.options]);
      expect(answerOf(id), `staff round ${id} answer`).toBe(expected.answer);
      const rule = roundById(id).rule;
      expect(rule, `staff round ${id} rule chord`).toContain(
        prompt.notes.map((name) => noteName(parseNote(name))).join("–"),
      );
      expect(rule, `staff round ${id} rule chord quality`).toContain(`${expected.lowered} major chord`);
      expect(rule.toLowerCase(), `staff round ${id} rule key`).toContain(
        expected.answer.toLowerCase(),
      );
    }
  });

  it("matches the site's four sounded Neapolitans MIDI for MIDI", () => {
    for (const key of WORKED_KEYS) {
      const { triad } = neapolitanOf(key.root, key.scaleType);
      expect(
        triad.map((note) => midiNumber(note)),
        `Neapolitan of ${key.label}`,
      ).toEqual([...SITE_SOUNDS[key.label]]);
    }
  });

  it("keeps the correct answer in different positions across the pool", () => {
    const indices = new Set(
      lesson120Pool.map((round) => {
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
    for (const round of lesson120Pool) {
      expect(round.rule, round.id).not.toMatch(GENERIC_RULE);
    }
    const rules = lesson120Pool.map((round) => round.rule).join(" \n ");
    expect(rules).toMatch(/major triad/);
    expect(rules).toMatch(/lowered second degree/);
    expect(rules).toMatch(/supertonic/);
    expect(rules).toMatch(/major or minor scale/);
    expect(rules).toMatch(/figure out the second scale degree/i);
    expect(rules).toMatch(/half step/);
    for (const key of ["C minor", "E minor", "Ab major", "A major"]) {
      expect(rules, `rules must conclude the Neapolitan of ${key}`).toMatch(
        new RegExp(`Neapolitan of ${key}`),
      );
    }
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

describe("lesson 120 companion illustrations (T5e Progressions/Neapolitan pass)", () => {
  // The Neapolitan building drills are this pass's densest section: six of the
  // twelve text rounds name a concrete subject and keep the derived answer off
  // the page. The three scale-degree rounds ("In C minor, what is the second
  // scale degree?") are the lesson-21 starting-root archetype — the tonic named
  // by the key goes on the page, and the degree the learner counts stays off.
  // The Ab lowering round names Bb (the degree to lower) and keeps Bbb — the
  // lowered answer — off. The two conclusion rounds name a concrete key and
  // draw its tonic, the anchor of the lesson's own three-step Neapolitan
  // process; the derived chord ("F major", "Bbb major") is prose the learner
  // builds from the anchor, never a glyph on the page. The remaining six rounds
  // are class-level: three definition rounds and the three procedural step
  // rounds, none of which names a pitch to draw.
  const DEGREE = ["l120-text-degree-a", "l120-text-degree-c", "l120-text-degree-e"];
  const LOWERING = ["l120-text-lower-ab"];
  const CONCLUSION = ["l120-text-concl-ab", "l120-text-concl-e"];
  const DEFINITION = ["l120-text-chord-kind", "l120-text-scales", "l120-text-special-note"];
  const PROCEDURE = ["l120-text-step1", "l120-text-step2", "l120-text-step3"];
  const ILLUSTRATED = [...DEGREE, ...LOWERING, ...CONCLUSION].sort();

  function illustratedRounds(): Round[] {
    return lesson120Pool.filter((round) => round.illustration !== undefined);
  }

  it("accounts for every text round: six illustrated, six classified rejections", () => {
    const textIds = lesson120Pool
      .filter((round) => round.prompt.kind === "text")
      .map((round) => round.id)
      .sort();
    expect(textIds).toHaveLength(12);
    expect(textIds).toEqual([...ILLUSTRATED, ...DEFINITION, ...PROCEDURE].sort());
  });

  it("illustrates exactly the six named-subject rounds", () => {
    expect(
      illustratedRounds()
        .map((round) => round.id)
        .sort(),
    ).toEqual(ILLUSTRATED);
  });

  it("attaches illustrations only to text-prompt rounds", () => {
    for (const round of illustratedRounds()) {
      expect(round.prompt.kind).toBe("text");
    }
  });

  it("engraves each degree round's tonic alone — never the degree the learner counts", () => {
    // The question's pitch is the key's tonic; the answer is the second scale
    // degree (D, F#, B). The tonic alone goes on the page — the learner counts
    // the degree from the drawn anchor and never reads it off the picture.
    expect(roundById("l120-text-degree-c").illustration).toEqual({
      clef: "treble",
      notes: ["C4"],
    });
    expect(roundById("l120-text-degree-e").illustration).toEqual({
      clef: "treble",
      notes: ["E4"],
    });
    expect(roundById("l120-text-degree-a").illustration).toEqual({
      clef: "treble",
      notes: ["A4"],
    });
  });

  it("keeps every degree answer off the page: the tonic is drawn, the degree is answered", () => {
    expect(answerOf("l120-text-degree-c")).toBe("D");
    expect(answerOf("l120-text-degree-e")).toBe("F#");
    expect(answerOf("l120-text-degree-a")).toBe("B");
  });

  it("engraves the Ab lowering round's Bb alone — never the lowered Bbb", () => {
    // The question names Bb (the second degree to lower); the answer is Bbb.
    // Bb goes on the page — lowering it one half step is the learner's work.
    expect(roundById("l120-text-lower-ab").illustration).toEqual({
      clef: "treble",
      notes: ["Bb4"],
    });
    expect(answerOf("l120-text-lower-ab")).toBe("Bbb");
  });

  it("engraves each conclusion round's key tonic alone — never the derived chord", () => {
    // The question names a concrete key; its tonic is the anchor of the
    // three-step Neapolitan process (find the second degree, lower it, build a
    // major triad). The derived chord — "F major", "Bbb major" — is prose the
    // learner builds from the tonic, never a glyph on the page.
    expect(roundById("l120-text-concl-e").illustration).toEqual({
      clef: "treble",
      notes: ["E4"],
    });
    expect(roundById("l120-text-concl-ab").illustration).toEqual({
      clef: "treble",
      notes: ["Ab4"],
    });
  });

  it("pins every drawn anchor to the subject its own prompt names", () => {
    // Each illustrated round must name the subject the engraving draws: the
    // degree and conclusion rounds name the key whose tonic is drawn, and the
    // lowering round names Bb as the degree to lower. A drawn note that its own
    // prompt never mentions would be an invented subject.
    const keyed: Record<string, string> = {
      "l120-text-degree-c": "C minor",
      "l120-text-degree-e": "E minor",
      "l120-text-degree-a": "A major",
      "l120-text-concl-e": "E minor",
      "l120-text-concl-ab": "Ab major",
    };
    for (const [id, key] of Object.entries(keyed)) {
      const prompt = roundById(id).prompt;
      expect(prompt.kind, id).toBe("text");
      expect((prompt as Extract<PromptSpec, { kind: "text" }>).text, id).toContain(key);
      expect(roundById(id).illustration!.notes, id).toEqual([`${key.split(" ")[0]}4`]);
    }
    const lower = roundById("l120-text-lower-ab").prompt as Extract<
      PromptSpec,
      { kind: "text" }
    >;
    expect(lower.text).toContain("Bb");
    expect(roundById("l120-text-lower-ab").illustration!.notes).toEqual(["Bb4"]);
  });

  it("keeps the three definition rounds text-only: class subjects, no named pitch", () => {
    for (const id of DEFINITION) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("keeps the three procedural step rounds text-only: methods, not pitches", () => {
    for (const id of PROCEDURE) {
      expect(roundById(id).prompt.kind, id).toBe("text");
      expect(roundById(id).illustration, id).toBeUndefined();
    }
  });

  it("passes the shared no-leak assertion for every pool round", () => {
    for (const round of lesson120Pool) {
      expect(() => assertNoAnswerLeak(round), round.id).not.toThrow();
    }
  });

  it("engraves every illustration through the real Staff renderer", () => {
    for (const round of illustratedRounds()) {
      const host = engrave(round.id, { kind: "staff", ...round.illustration! });
      expect(host.querySelectorAll("path").length).toBeGreaterThanOrEqual(5);
    }
  });
});
