import { SignOutButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { AFTER_SIGN_OUT_URL } from "@/lib/auth/routes";

// Placeholder: B2 replaces this with the real dashboard shell.
export default async function DashboardPage() {
  await auth.protect();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.id;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p>Signed in as {email}</p>
      <SignOutButton redirectUrl={AFTER_SIGN_OUT_URL}>
        <button type="button" className="rounded border px-4 py-2">
          Sign out
        </button>
      </SignOutButton>
    </main>
  );
}
