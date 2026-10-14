import type { PromptSpec } from "../../lib/rounds/types";

export interface TextPromptProps {
  prompt: PromptSpec;
}

/**
 * Renders a `kind: "text"` PromptSpec. The prompt registry only routes text
 * prompts here; the kind check is defensive so a registry mistake fails loud
 * with the actual kind instead of rendering silently empty.
 */
export default function TextPrompt(props: TextPromptProps) {
  const text = () => {
    const prompt = props.prompt;
    if (prompt.kind !== "text") {
      throw new Error(
        `TextPrompt: expected prompt kind "text", got "${prompt.kind}"`,
      );
    }
    return prompt.text;
  };
  return <p class="prompt--text">{text()}</p>;
}
