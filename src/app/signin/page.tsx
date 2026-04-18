import { redirect } from "next/navigation"
import { auth, signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"

/**
 * Sign-in screen.
 *
 * Uses Auth.js v5 server actions (`signIn` re-exported from `@/lib/auth`).
 * Server components invoke providers by name via the form action — no client
 * runtime required for the happy path. If a user is already signed in we
 * redirect them straight to /home.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await auth()
  const params = await searchParams

  if (session?.user?.id) {
    redirect(params.callbackUrl ?? "/home")
  }

  const hasGoogle = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  )
  const hasResend = Boolean(
    process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM,
  )
  const hasAnyProvider = hasGoogle || hasResend

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Sign in to bendro</h1>
          <p className="text-sm text-white/60">
            We never share your email. No passwords, ever.
          </p>
        </div>

        {params.error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            Something went wrong. Try again, or pick a different provider.
          </div>
        ) : null}

        {!hasAnyProvider ? (
          <div
            role="alert"
            className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200"
          >
            Authentication is not configured on this instance. Ask the administrator
            to set <code>AUTH_GOOGLE_ID</code> / <code>AUTH_RESEND_KEY</code> env vars.
          </div>
        ) : null}

        {hasResend ? (
          <form
            className="space-y-3"
            action={async (formData: FormData) => {
              "use server"
              await signIn("resend", {
                email: formData.get("email") as string,
                redirectTo: "/home",
              })
            }}
          >
            <label htmlFor="email" className="block text-sm text-white/70">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[#7C5CFC] focus:outline-none"
            />
            <Button type="submit" className="w-full" size="lg">
              Email me a sign-in link
            </Button>
          </form>
        ) : null}

        {hasGoogle && hasResend ? (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0F0F14] px-2 text-white/40">or</span>
            </div>
          </div>
        ) : null}

        {hasGoogle ? (
          <form
            action={async () => {
              "use server"
              await signIn("google", { redirectTo: "/home" })
            }}
          >
            <Button
              type="submit"
              variant="outline"
              size="lg"
              className="w-full"
            >
              Continue with Google
            </Button>
          </form>
        ) : null}
      </div>
    </main>
  )
}
