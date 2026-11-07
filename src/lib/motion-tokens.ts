/**
 * Motion foundation. Every duration, easing and spring in the app
 * resolves here — components never inline their own values.
 *
 * Spring presets are expressed the way Apple's designers reason about
 * them (damping ratio + response) and converted to the stiffness /
 * damping pair the runtime wants. Critically damped (damping 1.0) is
 * the default; overshoot is reserved for motion the user's own gesture
 * already gave momentum to.
 */

export const motionTokens = {
  duration: {
    instant: 0.08,
    fast: 0.16,
    normal: 0.22,
    slow: 0.32,
    crawl: 0.6,
  },
  easing: {
    /** ease-out-quint — the house curve. No bounce, no elastic. */
    smooth: [0.22, 1, 0.36, 1],
    sharp: [0.4, 0, 0.2, 1],
    linear: [0, 0, 1, 1],
  },
  distance: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 48,
  },
  scale: {
    subtle: 0.985,
    press: 0.975,
    pop: 1.02,
  },
} as const;

/**
 * Apple's two designer-facing parameters, converted for the runtime.
 * `response` is the time to reach the target in seconds — not a
 * duration, since a spring has no fixed duration; its settle time
 * emerges from the parameters. `damping` 1.0 means no overshoot.
 */
function spring(damping: number, response: number) {
  const mass = 1;
  const stiffness = ((2 * Math.PI) / response) ** 2 * mass;
  return {
    type: "spring" as const,
    stiffness: Math.round(stiffness),
    damping: Math.round(2 * damping * Math.sqrt(stiffness * mass)),
    mass,
  };
}

export const springs = {
  /** Default UI: buttons, chips, nav items. Critically damped. */
  snappy: spring(1.0, 0.3),
  /** Cards, panels and sheets landing softly. */
  gentle: spring(1.0, 0.4),
  /** Momentum only — a flick or a throw preceded it. */
  bouncy: spring(0.8, 0.35),
  /** Tooltips, popovers, dropdowns. */
  instant: spring(1.0, 0.2),
  /** Drag release. Carries the pointer's velocity through. */
  release: { ...spring(0.8, 0.4), restDelta: 0.001 },
} as const;

/**
 * Apple's momentum projection, from the Designing Fluid Interfaces
 * sample code. Not the textbook v²/2a — the exponential-decay form.
 * Use it to pick the snap target a flick is actually heading for,
 * then hand the release velocity to the spring.
 */
export function projectMomentum(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. A hard stop reads as frozen;
 * this reads as "responsive, but there is nothing more here".
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export type SpringPreset = keyof typeof springs;
