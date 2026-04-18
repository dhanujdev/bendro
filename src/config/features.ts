export const features = {
  /** AI-generated personalized plans */
  aiPlans: process.env.NEXT_PUBLIC_FF_AI_PLANS === "true",

  /** Stripe billing and premium gating */
  billing: process.env.NEXT_PUBLIC_FF_BILLING !== "false",

  /** Social sharing of routines */
  socialSharing: process.env.NEXT_PUBLIC_FF_SOCIAL === "true",

  /** Wearable sync (HRV, Apple Health) */
  wearableSync: process.env.NEXT_PUBLIC_FF_WEARABLES === "true",

  /** Pain tracking per-stretch feedback */
  painTracking: process.env.NEXT_PUBLIC_FF_PAIN_TRACKING !== "false",

  /** Streak notifications via push */
  pushNotifications: process.env.NEXT_PUBLIC_FF_PUSH !== "false",

  /** Beta builder UI */
  routineBuilder: process.env.NEXT_PUBLIC_FF_BUILDER === "true",

  /**
   * Phase 6 multi-step onboarding flow (goals → focus → avoid → conditions).
   * Defaults ON in dev; set NEXT_PUBLIC_FF_ONBOARDING_V1=false to disable.
   */
  onboardingV1: process.env.NEXT_PUBLIC_FF_ONBOARDING_V1 !== "false",
} as const;

export type FeatureFlag = keyof typeof features;

export function isEnabled(flag: FeatureFlag): boolean {
  return features[flag];
}
