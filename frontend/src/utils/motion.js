/**
 * SKYDISH CENTRALIZED MOTION SYSTEM
 * Standard motion tokens and reusable framer-motion variants
 * Respects prefers-reduced-motion
 */

export const transitions = {
  micro: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
  standard: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  large: { duration: 0.32, ease: [0.4, 0, 0.2, 1] },
  spring: { type: "spring", stiffness: 350, damping: 25 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.standard },
  exit: { opacity: 0, transition: transitions.micro },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: transitions.standard },
  exit: { opacity: 0, y: 8, transition: transitions.micro },
};

export const fadeInScale = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: transitions.standard },
  exit: { opacity: 0, scale: 0.98, transition: transitions.micro },
};

export const modalMotion = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: transitions.micro },
    exit: { opacity: 0, transition: transitions.micro },
  },
  modal: {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: transitions.standard },
    exit: { opacity: 0, scale: 0.96, y: 10, transition: transitions.micro },
  },
};

export const drawerMotion = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: transitions.micro },
    exit: { opacity: 0, transition: transitions.micro },
  },
  drawerRight: {
    initial: { x: "100%" },
    animate: { x: 0, transition: transitions.standard },
    exit: { x: "100%", transition: transitions.micro },
  },
  drawerBottom: {
    initial: { y: "100%" },
    animate: { y: 0, transition: transitions.standard },
    exit: { y: "100%", transition: transitions.micro },
  },
};

export const listItemMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.micro },
  exit: { opacity: 0, transition: transitions.micro },
};

export const hoverElevate = {
  whileHover: { y: -2, transition: transitions.micro },
  whileTap: { scale: 0.98, transition: transitions.micro },
};

export const buttonPress = {
  whileTap: { scale: 0.97, transition: transitions.micro },
};
