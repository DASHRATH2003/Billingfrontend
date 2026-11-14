import React, { useEffect, useState } from 'react'
import {
  Building,
  Calendar,
  ChevronDown,
  Eraser,
  FileText,
  IndianRupee,
  LayoutDashboard,
  List,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  Trash2,
  User,
} from 'lucide-react'
import { getPathologyTests, TESTS_STORAGE_KEY } from '../data/pathologyTests'
import Panel from '../components/Panel.jsx'
import TopBar from '../components/TopBar.jsx'
import { useDarkMode } from '../lib/theme.js'
import PatientLookup from '../components/PatientLookup.jsx'
import { ACCENTS, ui } from '../lib/ui.js'

const SERIAL_KEY = 'bill_si_next'
const getPreviewSerial = () => {
  const raw = localStorage.getItem(SERIAL_KEY)
  const next = raw ? Number(raw) : 1
  return String(next).padStart(4, '0')
}
const allocateSerial = () => {
  const raw = localStorage.getItem(SERIAL_KEY)
  const next = raw ? Number(raw) : 1
  localStorage.setItem(SERIAL_KEY, String(next + 1))
  return String(next).padStart(4, '0')
}

function generateBillId() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const y = String(now.getFullYear()).slice(2)
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `RJ-${y}${m}${d}-${hh}${mm}-${rand}`
}

function formatDateTimeLocal(d) {
  const pad = (n) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0)

const EMPTY_PATIENT = { name: '', age: '', sex: 'Male', mobile: '', refBy: '' }

/** Text input with an icon inside on the left. */
const IconInput = ({ icon, className = '', ...props }) => {
  const Icon = icon
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input className={`${ui.input} pl-9 ${className}`} {...props} />
    </div>
  )
}

const RupeeInput = (props) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₹</span>
    <input type="number" min="0" className={`${ui.input} pl-7 text-right tabular-nums`} {...props} />
  </div>
)

