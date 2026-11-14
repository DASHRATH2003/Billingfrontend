import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FileText, Pencil, Plus, Search, UserRound, Users, X } from 'lucide-react'
import Panel from '../components/Panel.jsx'
import { api } from '../lib/api.js'
import { ACCENTS, ui } from '../lib/ui.js'

const money = (v) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(v) || 0)}`

const wallDate = (value, fallback) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (m) {
    const [, y, mo, d, hh, mi] = m
    const time = hh ? ` ${String(Number(hh) % 12 || 12).padStart(2, '0')}:${mi} ${Number(hh) >= 12 ? 'PM' : 'AM'}` : ''
    return `${d}/${mo}/${y}${time}`
  }
  const date = fallback ? new Date(fallback) : null
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('en-GB').format(date) : '—'
}

const ageSex = (p = {}) => {
  const age = String(p.age || '').trim()
  return [p.sex, age ? (/^\d+(\.\d+)?$/.test(age) ? `${age} Y` : age) : ''].filter(Boolean).join(' · ') || '—'
}

const EMPTY = { name: '', age: '', sex: 'Male', mobile: '', address: '', refBy: '', notes: '' }

/* ---------------- add / edit form (modal) ---------------- */

const PatientForm = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState({ ...EMPTY, ...(initial || {}) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(initial?.patientId)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { patient } = isEdit
        ? await api(`/patients/${encodeURIComponent(initial.patientId)}`, { method: 'PUT', body: form })
        : await api('/patients', { method: 'POST', body: form })
      onSaved(patient)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <form onSubmit={submit} className={`${ui.card} max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 shadow-xl`}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{isEdit ? `Edit patient ${initial.patientId}` : 'New patient'}</h2>
            <p className={`text-sm ${ui.muted}`}>{isEdit ? 'Changes apply to future bills and reports.' : 'A patient ID is created automatically.'}</p>
          </div>
          <button type="button" onClick={onClose} className={`${ui.btn} border-0 px-2`} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        {error ? <div className={`${ui.alertError} mb-4`}>{error}</div> : null}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={ui.label} htmlFor="pf-name">Full name *</label>
            <input id="pf-name" className={ui.input} value={form.name} onChange={set('name')} required autoFocus />
          </div>
          <div>
            <label className={ui.label} htmlFor="pf-age">Age</label>
            <input id="pf-age" className={ui.input} value={form.age} onChange={set('age')} placeholder="e.g. 35" />
          </div>
          <div>
            <label className={ui.label} htmlFor="pf-sex">Sex</label>
            <select id="pf-sex" className={ui.input} value={form.sex} onChange={set('sex')}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={ui.label} htmlFor="pf-mobile">Mobile</label>
            <input id="pf-mobile" className={ui.input} value={form.mobile} onChange={set('mobile')} inputMode="tel" placeholder="10-digit number" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={ui.label} htmlFor="pf-ref">Ref doctor</label>
            <input id="pf-ref" className={ui.input} value={form.refBy} onChange={set('refBy')} placeholder="Doctor's name" />
          </div>
          <div className="col-span-2">
            <label className={ui.label} htmlFor="pf-addr">Address</label>
            <input id="pf-addr" className={ui.input} value={form.address} onChange={set('address')} />
          </div>
          <div className="col-span-2">
            <label className={ui.label} htmlFor="pf-notes">Notes</label>
            <textarea id="pf-notes" className={ui.input} rows={2} value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ui.btn}>Cancel</button>
          <button type="submit" disabled={saving} className={ui.btnPrimary}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add patient'}</button>
        </div>
      </form>
    </div>
  )
}

/* ---------------- patient profile + visit history ---------------- */

const PatientDetail = ({ patientId, onBack, onPrintBill, onNewBill }) => {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  const load = useCallback(() => {
    api(`/patients/${encodeURIComponent(patientId)}`)
      .then((d) => {
        setError('')
        setData(d)
      })
      .catch((err) => setError(err.message))
  }, [patientId])

  useEffect(load, [load])

  const bills = useMemo(() => data?.bills || [], [data])
  const totals = useMemo(
    () => bills.reduce((a, b) => ({ net: a.net + (b.netAmount || 0), received: a.received + (b.receivedAmt || 0), dues: a.dues + (b.duesAmt || 0) }), { net: 0, received: 0, dues: 0 }),
    [bills],
  )
  const p = data?.patient

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className={ui.btn}>
        <ArrowLeft className="h-4 w-4" />
        All patients
      </button>

      {error ? <div className={ui.alertError}>{error}</div> : null}

      {p ? (
        <>
          <section className={`${ui.card} p-5`}>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold uppercase text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                  {p.name.charAt(0)}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{p.name}</h2>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{p.patientId}</span>
                  </div>
                  <div className={`mt-1 text-sm ${ui.muted}`}>
                    {ageSex(p)} · {p.mobile || 'No mobile'}
                    {p.refBy ? ` · Ref: ${p.refBy}` : ''}
                  </div>
                  {p.address ? <div className={`text-sm ${ui.muted}`}>{p.address}</div> : null}
                  {p.notes ? <div className="mt-2 text-sm">{p.notes}</div> : null}
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(true)} className={ui.btn}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button type="button" onClick={() => onNewBill?.(p)} className={ui.btnPrimary}>
                  <Plus className="h-4 w-4" />
                  New bill
                </button>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4 dark:border-slate-800">
              {[
                ['Visits', bills.length],
                ['Billed', money(totals.net)],
                ['Received', money(totals.received)],
                ['Dues', money(totals.dues)],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className={`text-xs uppercase tracking-wide ${ui.muted}`}>{label}</div>
                  <div className={`text-lg font-bold tabular-nums ${label === 'Dues' && totals.dues > 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          <Panel title="Visit history" subtitle="Every bill for this patient, newest first" icon={FileText} accent={ACCENTS.indigo}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className={ui.th}>Date</th>
                    <th className={ui.th}>Bill</th>
                    <th className={ui.th}>Tests</th>
                    <th className={`${ui.th} text-right`}>Net</th>
                    <th className={`${ui.th} text-right`}>Paid</th>
                    <th className={`${ui.th} text-right`}>Dues</th>
                    <th className={`${ui.th} text-right`}>Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {bills.length ? (
                    bills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className={`${ui.td} whitespace-nowrap`}>{wallDate(b.meta?.billingDateTime, b.createdAt)}</td>
                        <td className={`${ui.td} font-mono text-xs`}>{b.id}</td>
                        <td className={`${ui.td} max-w-[320px]`}>
                          <div className="truncate" title={(b.items || []).map((i) => i.name).join(', ')}>
                            {(b.items || []).map((i) => i.name).join(', ') || '—'}
                          </div>
                          {b.patient?.refBy ? <div className={`text-xs ${ui.muted}`}>Ref: {b.patient.refBy}</div> : null}
                        </td>
                        <td className={`${ui.td} text-right tabular-nums font-semibold`}>{money(b.netAmount)}</td>
                        <td className={`${ui.td} text-right tabular-nums`}>{money(b.receivedAmt)}</td>
                        <td className={`${ui.td} text-right tabular-nums ${b.duesAmt > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>{money(b.duesAmt)}</td>
                        <td className={`${ui.td} text-right`}>
                          <button type="button" onClick={() => onPrintBill?.(b)} className={`${ui.btn} px-2.5 py-1.5`} title="Print receipt">
                            <FileText className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className={`px-4 py-10 text-center text-sm ${ui.muted}`}>No visits yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      ) : !error ? (
        <div className={`${ui.card} p-10 text-center text-sm ${ui.muted}`}>Loading patient…</div>
      ) : null}

      {editing && p ? (
        <PatientForm
          initial={p}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            load()
          }}
        />
      ) : null}
    </div>
  )
}

/* ---------------- list ---------------- */

const PAGE = 50

const PatientsPage = ({ onPrintBill, onNewBill, refreshKey = 0 }) => {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const load = useCallback(
    async (skip = 0) => {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ q: debounced, limit: PAGE, skip })
        const data = await api(`/patients?${params}`)
        setRows((prev) => (skip ? [...prev, ...data.patients] : data.patients))
        setTotal(data.total)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [debounced],
  )

  useEffect(() => {
    load(0)
  }, [load, refreshKey])

  if (selected) {
    return <PatientDetail patientId={selected} onBack={() => setSelected(null)} onPrintBill={onPrintBill} onNewBill={onNewBill} />
  }

  return (
    <div className="space-y-6">
      {error ? <div className={ui.alertError}>{error}</div> : null}

      <Panel
        title="Patients"
        subtitle={`${total} patient${total === 1 ? '' : 's'}${debounced ? ' matching' : ''} · click a patient to see visit history`}
        icon={Users}
        accent={ACCENTS.emerald}
        actions={
          <>
            <div className="relative w-full md:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${ui.input} pl-9`} placeholder="Name, mobile or patient ID" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button type="button" onClick={() => setAdding(true)} className={ui.btnPrimary}>
              <Plus className="h-4 w-4" />
              New patient
            </button>
          </>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className={ui.th}>Patient</th>
                <th className={ui.th}>Age / Sex</th>
                <th className={ui.th}>Mobile</th>
                <th className={ui.th}>Ref doctor</th>
                <th className={`${ui.th} text-center`}>Visits</th>
                <th className={`${ui.th} text-right`}>Billed</th>
                <th className={`${ui.th} text-right`}>Dues</th>
                <th className={ui.th}>Last visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length ? (
                rows.map((p) => (
                  <tr key={p.patientId} onClick={() => setSelected(p.patientId)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className={ui.td}>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold uppercase text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          {p.name.charAt(0)}
                        </span>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className={`font-mono text-[11px] ${ui.muted}`}>{p.patientId}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${ui.td} whitespace-nowrap`}>{ageSex(p)}</td>
                    <td className={`${ui.td} tabular-nums`}>{p.mobile || '—'}</td>
                    <td className={`${ui.td} max-w-[220px] truncate`}>{p.refBy || '—'}</td>
                    <td className={`${ui.td} text-center font-semibold`}>{p.visits}</td>
                    <td className={`${ui.td} text-right tabular-nums`}>{money(p.net)}</td>
                    <td className={`${ui.td} text-right tabular-nums ${p.dues > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : ui.muted}`}>{money(p.dues)}</td>
                    <td className={`${ui.td} whitespace-nowrap ${ui.muted}`}>{p.lastVisit ? wallDate(p.lastVisit) : '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={`px-4 py-12 text-center text-sm ${ui.muted}`}>
                    {loading ? (
                      'Loading patients…'
                    ) : (
                      <span className="inline-flex flex-col items-center gap-2">
                        <UserRound className="h-8 w-8 text-slate-300" />
                        {debounced ? 'No patient matches your search.' : 'No patients yet. Patients are created when you save a bill, or with “New patient”.'}
                      </span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length < total ? (
          <div className="border-t border-slate-100 p-4 text-center dark:border-slate-800">
            <button type="button" onClick={() => load(rows.length)} disabled={loading} className={ui.btn}>
              {loading ? 'Loading…' : `Show more (${total - rows.length} left)`}
            </button>
          </div>
        ) : null}
      </Panel>

      {adding ? (
        <PatientForm
          onClose={() => setAdding(false)}
          onSaved={(p) => {
            setAdding(false)
            setSelected(p.patientId)
          }}
        />
      ) : null}
    </div>
  )
}

export default PatientsPage
