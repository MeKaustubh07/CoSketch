import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BoardsGrid } from "@/components/dashboard/BoardsGrid";

export default async function BoardsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col relative overflow-hidden min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/30 via-zinc-950 to-purple-950/20 -z-10" />

      {/* Header */}
      <header className="relative z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
              CoSketch
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">
              {session.user.name || session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="px-4 py-2 text-sm rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-all"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        <BoardsGrid />
      </main>
    </div>
  );
}
