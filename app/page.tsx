import Link from "next/link";

export const metadata = {
  title: "CoSketch — Real-time Collaborative Whiteboard",
  description:
    "Sketch, brainstorm, and create together in real time. A collaborative whiteboard with a hand-drawn feel, persistent rooms, and shareable links.",
};

const features = [
  {
    icon: "🎨",
    title: "Hand-Drawn Style",
    description:
      "Beautiful rough.js rendering gives every shape and line a natural, hand-drawn aesthetic.",
  },
  {
    icon: "⚡",
    title: "Real-Time Collaboration",
    description:
      "See everyone's cursors, selections, and edits instantly — powered by Liveblocks.",
  },
  {
    icon: "🔒",
    title: "Password-Protected Rooms",
    description:
      "Every board has a unique join password. Share it with your team to collaborate securely.",
  },
  {
    icon: "💾",
    title: "Persistent Storage",
    description:
      "Your boards are saved automatically. Come back anytime and pick up where you left off.",
  },
  {
    icon: "📤",
    title: "Export Anywhere",
    description:
      "Export your work as PNG images or JSON files. Import previous sketches to keep building.",
  },
  {
    icon: "🛠️",
    title: "Full Drawing Toolkit",
    description:
      "Rectangles, ellipses, diamonds, arrows, lines, freehand draw, text — all with style controls.",
  },
];

const shortcuts = [
  { key: "V", action: "Select" },
  { key: "R", action: "Rectangle" },
  { key: "O", action: "Ellipse" },
  { key: "D", action: "Diamond" },
  { key: "A", action: "Arrow" },
  { key: "L", action: "Line" },
  { key: "P", action: "Draw" },
  { key: "T", action: "Text" },
  { key: "⌘Z", action: "Undo" },
  { key: "⌘D", action: "Duplicate" },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-950/50 via-zinc-950 to-purple-950/30 -z-20" />
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/8 rounded-full blur-[120px] -z-10" />
      <div className="fixed bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[120px] -z-10" />
      <div className="fixed top-2/3 left-1/2 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] -z-10" />

      {/* Nav */}
      <header className="relative z-10 border-b border-zinc-800/50 bg-zinc-950/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="px-5 py-2 text-sm rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.02] transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-20">
        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-zinc-400">
            Real-time multiplayer whiteboard
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] max-w-4xl">
          <span className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-100 bg-clip-text text-transparent">
            Sketch ideas
          </span>
          <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            together, in real time
          </span>
        </h1>

        <p className="max-w-xl text-lg text-zinc-400 leading-relaxed mt-6">
          A collaborative whiteboard with a hand-drawn feel. Draw shapes,
          write text, sketch freely — and see everyone&apos;s work appear
          live on your canvas.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-10">
          <Link
            href="/register"
            className="group flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all duration-200"
          >
            Start Sketching
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800/50 hover:border-zinc-600 transition-all duration-200"
          >
            Sign In
          </Link>
        </div>

        {/* Canvas preview mockup */}
        <div className="relative mt-20 w-full max-w-5xl">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl blur-xl" />
          <div className="relative bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Toolbar mockup */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800/50 bg-zinc-950/50">
              <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex gap-1 mx-auto">
                {["↖", "▭", "◇", "○", "→", "╱", "✎", "T"].map((icon, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-xs ${
                      i === 1
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "text-zinc-500"
                    }`}
                  >
                    {icon}
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas area with sketched shapes */}
            <div className="h-72 md:h-96 bg-zinc-950/50 relative">
              {/* Grid dots */}
              <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                }}
              />

              {/* Faux shapes */}
              <div className="absolute top-12 left-16 w-32 h-24 border-2 border-indigo-400/60 rounded-sm" style={{ transform: "rotate(-2deg)" }} />
              <div className="absolute top-20 left-56 w-28 h-28 border-2 border-purple-400/60 rounded-full" />
              <div className="absolute top-16 right-32 w-36 h-20 border-2 border-cyan-400/60 rounded-sm" style={{ transform: "rotate(1deg)" }} />

              {/* Arrow connecting shapes */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <line x1="200" y1="120" x2="340" y2="120" stroke="rgba(251,191,36,0.5)" strokeWidth="2" strokeDasharray="6 4" />
                <polygon points="340,116 352,120 340,124" fill="rgba(251,191,36,0.5)" />
              </svg>

              {/* Text elements */}
              <div className="absolute bottom-16 left-24 text-zinc-400/60 text-sm italic" style={{ fontFamily: "cursive" }}>
                brainstorm...
              </div>
              <div className="absolute bottom-12 right-24 text-indigo-300/40 text-xs" style={{ fontFamily: "cursive" }}>
                sketch together ✨
              </div>

              {/* Cursor mockups */}
              <div className="absolute top-24 left-40 animate-pulse">
                <svg width="18" height="24" viewBox="0 0 24 36" fill="none">
                  <path d="M5.65 12.37H5.46L5.32 12.5L0.5 16.88V1.2L11.78 12.37H5.65Z" fill="#e57373" stroke="white" strokeWidth="1" />
                </svg>
                <span className="absolute left-4 top-4 text-[10px] bg-red-400/80 text-white px-1.5 py-0.5 rounded-md">Alice</span>
              </div>
              <div className="absolute top-48 right-48">
                <svg width="18" height="24" viewBox="0 0 24 36" fill="none">
                  <path d="M5.65 12.37H5.46L5.32 12.5L0.5 16.88V1.2L11.78 12.37H5.65Z" fill="#64b5f6" stroke="white" strokeWidth="1" />
                </svg>
                <span className="absolute left-4 top-4 text-[10px] bg-blue-400/80 text-white px-1.5 py-0.5 rounded-md">Bob</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-4">
          Everything you need to sketch
        </h2>
        <p className="text-zinc-400 text-center max-w-lg mx-auto mb-12">
          A complete drawing toolkit, real-time sync, and secure sharing — all in
          one beautiful, fast whiteboard.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group p-6 bg-zinc-900/40 border border-zinc-800/50 rounded-xl hover:border-zinc-700/50 hover:bg-zinc-900/60 transition-all duration-300"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-zinc-200 mb-1">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Keyboard shortcuts */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-8">
          Keyboard-first workflow
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg"
            >
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 font-mono">
                {s.key}
              </kbd>
              <span className="text-sm text-zinc-500">{s.action}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-32">
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 rounded-3xl blur-xl" />
          <div className="relative bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-3">Ready to sketch?</h2>
            <p className="text-zinc-400 mb-8">
              Create your free account and start collaborating in seconds.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all duration-200"
            >
              Get Started — It&apos;s Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-800/50 py-8 text-center">
        <p className="text-sm text-zinc-600">
          Built with Next.js, rough.js, Liveblocks, and Prisma •{" "}
          <span className="text-zinc-500">CoSketch</span>
        </p>
      </footer>
    </div>
  );
}
