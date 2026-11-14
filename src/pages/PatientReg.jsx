import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Accessibility, CheckCircle2, List, Printer, RefreshCw, Save, Search, Trash2, UserCheck, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { LAB_DETAILS, ui } from '../lib/ui.js'

/* ---------------- helpers ---------------- */

const pad = (n) => String(n).padStart(2, '0')
const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const nowTime = () => {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const money = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(v) || 0)
const round2 = (n) => Math.round(n * 100) / 100

const TITLES = ['Mr.', 'Mrs.', 'Miss', 'Master', 'Baby', 'Dr.', 'Ms.']
const TITLE_SEX = { 'Mr.': 'Male', Master: 'Male', 'Mrs.': 'Female', Miss: 'Female', 'Ms.': 'Female', Baby: '' }
const CATEGORIES = ['Male', 'Female', 'Other']
const PAY_MODES = ['Cash', 'UPI', 'Card', 'Online', 'Cheque', 'Credit']
const DISCOUNT_BY = ['Self', 'Doctor', 'Management', 'Staff', 'Other']

const blankForm = () => {
  const date = todayStr()
  const time = nowTime()
  return {
    regDate: date,
    mobile: '',
    title: '',
    name: '',
    category: '',
    weight: '',
    ageY: '',
    ageM: '',
    ageD: '',
    address: '',
    email: '',
    centerName: 'Main',
    refBy: 'Self',
    otherReference: 'Self',
    labName: LAB_DETAILS.name,
    sampleType: '',
    collectDate: date,
    collectTime: time,
    receivedDate: date,
    receivedTime: time,
    reportDate: date,
    reportTime: time,
    rateType: 'patient',
    discountValue: '',
    discountMode: 'amount',
    discountBy: 'Self',
    payMode: 'Cash',
    received: '',
    remarks: '',
    transactionId: '',
  }
}

/** Fill the form from a saved bill (Edit Registration). */
const formFromBill = (bill) => {
  const base = blankForm()
  const p = bill.patient || {}
  const m = bill.meta || {}
  const split = (v, dateKey, timeKey) => {
    const s = String(v || '')
    return /^\d{4}-\d{2}-\d{2}/.test(s) ? { [dateKey]: s.slice(0, 10), [timeKey]: s.slice(11, 16) || base[timeKey] } : {}
  }
  const ageY = p.ageY || (/^\d+$/.test(String(p.age || '')) ? String(p.age) : '')
  return {
    ...base,
    ...split(m.collectionDateTime, 'collectDate', 'collectTime'),
    ...split(m.receivedDateTime, 'receivedDate', 'receivedTime'),
    ...split(m.reportingTime, 'reportDate', 'reportTime'),
    regDate: String(m.billingDateTime || '').slice(0, 10) || base.regDate,
    mobile: p.mobile || '',
    title: p.title || '',
    name: p.name || '',
    category: p.category || (CATEGORIES.includes(p.sex) ? p.sex : ''),
    weight: p.weight || '',
    ageY,
    ageM: p.ageM || '',
    ageD: p.ageD || '',
    address: p.address || '',
    email: p.email || '',
    centerName: m.centerName || base.centerName,
    refBy: p.refBy || '',
    otherReference: m.otherReference || '',
    labName: m.labName || base.labName,
    sampleType: m.sampleType || '',
    rateType: m.rateType || base.rateType,
    discountValue: bill.discountMode ? String(bill.discountValue || '') : bill.discount ? String(bill.discount) : '',
    discountMode: bill.discountMode || 'amount',
    discountBy: bill.discountBy || base.discountBy,
    payMode: bill.payMode || base.payMode,
    received: bill.receivedAmt ? String(bill.receivedAmt) : '',
    remarks: bill.narration || '',
    transactionId: bill.transactionId || '',
  }
}

/** "35" years, or "2 Month 15 Day" for babies. */
const ageText = ({ ageY, ageM, ageD }) => {
  const y = Number(ageY) || 0
  const m = Number(ageM) || 0
  const d = Number(ageD) || 0
  if (y) return String(y)
  return [m ? `${m} Month` : '', d ? `${d} Day` : ''].filter(Boolean).join(' ')
}

/* ---------------- small UI pieces ---------------- */

const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className={ui.label}>{label}</label>
    {children}
  </div>
)

