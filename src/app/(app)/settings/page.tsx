import Link from "next/link"
import { Bell, Moon, ChevronRight, Crown, LogOut, Shield, FileText } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex flex-col min-h-full px-4 py-6 max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </header>

      <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-6 flex items-center gap-4">
        <div className="size-12 rounded-full bg-[#7C5CFC]/20 flex items-center justify-center text-xl font-bold text-[#7C5CFC]">
          D
        </div>
        <div>
          <p className="font-semibold text-white">Demo User</p>
          <p className="text-sm text-white/50">Free plan</p>
        </div>
        <Link
          href="/pricing"
          className="ml-auto flex items-center gap-1 rounded-full bg-[#7C5CFC]/20 px-3 py-1.5 text-xs font-medium text-[#7C5CFC] hover:bg-[#7C5CFC]/30 transition-colors"
        >
          <Crown className="size-3" />
          Upgrade
        </Link>
      </div>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Preferences</h2>
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden divide-y divide-white/10">
          <Link
            href="/settings/notifications"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="size-5 text-white/60" />
              <span className="text-sm text-white">Reminders</span>
            </div>
            <ChevronRight className="size-4 text-white/30" />
          </Link>
          <Link
            href="/settings/appearance"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Moon className="size-5 text-white/60" />
              <span className="text-sm text-white">Appearance</span>
            </div>
            <ChevronRight className="size-4 text-white/30" />
          </Link>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 px-1">Account</h2>
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden divide-y divide-white/10">
          <Link
            href="/pricing"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Crown className="size-5 text-[#7C5CFC]" />
              <span className="text-sm text-white">Subscription</span>
            </div>
            <ChevronRight className="size-4 text-white/30" />
          </Link>
          <Link
            href="/settings/privacy"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="size-5 text-white/60" />
              <span className="text-sm text-white">Privacy</span>
            </div>
            <ChevronRight className="size-4 text-white/30" />
          </Link>
          <Link
            href="/settings/terms"
            className="flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-white/60" />
              <span className="text-sm text-white">Terms & Privacy</span>
            </div>
            <ChevronRight className="size-4 text-white/30" />
          </Link>
        </div>
      </section>

      <section>
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <button className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-white/5 transition-colors text-left">
            <LogOut className="size-5 text-red-400/70" />
            <span className="text-sm text-red-400/80">Sign out</span>
          </button>
        </div>
      </section>

      <p className="text-center text-xs text-white/20 mt-8">Bend v0.1.0</p>
    </div>
  )
}
