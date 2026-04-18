import { z } from "zod";

export const BodyAreaSchema = z.enum([
  "neck",
  "shoulders",
  "chest",
  "upper_back",
  "lower_back",
  "hips",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "ankles",
  "wrists",
  "full_body",
]);
export type BodyArea = z.infer<typeof BodyAreaSchema>;

export const IntensitySchema = z.enum(["gentle", "moderate", "deep"]);
export type Intensity = z.infer<typeof IntensitySchema>;

export const StretchSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  instructions: z.string().min(1),
  cues: z.array(z.string()),
  cautions: z.array(z.string()),
  bodyAreas: z.array(BodyAreaSchema),
  intensity: IntensitySchema,
  bilateral: z.boolean(),
  defaultDurationSec: z.number().int().positive(),
  mediaUrl: z.string().url().nullable(),
  thumbnailUrl: z.string().url().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type StretchType = z.infer<typeof StretchSchema>;

export const CreateStretchSchema = StretchSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateStretch = z.infer<typeof CreateStretchSchema>;

export const UpdateStretchSchema = CreateStretchSchema.partial();
export type UpdateStretch = z.infer<typeof UpdateStretchSchema>;
