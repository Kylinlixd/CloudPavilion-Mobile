import { apiClient } from './api'
import { setSession } from './storage'

type AuthResponse = {
  user?: { id: number; username: string }
  access: string
  refresh: string
}

async function persist(result: AuthResponse) {
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
