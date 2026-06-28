"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [roomId, setRoomId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomId.trim() || "Untitled" }),
      });

      if (res.ok) {
        const data = await res.json();
        // Store the password in sessionStorage so we can show it in the share panel
        sessionStorage.setItem(
          `board-${data.board.id}-password`,
          data.board.joinPassword
        );
        router.push(`/board/${data.board.id}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create room");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!roomId.trim()) {
      setError("Room ID is required");
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/boards/${roomId.trim()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push(`/board/${roomId.trim()}`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to join room");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle dotted background — Excalidraw canvas feel */}
      <div
        className="absolute inset-0 opacity-100"
        style={{
          backgroundImage: "radial-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Card */}
      <div className="relative w-full max-w-md">
        <div className="island p-8" style={{ borderRadius: 16 }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="mb-2">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6965db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                <path d="M2 2l7.586 7.586" />
                <circle cx="11" cy="11" r="2" />
              </svg>
            </div>
            <h1
              className="text-4xl text-[#6965db] mb-1"
              style={{ fontFamily: "var(--font-caveat), cursive" }}
            >
              CoSketch
            </h1>
            <p className="text-sm text-gray-500">
              Collaborative drawing, hand-crafted feel.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => {
                setActiveTab("create");
                setError("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "create"
                  ? "bg-[#6965db] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Create room
            </button>
            <button
              onClick={() => {
                setActiveTab("join");
                setError("");
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "join"
                  ? "bg-[#6965db] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Join room
            </button>
          </div>

          {/* Form */}
          <form
            onSubmit={activeTab === "create" ? handleCreate : handleJoin}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">
                {activeTab === "create" ? "Room name" : "Room ID"}
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder={
                  activeTab === "create" ? "e.g. My Canvas" : "Enter the room ID"
                }
                required={activeTab === "join"}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-[#6965db] focus:ring-2 focus:ring-[#6965db]/20 transition-all"
              />
            </div>

            {activeTab === "join" && (
              <div>
                <label className="block text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the room password"
                  required
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-[#6965db] focus:ring-2 focus:ring-[#6965db]/20 transition-all font-mono tracking-widest text-center"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#6965db] text-white font-medium rounded-lg hover:bg-[#5b57d1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {loading
                ? "Loading…"
                : activeTab === "create"
                ? "Create & Enter"
                : "Join Room"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          No sign-up needed · Share a link to collaborate
        </p>
      </div>
    </div>
  );
}
