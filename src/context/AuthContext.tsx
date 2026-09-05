import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { apiClient } from '../lib/api'
import { loginAccount, registerAccount } from '../lib/auth'
import { clearSession, getAccessToken } from '../lib/storage'

type AuthValue = {
  isAuthenticated: boolean
  hydrating: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, passwordConfirm: string) => Promise<void>
  logout: () => Promise<void>
}
const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<string | null>(null)
  const [hydrating, setHydrating] = useState(true)
  useEffect(() => { void getAccessToken().then(setAccess).finally(() => setHydrating(false)) }, [])
  const login = useCallback(async (username: string, password: string) => {
    setAccess(await loginAccount(username, password))
  }, [])
  const register = useCallback(async (username: string, password: string, passwordConfirm: string) => {
    setAccess(await registerAccount(username, password, passwordConfirm))
  }, [])
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout/')
    } finally {
      await clearSession()
      setAccess(null)
    }
  }, [])
  const value = useMemo(
    () => ({ isAuthenticated: Boolean(access), hydrating, login, register, logout }),
    [access, hydrating, login, register, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