const CreateBill = ({ onSubmit, onDashboard, initialPatient }) => {
  const [darkMode, setDarkMode] = useDarkMode()
  const [pathologyTests, setPathologyTests] = useState(() => getPathologyTests())
  const [patient, setPatient] = useState(() =>
    initialPatient
      ? { name: initialPatient.name || '', age: initialPatient.age || '', sex: initialPatient.sex || 'Male', mobile: initialPatient.mobile || '', refBy: initialPatient.refBy || '' }
      : EMPTY_PATIENT,
  )
  const [linkedPatient, setLinkedPatient] = useState(initialPatient?.patientId ? initialPatient : null)
  const [meta, setMeta] = useState({
    id: generateBillId(),
    siNo: getPreviewSerial(),
    collectionDateTime: formatDateTimeLocal(new Date()),
    billingDateTime: formatDateTimeLocal(new Date()),
    reportingTime: formatDateTimeLocal(new Date()),
  })
  const [lab, setLab] = useState({
    name: 'Radha Jyoti Diagnostics',
    addressLine1: 'Roy Complex, Infront of ML Academy School, VIP Road, Laheriasarai, Darbhanga',
    addressLine2: 'District: Darbhanga, PIN: 846001, State: Bihar',
    contact1: '8084930463',
    contact2: '8873867062',
    email: 'radhajyotidiagnostics@gmail.com',
  })
  const [discount, setDiscount] = useState('')
  const [receivedAmt, setReceivedAmt] = useState('')
  const [narration, setNarration] = useState('')
  const [items, setItems] = useState([])
  const [openSuggestionIdx, setOpenSuggestionIdx] = useState(null)
  const displayName = (t) => {
    const m = t.name.match(/\(([^)]+)\)/)
    return m ? m[1] : t.name
  }

  useEffect(() => {
    const handleStorage = (event) => {
      if (event?.key !== TESTS_STORAGE_KEY) return
      setPathologyTests(getPathologyTests())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const addItem = () => setItems([...items, { name: '', amount: '' }])
  const updateItem = (idx, field, value) => {
    setItems((prev) => {
      const next = [...prev]
      if (field === 'name') {
        next[idx] = { ...next[idx], name: value }
      } else {
        next[idx] = { ...next[idx], [field]: field === 'amount' ? (value === '' ? '' : Number(value)) : value }
      }
      return next
    })
  }
  const selectTest = (idx, test) => {
    setItems((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], name: test.name, amount: test.amount }
      return next
    })
  }
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))

  const handleSubmit = (e) => {
    e.preventDefault()
    const siFinal = allocateSerial()
    const payload = { patient, patientId: linkedPatient?.patientId || '', meta: { ...meta, siNo: siFinal }, lab, items, discount, receivedAmt, narration }
    onSubmit(payload)
    setMeta((m) => ({ ...m, siNo: getPreviewSerial() }))
  }

  const handleClear = () => {
    if (!window.confirm('Clear patient details, tests and payment from this form?')) return
    const now = formatDateTimeLocal(new Date())
    setPatient(EMPTY_PATIENT)
    setLinkedPatient(null)
    setItems([])
    setDiscount('')
    setReceivedAmt('')
    setNarration('')
    setMeta({ id: generateBillId(), siNo: getPreviewSerial(), collectionDateTime: now, billingDateTime: now, reportingTime: now })
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const netAmount = subtotal - (Number(discount) || 0)
  const duesAmount = Math.max(0, netAmount - (Number(receivedAmt) || 0))

  return (
    <div className={ui.page}>
      <TopBar section="Create bill" darkMode={darkMode} onToggleTheme={() => setDarkMode((v) => !v)}>
        <button type="button" onClick={onDashboard} className={ui.btn}>
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
      </TopBar>

      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-6 p-4 pb-28 md:p-6 md:pb-28">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">New bill</h1>
            <p className={`mt-1 text-sm ${ui.muted}`}>Fill in patient details and tests, then preview and print the receipt.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{meta.id}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">SI No {meta.siNo}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-6 lg:col-span-2">
            <Panel title="Patient details" subtitle="Fields marked * are required" icon={User} accent={ACCENTS.blue}>
              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <PatientLookup
                    linked={linkedPatient}
                    onPick={(p) => {
                      setLinkedPatient(p)
                      setPatient({ name: p.name || '', age: p.age || '', sex: p.sex || 'Male', mobile: p.mobile || '', refBy: p.refBy || '' })
                    }}
                    onUnlink={() => setLinkedPatient(null)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={ui.label} htmlFor="p-name">Full name *</label>
                  <input
                    id="p-name"
                    className={ui.input}
                    placeholder="Enter patient name"
                    value={patient.name}
                    onChange={(e) => setPatient({ ...patient, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={ui.label} htmlFor="p-age">Age *</label>
                    <input
                      id="p-age"
                      className={ui.input}
                      type="number"
                      min="0"
                      placeholder="Age"
                      value={patient.age}
                      onChange={(e) => setPatient({ ...patient, age: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className={ui.label} htmlFor="p-sex">Sex *</label>
                    <select id="p-sex" className={ui.input} value={patient.sex} onChange={(e) => setPatient({ ...patient, sex: e.target.value })} required>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={ui.label} htmlFor="p-mobile">Mobile *</label>
                  <IconInput
                    id="p-mobile"
                    icon={Phone}
                    inputMode="tel"
                    placeholder="Phone number"
                    value={patient.mobile}
                    onChange={(e) => setPatient({ ...patient, mobile: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={ui.label} htmlFor="p-ref">Referred by</label>
                  <input
                    id="p-ref"
                    className={ui.input}
                    placeholder="Doctor's name"
                    value={patient.refBy}
                    onChange={(e) => setPatient({ ...patient, refBy: e.target.value })}
                  />
                </div>
              </div>
            </Panel>

            <Panel
              title="Tests"
              subtitle={items.length ? `${items.length} test${items.length === 1 ? '' : 's'} added` : 'Pick tests from the price list'}
              icon={List}
              accent={ACCENTS.emerald}
              actions={
                items.length ? (
                  <button type="button" onClick={addItem} className={ui.btnPrimary}>
                    <Plus className="h-4 w-4" />
                    Add test
                  </button>
                ) : null
              }
            >
              {items.length > 0 ? (
                <div className="p-3 sm:p-5">
                  <div className={`hidden grid-cols-[2rem_1fr_9rem_2.5rem] gap-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wide sm:grid ${ui.muted}`}>
                    <span>#</span>
                    <span>Test name</span>
                    <span className="text-right">Amount</span>
                    <span />
                  </div>
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_7rem_2.5rem] items-center gap-2 sm:grid-cols-[2rem_1fr_9rem_2.5rem] sm:gap-3">
                        <span className={`hidden text-sm font-semibold sm:block ${ui.muted}`}>{idx + 1}</span>
                        <div className="relative">
                          <input
                            className={`${ui.input} pr-9`}
                            placeholder="Search or type test name"
                            value={item.name}
                            onFocus={() => {
                              setPathologyTests(getPathologyTests())
                              setOpenSuggestionIdx(idx)
                            }}
                            onBlur={() => setTimeout(() => setOpenSuggestionIdx(null), 150)}
                            onChange={(e) => updateItem(idx, 'name', e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                            aria-label="Show test list"
                            onMouseDown={() => {
                              setPathologyTests(getPathologyTests())
                              setOpenSuggestionIdx(idx)
                            }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          {openSuggestionIdx === idx && (
                            <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                              {pathologyTests
                                .filter((t) => {
                                  const q = (item.name || '').toLowerCase()
                                  return t.name.toLowerCase().includes(q) || displayName(t).toLowerCase().includes(q)
                                })
                                .map((t, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                    onMouseDown={() => {
                                      selectTest(idx, t)
                                      setOpenSuggestionIdx(null)
                                    }}
                                  >
                                    <span>{t.name.includes('(') ? t.name : displayName(t) !== t.name ? `${t.name} (${displayName(t)})` : t.name}</span>
                                    <span className={`shrink-0 text-xs tabular-nums ${ui.muted}`}>₹{t.amount}</span>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                        <RupeeInput placeholder="0" value={item.amount} onChange={(e) => updateItem(idx, 'amount', e.target.value)} />
                        <button type="button" onClick={() => removeItem(idx)} className={`${ui.btnDanger} h-[38px] px-0`} aria-label={`Remove test ${idx + 1}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                  >
                    <Plus className="h-4 w-4" />
                    Add another test
                  </button>
                </div>
              ) : (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <List className="h-7 w-7 text-slate-400" />
                  </div>
                  <h4 className="font-semibold">No tests added yet</h4>
                  <p className={`mb-5 mt-1 text-sm ${ui.muted}`}>Add tests to start building the bill.</p>
                  <button type="button" onClick={addItem} className={ui.btnPrimary}>
                    <Plus className="h-4 w-4" />
                    Add first test
                  </button>
                </div>
              )}
            </Panel>

            <Panel title="Narration / remarks" subtitle="Printed on the bill" icon={FileText} accent={ACCENTS.violet}>
              <div className="p-5">
                <textarea
                  className={ui.input}
                  rows={3}
                  placeholder="Add any additional notes, remarks, or instructions here…"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                />
              </div>
            </Panel>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <Panel title="Payment" subtitle="Discount and amount received" icon={IndianRupee} accent={ACCENTS.amber}>
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={ui.label} htmlFor="b-discount">Discount</label>
                    <RupeeInput id="b-discount" placeholder="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className={ui.label} htmlFor="b-received">Received</label>
                    <RupeeInput id="b-received" placeholder="0" value={receivedAmt} onChange={(e) => setReceivedAmt(Number(e.target.value))} />
                  </div>
                </div>

                <dl className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-950/60">
                  <div className="flex justify-between">
                    <dt className={ui.muted}>Subtotal</dt>
                    <dd className="font-medium tabular-nums">{formatCurrency(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={ui.muted}>Discount</dt>
                    <dd className="font-medium tabular-nums text-rose-600 dark:text-rose-400">− {formatCurrency(discount)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                    <dt className="font-semibold">Net payable</dt>
                    <dd className="text-lg font-bold tabular-nums text-blue-700 dark:text-blue-400">{formatCurrency(netAmount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={ui.muted}>Received</dt>
                    <dd className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(receivedAmt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className={ui.muted}>Dues</dt>
                    <dd className={`font-semibold tabular-nums ${duesAmount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {duesAmount > 0 ? formatCurrency(duesAmount) : 'Paid'}
                    </dd>
                  </div>
                </dl>
              </div>
            </Panel>

            <Panel title="Bill information" icon={Calendar} accent={ACCENTS.indigo}>
              <div className="grid grid-cols-2 gap-4 p-5">
                <div>
                  <label className={ui.label}>Bill ID</label>
                  <input className={`${ui.input} font-mono text-xs`} readOnly value={meta.id} />
                </div>
                <div>
                  <label className={ui.label}>SI No</label>
                  <input className={ui.input} readOnly value={meta.siNo} />
                </div>
                <div className="col-span-2">
                  <label className={ui.label} htmlFor="m-collect">Collection date &amp; time</label>
                  <input id="m-collect" className={ui.input} type="datetime-local" value={meta.collectionDateTime} onChange={(e) => setMeta({ ...meta, collectionDateTime: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={ui.label} htmlFor="m-billing">Billing date &amp; time</label>
                  <input id="m-billing" className={ui.input} type="datetime-local" value={meta.billingDateTime} onChange={(e) => setMeta({ ...meta, billingDateTime: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={ui.label} htmlFor="m-report">Reporting date &amp; time</label>
                  <input id="m-report" className={ui.input} type="datetime-local" value={meta.reportingTime} onChange={(e) => setMeta({ ...meta, reportingTime: e.target.value })} />
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* Lab details – rarely changed, so collapsed by default */}
        <details className={`${ui.card} group`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={`rounded-lg p-2 ${ACCENTS.indigo}`}>
                <Building className="h-4 w-4" />
              </span>
              <div>
                <div className="text-base font-semibold">Laboratory details</div>
                <div className={`text-sm ${ui.muted}`}>{lab.name} · printed at the top of the bill</div>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 p-5 md:grid-cols-2 dark:border-slate-800">
            <div>
              <label className={ui.label} htmlFor="l-name">Lab name *</label>
              <input id="l-name" className={ui.input} placeholder="Laboratory name" value={lab.name} onChange={(e) => setLab({ ...lab, name: e.target.value })} required />
            </div>
            <div>
              <label className={ui.label} htmlFor="l-email">Email</label>
              <IconInput id="l-email" icon={Mail} type="email" placeholder="lab@example.com" value={lab.email} onChange={(e) => setLab({ ...lab, email: e.target.value })} />
            </div>
            <div>
              <label className={ui.label} htmlFor="l-c1">Contact 1</label>
              <IconInput id="l-c1" icon={Phone} placeholder="Primary contact number" value={lab.contact1} onChange={(e) => setLab({ ...lab, contact1: e.target.value })} />
            </div>
            <div>
              <label className={ui.label} htmlFor="l-c2">Contact 2</label>
              <IconInput id="l-c2" icon={Phone} placeholder="Secondary contact number" value={lab.contact2} onChange={(e) => setLab({ ...lab, contact2: e.target.value })} />
            </div>
            <div>
              <label className={ui.label} htmlFor="l-a1">Address line 1</label>
              <IconInput id="l-a1" icon={MapPin} placeholder="Street address" value={lab.addressLine1} onChange={(e) => setLab({ ...lab, addressLine1: e.target.value })} />
            </div>
            <div>
              <label className={ui.label} htmlFor="l-a2">Address line 2</label>
              <input id="l-a2" className={ui.input} placeholder="City, State, ZIP" value={lab.addressLine2} onChange={(e) => setLab({ ...lab, addressLine2: e.target.value })} />
            </div>
          </div>
        </details>

        {/* Sticky action bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div className="min-w-0">
              <div className={`text-xs ${ui.muted}`}>
                {items.length} test{items.length === 1 ? '' : 's'} · Net payable
              </div>
              <div className="text-xl font-bold tabular-nums">{formatCurrency(netAmount)}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleClear} className={ui.btn}>
                <Eraser className="h-4 w-4" />
                <span className="hidden sm:inline">Clear form</span>
              </button>
              <button type="submit" className={`${ui.btnPrimary} px-5 py-2.5`}>
                <Printer className="h-4 w-4" />
                Preview &amp; Print
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CreateBill
