import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { apiClient } from '../lib/api'
import type { Family } from '../lib/types'
import { getFamilyId, setFamilyId } from '../lib/storage'

type FamilyValue = { familyId: string | null; family: Family | null; setCurrentFamilyId: (id: string) => Promise<void>; refreshFamily: () => Promise<void> }
const FamilyContext = createContext<FamilyValue | null>(null)

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [familyId, setFamilyIdState] = useState<string | null>(null)
  const [family, setFamily] = useState<Family | null>(null)
  useEffect(() => { void getFamilyId().then(setFamilyIdState) }, [])
  const setCurrentFamilyId = useCallback(async (id: string) => { const value = id.trim(); if (!value) return; await setFamilyId(value); setFamilyIdState(value); setFamily(null) }, [])
  const refreshFamily = useCallback(async () => { if (!familyId) return; const result = await apiClient.get<Family[] | { results: Family[] }>('/families/'); const list = Array.isArray(result) ? result : result.results; setFamily(list.find((item) => String(item.id) === familyId) || list[0] || null) }, [familyId])
  const value = useMemo(() => ({ familyId, family, setCurrentFamilyId, refreshFamily }), [familyId, family, setCurrentFamilyId, refreshFamily])
  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
}

export function useFamily() {
  const value = useContext(FamilyContext)
  if (!value) throw new Error('useFamily must be used inside FamilyProvider')
  return value
}
