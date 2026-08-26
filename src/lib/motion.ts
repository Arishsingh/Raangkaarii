import type { Transition, Variants } from "motion/react";

/** Shared easing + duration tokens so animations feel like one system. */
export const ease = [0.16, 1, 0.3, 1] as const;

export const transition: Transition = {
  duration: 0.5,
  ease: [...ease],
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition },
};

export const staggerContainer = (stagger = 0.06, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});
