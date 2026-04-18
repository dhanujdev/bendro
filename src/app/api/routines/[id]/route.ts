import { RoutineWithStretchesSchema } from "@/types"
import { getRoutineByIdOrSlug } from "@/lib/data"
import { ERROR_CODES, errorResponse, jsonResponse } from "@/lib/http"

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  const routine = await getRoutineByIdOrSlug(id)
  if (!routine) {
    return errorResponse(ERROR_CODES.NOT_FOUND, "Routine not found")
  }

  const validated = RoutineWithStretchesSchema.parse(routine)
  return jsonResponse({ data: validated })
}
