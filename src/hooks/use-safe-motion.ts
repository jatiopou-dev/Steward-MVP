"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { motionTokens } from "@/lib/motion-tokens";

/**
 * Entrance variants that respect the user's motion setting and never
 * cause a hydration mismatch.
 *
 * The server renders content visible, so `initial` has to be the
 * visible state until the client has mounted — otherwise React finds
 * an opacity the server never wrote. After mount the animation runs
 * from the hidden state as normal.
 *
 * Under reduced motion the travel is dropped and only the fade stays.
 */
export function useSafeMotion(travel: number = motionTokens.distance.md) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const y = reduce ? 0 : travel;

  return {
    mounted,
    reduce: Boolean(reduce),
    initial: mounted ? { opacity: 0, y } : { opacity: 1, y: 0 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -travel },
  };
}

/**
 * True once the component is running on the client. Use it to defer
 * anything that reads layout, pointer state or a media query.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
