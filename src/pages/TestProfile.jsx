import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { IndianRupee, Pencil, Plus, Printer, Save, Search, Shuffle, Trash2 } from 'lucide-react'
import RichTextEditor from '../components/RichTextEditor.jsx'
import { api } from '../lib/api.js'
import { DEPARTMENTS, SAMPLES, VIALS, WINGS } from '../data/testOptions.js'
import { ACCENTS, ui } from '../lib/ui.js'

const blank = () => ({
  name: '',
  shortName: '',
  sample: '',
  discountPct: '',
  wing: '',
  department: '',
  amount: '',
  offerRate: '',
  method: '',
  vial: '',
  description: '',
  preTestDetail: '',
  printMethod: false,
  printComment: false,
  printProfileName: false,
})

const fromServer = (p) => ({
  ...blank(),
  ...p,
  amount: p.amount ?? '',
  discountPct: p.discountPct || '',
  offerRate: p.offerRate || '',
})

const round2 = (n) => Math.round(n * 100) / 100

const Field = ({ label, children }) => (
  <div>
    <label className={ui.label}>{label}</label>
    {children}
  </div>
)

const Select = ({ value, onChange, placeholder, options }) => (
  <select className={ui.input} value={value} onChange={(e) => onChange(e.target.value)}>
    <option value="">{placeholder}</option>
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
    {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
  </select>
)

/** Test Profile page like E-PathoSoft: form on the left, list of profiles on the right. */
const TestProfile = () => {
  const [profiles, setProfiles] = useState([])
  const [listError, setListError] = useState('')
  const [query, setQuery] = useState('')
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(blank)
  const [editorKey, setEditorKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadList = useCallback(() => {
    api('/profiles')
      .then((d) => {
        setProfiles(d.profiles || [])
        setListError('')
      })
      .catch((err) => setListError(err.message))
  }, [])

  useEffect(loadList, [loadList])

  const startNew = () => {
    setEditId(null)
    setForm(blank())
    setEditorKey((k) => k + 1)
    setError('')
    setNotice('')
  }

  const open = (p) => {
    setEditId(p._id)
    setForm(fromServer(p))
    setEditorKey((k) => k + 1)
    setError('')
    setNotice('')
  }

  const set = (key) => (value) => {
    setNotice('')
    setForm((f) => ({ ...f, [key]: value }))
  }
  const setText = (key) => (e) => set(key)(e.target.value)

  // Discount % and Offer Price stay in sync with Patient Rate.
  const setRate = (e) => {
    const amount = e.target.value
    setForm((f) => ({ ...f, amount, offerRate: f.discountPct ? String(round2(Number(amount || 0) * (1 - Number(f.discountPct) / 100))) : f.offerRate }))
  }
  const setDiscount = (e) => {
    const discountPct = e.target.value
    setForm((f) => ({ ...f, discountPct, offerRate: discountPct === '' ? '' : String(round2(Number(f.amount || 0) * (1 - Number(discountPct) / 100))) }))
  }
  const setOffer = (e) => {
    const offerRate = e.target.value
    setForm((f) => ({ ...f, offerRate, discountPct: Number(f.amount) > 0 && offerRate !== '' ? String(round2((1 - Number(offerRate) / Number(f.amount)) * 100)) : '' }))
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Enter the profile name.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const { profile } = editId ? await api(`/profiles/${editId}`, { method: 'PUT', body: form }) : await api('/profiles', { method: 'POST', body: form })
      setEditId(profile._id)
      setNotice(`Saved "${profile.name}".`)
      loadList()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editId || !window.confirm(`Delete profile "${form.name}"?`)) return
    try {
      await api(`/profiles/${editId}`, { method: 'DELETE' })
      startNew()
      loadList()
    } catch (err) {
      setError(err.message)
    }
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? profiles.filter((p) => [p.name, p.shortName, p.department].filter(Boolean).some((v) => v.toLowerCase().includes(q))) : profiles
  }, [profiles, query])

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* ---------------- form ---------------- */}
      <form onSubmit={save} className={`${ui.card} overflow-hidden`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className={`rounded-lg p-2 ${ACCENTS.violet}`}>
              <Shuffle className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold">{editId ? `Edit profile: ${form.name || '…'}` : 'New profile'}</h2>
              <p className={`text-sm ${ui.muted}`}>A profile groups several tests under one name and price.</p>
            </div>
          </div>
          {editId ? (
            <button type="button" onClick={startNew} className={ui.btn}>
              <Plus className="h-4 w-4" />
              New profile
            </button>
          ) : null}
        </header>

        <div className="space-y-5 p-5">
          {error ? <div className={ui.alertError}>{error}</div> : null}
          {notice ? <div className={ui.alertSuccess}>{notice}</div> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Profile Name *">
              <input className={ui.input} value={form.name} onChange={setText('name')} placeholder="Name of profile for investigation" required />
            </Field>
            <Field label="Wing">
              <Select value={form.wing} onChange={set('wing')} placeholder="Select Wing" options={WINGS} />
            </Field>
            <Field label="Method">
              <input className={ui.input} value={form.method} onChange={setText('method')} />
            </Field>

            <Field label="Short Name">
              <input className={ui.input} value={form.shortName} onChange={setText('shortName')} />
            </Field>
            <Field label="Department">
              <Select value={form.department} onChange={set('department')} placeholder="Select Department" options={DEPARTMENTS} />
            </Field>
            <Field label="Vial">
              <Select value={form.vial} onChange={set('vial')} placeholder="Vial" options={VIALS} />
            </Field>

            <Field label="Sample">
              <Select value={form.sample} onChange={set('sample')} placeholder="Sample" options={SAMPLES} />
            </Field>
            <Field label="Patient Rate">
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                <input className={`${ui.input} pl-9 text-right tabular-nums`} type="number" min="0" value={form.amount} onChange={setRate} placeholder="0" />
              </div>
            </Field>
            <div className="hidden md:block" />

            <Field label="Discount %">
              <input className={`${ui.input} text-right tabular-nums`} type="number" min="0" max="100" step="0.01" value={form.discountPct} onChange={setDiscount} placeholder="0" />
            </Field>
            <Field label="Offer Price">
              <input className={`${ui.input} text-right tabular-nums`} type="number" min="0" step="0.01" value={form.offerRate} onChange={setOffer} placeholder="0" />
            </Field>
          </div>

          <div>
            <label className={ui.label}>Description</label>
            <RichTextEditor key={`d${editorKey}`} value={form.description} onChange={(html) => setForm((f) => ({ ...f, description: html }))} minHeight={180} />
          </div>

          <div>
            <label className={ui.label}>Add Pre Test Detail</label>
            <RichTextEditor
              key={`p${editorKey}`}
              value={form.preTestDetail}
              onChange={(html) => setForm((f) => ({ ...f, preTestDetail: html }))}
              minHeight={140}
              placeholder="e.g. 10–12 hours fasting required"
            />
          </div>

          <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.printMethod} onChange={(e) => set('printMethod')(e.target.checked)} />
                Print Method
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.printComment} onChange={(e) => set('printComment')(e.target.checked)} />
                Print Comment
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.printProfileName} onChange={(e) => set('printProfileName')(e.target.checked)} />
                <Printer className="h-4 w-4" />
                Profile Name
              </label>
            </div>
            <div className="flex gap-2">
              {editId ? (
                <button type="button" onClick={remove} className={`${ui.btnDanger} py-2`}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              ) : null}
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ---------------- profile list ---------------- */}
      <aside className={`${ui.card} flex max-h-[calc(100vh-10rem)] flex-col overflow-hidden xl:sticky xl:top-4`}>
        <div className="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide">Profile name</h3>
            <span className={`text-xs ${ui.muted}`}>{profiles.length} profiles</span>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${ui.input} pl-9`} placeholder="Search profile" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        {listError ? <div className={`${ui.alertError} m-4`}>{listError}</div> : null}
        <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
          {shown.length ? (
            shown.map((p) => (
              <li key={p._id}>
                <button
                  type="button"
                  onClick={() => open(p)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors ${
                    p._id === editId ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{p.name}</span>
                    {p.department ? <span className={`block text-right text-[10px] uppercase tracking-wide ${ui.muted}`}>{p.department}</span> : null}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className={`px-4 py-10 text-center text-sm ${ui.muted}`}>{query ? 'No profile matches.' : 'No profiles yet. Fill the form and press Save.'}</li>
          )}
        </ul>
      </aside>
    </div>
  )
}

export default TestProfile
