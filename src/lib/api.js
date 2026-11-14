export const API_BASE = String(import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace(/\/+$/, '')

const TOKEN_KEY = 'billing_token'
const USER_KEY = 'billing_user'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export const saveSession = (token, user) => {
  try {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.removeItem('billing_auth') // old flag from before real logins
  } catch {
    // ignore
  }
}

export const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('billing_auth')
  } catch {
    // ignore
  }
}

let unauthorizedHandler = null
/** App registers this so any 401 from the API sends the user back to the login page. */
export const onUnauthorized = (handler) => {
  unauthorizedHandler = handler
}

/** Same as fetch(), but adds the login token and handles an expired session. */
export const authFetch = async (url, options = {}) => {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(url, { ...options, headers })
  if (response.status === 401 && token) {
    clearSession()
    unauthorizedHandler?.()
  }
  return response
}

/** JSON helper: returns parsed body, throws Error(message) on failure. */
export const api = async (path, { method = 'GET', body } = {}) => {
  const response = await authFetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`)
  return data
}
