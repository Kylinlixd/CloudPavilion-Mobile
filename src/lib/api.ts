import { getAccessToken, getFamilyId, getRefreshToken, setAccessToken } from './storage'

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

function parsePayload(value: string) {
  if (!value) return null
  try { return JSON.parse(value) } catch { return value }
}

function messageFromPayload(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string') return payload.detail
  return fallback
}

async function refreshAccessToken() {
  const refresh = await getRefreshToken()
  if (!refresh) return false
  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
  if (!response.ok) return false
  const result = (await response.json()) as { access: string }
  await setAccessToken(result.access)
  return true
}

async function request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const [access, familyId] = await Promise.all([getAccessToken(), getFamilyId()])
  if (access) headers.set('Authorization', `Bearer ${access}`)
  if (familyId) headers.set('X-Family-ID', familyId)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  if (response.status === 401 && allowRefresh && path !== '/auth/token/refresh/') {
    if (await refreshAccessToken()) return request<T>(path, options, false)
  }
  const payload = parsePayload(await response.text())
  if (!response.ok) throw new ApiError(response.status, messageFromPayload(payload, `请求失败（${response.status}）`), payload)
  return payload as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
}
