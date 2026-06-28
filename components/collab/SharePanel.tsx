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

  useEffect(() => {
    if (!isOpen) return;
    // Check if we have the password from room creation
    const stored = sessionStorage.getItem(`board-${boardId}-password`);
    if (stored) setPassword(stored);
  }, [isOpen, boardId]);

  if (!isOpen) return null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/board/${boardId}`
      : "";

  const copyToClipboard = async (text: string, type: "link" | "password") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-50" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Share this room
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Join Link */}
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 outline-none"
                />
                <button
                  onClick={() => copyToClipboard(shareUrl, "link")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    copied === "link"
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : "bg-[#e0dfff] text-[#6965db] hover:bg-[#d0ceff]"
                  }`}
                >
                  {copied === "link" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Room ID */}
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">
                Room ID
              </label>
              <code className="block px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#6965db] font-mono">
                {boardId}
              </code>
            </div>

            {/* Password (only visible to room creator) */}
            {password && (
              <div>
                <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">
                  Room Password
                </label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-mono tracking-widest text-center">
                    {password}
                  </code>
                  <button
                    onClick={() => copyToClipboard(password, "password")}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied === "password"
                        ? "bg-green-50 text-green-600 border border-green-200"
                        : "bg-[#e0dfff] text-[#6965db] hover:bg-[#d0ceff]"
                    }`}
                  >
                    {copied === "password" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
              <p className="text-xs text-gray-500 leading-relaxed">
                Share the link and password with others to let them join this
                room and sketch together in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
