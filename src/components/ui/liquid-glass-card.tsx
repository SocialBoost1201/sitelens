"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiquidGlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  intensity?: "low" | "medium" | "high";
  glow?: boolean;
}

export function LiquidGlassCard({
  children,
  className,
  intensity = "medium",
  glow = false,
  ...props
}: LiquidGlassCardProps) {
  const intensityClasses = {
    low: "bg-white/5 dark:bg-black/20 backdrop-blur-md",
    medium: "bg-white/10 dark:bg-white/5 backdrop-blur-xl",
    high: "bg-white/20 dark:bg-white/10 backdrop-blur-2xl",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/20 dark:border-white/10 shadow-xl",
        intensityClasses[intensity],
        glow && "after:absolute after:inset-0 after:-z-10 after:bg-primary/20 after:blur-3xl",
        className
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
      {/* Subtle ambient light effect inside the card */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 mix-blend-overlay" />
    </motion.div>
  );
}
