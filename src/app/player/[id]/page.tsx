import PlayerClient from "../_components/player-client"
import { MOCK_ROUTINES, findRoutineByIdOrSlug } from "@/lib/mock-data"
import { notFound } from "next/navigation"

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const routine = findRoutineByIdOrSlug(id)
  if (!routine) notFound()

  return <PlayerClient routine={routine} />
}

export async function generateStaticParams() {
  // Pre-render by slug + the /demo shortcut.
  return [{ id: "demo" }, ...MOCK_ROUTINES.map((r) => ({ id: r.slug }))]
}
