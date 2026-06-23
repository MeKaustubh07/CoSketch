"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface BoardItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  collaboratorCount: number;
  role: "owner" | "collaborator";
}

export function BoardsGrid() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/boards");
      if (res.ok) {
        const data = await res.json();
        setBoards(data.boards);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/board/${data.board.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this board? This cannot be undone.")) return;
    await fetch(`/api/boards/${id}`, { method: "DELETE" });
    setBoards((prev) => prev.filter((b) => b.id !== id));
  };

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    await fetch(`/api/boards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    setBoards((prev) =>
      prev.map((b) => (b.id === id ? { ...b, name: renameValue.trim() } : b))
    );
    setRenamingId(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">My Boards</h1>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
        >
          {creating ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          )}
          New Board
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </div>
          <p className="text-zinc-500 mb-2">No boards yet</p>
          <p className="text-sm text-zinc-600 mb-6">
            Create your first board to start sketching
          </p>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-400 hover:to-purple-500 transition-all"
          >
            Create Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {boards.map((board) => (
            <div
              key={board.id}
              className="group relative bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all cursor-pointer"
              onClick={() => router.push(`/board/${board.id}`)}
            >
              {/* Preview area */}
              <div className="h-36 bg-gradient-to-br from-zinc-900 to-zinc-800/50 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-zinc-700">
                  <path d="M12 19l7-7 3 3-7 7-3-3z" />
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                  <path d="M2 2l7.586 7.586" />
                  <circle cx="11" cy="11" r="2" />
                </svg>
              </div>

              {/* Info */}
              <div className="p-3">
                {renamingId === board.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRename(board.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(board.id);
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 outline-none focus:border-indigo-500"
                  />
                ) : (
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {board.name}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-zinc-500">
                    {formatDate(board.updatedAt)}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    {board.role === "collaborator" && (
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px]">
                        Shared
                      </span>
                    )}
                    {board.collaboratorCount > 0 && (
                      <span>{board.collaboratorCount + 1} 👤</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions (owner only) */}
              {board.role === "owner" && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(board.id);
                      setRenameValue(board.name);
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-zinc-800/80 backdrop-blur rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
                    title="Rename"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(board.id);
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-zinc-800/80 backdrop-blur rounded-md text-zinc-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
