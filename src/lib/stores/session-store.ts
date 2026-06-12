import { create } from "zustand"

type Role = "SUPER_ADMIN" | "ADMIN" | "EDITOR"

export type SessionUser = {
  id: string
  email: string
  name: string | null
  role: Role
}

type SessionStore = {
  user: SessionUser | null
  setUser: (user: SessionUser | null) => void
}

export const useSessionStore = create<SessionStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
