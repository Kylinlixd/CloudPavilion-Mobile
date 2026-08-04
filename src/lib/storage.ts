import * as SecureStore from 'expo-secure-store'

export const storageKeys = {
  access: 'cloudpavilion.access',
  refresh: 'cloudpavilion.refresh',
  family: 'cloudpavilion.family',
} as const

export const getAccessToken = () => SecureStore.getItemAsync(storageKeys.access)
export const getRefreshToken = () => SecureStore.getItemAsync(storageKeys.refresh)
export const getFamilyId = () => SecureStore.getItemAsync(storageKeys.family)

export async function setSession(access: string, refresh: string) {
  await Promise.all([
    SecureStore.setItemAsync(storageKeys.access, access),
    SecureStore.setItemAsync(storageKeys.refresh, refresh),
  ])
}

export function setAccessToken(access: string) {
  return SecureStore.setItemAsync(storageKeys.access, access)
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(storageKeys.access),
    SecureStore.deleteItemAsync(storageKeys.refresh),
    SecureStore.deleteItemAsync(storageKeys.family),
  ])
}

export function setFamilyId(id: number | string) {
  return SecureStore.setItemAsync(storageKeys.family, String(id))
}
