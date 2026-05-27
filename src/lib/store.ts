'use client'

import { create } from 'zustand'

type Role = 'researcher' | 'reader'

interface StoreState {
  role: Role
  setRole: (role: Role) => void
}

export const useStore = create<StoreState>((set) => ({
  role: 'researcher',
  setRole: (role) => set({ role }),
}))
