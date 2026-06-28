"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CanvasStage } from "@/components/canvas/CanvasStage";
import { SharePanel } from "@/components/collab/SharePanel";
import { RoomProviderWrapper } from "@/components/collab/RoomProviderWrapper";
import { AvatarStack } from "@/components/collab/Cursors";
import {
  getStoredName,
  setStoredName,
  isRoomAuthed,
  markRoomAuthed,
  setRoomPassword,
} from "@/lib/user";

export default function BoardPage() {
  const params = useParams();
  const boardId = params.boardId as string;

  const [name, setName] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    const n = getStoredName();
    if (n && isRoomAuthed(boardId)) setName(n);
    setResolved(true);
  }, [boardId]);

  if (!resolved) return null;

  if (!name) {
    return <AccessGate boardId={boardId} onEnter={(n) => setName(n)} />;
  }

  return (
    <RoomProviderWrapper roomId={boardId} userName={name}>
      <BoardRoom boardId={boardId} />
    </RoomProviderWrapper>
  );
}

function AccessGate({
  boardId,
  onEnter,
}: {
  boardId: string;
  onEnter: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(getStoredName());
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter your name");
    if (!password.trim()) return setError("Password is required");

    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${boardId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not join room");
        setLoading(false);
        return;
      }
      setStoredName(name);
      markRoomAuthed(boardId);
      setRoomPassword(boardId, password.trim());
      onEnter(name.trim());
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div
      className="w-screen h-screen flex items-center justify-center bg-[#fafafa] p-4"
      style={{
        backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="island p-8 w-full max-w-sm" style={{ borderRadius: 16 }}>
        <div className="flex flex-col items-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6965db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          <h1 className="text-lg font-semibold text-gray-900">Join the canvas</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your name and the room password</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={32}
            className={gateInput}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Room password"
            className={gateInput}
          />
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !name.trim() || !password.trim()}
            className="w-full py-3 bg-[#6965db] text-white font-medium rounded-lg hover:bg-[#5b57d1] disabled:opacity-50 transition-colors text-sm"
          >
            {loading ? "Joining…" : "Enter room"}
          </button>
        </form>
      </div>
    </div>
  );
}

const gateInput =
  "w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 text-sm outline-none focus:border-[#6965db] focus:ring-2 focus:ring-[#6965db]/20 transition-all";

function BoardRoom({ boardId }: { boardId: string }) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="w-screen h-screen relative bg-white overflow-hidden">
      <CanvasStage />

      {/* Top-right cluster: avatars + share */}
      <div className="absolute top-3 right-3 z-40 flex items-center gap-2">
        <AvatarStack />
        <button
          onClick={() => setShareOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white bg-[#6965db] hover:bg-[#5b57d1] shadow-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </button>
      </div>

      <SharePanel boardId={boardId} isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
