import type { Round } from "./types";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validatePrompt(prompt: unknown, label: string): void {
  if (typeof prompt !== "object" || prompt === null || Array.isArray(prompt)) {
    throw new Error(`${label}: prompt must be an object`);
  }
  const kind = (prompt as { kind?: unknown }).kind;
  switch (kind) {
    case "text": {
      if (!isNonEmptyString((prompt as { text?: unknown }).text)) {
        throw new Error(`${label}: prompt text must be a non-empty string`);
      }
      return;
    }
    case "staff": {
      const { clef, notes } = prompt as { clef?: unknown; notes?: unknown };
      if (clef !== "treble" && clef !== "bass") {
        throw new Error(`${label}: prompt clef must be "treble" or "bass"`);
      }
      if (!isStringArray(notes) || notes.length === 0) {
        throw new Error(`${label}: prompt notes must be a non-empty string array`);
      }
      return;
    }
    case "audio": {
      const { play, notes } = prompt as { play?: unknown; notes?: unknown };
      if (play !== "note" && play !== "chord" && play !== "scale" && play !== "interval") {
        throw new Error(`${label}: prompt play must be note | chord | scale | interval`);
      }
      if (!isStringArray(notes) || notes.length === 0) {
        throw new Error(`${label}: prompt notes must be a non-empty string array`);
      }
      return;
    }
    case "keyboard": {
      const { highlight } = prompt as { highlight?: unknown };
      if (!isStringArray(highlight) || highlight.length === 0) {
        throw new Error(`${label}: prompt highlight must be a non-empty string array`);
      }
      return;
    }
    default:
      throw new Error(`${label}: unknown prompt kind ${JSON.stringify(kind)}`);
  }
}

function validateAnswer(answer: unknown, label: string): void {
  if (typeof answer !== "object" || answer === null || Array.isArray(answer)) {
    throw new Error(`${label}: answer must be an object`);
  }
  const kind = (answer as { kind?: unknown }).kind;
  switch (kind) {
    case "choices": {
      const { options, correctIndex } = answer as { options?: unknown; correctIndex?: unknown };
      if (!isStringArray(options)) {
        throw new Error(`${label}: answer options must be a string array`);
      }
      // An empty options list is caught by the range check below (no index can
      // be in range for zero options), so the learner-facing error names the
      // real problem rather than the container.
      if (!Number.isInteger(correctIndex) || (correctIndex as number) < 0 || (correctIndex as number) >= options.length) {
        throw new Error(
          `${label}: correctIndex ${String(correctIndex)} out of range for ${options.length} options`,
        );
      }
      const seen = new Set<string>();
      for (const option of options) {
        if (seen.has(option)) {
          throw new Error(`${label}: duplicate option ${JSON.stringify(option)}`);
        }
        seen.add(option);
      }
      return;
    }
    case "textInput": {
      const { accepted, expected } = answer as { accepted?: unknown; expected?: unknown };
      if (!isStringArray(accepted) || accepted.length === 0) {
        throw new Error(`${label}: answer accepted must be a non-empty string array`);
      }
      if (!isNonEmptyString(expected)) {
        throw new Error(`${label}: answer expected must be a non-empty string`);
      }
      return;
    }
    case "notePick": {
      const { correctNotes } = answer as { correctNotes?: unknown };
      if (!isStringArray(correctNotes) || correctNotes.length === 0) {
        throw new Error(`${label}: answer correctNotes must be a non-empty string array`);
      }
      return;
    }
    case "sequence": {
      const { correctOrder } = answer as { correctOrder?: unknown };
      if (!isStringArray(correctOrder) || correctOrder.length === 0) {
        throw new Error(`${label}: answer correctOrder must be a non-empty string array`);
      }
      return;
    }
    default:
      throw new Error(`${label}: unknown answer kind ${JSON.stringify(kind)}`);
  }
}

/**
 * Runtime validation for a single round. Throws with a message naming the round
 * (id when available) so bad generated data fails at the boundary, not mid-play.
 */
export function validateRound(round: unknown): void {
  if (typeof round !== "object" || round === null || Array.isArray(round)) {
    throw new Error("validateRound: round must be an object");
  }
  const { id, prompt, answer, rule } = round as Partial<Round> & {
    prompt?: unknown;
    answer?: unknown;
  };
  const label = `Round ${typeof id === "string" && id !== "" ? JSON.stringify(id) : "<no id>"}`;
  if (!isNonEmptyString(id)) {
    throw new Error(`${label}: id must be a non-empty string`);
  }
  validatePrompt(prompt, label);
  validateAnswer(answer, label);
  if (!isNonEmptyString(rule)) {
    throw new Error(`${label}: rule must be a non-empty string`);
  }
}

/** Validates a non-empty list of rounds, prefixing failures with the member index. */
export function validateRounds(rounds: unknown): void {
  if (!Array.isArray(rounds)) {
    throw new Error("validateRounds: rounds must be an array");
  }
  if (rounds.length === 0) {
    throw new Error("validateRounds: rounds must not be empty");
  }
  rounds.forEach((round, index) => {
    try {
      validateRound(round);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`rounds[${index}]: ${message}`);
    }
  });
}
