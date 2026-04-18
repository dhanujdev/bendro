import { RoutineWithStretchesSchema } from "@/types"
import { MOCK_ROUTINE_STRETCHES } from "@/lib/mock-data"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const routine = MOCK_ROUTINE_STRETCHES[id]
  if (!routine) {
    return Response.json({ error: "Routine not found" }, { status: 404 })
  }

  const validated = RoutineWithStretchesSchema.parse(routine)
  return Response.json({ data: validated })
}
