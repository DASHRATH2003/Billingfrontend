import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react'
import AuthLayout from '../components/AuthLayout.jsx'
import { ui } from '../lib/ui.js'

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

  const goToLogin = () => {
    onGoToLogin?.()
    buildNavigate('/login')
  }

  return (
    <AuthLayout title="Reset password" subtitle="Enter the token from your email and choose a new password." footer="The reset token is valid for 15 minutes.">
      {status.message ? (
        <div className={`mb-4 flex items-start gap-2 ${status.type === 'success' ? ui.alertSuccess : ui.alertError}`}>
          {status.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> : <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />}
          <div>{status.message}</div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={ui.label} htmlFor="reset-username">Username</label>
          <input
            id="reset-username"
            className={`${ui.input} py-2.5`}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Enter username/email"
            autoComplete="username"
          />
        </div>

        <div>
          <label className={ui.label} htmlFor="reset-token">Token</label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="reset-token"
              className={`${ui.input} py-2.5 pl-9 font-mono`}
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste token from email"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ui.label} htmlFor="reset-new">New password</label>
            <input
              id="reset-new"
              className={`${ui.input} py-2.5`}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className={ui.label} htmlFor="reset-confirm">Confirm password</label>
            <input
              id="reset-confirm"
              className={`${ui.input} py-2.5`}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={`${ui.btnPrimary} w-full py-2.5`}>
          {loading ? 'Saving…' : 'Update Password'}
        </button>
      </form>

      <button type="button" onClick={goToLogin} className={`${ui.link} mt-5 inline-flex items-center gap-1.5`}>
        <ArrowLeft className="h-4 w-4" />
        Back to login
      </button>
    </AuthLayout>
  )
}

export default ResetPassword
