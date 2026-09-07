import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as SecureStore from 'expo-secure-store'

import { API_BASE_URL, apiClient } from '../lib/api'

describe('mobile api client', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.mocked(SecureStore.getItemAsync).mockReset()
    vi.mocked(SecureStore.setItemAsync).mockReset()
    vi.mocked(SecureStore.deleteItemAsync).mockReset()
  })

  it('defaults release builds to the production API', () => {
    expect(API_BASE_URL).toBe('https://leexd.top/cloudpavilion/api/v1')
  })

  it('adds JWT and family headers to protected requests', async () => {
    vi.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => ({
      'cloudpavilion.access': 'access-token',
      'cloudpavilion.family': '8',
    }[key] || null))
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }))

    await expect(apiClient.get<{ id: number }>('/books/')).resolves.toEqual({ id: 1 })
    const [, options] = fetchMock.mock.calls[0]
    expect(options.headers.get('Authorization')).toBe('Bearer access-token')
    expect(options.headers.get('X-Family-ID')).toBe('8')
  })

  it('refreshes access once after a 401 and retries the request', async () => {
    vi.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => ({
      'cloudpavilion.access': 'expired-token',
      'cloudpavilion.refresh': 'refresh-token',
      'cloudpavilion.family': '8',
    }[key] || null))
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: '过期' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ access: 'fresh-token', refresh: 'fresh-refresh' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

    await expect(apiClient.get<{ ok: boolean }>('/reports/dashboard/')).resolves.toEqual({ ok: true })
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cloudpavilion.access', 'fresh-token')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cloudpavilion.refresh', 'fresh-refresh')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('normalizes errors from the backend', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: '没有权限' }), { status: 403 }))
    await expect(apiClient.get('/audit-logs/')).rejects.toMatchObject({ status: 403, message: '没有权限' })
  })

  it('sends multipart bodies without forcing a JSON content type', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 3 }), { status: 201 }))
    const body = new FormData()
    body.append('content', '书摘')
    await expect(apiClient.upload('/excerpts/', body)).resolves.toEqual({ id: 3 })
    const [, options] = fetchMock.mock.calls[0]
    expect(options.body).toBe(body)
    expect(options.headers.has('Content-Type')).toBe(false)
  })
})
