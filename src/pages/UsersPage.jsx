import React, { useCallback, useEffect, useState } from 'react'
import { KeyRound, Plus, ShieldCheck, UserCog, X } from 'lucide-react'
import Panel from '../components/Panel.jsx'
import { api } from '../lib/api.js'
import { ACCENTS, ui } from '../lib/ui.js'

const formatWhen = (value) => (value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Never')

const Modal = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
    <div className={`${ui.card} w-full max-w-md p-6 shadow-xl`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle ? <p className={`text-sm ${ui.muted}`}>{subtitle}</p> : null}
        </div>
        <button type="button" onClick={onClose} className={`${ui.btn} border-0 px-2`} aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
)

const UsersPage = ({ currentUser }) => {
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [resetFor, setResetFor] = useState(null)
  const [form, setForm] = useState({ name: '', username: '', email: '', role: 'staff', password: '' })
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api('/users')
      .then((d) => setUsers(d.users))
      .catch((err) => setError(err.message))
  }, [])

  useEffect(load, [load])

  const update = async (user, changes, message) => {
    setError('')
    setNotice('')
    try {
      await api(`/users/${user.id}`, { method: 'PUT', body: changes })
      setNotice(message)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const addUser = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/users', { method: 'POST', body: form })
      setNotice(`User "${form.username}" added. Share the password with them privately.`)
      setAdding(false)
      setForm({ name: '', username: '', email: '', role: 'staff', password: '' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setBusy(true)
    await update(resetFor, { password: newPassword }, `Password changed for ${resetFor.username}. They have been logged out everywhere.`)
    setBusy(false)
    setResetFor(null)
    setNewPassword('')
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-6">
      {error ? <div className={ui.alertError}>{error}</div> : null}
      {notice ? <div className={ui.alertSuccess}>{notice}</div> : null}

      <Panel
        title="Users"
        subtitle="Admins manage tests, prices and users. Staff register patients, create bills and enter results."
        icon={UserCog}
        accent={ACCENTS.violet}
        actions={
          <button type="button" onClick={() => setAdding(true)} className={ui.btnPrimary}>
            <Plus className="h-4 w-4" />
            Add user
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={ui.th}>User</th>
                <th className={ui.th}>Role</th>
                <th className={ui.th}>Status</th>
                <th className={ui.th}>Last login</th>
                <th className={`${ui.th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id} className={u.active ? '' : 'opacity-60'}>
                    <td className={ui.td}>
                      <div className="font-medium">
                        {u.name} {isSelf ? <span className={`text-xs ${ui.muted}`}>(you)</span> : null}
                      </div>
                      <div className={`text-xs ${ui.muted}`}>{u.username}</div>
                    </td>
                    <td className={ui.td}>
                      <select
                        className={`${ui.input} w-28 py-1.5`}
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => update(u, { role: e.target.value }, `${u.username} is now ${e.target.value}.`)}
                      >
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className={ui.td}>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        {u.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className={`${ui.td} ${ui.muted}`}>{formatWhen(u.lastLoginAt)}</td>
                    <td className={ui.td}>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setResetFor(u)} className={`${ui.btn} px-2.5 py-1.5`}>
                          <KeyRound className="h-4 w-4" />
                          Password
                        </button>
                        {!isSelf ? (
                          <button
                            type="button"
                            onClick={() => update(u, { active: !u.active }, `${u.username} ${u.active ? 'disabled' : 'enabled'}.`)}
                            className={u.active ? ui.btnDanger : `${ui.btn} px-2.5 py-1.5`}
                          >
                            {u.active ? 'Disable' : 'Enable'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {adding ? (
        <Modal title="Add user" subtitle="They log in with this username and password." onClose={() => setAdding(false)}>
          <form onSubmit={addUser} className="space-y-4">
            <div>
              <label className={ui.label} htmlFor="u-name">Full name</label>
              <input id="u-name" className={ui.input} value={form.name} onChange={set('name')} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={ui.label} htmlFor="u-user">Username *</label>
                <input id="u-user" className={ui.input} value={form.username} onChange={set('username')} required autoComplete="off" />
              </div>
              <div>
                <label className={ui.label} htmlFor="u-role">Role</label>
                <select id="u-role" className={ui.input} value={form.role} onChange={set('role')}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div>
              <label className={ui.label} htmlFor="u-email">Email (for password reset)</label>
              <input id="u-email" type="email" className={ui.input} value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className={ui.label} htmlFor="u-pass">Password * (min 6 characters)</label>
              <input id="u-pass" type="text" className={ui.input} value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setAdding(false)} className={ui.btn}>Cancel</button>
              <button type="submit" disabled={busy} className={ui.btnPrimary}>
                <ShieldCheck className="h-4 w-4" />
                {busy ? 'Adding…' : 'Add user'}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {resetFor ? (
        <Modal title={`New password for ${resetFor.username}`} subtitle="They will be logged out on all devices." onClose={() => setResetFor(null)}>
          <form onSubmit={resetPassword} className="space-y-4">
            <input type="text" className={ui.input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 characters)" minLength={6} required autoFocus autoComplete="new-password" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetFor(null)} className={ui.btn}>Cancel</button>
              <button type="submit" disabled={busy} className={ui.btnPrimary}>{busy ? 'Saving…' : 'Set password'}</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}

export default UsersPage
