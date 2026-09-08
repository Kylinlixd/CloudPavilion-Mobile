import { apiClient } from './api'
import { clearFamilyId, getRefreshToken, setSession } from './storage'

type AuthResponse = {
  user?: { id: number; username: string }
  access: string
  refresh: string
}

async function persist(result: AuthResponse) {
  // A family belongs to the previous account; never carry it across sessions.
  await clearFamilyId()
  await setSession(result.access, result.refresh)
  return result.access
}

export async function loginAccount(username: string, password: string) {
  return persist(await apiClient.post<AuthResponse>('/auth/token/', { username, password }))
}

export async function registerAccount(username: string, password: string, passwordConfirm: string) {
  return persist(await apiClient.post<AuthResponse>('/auth/register/', {
    username,
    password,
    password_confirm: passwordConfirm,
  }))
}

export async function logoutAccount() {
  const refresh = await getRefreshToken()
  if (refresh) await apiClient.post('/auth/logout/', { refresh })
}
