import React, { useEffect, useMemo, useState } from 'react'
import { FlaskConical, IndianRupee, List, RotateCcw, Save, Trash2, Users, X } from 'lucide-react'
import RichTextEditor from '../components/RichTextEditor.jsx'
import { api } from '../lib/api.js'
import { DEPARTMENTS, FORMATS, REPORTING_DAYS, SAMPLES, VIALS, WINGS } from '../data/testOptions.js'
import { ACCENTS, ui } from '../lib/ui.js'

const AGE_GROUPS = [
  ['male', 'Male'],
  ['female', 'Female'],
  ['childM', 'Child - M'],
  ['childF', 'Child - F'],
  ['infant', 'Infant'],
]

const FLAGS = [
  ['showMethod', 'Show Method'],
  ['showComment', 'Show Comment'],
  ['testNameBold', 'Test Name Bold'],
  ['commentAsResult', 'Use Comment as Result'],
  ['resultBold', 'Result in Bold'],
  ['antibiotic', 'Antibiotic'],
  ['paragraphResult', 'Paragraph Result'],
  ['pageBreak', 'Page Break'],
  ['showShortCode', 'Show Short Code'],
]

const blank = () => ({
  name: '',
  wing: 'PATHOLOGY',
  department: '',
  unit: '',
  format: 'Single',
  underTest: '',
  normalRanges: ['', '', '', '', ''],
  ageBased: false,
  ageRanges: Object.fromEntries(AGE_GROUPS.map(([k]) => [k, { text: '', low: '', high: '' }])),
  normalLow: '',
  normalHigh: '',
  defaultResult: '',
  method: '',
  sample: '',
  vial: '',
  reportingDays: '',
  amount: '',
  discountPct: '',
  offerRate: '',
  interpretation: '',
  code: '',
  shortCode: '',
  ...Object.fromEntries(FLAGS.map(([k]) => [k, false])),
})

const fromServer = (t) => {
  const b = blank()
  return {
    ...b,
    ...t,
    normalRanges: Array.from({ length: 5 }, (_, i) => t.normalRanges?.[i] || ''),
    ageRanges: Object.fromEntries(AGE_GROUPS.map(([k]) => [k, { ...b.ageRanges[k], ...(t.ageRanges?.[k] || {}) }])),
    amount: t.amount ?? '',
    discountPct: t.discountPct || '',
    offerRate: t.offerRate || '',
  }
}

const round2 = (n) => Math.round(n * 100) / 100

const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className={ui.label}>{label}</label>
    {children}
  </div>
)

