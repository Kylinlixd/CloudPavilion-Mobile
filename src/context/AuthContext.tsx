import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { apiClient } from '../lib/api'
import { clearSession, getAccessToken, setSession } from '../lib/storage'

type AuthValue = { isAuthenticated: boolean; hydrating: boolean; login: (username: string, password: string) => Promise<void>; logout: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<string | null>(null)
  const [hydrating, setHydrating] = useState(true)
  useEffect(() => { void getAccessToken().then(setAccess).finally(() => setHydrating(false)) }, [])
  const login = useCallback(async (username: string, password: string) => {
    const result = await apiClient.post<{ access: string; refresh: string }>('/auth/token/', { username, password })
    await setSession(result.access, result.refresh)
    setAccess(result.access)
  }, [])
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout/')
    } finally {
      await clearSession()
      setAccess(null)
    }
  }, [])
  const value = useMemo(() => ({ isAuthenticated: Boolean(access), hydrating, login, logout }), [access, hydrating, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
