import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '../lib/api'
import { logoutAccount, registerAccount } from '../lib/auth'
import { getRefreshToken, setSession } from '../lib/storage'

vi.mock('../lib/api', () => ({ apiClient: { post: vi.fn() } }))
vi.mock('../lib/storage', () => ({ getRefreshToken: vi.fn(), setSession: vi.fn() }))

describe('registration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts the account fields and persists returned tokens', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      user: { id: 9, username: 'new_reader' },
      access: 'access-token',
      refresh: 'refresh-token',
    })

    await expect(registerAccount('new_reader', 'Safe-cloud-2026!', 'Safe-cloud-2026!')).resolves.toBe('access-token')
    expect(apiClient.post).toHaveBeenCalledWith('/auth/register/', {
      username: 'new_reader',
      password: 'Safe-cloud-2026!',
      password_confirm: 'Safe-cloud-2026!',
    })
    expect(setSession).toHaveBeenCalledWith('access-token', 'refresh-token')
  })

  it('sends the refresh token when logging out', async () => {
    vi.mocked(getRefreshToken).mockResolvedValue('refresh-token')
    vi.mocked(apiClient.post).mockResolvedValue(undefined)

    await logoutAccount()

    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout/', { refresh: 'refresh-token' })
  })
})
