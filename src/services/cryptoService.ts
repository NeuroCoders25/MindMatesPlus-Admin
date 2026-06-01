const BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface EncryptedMessage {
  ciphertext?: string | null
  iv?: string | null
  v?: number
  plaintext?: string | null
}

export function safeText(val: unknown): string {
  if (typeof val === 'string') return val
  if (val && typeof val === 'object') {
    const obj = val as EncryptedMessage
    if (typeof obj.plaintext === 'string') return obj.plaintext
    if (obj.ciphertext) return ''
  }
  return ''
}

export async function encryptText(text: string): Promise<EncryptedMessage | string> {
  try {
    const res = await fetch(`${BASE_URL}/crypto/encrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return text
    return await res.json()
  } catch (e) {
    console.warn('encryptText failed:', e)
    return text
  }
}

export async function decryptBatch(
  items: Array<EncryptedMessage | string>
): Promise<string[]> {
  if (items.length === 0) return []
  try {
    const res = await fetch(`${BASE_URL}/crypto/decrypt-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) return items.map(i => safeText(i))
    const data = await res.json()
    return data.plaintext
  } catch (e) {
    console.warn('decryptBatch failed:', e)
    return items.map(i => safeText(i))
  }
}
