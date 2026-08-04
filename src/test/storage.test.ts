import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as SecureStore from 'expo-secure-store'

import { clearSession, getAccessToken, getFamilyId, setFamilyId, setSession } from '../lib/storage'

describe('secure session storage', () => {
  beforeEach(() => {
    vi.mocked(SecureStore.getItemAsync).mockReset()
    vi.mocked(SecureStore.setItemAsync).mockReset()
    vi.mocked(SecureStore.deleteItemAsync).mockReset()
  })

  it('stores the session and family context in SecureStore', async () => {
    await setSession('access', 'refresh')
    await setFamilyId(12)
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cloudpavilion.access', 'access')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cloudpavilion.refresh', 'refresh')
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('cloudpavilion.family', '12')
  })

  it('reads and clears the saved session', async () => {
    vi.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => key === 'cloudpavilion.access' ? 'access' : '12')
    expect(await getAccessToken()).toBe('access')
    expect(await getFamilyId()).toBe('12')
    await clearSession()
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cloudpavilion.access')
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('cloudpavilion.refresh')
  })
})