const SummaryRow = ({ label, children, strong = false }) => (
  <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-sm dark:border-slate-800">
    <span className={strong ? 'font-semibold' : ui.muted}>{label}</span>
    <span className={`tabular-nums ${strong ? 'text-lg font-bold' : 'font-medium'}`}>{children}</span>
  </div>
)

/* ---------------- page ---------------- */

/**
 * Patient Registration like E-PathoSoft: patient details + tests/profiles + payment, saved as one bill.
 */
const PatientReg = ({ onPrintBill, onOpenReport, editBill = null }) => {
  // When opened from Dashboard → Edit Registration, the form starts with that bill.
  const [editing, setEditing] = useState(editBill)
  const [form, setForm] = useState(() => (editBill ? formFromBill(editBill) : blankForm()))
  const [linked, setLinked] = useState(editBill?.patientId ? { patientId: editBill.patientId, name: editBill.patient?.name } : null)
  const [items, setItems] = useState(() =>
    (editBill?.items || []).map((it) => ({ kind: it.kind || 'test', name: it.name, amount: it.amount, tests: it.kind === 'profile' ? it.tests || [] : undefined })),
  )
  const [catalog, setCatalog] = useState({ tests: [], profiles: [] })
  const [refs, setRefs] = useState({ doctors: [], others: [], centers: [] })
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [matches, setMatches] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    Promise.all([api('/tests'), api('/profiles'), api('/bills/references')])
      .then(([t, p, r]) => {
        setCatalog({ tests: t.tests || [], profiles: p.profiles || [] })
        setRefs(r)
      })
      .catch((err) => setError(err.message))
  }, [])

  // Existing-patient suggestions while typing mobile or name.
  const lookup = linked ? '' : (form.mobile.replace(/\D/g, '').length >= 4 ? form.mobile : form.name.trim().length >= 3 ? form.name : '')
  useEffect(() => {
    if (!lookup) return undefined
    const t = setTimeout(() => {
      api(`/patients?${new URLSearchParams({ q: lookup.trim(), limit: 6 })}`)
        .then((d) => setMatches(d.patients || []))
        .catch(() => setMatches([]))
    }, 300)
    return () => clearTimeout(t)
  }, [lookup])

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e
    setSaved(null)
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'title' && TITLE_SEX[value]) next.category = TITLE_SEX[value]
      return next
    })
  }

  const pickPatient = (p) => {
    setLinked(p)
    setMatches([])
    setForm((f) => ({
      ...f,
      mobile: p.mobile || f.mobile,
      name: p.name,
      category: CATEGORIES.includes(p.sex) ? p.sex : f.category,
      ageY: /^\d+$/.test(String(p.age || '')) ? String(p.age) : f.ageY,
      address: p.address || f.address,
      refBy: p.refBy || f.refBy,
    }))
  }

  /* ----- tests & profiles ----- */

  const rateOf = (entry) => {
    const offer = Number(entry.offerRate) || 0
    return form.rateType === 'offer' && offer > 0 ? offer : Number(entry.amount) || 0
  }

  const options = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return []
    const inBill = new Set(items.map((i) => i.name))
    const profiles = catalog.profiles
      .filter((p) => !inBill.has(p.name) && [p.name, p.shortName].filter(Boolean).some((v) => v.toLowerCase().includes(q)))
      .map((p) => ({ kind: 'profile', name: p.name, entry: p }))
    const tests = catalog.tests
      .filter((t) => t.format !== 'Heading' && !inBill.has(t.name) && [t.name, t.shortCode, t.code].filter(Boolean).some((v) => v.toLowerCase().includes(q)))
      .map((t) => ({ kind: 'test', name: t.name, entry: t }))
    return [...profiles, ...tests].slice(0, 30)
  }, [search, catalog, items])

  const addItem = (opt) => {
    setSaved(null)
    setItems((list) => [...list, { kind: opt.kind, name: opt.name, amount: rateOf(opt.entry), tests: opt.kind === 'profile' ? opt.entry.tests || [] : undefined, source: opt.entry }])
    setSearch('')
    searchRef.current?.focus()
  }

  // Switching Patient / Offer rate re-prices the lines already added.
  useEffect(() => {
    setItems((list) => list.map((it) => ({ ...it, amount: it.source ? rateOf(it.source) : it.amount })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rateType])

  /* ----- money ----- */

  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
  const discountValue = Number(form.discountValue) || 0
  const discount = Math.min(total, round2(form.discountMode === 'percent' ? (total * discountValue) / 100 : discountValue))
  const payable = round2(total - discount)
  const received = Math.min(payable, Number(form.received) || 0)
  const dues = round2(payable - received)

  /* ----- save ----- */

  const reset = () => {
    setEditing(null)
    setForm(blankForm())
    setItems([])
    setLinked(null)
    setMatches([])
    setSearch('')
    setError('')
    setSaved(null)
  }

  const save = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) return setError('Enter the patient name.')
    if (!items.length) return setError('Add at least one test, profile or package.')

    const ageStr = ageText(form)
    const payload = {
      patientId: linked?.patientId || '',
      patient: {
        name: form.name.trim(),
        title: form.title,
        age: ageStr,
        sex: form.category,
        mobile: form.mobile.trim(),
        refBy: form.refBy.trim(),
        ageY: form.ageY,
        ageM: form.ageM,
        ageD: form.ageD,
        address: form.address.trim(),
        email: form.email.trim(),
        category: form.category,
        weight: form.weight,
      },
      meta: {
        // New: the server gives the registration number (R26-000123) and daily serial. Edit: keep them.
        id: editing?.id || '',
        siNo: editing?.meta?.siNo || '',
        billingDateTime:
          editing?.meta?.billingDateTime && editing.meta.billingDateTime.slice(0, 10) === form.regDate
            ? editing.meta.billingDateTime
            : `${form.regDate}T${nowTime()}`,
        collectionDateTime: `${form.collectDate}T${form.collectTime}`,
        receivedDateTime: `${form.receivedDate}T${form.receivedTime}`,
        reportingTime: `${form.reportDate}T${form.reportTime}`,
        centerName: form.centerName,
        labName: form.labName,
        sampleType: form.sampleType,
        otherReference: form.otherReference,
        rateType: form.rateType,
      },
      lab: LAB_DETAILS,
      items: items.map(({ kind, name, amount, tests }) => ({ kind, name, amount: Number(amount) || 0, tests })),
      discount,
      discountMode: form.discountMode,
      discountValue,
      discountBy: discount ? form.discountBy : '',
      receivedAmt: received,
      payMode: form.payMode,
      transactionId: form.transactionId.trim(),
      narration: form.remarks.trim(),
    }

    setSaving(true)
    try {
      const { bill } = await api('/bills', { method: 'POST', body: payload })
      setSaved(bill)
      if (editing) setEditing(bill)
      setLinked((l) => l || { patientId: bill.patientId, name: bill.patient?.name })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const dt = (dateKey, timeKey) => (
    <div className="grid grid-cols-[1fr_7rem] gap-2">
      <input type="date" className={ui.input} value={form[dateKey]} onChange={set(dateKey)} />
      <input type="time" className={ui.input} value={form[timeKey]} onChange={set(timeKey)} />
    </div>
  )

  return (
    <form onSubmit={save} className={`${ui.card} overflow-hidden`}>
      <header className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-violet-700 to-fuchsia-700 px-5 py-3 text-white">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Accessibility className="h-5 w-5" />
          {editing ? 'Edit Registration' : 'Patient Registration'}
          <span className="font-mono text-base font-bold">{saved ? saved.id : editing ? editing.id : '(new)'}</span>
        </div>
        {linked?.patientId ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <UserCheck className="h-3.5 w-3.5" />
            {linked.patientId}
            <button type="button" onClick={() => setLinked(null)} className="ml-1 opacity-80 hover:opacity-100" aria-label="Unlink patient">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : null}
      </header>

      <div className="space-y-5 p-5">
        {error ? <div className={ui.alertError}>{error}</div> : null}
        {saved ? (
          <div className={`${ui.alertSuccess} flex flex-wrap items-center justify-between gap-3`}>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Saved <b className="font-mono">{saved.id}</b> · Serial {saved.meta?.siNo} · Patient {saved.patientId}
            </span>
            <span className="flex gap-2">
              <button type="button" onClick={() => onPrintBill?.(saved)} className={ui.btnPrimary}>
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>
              <button type="button" onClick={reset} className={ui.btn}>
                New Registration
              </button>
            </span>
          </div>
        ) : null}

        {/* ---------------- patient details ---------------- */}
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Registration Number">
            <div className="grid grid-cols-[1fr_4.5rem_3.5rem] gap-2">
              <input type="date" className={ui.input} value={form.regDate} onChange={set('regDate')} />
              <input className={`${ui.input} text-center`} readOnly value={`${form.regDate.slice(8, 10)}/${form.regDate.slice(5, 7)}`} />
              <input className={`${ui.input} text-center`} readOnly value={(saved || editing)?.meta?.siNo?.split('-')[1] || 'Auto'} title="Daily serial, given on Save" />
            </div>
          </Field>

          <Field label="Mobile No" className="relative">
            <input className={ui.input} inputMode="tel" value={form.mobile} onChange={set('mobile')} placeholder="10-digit mobile" />
            {matches.length && lookup ? (
              <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                <div className={`px-3 py-1 text-xs ${ui.muted}`}>Existing patients — click to use</div>
                {matches.map((p) => (
                  <button
                    key={p.patientId}
                    type="button"
                    onClick={() => pickPatient(p)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className={`block text-xs ${ui.muted}`}>{[p.sex, p.age && `${p.age} Y`, p.mobile].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-500">{p.patientId}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </Field>

          <Field label="Patient Name *">
            <div className="grid grid-cols-[5.5rem_1fr] gap-2">
              <select className={ui.input} value={form.title} onChange={set('title')} aria-label="Title">
                <option value="">--</option>
                {TITLES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <input className={ui.input} value={form.name} onChange={set('name')} required />
            </div>
          </Field>

          <Field label="Category And Weight">
            <div className="grid grid-cols-[1fr_5rem] gap-2">
              <select className={ui.input} value={form.category} onChange={set('category')}>
                <option value="">Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input className={ui.input} value={form.weight} onChange={set('weight')} placeholder="kg." inputMode="decimal" />
            </div>
          </Field>

          <Field label="Age (YY/MM/DD)">
            <div className="grid grid-cols-3 gap-2">
              <input className={ui.input} value={form.ageY} onChange={set('ageY')} inputMode="numeric" placeholder="Years" />
              <input className={ui.input} value={form.ageM} onChange={set('ageM')} inputMode="numeric" placeholder="Months" />
              <input className={ui.input} value={form.ageD} onChange={set('ageD')} inputMode="numeric" placeholder="Days" />
            </div>
          </Field>

          <Field label="Address">
            <input className={ui.input} value={form.address} onChange={set('address')} />
          </Field>

          <Field label="Email ID">
            <input type="email" className={ui.input} value={form.email} onChange={set('email')} />
          </Field>

          <Field label="Center Name">
            <select className={ui.input} value={form.centerName} onChange={set('centerName')}>
              {[...new Set(['Main', ...refs.centers])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="Ref. Doctor">
            <input className={ui.input} list="reg-doctors" value={form.refBy} onChange={set('refBy')} placeholder="Self or doctor name" />
            <datalist id="reg-doctors">
              {refs.doctors.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>

          <Field label="Other Reference">
            <input className={ui.input} list="reg-others" value={form.otherReference} onChange={set('otherReference')} />
            <datalist id="reg-others">
              {refs.others.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>

          <Field label="Lab Name">
            <input className={ui.input} value={form.labName} onChange={set('labName')} />
          </Field>

          <Field label="Sample Type">
            <input className={ui.input} value={form.sampleType} onChange={set('sampleType')} placeholder="Urin, Blood, Swab, Semen" />
          </Field>

          <Field label="Lab Serial No">
            <input className={ui.input} readOnly value={(saved || editing)?.meta?.siNo || 'Given on Save'} />
          </Field>
          <Field label="Sample Collection Date Time">{dt('collectDate', 'collectTime')}</Field>
          <Field label="Sample Received Date Time">{dt('receivedDate', 'receivedTime')}</Field>
          <Field label="Reporting Date Time">{dt('reportDate', 'reportTime')}</Field>
        </div>

        {/* ---------------- tests + payment ---------------- */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
              <select className={ui.input} value={form.rateType} onChange={set('rateType')} aria-label="Test rate">
                <option value="patient">Test Rate Based On Patient</option>
                <option value="offer">Offer Rate</option>
              </select>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  className={`${ui.input} pl-9`}
                  placeholder="---Search Package, Profile or Test---"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setSearchOpen(true)
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (options[0]) addItem(options[0])
                    }
                  }}
                />
                {searchOpen && search.trim() ? (
                  <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {options.length ? (
                      options.map((o) => (
                        <button
                          key={`${o.kind}-${o.name}`}
                          type="button"
                          onMouseDown={() => addItem(o)}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
                        >
                          <span className="min-w-0">
                            <span className="block truncate">{o.name}</span>
                            <span className={`block text-[11px] uppercase tracking-wide ${o.kind === 'profile' ? 'text-violet-600 dark:text-violet-400' : ui.muted}`}>
                              {o.kind === 'profile' ? `Profile · ${(o.entry.tests || []).length} tests` : o.entry.department || 'Test'}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums font-medium">₹{money(rateOf(o.entry))}</span>
                        </button>
                      ))
                    ) : (
                      <div className={`px-3 py-2 text-sm ${ui.muted}`}>No test or profile matches “{search}”.</div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-h-[260px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className={`${ui.th} w-10`}>#</th>
                    <th className={ui.th}>Test / Profile</th>
                    <th className={`${ui.th} w-32 text-right`}>Rate (₹)</th>
                    <th className={`${ui.th} w-12`} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.length ? (
                    items.map((it, i) => (
                      <tr key={it.name}>
                        <td className={`${ui.td} ${ui.muted}`}>{i + 1}</td>
                        <td className={ui.td}>
                          <div className="font-medium">{it.name}</div>
                          {it.kind === 'profile' ? (
                            <div className="text-xs text-violet-600 dark:text-violet-400">
                              Profile{it.tests?.length ? `: ${it.tests.join(', ')}` : ''}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            className={`${ui.input} text-right tabular-nums`}
                            value={it.amount}
                            onChange={(e) => setItems((list) => list.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => setItems((list) => list.filter((_, j) => j !== i))} className="rounded p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label={`Remove ${it.name}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className={`px-4 py-16 text-center text-sm ${ui.muted}`}>
                        Search above and pick a package, profile or test. Press Enter to add the first match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* payment */}
          <div className="self-start overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <SummaryRow label="Total Amount">{money(total)}</SummaryRow>
            <div className="space-y-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className={`text-sm ${ui.muted}`}>Discount After Total Bill</div>
              <div className="grid grid-cols-[1fr_4.5rem_5rem] items-center gap-2">
                <input type="number" min="0" className={`${ui.input} text-right`} value={form.discountValue} onChange={set('discountValue')} placeholder="0" />
                <select className={ui.input} value={form.discountMode} onChange={set('discountMode')} aria-label="Discount type">
                  <option value="amount">₹</option>
                  <option value="percent">%</option>
                </select>
                <span className="text-right text-sm tabular-nums">−{money(discount)}</span>
              </div>
              <select className={ui.input} value={form.discountBy} onChange={set('discountBy')} aria-label="Discount by">
                {DISCOUNT_BY.map((d) => (
                  <option key={d} value={d}>
                    Discount By {d}
                  </option>
                ))}
              </select>
            </div>
            <SummaryRow label="Payable Amount" strong>
              {money(payable)}
            </SummaryRow>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-sm dark:border-slate-800">
              <span className={ui.muted}>Pay Mode</span>
              <select className={`${ui.input} w-40`} value={form.payMode} onChange={set('payMode')}>
                {PAY_MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-sm dark:border-slate-800">
              <span className={ui.muted}>Received</span>
              <input type="number" min="0" className={`${ui.input} w-40 text-right`} value={form.received} onChange={set('received')} placeholder="0" />
            </div>
            <SummaryRow label="Dues">
              <span className={dues > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>{money(dues)}</span>
            </SummaryRow>
            <div className="space-y-2 px-4 py-3">
              <input className={ui.input} value={form.remarks} onChange={set('remarks')} placeholder="Remarks" />
              <input className={ui.input} value={form.transactionId} onChange={set('transactionId')} placeholder="Transaction ID" />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={onOpenReport} className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-3 text-white hover:bg-violet-700" title="Patient report list" aria-label="Patient report list">
                  <List className="h-4 w-4" />
                </button>
                <button type="button" onClick={reset} className={`${ui.btn} px-3`} title="Clear form" aria-label="Clear form">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export default PatientReg
