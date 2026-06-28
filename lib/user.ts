/**
 * user.ts — the collaborator's display name, kept in sessionStorage so it
 * lives only for the current browser session. No accounts, no DB.
 */

export const USERNAME_KEY = "cosketch-username";

export function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(USERNAME_KEY) ?? "";
}

export function setStoredName(name: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(USERNAME_KEY, name.trim());
}

// Per-room password, kept for the session so the creator/joiner isn't asked
// twice and so the room provider can pass it to the auth endpoint.
const roomKey = (id: string) => `cosketch-pw-${id}`;

export function getRoomPassword(id: string): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(roomKey(id)) ?? "";
}

export function setRoomPassword(id: string, pw: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(roomKey(id), pw);
}
