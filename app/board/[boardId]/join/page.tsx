"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.boardId as string;
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/boards/${boardId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(`/board/${boardId}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to join");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-[#6965db] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">CoSketch</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-center text-gray-900 mb-2">Join Board</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter the password to join board{" "}
            <code className="text-[#6965db] font-mono">{boardId}</code>
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Board Password
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the 6-character password"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#6965db]/30 focus:border-[#6965db] transition-all text-center tracking-widest font-mono text-lg"
                maxLength={6}
                autoFocus
              />
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || password.length === 0}
              className="w-full py-2.5 bg-[#6965db] text-white font-medium text-sm rounded-lg hover:bg-[#5b57d1] transition-colors disabled:opacity-50"
            >
              {loading ? "Joining…" : "Join Board"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push("/")}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
