import React, { useEffect, useState } from 'react'
import { LockKeyhole, LogIn, User, X } from 'lucide-react'
import AuthLayout from '../components/AuthLayout.jsx'
import { ui } from '../lib/ui.js'

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

      onLogin(await response.json())
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
    <AuthLayout title="Welcome back" subtitle="Sign in to the billing dashboard." footer="Only authorised staff can access billing records.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <div className={ui.alertError}>{error}</div> : null}

        <div>
          <label className={ui.label} htmlFor="login-username">Username</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-username"
              className={`${ui.input} py-2.5 pl-9`}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="login-password">Password</label>
            <button
              type="button"
              onClick={() => {
                setForgotStatus({ type: '', message: '' })
                setForgotUsername(username)
                setForgotOpen(true)
              }}
              className={ui.link}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="login-password"
              className={`${ui.input} py-2.5 pl-9`}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={`${ui.btnPrimary} w-full py-2.5`}>
          <LogIn className="h-4 w-4" />
          {loading ? 'Checking…' : 'Login to Dashboard'}
        </button>

        <div className="text-center">
          <button type="button" onClick={() => navigateTo('/reset-password')} className={`text-sm font-medium ${ui.muted} hover:text-slate-900 dark:hover:text-slate-100`}>
            Have a reset token? Reset password
          </button>
        </div>
      </form>

      {forgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className={`${ui.card} w-full max-w-md p-6 shadow-xl`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Forgot password</h2>
                <p className={`mt-1 text-sm ${ui.muted}`}>Enter your username. A reset link will be sent to your email.</p>
              </div>
              <button type="button" onClick={() => setForgotOpen(false)} className={`${ui.btn} border-0 px-2`} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {forgotStatus.message ? (
              <div className={`mb-4 ${forgotStatus.type === 'success' ? ui.alertSuccess : ui.alertError}`}>{forgotStatus.message}</div>
            ) : null}

            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className={ui.label} htmlFor="forgot-username">Username</label>
                <input
                  id="forgot-username"
                  className={`${ui.input} py-2.5`}
                  value={forgotUsername}
                  onChange={(event) => setForgotUsername(event.target.value)}
                  placeholder="Enter username"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setForgotOpen(false)} className={`${ui.btn} flex-1 py-2.5`}>
                  Close
                </button>
                <button type="submit" disabled={forgotLoading} className={`${ui.btnPrimary} flex-1 py-2.5`}>
                  {forgotLoading ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AuthLayout>
  )
}

export default Login
