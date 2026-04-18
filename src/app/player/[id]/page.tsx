import PlayerClient from "../_components/player-client"
import { MOCK_ROUTINE_STRETCHES, MOCK_ROUTINES } from "@/lib/mock-data"
import { notFound } from "next/navigation"

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const routine = MOCK_ROUTINE_STRETCHES[id]
  if (!routine) notFound()

  return <PlayerClient routine={routine} />
}

export async function generateStaticParams() {
  return MOCK_ROUTINES.map((r) => ({ id: r.id }))
}
