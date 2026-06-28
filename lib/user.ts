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

// Non-secret per-room flag: "this session already passed the password gate".
// The real credential is the httpOnly room-access cookie — this is only used to
// decide whether to show the gate UI. No password is ever stored client-side.
const roomKey = (id: string) => `cosketch-ok-${id}`;

export function isRoomAuthed(id: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(roomKey(id)) === "1";
}

export function markRoomAuthed(id: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(roomKey(id), "1");
}

export function clearRoomAuthed(id: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(roomKey(id));
}

// Display-only copy of the room password for the Share panel (so members can
// hand it to others). NOT used for auth — that's the httpOnly cookie. Lives
// only in this session.
const pwKey = (id: string) => `cosketch-pw-${id}`;

export function getRoomPassword(id: string): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(pwKey(id)) ?? "";
}

export function setRoomPassword(id: string, pw: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(pwKey(id), pw);
}
