import { apiClient } from './api'

export type Ebook = { id: number; book: number; name: string; format: string; page_count: number; progress: number }
export type Excerpt = { id: number; book: number; content: string; username: string; has_image: boolean; created_at: string }
export type Quote = { date: string; content: string; book_title: string; author: string; source_url: string; source_note: string }

export function uploadFile<T>(path: string, field: string, asset: { uri: string; name?: string; mimeType?: string }, bookId?: number, content?: string) {
  const form = new FormData()
  form.append(field, { uri: asset.uri, name: asset.name || 'photo.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob)
  if (bookId) form.append('book', String(bookId))
  if (content) form.append('content', content)
  return apiClient.upload<T>(path, form)
}

export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'payload' in error) {
    const payload = error.payload
    if (Array.isArray(payload)) return payload.join('\n')
    if (payload && typeof payload === 'object') {
      const messages = Object.values(payload).flat().filter((item) => typeof item === 'string')
      if (messages.length) return messages.join('\n')
    }
  }
  return error instanceof Error ? error.message : '操作未完成，请重试。'
}
