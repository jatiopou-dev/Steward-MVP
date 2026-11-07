import { motionTokens } from "./motion-tokens";

/**
 * Runtime gates for motion. Every value is read lazily behind a
 * `typeof window` guard — never at module level, or the server build
 * and the client disagree.
 *
 * Reduced motion does not mean no feedback. It means the vestibular
 * part goes (transforms, parallax, travel) and the comprehension part
 * stays (opacity, colour, a short cross-fade).
 */
export const motionConfig = {
  isLowEnd(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.hardwareConcurrency === "number" &&
      navigator.hardwareConcurrency <= 4
    );
  },

  prefersReduced(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  },

  prefersReducedTransparency(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-transparency: reduce)").matches
    );
  },

  /**
   * `essential` marks motion that carries meaning — a sheet tracking a
   * drag, a value counting to its new figure. Essential motion survives
   * a low-end device; decoration does not. Nothing survives reduced
   * motion as a transform.
   */
  shouldAnimate({ essential = false }: { essential?: boolean } = {}): boolean {
    if (this.prefersReduced()) return false;
    if (!essential && this.isLowEnd()) return false;
    return true;
  },

  duration(): number {
    return this.isLowEnd() || this.prefersReduced()
      ? motionTokens.duration.instant
      : motionTokens.duration.normal;
  },
};
