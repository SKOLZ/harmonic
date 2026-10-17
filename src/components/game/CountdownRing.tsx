import { remainingFraction, remainingSeconds } from "./timer";

export interface CountdownRingProps {
  /**
   * Live milliseconds remaining from `createQuestionCountdown` — the shared
   * per-question clock. The ring and the label are both pure views of this
   * one signal; the component schedules no timer of its own.
   */
  remainingMs: () => number;
}

/**
 * The countdown readout: a circle whose arc visibly consumes as the seconds
 * tick down, with the numeric label still inside it. The number remains the
 * primary cue — the ring is supplementary — and both are driven by the same
 * `remainingMs` signal, so the arc can never drift against the displayed
 * seconds (one clock only).
 *
 * The arc is geometry, not colour: stroke-dashoffset = circumference × (1 −
 * remaining fraction), with the circumference fixed at 100 by the circle's
 * radius (100 / 2π), so the offset doubles as the percentage of the ring not
 * yet consumed. Ring colours live in styles.css custom properties
 * (--timer-ring-track / --timer-ring-progress) so a design-system restyle
 * rethemes the ring without touching this component.
 *
 * Accessibility contract is unchanged from the bare-text timer:
 * `role="timer"` with `aria-live="off"` (ticks are never announced), and the
 * decorative SVG is `aria-hidden` so assistive tech reads exactly the
 * seconds text as before. Under `prefers-reduced-motion` the stylesheet
 * hides the shrinking arc, leaving the static full track ring.
 */
export default function CountdownRing(props: CountdownRingProps) {
  return (
    <p class="game-shell__timer" role="timer" aria-live="off">
      <svg class="game-shell__timer-ring" viewBox="0 0 36 36" aria-hidden="true">
        {/* The full circle the progress arc is drawn over: the static ring
            that reduced-motion degradation leaves behind. */}
        <circle class="game-shell__timer-ring-track" cx="18" cy="18" r="15.9155" />
        <circle
          class="game-shell__timer-ring-progress"
          cx="18"
          cy="18"
          r="15.9155"
          stroke-dasharray="100"
          stroke-dashoffset={100 * (1 - remainingFraction(props.remainingMs()))}
        />
      </svg>
      <span class="game-shell__timer-value">{remainingSeconds(props.remainingMs())}s</span>
    </p>
  );
}
