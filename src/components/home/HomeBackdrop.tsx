import { onCleanup, onMount } from "solid-js";

/** Grid gaps at the three width steps the landing uses. */
const SPACING_COMPACT = 26;
const SPACING_WIDE = 32;
const SPACING_MAX = 40;

/** The wave's shape, in CSS pixels and milliseconds. */
const WAVE_FREQUENCY = 0.018;
const WAVE_SPEED = 0.0007;

/** The quiet resting dot, before the wave lifts it. */
const BASE_ALPHA = 0.09;
const BASE_RADIUS = 1.1;
const ALPHA_LIFT = 0.09;
const RADIUS_LIFT = 0.8;

/**
 * Grey, deliberately: the backdrop is a small detail behind the type, so it
 * never borrows the brand's gold or any other hue.
 */
const DOT_COLOR = "#6b6b6b";

interface Dot {
  x: number;
  y: number;
  /** `distance * WAVE_FREQUENCY`, precomputed so a frame only does one sine. */
  phase: number;
}

function spacingFor(width: number): number {
  if (width > 1800) return SPACING_MAX;
  if (width > 1200) return SPACING_WIDE;
  return SPACING_COMPACT;
}

/**
 * The landing's backdrop: a grey dot grid with a slow radial wave breathing
 * out from the right of the page. It is decoration, not content — the canvas
 * is `aria-hidden` and transparent to the pointer — so it can never compete
 * with the promise or the two actions.
 *
 * The loop only starts when a real 2D context exists, which keeps happy-dom
 * and any canvas-less environment quiet. Reduced motion draws the grid once
 * and never schedules a frame; hiding the document pauses the loop; a resize
 * rebuilds the grid and the device-pixel transform.
 */
export default function HomeBackdrop() {
  let canvas: HTMLCanvasElement | undefined;

  onMount(() => {
    const element = canvas;
    if (!element) return;

    let context: CanvasRenderingContext2D | null = null;
    try {
      context = element.getContext("2d");
    } catch {
      return;
    }
    if (!context) return;

    // The narrowed context, captured for the closures below.
    const ctx = context;

    let frameId: number | null = null;
    let width = 0;
    let height = 0;
    let dots: Dot[] = [];

    let motionQuery: MediaQueryList | null = null;
    if (typeof window.matchMedia === "function") {
      try {
        motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      } catch {
        motionQuery = null;
      }
    }

    const prefersStatic = () => motionQuery?.matches === true;

    const rebuild = () => {
      width = Math.max(
        1,
        Math.round(
          element.clientWidth ||
            element.parentElement?.clientWidth ||
            window.innerWidth,
        ),
      );
      height = Math.max(
        1,
        Math.round(
          element.clientHeight ||
            element.parentElement?.clientHeight ||
            window.innerHeight,
        ),
      );

      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      // Resizing the backing store resets the transform, so every rebuild
      // restores the CSS-pixel coordinate system.
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      const originX = width * 0.68;
      const originY = height * 0.45;
      const step = spacingFor(width);

      dots = [];
      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          const dx = x - originX;
          const dy = y - originY;
          dots.push({
            x,
            y,
            phase: Math.sqrt(dx * dx + dy * dy) * WAVE_FREQUENCY,
          });
        }
      }
    };

    /**
     * `time` is the animation clock in milliseconds. `null` paints the
     * resting grid — the reduced-motion frame — with no wave phase at all.
     */
    const draw = (time: number | null) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = DOT_COLOR;

      const travel = time === null ? null : time * WAVE_SPEED;

      for (const dot of dots) {
        const lift =
          travel === null
            ? 0
            : Math.max(0, Math.sin(dot.phase - travel)) ** 2;

        ctx.globalAlpha = BASE_ALPHA + lift * ALPHA_LIFT;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, BASE_RADIUS + lift * RADIUS_LIFT, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    const stop = () => {
      if (frameId !== null) {
        if (typeof window.cancelAnimationFrame === "function") {
          window.cancelAnimationFrame(frameId);
        }
        frameId = null;
      }
    };

    const frame = (time: number) => {
      frameId = null;
      draw(time);

      // Reduced motion can arrive mid-flight, and a hidden document must not
      // keep painting; either way the next frame is the one that resumes.
      if (document.hidden || prefersStatic()) return;

      frameId = window.requestAnimationFrame(frame);
    };

    const start = () => {
      if (frameId !== null) return;

      if (prefersStatic() || typeof window.requestAnimationFrame !== "function") {
        draw(null);
        return;
      }

      frameId = window.requestAnimationFrame(frame);
    };

    const handleResize = () => {
      rebuild();

      if (prefersStatic() || frameId === null) {
        draw(null);
        return;
      }

      // Keep the new grid painting immediately instead of showing one stale
      // frame while the loop catches up.
      draw(performance.now());
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };

    const handleMotionPreference = () => {
      stop();

      if (prefersStatic()) {
        draw(null);
      } else if (!document.hidden) {
        start();
      }
    };

    let observingResize = false;
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver === "function") {
      try {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(element);
        observingResize = true;
      } catch {
        resizeObserver = null;
      }
    }
    if (!observingResize) {
      window.addEventListener("resize", handleResize);
    }

    document.addEventListener("visibilitychange", handleVisibility);

    let listeningWithAddEventListener = false;
    if (motionQuery) {
      listeningWithAddEventListener =
        typeof motionQuery.addEventListener === "function";
      if (listeningWithAddEventListener) {
        motionQuery.addEventListener("change", handleMotionPreference);
      } else if (typeof motionQuery.addListener === "function") {
        motionQuery.addListener(handleMotionPreference);
      }
    }

    rebuild();
    if (!document.hidden) {
      start();
    }

    onCleanup(() => {
      stop();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);

      if (motionQuery) {
        if (listeningWithAddEventListener) {
          motionQuery.removeEventListener("change", handleMotionPreference);
        } else if (typeof motionQuery.removeListener === "function") {
          motionQuery.removeListener(handleMotionPreference);
        }
      }
    });
  });

  return <canvas ref={canvas} class="home__backdrop" aria-hidden="true" />;
}
