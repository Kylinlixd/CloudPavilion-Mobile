import { apiClient } from './api'
import type { Book, BookCopy } from './types'


export type BookDraft = {
  title: string
  author: string
  isbn: string
  publisher: string
  publish_date: string
  category: string
  description: string
  cover_url: string
  barcode: string
  notes: string
}

export type BookLookup = Omit<BookDraft, 'barcode' | 'notes'> & {
  source: 'local' | 'google' | 'openlibrary' | 'douban'
}

export type BookIntakeResult = {
  book: Book
  copy: BookCopy
}

export function normalizeScannedIsbn(value: string) {
  const isbn = value.replace(/[-\s]/g, '')
  if (!/^97[89]\d{10}$/.test(isbn)) return null
  const weightedSum = isbn
    .slice(0, 12)
    .split('')
    .reduce((sum, digit, index) => sum + Number(digit) * (index % 2 === 0 ? 1 : 3), 0)
  const checkDigit = (10 - (weightedSum % 10)) % 10
  return checkDigit === Number(isbn[12]) ? isbn : null
}

export async function lookupBookByIsbn(value: string) {
  const isbn = normalizeScannedIsbn(value)
  if (!isbn) throw new Error('这不是有效的 ISBN-13 条码')
  return apiClient.get<BookLookup>(`/books/lookup/?isbn=${encodeURIComponent(isbn)}`)
}

export async function addBookToFamily(draft: BookDraft) {
  const payload: Record<string, string> = {
    title: draft.title.trim(),
    author: draft.author.trim(),
    isbn: draft.isbn.trim(),
    publisher: draft.publisher.trim(),
    category: draft.category.trim(),
    description: draft.description.trim(),
    cover_url: draft.cover_url.trim(),
    barcode: draft.barcode.trim(),
    notes: draft.notes.trim(),
  }
  if (draft.publish_date.trim()) payload.publish_date = draft.publish_date.trim()
  return apiClient.post<BookIntakeResult>('/book-copies/add-book/', payload)
}

export function createSubmissionGuard<T>(operation: () => Promise<T>) {
  let pending = false
  return async (): Promise<T | undefined> => {
    if (pending) return undefined
    pending = true
    try {
      return await operation()
    } finally {
      pending = false
    }
  }
}
