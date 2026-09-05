import { beforeEach, describe, expect, it, vi } from 'vitest'

import { apiClient } from '../lib/api'
import { registerAccount } from '../lib/auth'
import { setSession } from '../lib/storage'

vi.mock('../lib/api', () => ({ apiClient: { post: vi.fn() } }))
vi.mock('../lib/storage', () => ({ setSession: vi.fn() }))

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
})
