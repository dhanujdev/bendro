import Link from "next/link"
import { redirect } from "next/navigation"
import { Home, BookOpen, Settings } from "lucide-react"
import { auth } from "@/lib/auth"
import { AuthStatus } from "@/components/auth-buttons"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/home")
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0F0F14] text-white">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#0F0F14]/95 px-4 py-2 backdrop-blur-sm">
        <Link href="/home" className="text-sm font-semibold text-white/80">
          bendro
        </Link>
        <AuthStatus />
      </header>
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#0F0F14]/95 backdrop-blur-sm">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
          <Link
            href="/home"
            className="flex flex-col items-center gap-1 text-xs text-white/60 hover:text-[#7C5CFC] transition-colors"
          >
            <Home className="size-5" />
            <span>Home</span>
          </Link>
          <Link
            href="/library"
            className="flex flex-col items-center gap-1 text-xs text-white/60 hover:text-[#7C5CFC] transition-colors"
          >
            <BookOpen className="size-5" />
            <span>Library</span>
          </Link>
          <Link
            href="/settings"
            className="flex flex-col items-center gap-1 text-xs text-white/60 hover:text-[#7C5CFC] transition-colors"
          >
            <Settings className="size-5" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
