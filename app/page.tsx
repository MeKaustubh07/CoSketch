import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-zinc-950 to-purple-950/30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />

      <main className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-300 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
            CoSketch
          </h1>
        </div>

        <p className="max-w-md text-lg text-zinc-400 leading-relaxed">
          A real-time collaborative whiteboard with a hand-drawn feel.
          Sketch, brainstorm, and create — together.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-200"
          >
            Get Started
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800/50 hover:border-zinc-600 transition-all duration-200"
          >
            Create Account
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          {[
            "Real-time collaboration",
            "Hand-drawn style",
            "Persistent rooms",
            "Shareable links",
          ].map((feature) => (
            <span
              key={feature}
              className="px-4 py-1.5 rounded-full text-sm text-zinc-400 border border-zinc-800 bg-zinc-900/50"
            >
              {feature}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
