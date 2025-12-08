// Centralized Framer Motion presets and helpers
import { Variants } from "framer-motion";

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  }),
  exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  }),
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.12, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
  }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const defaultTransition = { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } as const;

export type MotionPreset = keyof typeof presets;

export const presets = {
  fadeInUp,
  fadeIn,
  scaleIn,
};


