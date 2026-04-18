import { auth, signIn, signOut } from "@/lib/auth"
import { Button } from "@/components/ui/button"

/**
 * Auth status + sign-in/out control. Server component — reads `auth()` on
 * every render so the UI always reflects the latest session state.
 */
export async function AuthStatus({ className }: { className?: string }) {
  const session = await auth()

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server"
          await signIn(undefined, { redirectTo: "/home" })
        }}
      >
        <Button type="submit" size="sm" variant="outline" className={className}>
          Sign in
        </Button>
      </form>
    )
  }

  const label = session.user.name ?? session.user.email ?? "Signed in"

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="text-xs text-white/60" aria-label="signed-in-as">
        {label}
      </span>
      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/" })
        }}
      >
        <Button type="submit" size="sm" variant="ghost">
          Sign out
        </Button>
      </form>
    </div>
  )
}
