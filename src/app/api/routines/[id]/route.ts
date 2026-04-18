import { RoutineWithStretchesSchema } from "@/types"
import { findRoutineByIdOrSlug } from "@/lib/mock-data"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const routine = findRoutineByIdOrSlug(id)
  if (!routine) {
    return Response.json({ error: "Routine not found" }, { status: 404 })
  }

  const validated = RoutineWithStretchesSchema.parse(routine)
  return Response.json({ data: validated })
}