const Select = ({ value, onChange, placeholder, options }) => (
  <select className={ui.input} value={value} onChange={(e) => onChange(e.target.value)}>
    {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
    {value && !options.includes(value) ? <option value={value}>{value}</option> : null}
  </select>
)

/**
 * Test Entry form (create or edit one test), laid out like E-PathoSoft's Test Entry.
 * `editId` = MongoDB id of the test to edit, or null for a new test.
 */
const TestEntry = ({ editId, onSaved, onNew, onOpenList, onDeleted }) => {
  const [form, setForm] = useState(blank)
  const [testId, setTestId] = useState(null)
  const [allTests, setAllTests] = useState([])
  const [loading, setLoading] = useState(Boolean(editId))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ageOpen, setAgeOpen] = useState(false)
  const [editorKey, setEditorKey] = useState(0)

  useEffect(() => {
    api('/tests')
      .then((d) => setAllTests(d.tests || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!editId) return undefined
    let alive = true
    api(`/tests/entry/${editId}`)
      .then(({ test }) => {
        if (!alive) return
        setForm(fromServer(test))
        setTestId(test.testId || null)
        setEditorKey((k) => k + 1)
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [editId])

  const set = (key) => (value) => {
    setNotice('')
    setForm((f) => ({ ...f, [key]: value }))
  }
  const setText = (key) => (e) => set(key)(e.target.value)

  const setRange = (i) => (e) => setForm((f) => ({ ...f, normalRanges: f.normalRanges.map((r, j) => (j === i ? e.target.value : r)) }))
  const setAge = (group, field) => (e) => setForm((f) => ({ ...f, ageRanges: { ...f.ageRanges, [group]: { ...f.ageRanges[group], [field]: e.target.value } } }))

  // Discount % and Offer Rate stay in sync with Rate To Patient.
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

  const parents = useMemo(
    () => allTests.filter((t) => t.format !== 'Single' && t.name !== form.name).map((t) => t.name),
    [allTests, form.name],
  )

  /** Checks the form in plain words (instead of the browser silently blocking Save). */
  const problem = () => {
    if (!form.name.trim()) return 'Enter the test name.'
    for (const [label, value, max] of [
      ['Rate To Patient', form.amount],
      ['Discount %', form.discountPct, 100],
      ['Offer Rate', form.offerRate],
    ]) {
      if (value === '' || value === null || value === undefined) continue
      const n = Number(value)
      if (!Number.isFinite(n) || n < 0) return `${label} must be a number of 0 or more.`
      if (max !== undefined && n > max) return `${label} cannot be more than ${max}.`
    }
    return ''
  }

  const save = async (e) => {
    e.preventDefault()
    const why = problem()
    if (why) {
      setNotice('')
      setError(why)
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const { test } = editId ? await api(`/tests/entry/${editId}`, { method: 'PUT', body: form }) : await api('/tests/entry', { method: 'POST', body: form })
      if (editId) {
        setTestId(test.testId || null)
        setNotice(`✓ Changes saved for "${test.name}".`)
      } else {
        // New test: clear the form for the next one so nothing is edited by mistake.
        setForm(blank())
        setTestId(null)
        setEditorKey((k) => k + 1)
        setNotice(`✓ Saved "${test.name}"${test.testId ? ` (Test ID ${test.testId})` : ''}. It is now in Test List. The form is ready for the next test.`)
      }
      onSaved?.(test)
    } catch (err) {
      setError(err.message || 'Could not save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editId || !window.confirm(`Delete test "${form.name}"? Old bills keep their test names.`)) return
    try {
      await api(`/tests/entry/${editId}`, { method: 'DELETE' })
      onDeleted?.()
    } catch (err) {
      setError(err.message)
    }
  }

  const ageFilled = AGE_GROUPS.filter(([k]) => form.ageRanges[k].text || form.ageRanges[k].low || form.ageRanges[k].high).length

  if (loading) return <div className={`${ui.card} p-10 text-center text-sm ${ui.muted}`}>Loading test…</div>

  return (
    <form onSubmit={save} noValidate className={`${ui.card} overflow-hidden`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className={`rounded-lg p-2 ${ACCENTS.violet}`}>
            <FlaskConical className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">{editId ? `Edit test: ${form.name || '…'}` : 'New test'}</h2>
            <p className={`text-sm ${ui.muted}`}>{editId ? 'Change any field and press Save.' : 'Fill in the details and press Save.'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {editId ? (
            <button type="button" onClick={onNew} className={ui.btn} title="Start a new test">
              <RotateCcw className="h-4 w-4" />
              New
            </button>
          ) : null}
          <button type="button" onClick={onOpenList} className={ui.btn}>
            <List className="h-4 w-4" />
            Test List
          </button>
        </div>
      </header>

      <div className="space-y-5 p-5">
        {error ? <div className={ui.alertError}>{error}</div> : null}
        {notice ? <div className={ui.alertSuccess}>{notice}</div> : null}

        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Column 1 */}
          <div className="space-y-4">
            <Field label="Test Name *">
              <input className={ui.input} value={form.name} onChange={setText('name')} autoFocus={!editId} required />
            </Field>
            <Field label="Wing">
              <Select value={form.wing} onChange={set('wing')} options={WINGS} />
            </Field>
            <Field label="Department">
              <Select value={form.department} onChange={set('department')} placeholder="Select Department" options={DEPARTMENTS} />
            </Field>
            <Field label="Unit">
              <input className={ui.input} value={form.unit} onChange={setText('unit')} placeholder="e.g. g/dL" />
            </Field>
            <Field label="Test Format">
              <Select value={form.format} onChange={set('format')} options={FORMATS} />
            </Field>
            {form.format === 'Single' ? (
              <Field label="Under Test (parent)">
                <Select value={form.underTest} onChange={set('underTest')} placeholder="— None —" options={parents} />
              </Field>
            ) : null}
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            {form.normalRanges.map((r, i) => (
              <Field key={i} label={`Normal Range ${i + 1}`}>
                <input className={ui.input} value={r} onChange={setRange(i)} />
              </Field>
            ))}
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <Field label="Set Age Based Normal Range">
              <div className="flex gap-2">
                <label className={`${ui.btn} flex-1 cursor-pointer justify-start`}>
                  <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={form.ageBased} onChange={(e) => set('ageBased')(e.target.checked)} />
                  Set Default
                </label>
                <button type="button" onClick={() => setAgeOpen(true)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  <Users className="h-4 w-4" />
                  Age Group{ageFilled ? ` (${ageFilled})` : '…'}
                </button>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Normal Lower">
                <input className={ui.input} value={form.normalLow} onChange={setText('normalLow')} inputMode="decimal" placeholder="0" />
              </Field>
              <Field label="Normal Higher">
                <input className={ui.input} value={form.normalHigh} onChange={setText('normalHigh')} inputMode="decimal" placeholder="0" />
              </Field>
            </div>
            <Field label="Default Result">
              <input className={ui.input} value={form.defaultResult} onChange={setText('defaultResult')} />
            </Field>
            <Field label="Method">
              <input className={ui.input} value={form.method} onChange={setText('method')} />
            </Field>
            <Field label="Sample">
              <Select value={form.sample} onChange={set('sample')} placeholder="Sample" options={SAMPLES} />
            </Field>
          </div>

          {/* Column 4 */}
          <div className="space-y-4">
            <Field label="Vial">
              <Select value={form.vial} onChange={set('vial')} placeholder="Select Vial" options={VIALS} />
            </Field>
            <Field label="Reporting Days">
              <Select value={form.reportingDays} onChange={set('reportingDays')} placeholder="Reporting Days" options={REPORTING_DAYS} />
            </Field>
            <Field label="Rate To Patient">
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                <input className={`${ui.input} pl-9 text-right tabular-nums`} type="number" min="0" step="any" value={form.amount} onChange={setRate} placeholder="0" />
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount %">
                <input className={`${ui.input} text-right tabular-nums`} type="number" min="0" max="100" step="0.01" value={form.discountPct} onChange={setDiscount} placeholder="0" />
              </Field>
              <Field label="Offer Rate">
                <input className={`${ui.input} text-right tabular-nums`} type="number" min="0" step="0.01" value={form.offerRate} onChange={setOffer} placeholder="0" />
              </Field>
            </div>
          </div>
        </div>

        <div>
          <label className={ui.label}>Interpretation / comment (printed with the result)</label>
          <RichTextEditor key={editorKey} value={form.interpretation} onChange={(html) => setForm((f) => ({ ...f, interpretation: html }))} placeholder="Type notes, interpretation or a report template…" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-4 sm:grid-cols-3 lg:grid-cols-5 dark:border-slate-800">
          {FLAGS.map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={Boolean(form[key])} onChange={(e) => set(key)(e.target.checked)} />
              {label}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-end dark:border-slate-800">
          <div className="grid flex-1 grid-cols-3 gap-3">
            <Field label="Test ID">
              <input className={`${ui.input} text-right`} value={testId ?? 'Auto'} readOnly />
            </Field>
            <Field label="Test Code">
              <input className={ui.input} value={form.code} onChange={setText('code')} />
            </Field>
            <Field label="Short Code">
              <input className={ui.input} value={form.shortCode} onChange={setText('shortCode')} />
            </Field>
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

        {/* Same message again next to the Save button, so it is seen without scrolling up. */}
        {error ? <div className={ui.alertError} role="alert">{error}</div> : null}
        {notice ? <div className={ui.alertSuccess} role="status">{notice}</div> : null}
      </div>

      {ageOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className={`${ui.card} w-full max-w-2xl p-6 shadow-xl`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">Age group normal range</h3>
                <p className={`text-sm ${ui.muted}`}>Used on the report for the patient's sex and age. Leave a row empty to use the default range.</p>
              </div>
              <button type="button" onClick={() => setAgeOpen(false)} className={`${ui.btn} border-0 px-2`} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className={ui.th}>#</th>
                    <th className={ui.th}>Category</th>
                    <th className={ui.th}>Normal Range</th>
                    <th className={ui.th}>Lower</th>
                    <th className={ui.th}>Higher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {AGE_GROUPS.map(([key, label], i) => (
                    <tr key={key}>
                      <td className={`${ui.td} ${ui.muted}`}>{i + 1}</td>
                      <td className={`${ui.td} whitespace-nowrap font-medium`}>{label}</td>
                      <td className="px-2 py-2">
                        <input className={ui.input} value={form.ageRanges[key].text} onChange={setAge(key, 'text')} placeholder="e.g. 13.0 – 17.0" />
                      </td>
                      <td className="w-28 px-2 py-2">
                        <input className={`${ui.input} text-right`} value={form.ageRanges[key].low} onChange={setAge(key, 'low')} inputMode="decimal" />
                      </td>
                      <td className="w-28 px-2 py-2">
                        <input className={`${ui.input} text-right`} value={form.ageRanges[key].high} onChange={setAge(key, 'high')} inputMode="decimal" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setAgeOpen(false)} className={ui.btnPrimary}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}

export default TestEntry
