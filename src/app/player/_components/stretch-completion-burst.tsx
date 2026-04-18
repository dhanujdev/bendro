"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Check } from "lucide-react"

// Renders a ~500ms celebration when a stretch's timer hits zero. Skipped
// entirely (empty fragment) when the OS/browser prefers reduced motion —
// the parent uses a shorter pre-advance delay in that case so the feel is
// still snappy. See `src/app/player/_components/player-client.tsx`.
export function StretchCompletionBurst() {
  const reduce = useReducedMotion()
  if (reduce) return null

  return (
    <motion.div
      data-testid="player-completion-burst"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.15, 1] }}
        transition={{ duration: 0.4 }}
        className="relative size-28 rounded-full bg-[#7C5CFC]/20 flex items-center justify-center"
      >
        <motion.span
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute inset-0 rounded-full bg-[#7C5CFC]/40"
        />
        <Check className="size-14 text-[#7C5CFC]" strokeWidth={3} />
      </motion.div>
    </motion.div>
  )
}
