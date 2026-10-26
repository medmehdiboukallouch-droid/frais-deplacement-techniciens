const DEFAULT_API_URL = 'http://localhost:3000'

/** 
 * Dev : préférer la même origine que Vite (proxy vers Express) pour éviter CORS / corps vidé selon environnement.
 * Production : défaut localhost:3000 ou VITE_API_URL explicite.
 */
function resolvedApiBase(): string {
  const raw = import.meta.env.VITE_API_URL
  if (typeof raw === 'string') {
    const t = raw.trim()
    if (t.length > 0) return t.replace(/\/+$/, '')
  }
  if (import.meta.env.DEV) return ''
  return DEFAULT_API_URL
}

export const API_BASE_URL = resolvedApiBase()

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: BodyInit | Record<string, unknown> | null
  token?: string | null
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`)
  }

  let body = options.body
  if (body && !(body instanceof FormData)) {
    if (typeof body === 'object') {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json; charset=UTF-8')
      }
      body = JSON.stringify(body)
    }
    /** Chaîne JSON déjà préparée (ex. login) — Express exige explicitement ce Content-Type sinon req.body peut rester {} */
    if (typeof body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json; charset=UTF-8')
    }
  }

  const { headers: _, body: __, token: ___, ...fetchInit } = options

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchInit,
    headers,
    body,
  })

  const contentType = response.headers.get('content-type') || ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const message =
      typeof data === 'string'
        ? data
        : data?.error || data?.message || 'Erreur API'
    throw new ApiError(message, response.status)
  }

  return data as T
}

