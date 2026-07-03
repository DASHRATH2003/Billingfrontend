import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, LockKeyhole, ShieldAlert } from 'lucide-react'

const buildNavigate = (path) => {
  if (window.location.pathname + window.location.search !== path) {
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

const ResetPassword = ({ apiBase, onGoToLogin }) => {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search || ''), [])
  const initialUsername = initialParams.get('username') || ''
  const initialToken = initialParams.get('token') || initialParams.get('resetToken') || ''

  const [username, setUsername] = useState(initialUsername)
  const [token, setToken] = useState(initialToken)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setStatus({ type: '', message: '' })
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    const cleanUsername = username.trim()
    const cleanToken = token.trim()

    if (!cleanUsername || !cleanToken || !newPassword) {
      setStatus({ type: 'error', message: 'Username, token and new password are required' })
      return
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${apiBase}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, token: cleanToken, newPassword }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to reset password')
      }

      setStatus({ type: 'success', message: 'Password updated successfully. Please login.' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Unable to reset password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
        <div className="w-full rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-900/30 text-blue-200">
              <LockKeyhole className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Reset Password</h1>
            <p className="mt-1 text-sm text-slate-400">Enter token and choose a new password.</p>
          </div>

          {status.message ? (
            <div
              className={`mb-4 rounded-lg border p-3 text-sm font-medium ${
                status.type === 'success'
                  ? 'border-emerald-900/60 bg-emerald-950/40 text-emerald-200'
                  : 'border-red-900/60 bg-red-950/40 text-red-200'
              }`}
            >
              <div className="flex items-start gap-2">
                {status.type === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
                )}
                <div>{status.message}</div>
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">Username</label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900/40"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter username/email"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">Token</label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900/40"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste token from email"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">New password</label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900/40"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">Confirm password</label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-900/40"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onGoToLogin?.()
                buildNavigate('/login')
              }}
              className="text-sm font-medium text-blue-300 hover:text-blue-200"
            >
              Back to login
            </button>
            <div className="text-xs text-slate-500">Token valid for 15 minutes</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
