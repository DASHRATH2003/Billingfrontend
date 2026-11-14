import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileText, Printer, Save, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { ui } from '../lib/ui.js'
import { openReportWindow, printPatientReport } from '../lib/reportPrint.js'

const toNum = (v) => {
  const s = String(v ?? '').trim()
  return s && Number.isFinite(Number(s)) ? Number(s) : null
}
const flagOf = (value, low, high) => {
  const v = toNum(value)
  if (v === null) return ''
  if (toNum(low) !== null && v < toNum(low)) return 'L'
  if (toNum(high) !== null && v > toNum(high)) return 'H'
  return ''
}

/**
 * Result Entry: type the value of every test on a registration, then print the Patient Report.
 * Opens full-screen over the dashboard (from Dashboard → Select Option → Result Entry, or Patient Report list).
 */
const ResultEntry = ({ billId, onClose, onSaved }) => {
  const [bill, setBill] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [values, setValues] = useState({}) // key -> { value, unit, range, remark }
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = (data) => {
    setBill(data.bill)
    setSheet(data.sheet)
    setComment(data.sheet.comment || '')
    const firstTime = !data.sheet.resultAt
    const next = {}
    for (const g of data.sheet.groups) {
      for (const r of g.rows) {
        if (r.heading) continue
        next[r.key] = { value: r.value || (firstTime ? r.defaultResult : ''), unit: r.unit, range: r.range, remark: r.remark }
      }
    }
    setValues(next)
  }

  useEffect(() => {
    let alive = true
    api(`/bills/${encodeURIComponent(billId)}/results`)
      .then((d) => alive && load(d))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [billId])

  // Close with Esc.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /** Sheet groups with the values currently on screen (used for printing). */
  const liveGroups = useMemo(
    () =>
      (sheet?.groups || []).map((g) => ({
        ...g,
        rows: g.rows.map((r) => {
          if (r.heading) return r
          const v = values[r.key] || {}
          return { ...r, ...v, flag: flagOf(v.value, r.low, r.high) }
        }),
      })),
    [sheet, values],
  )

  const entryRows = liveGroups.flatMap((g) => g.rows).filter((r) => !r.heading)
  const filled = entryRows.filter((r) => String(r.value || '').trim()).length

  const setField = (key, field) => (e) => {
    setNotice('')
    setValues((all) => ({ ...all, [key]: { ...all[key], [field]: e.target.value } }))
  }

  const save = async (final) => {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const results = entryRows.map((r) => ({ name: r.name, group: r.group, value: r.value, unit: r.unit, range: r.range, remark: r.remark }))
      const data = await api(`/bills/${encodeURIComponent(billId)}/results`, { method: 'PUT', body: { results, comment, final } })
      setBill(data.bill)
      setSheet(data.sheet)
      setNotice(final ? '✓ Saved and marked Report Ready. You can print the Patient Report now.' : '✓ Results saved.')
      onSaved?.(data.bill)
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setSaving(false)
    }
  }

  // Printing saves first and marks the report ready.
  const print = async () => {
    const win = openReportWindow()
    if (!win) return setError('Allow pop-ups for this site to print the report.')
    const data = await save(true)
    if (data) printPatientReport(data.bill, liveGroups, comment, win)
    else win.close()
  }

  // Enter jumps to the next result box (fast typing like E-PathoSoft).
  const nextOnEnter = (e) => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return
    e.preventDefault()
    const boxes = [...document.querySelectorAll('[data-result-box]')]
    const i = boxes.indexOf(e.target)
    boxes[i + 1]?.focus()
  }

  const p = bill?.patient || {}
  const ready = sheet?.status === 'ready' || sheet?.status === 'delivered'
  const cell = 'border-b border-slate-100 px-3 py-2 align-top text-sm dark:border-slate-800'

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-100 dark:bg-slate-950" role="dialog" aria-modal="true" aria-label="Result Entry">
      <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
        <header className={`${ui.card} flex flex-wrap items-center justify-between gap-3 overflow-hidden bg-gradient-to-r from-purple-700 to-fuchsia-700 px-5 py-3 text-white dark:from-purple-800 dark:to-fuchsia-800`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-5 w-5" />
              Result Entry <span className="font-mono">{billId}</span>
              {ready ? <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">Report Ready</span> : null}
            </div>
            {bill ? (
              <div className="truncate text-sm text-white/85">
                {[p.title, p.name].filter(Boolean).join(' ')} · {[p.ageY || p.age, p.sex || p.category].filter(Boolean).join(' / ')} · Ref: {p.refBy || 'Self'} · Serial {bill.meta?.siNo}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/20" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        {error ? <div className={ui.alertError}>{error}</div> : null}
        {loading ? <div className={`${ui.card} p-10 text-center ${ui.muted}`}>Loading tests…</div> : null}

        {liveGroups.map((g) => (
          <section key={g.title} className={`${ui.card} overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-800/60">
              <div className="font-semibold">
                {g.title}
                {g.isProfile ? <span className="ml-2 text-xs font-medium text-violet-600 dark:text-violet-400">Profile</span> : null}
              </div>
              <div className={`text-xs ${ui.muted}`}>{g.department}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className={`text-xs uppercase tracking-wide ${ui.muted}`}>
                    <th className="px-3 py-2 font-semibold">Test</th>
                    <th className="w-56 px-3 py-2 font-semibold">Result</th>
                    <th className="w-28 px-3 py-2 font-semibold">Unit</th>
                    <th className="w-64 px-3 py-2 font-semibold">Normal Range</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r) =>
                    r.heading ? (
                      r.name === g.title ? null : (
                        <tr key={`h-${r.key}`}>
                          <td colSpan={4} className={`${cell} font-semibold text-purple-700 dark:text-purple-300`}>
                            {r.name}
                          </td>
                        </tr>
                      )
                    ) : (
                      <tr key={r.key}>
                        <td className={`${cell} ${r.group && r.group !== g.title ? 'pl-7' : ''}`}>
                          <div className="font-medium">{r.name}</div>
                          {!r.known ? <div className="text-xs text-amber-600 dark:text-amber-400">Not in Test List — type unit and range here</div> : null}
                          {r.method ? <div className={`text-xs ${ui.muted}`}>{r.method}</div> : null}
                        </td>
                        <td className={cell}>
                          <div className="flex items-start gap-2">
                            {r.paragraph ? (
                              <textarea data-result-box rows={3} className={ui.input} value={r.value} onChange={setField(r.key, 'value')} />
                            ) : (
                              <input
                                data-result-box
                                className={`${ui.input} ${r.flag ? 'border-rose-400 font-bold text-rose-600 dark:border-rose-500 dark:text-rose-400' : ''}`}
                                value={r.value}
                                onChange={setField(r.key, 'value')}
                                onKeyDown={nextOnEnter}
                                aria-label={`Result for ${r.name}`}
                              />
                            )}
                            {r.flag ? (
                              <span className={`mt-2 rounded px-1.5 text-xs font-bold ${r.flag === 'H' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'}`}>
                                {r.flag}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={cell}>
                          <input className={ui.input} value={r.unit} onChange={setField(r.key, 'unit')} aria-label={`Unit for ${r.name}`} />
                        </td>
                        <td className={cell}>
                          <textarea rows={1} className={`${ui.input} resize-y`} value={r.range} onChange={setField(r.key, 'range')} aria-label={`Normal range for ${r.name}`} />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {sheet ? (
          <section className={`${ui.card} space-y-3 p-4`}>
            <label className={ui.label} htmlFor="re-comment">Comment on report (optional)</label>
            <textarea id="re-comment" rows={2} className={ui.input} value={comment} onChange={(e) => setComment(e.target.value)} />

            {notice ? (
              <div className={`${ui.alertSuccess} flex items-center gap-2`}>
                <CheckCircle2 className="h-4 w-4" />
                {notice}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className={`text-sm ${ui.muted}`}>
                {filled} of {entryRows.length} results entered · Enter key moves to the next box · H = high, L = low
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={saving} onClick={() => save(false)} className={ui.btn}>
                  <Save className="h-4 w-4" />
                  Save
                </button>
                <button type="button" disabled={saving || !filled} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save & Report Ready'}
                </button>
                <button type="button" disabled={saving || !filled} onClick={print} className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 disabled:opacity-50">
                  <Printer className="h-4 w-4" />
                  Print Report
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

export default ResultEntry
