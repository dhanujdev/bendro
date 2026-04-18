import { NextRequest } from "next/server"
import { ProgressSchema, ProgressQuerySchema } from "@/types"
import { MOCK_PROGRESS } from "@/lib/mock-data"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = ProgressQuerySchema.safeParse(Object.fromEntries(searchParams))

  if (!query.success) {
    return Response.json({ error: "Invalid query parameters", issues: query.error.issues }, { status: 400 })
  }

  const { days } = query.data
  const progress = {
    ...MOCK_PROGRESS,
    history: MOCK_PROGRESS.history.slice(0, days),
  }

  const validated = ProgressSchema.parse(progress)
  return Response.json({ data: validated })
}
