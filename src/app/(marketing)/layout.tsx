import Link from "next/link"
import { auth } from "@/lib/auth"

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const signedIn = !!session?.user?.id

  return (
    <div
      data-testid="marketing-shell"
      className="min-h-screen bg-[#0F0F14] text-white"
    >
      <header
        data-testid="marketing-header"
        className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#0F0F14]/80 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between h-16 max-w-5xl mx-auto px-6">
          <Link
            href="/"
            className="text-xl font-bold text-white tracking-tight"
          >
            Bend
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Pricing
            </Link>
            <Link
              href={signedIn ? "/home" : "/signin?callbackUrl=/home"}
              data-testid="marketing-cta"
              data-signed-in={signedIn ? "true" : "false"}
              className="rounded-full bg-[#7C5CFC] hover:bg-[#6B4EE0] px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {signedIn ? "Open app" : "Get started"}
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-16">{children}</main>

      <footer
        data-testid="marketing-footer"
        className="border-t border-white/10 px-6 py-12 mt-12"
      >
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-8 text-sm">
          <div className="sm:col-span-1">
            <p className="text-xl font-bold text-white tracking-tight">Bend</p>
            <p className="mt-2 text-white/40">
              Daily stretching, made simple.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
              Product
            </p>
            <ul className="flex flex-col gap-2 text-white/60">
              <li>
                <Link href="/pricing" className="hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/player/demo" className="hover:text-white">
                  Try a demo
                </Link>
              </li>
              <li>
                <Link
                  href={signedIn ? "/home" : "/signin?callbackUrl=/home"}
                  className="hover:text-white"
                >
                  {signedIn ? "Open app" : "Sign in"}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
              Legal
            </p>
            <ul className="flex flex-col gap-2 text-white/60">
              <li>
                <Link href="/legal/terms" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
              Company
            </p>
            <ul className="flex flex-col gap-2 text-white/60">
              <li>
                <a
                  href="mailto:hello@bendro.app"
                  className="hover:text-white"
                >
                  hello@bendro.app
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-white/30">
          © {new Date().getFullYear()} Bend. Not medical advice. Consult a
          qualified healthcare provider before starting any exercise program.
        </p>
      </footer>
    </div>
  )
}
