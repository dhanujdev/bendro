import Link from "next/link"

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F0F14] text-white">
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#0F0F14]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between h-16 max-w-5xl mx-auto px-6">
          <Link href="/" className="text-xl font-bold text-white tracking-tight">
            Bend
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/pricing" className="text-sm text-white/60 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link
              href="/home"
              className="rounded-full bg-[#7C5CFC] hover:bg-[#6B4EE0] px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>
      <main className="pt-16">{children}</main>
      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/30">
        © {new Date().getFullYear()} Bend. Daily stretching, made simple.
      </footer>
    </div>
  )
}
