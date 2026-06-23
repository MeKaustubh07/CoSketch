"use client";

import { useState, useEffect } from "react";

interface SharePanelProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SharePanel({ boardId, isOpen, onClose }: SharePanelProps) {
  const [copied, setCopied] = useState<"link" | "password" | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch board details to get password (owner only)
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`/api/boards/${boardId}`)
      .then((r) => r.json())
      .then((data) => {
        // Password isn't returned from the detail endpoint for security.
        // Only shown on creation. Here we just show the join link.
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, boardId]);

  if (!isOpen) return null;

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/board/${boardId}/join`
    : "";

  const copyToClipboard = async (text: string, type: "link" | "password") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Share Board</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              ✕
            </button>
          </div>

          {/* Join Link */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                Join Link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={joinUrl}
                  className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-300 outline-none"
                />
                <button
                  onClick={() => copyToClipboard(joinUrl, "link")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    copied === "link"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30"
                  }`}
                >
                  {copied === "link" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Board ID */}
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                Board ID
              </label>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-indigo-300 font-mono">
                  {boardId}
                </code>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-lg">
              <p className="text-xs text-zinc-400 leading-relaxed">
                <strong className="text-zinc-300">How it works:</strong> Share the join link with
                collaborators. They&apos;ll need to enter the board password (shown once when the board
                is created) to gain access. Once joined, they can sketch in real-time.
              </p>
            </div>

            {/* Password display (only available immediately after creation) */}
            {password && (
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                  Join Password
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-amber-300 font-mono tracking-widest text-center">
                    {password}
                  </code>
                  <button
                    onClick={() => copyToClipboard(password, "password")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      copied === "password"
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30"
                    }`}
                  >
                    {copied === "password" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
