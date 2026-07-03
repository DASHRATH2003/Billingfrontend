import React, { useEffect, useState } from 'react'
import { LockKeyhole, LogIn, User } from 'lucide-react'

const navigateTo = (path) => {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const Login = ({ apiBase, onLogin }) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotUsername, setForgotUsername] = useState('')
  const [forgotStatus, setForgotStatus] = useState({ type: '', message: '' })
  const [forgotLoading, setForgotLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search || '')
    const token = params.get('resetToken') || params.get('token') || ''
    const user = params.get('username') || ''
    if (!token) return
    navigateTo(`/reset-password?token=${encodeURIComponent(token)}&username=${encodeURIComponent(user)}`)
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setError('Enter username and password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Invalid username or password')
      }

      onLogin()
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleForgot = async (event) => {
    event.preventDefault()
    setForgotStatus({ type: '', message: '' })
    setForgotLoading(true)

    try {
      const response = await fetch(`${apiBase}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername.trim() }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to process request')
      }

      setForgotStatus({
        type: 'success',
        message: payload.message || 'Request received. Please contact administrator to reset your password.',
      })
    } catch (err) {
      setForgotStatus({ type: 'error', message: err.message || 'Unable to process request' })
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
        <form onSubmit={handleSubmit} className="w-full rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-900/30 text-blue-200">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Login</h1>
            <p className="mt-1 text-sm text-slate-400">Radha Jyoti Diagnostics billing dashboard</p>
          </div>

          {error ? (
            <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm font-medium text-red-200">
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">Username</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900/40"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter username"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">Password</label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900/40"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
              <div className="mt-2 flex justify-end">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      navigateTo('/reset-password')
                    }}
                    className="text-sm font-medium text-slate-300 hover:text-slate-100"
                  >
                    Reset password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStatus({ type: '', message: '' })
                      setForgotUsername(username)
                      setForgotOpen(true)
                    }}
                    className="text-sm font-medium text-blue-300 hover:text-blue-200"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {loading ? 'Checking...' : 'Login to Dashboard'}
          </button>
        </form>
      </div>

      {forgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-100">Forgot password</h2>
              <p className="mt-1 text-sm text-slate-400">Enter your username. A reset link will be sent to your email.</p>
            </div>

            {forgotStatus.message ? (
              <div
                className={`mb-4 rounded-lg border p-3 text-sm font-medium ${
                  forgotStatus.type === 'success'
                    ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-200'
                    : 'border-red-900/60 bg-red-950/40 text-red-200'
                }`}
              >
                {forgotStatus.message}
              </div>
            ) : null}

            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">Username</label>
                <input
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900/40"
                  value={forgotUsername}
                  onChange={(event) => setForgotUsername(event.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 font-semibold text-slate-200 transition-colors hover:bg-slate-800/40"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  {forgotLoading ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default Login
