import { z } from "zod"

export const BodyArea = z.enum([
  "neck",
  "shoulders",
  "chest",
  "back",
  "lower_back",
  "hips",
  "hamstrings",
  "quads",
  "calves",
  "ankles",
  "full_body",
])
export type BodyArea = z.infer<typeof BodyArea>

export const Intensity = z.enum(["gentle", "moderate", "deep"])
export type Intensity = z.infer<typeof Intensity>

export const StretchSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  bodyArea: BodyArea,
  intensity: Intensity,
  durationSeconds: z.number().int().positive(),
  instructions: z.array(z.string()),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  benefits: z.array(z.string()),
  contraindications: z.array(z.string()).optional(),
})
export type Stretch = z.infer<typeof StretchSchema>

export const StretchListQuerySchema = z.object({
  bodyArea: BodyArea.optional(),
  intensity: Intensity.optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
})
export type StretchListQuery = z.infer<typeof StretchListQuerySchema>
