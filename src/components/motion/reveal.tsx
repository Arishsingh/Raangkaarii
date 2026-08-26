"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

type RevealProps = React.ComponentProps<typeof motion.div> & {
  variants?: Variants;
  /** Animate when scrolled into view instead of on mount. */
  inView?: boolean;
};

/** Single element that animates in. */
export function Reveal({
  className,
  variants = fadeInUp,
  inView = false,
  children,
  ...props
}: RevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      variants={reduce ? undefined : variants}
      initial={reduce ? undefined : "hidden"}
      {...(inView
        ? { whileInView: "show", viewport: { once: true, amount: 0.3 } }
        : { animate: "show" })}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Wrap children so they animate in one after another. */
export function Stagger({
  className,
  stagger = 0.06,
  delay = 0,
  children,
  ...props
}: React.ComponentProps<typeof motion.div> & {
  stagger?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      variants={reduce ? undefined : staggerContainer(stagger, delay)}
      initial={reduce ? undefined : "hidden"}
      animate="show"
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Child of <Stagger>. */
export function StaggerItem({
  className,
  variants = fadeInUp,
  children,
  ...props
}: React.ComponentProps<typeof motion.div> & { variants?: Variants }) {
  return (
    <motion.div className={cn(className)} variants={variants} {...props}>
      {children}
    </motion.div>
  );
}
