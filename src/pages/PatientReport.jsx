import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Banknote, ChevronRight, ClipboardList, Download, FileText, IndianRupee, Percent, Plus, Printer, Search, Users, Wallet, X } from 'lucide-react'
import Panel from '../components/Panel.jsx'
import { authFetch } from '../lib/api.js'
import { ACCENTS, LAB_NAME, ui } from '../lib/ui.js'

/* ---------------- helpers ---------------- */

const toDay = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const shiftDays = (n) => {
  const d = new Date()
  return toDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n))
}

const money = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value) || 0)

/** "2026-11-13T17:08" -> { date: "13/11/2026", time: "05:08 PM" } (wall-clock, no time-zone shift) */
const splitDateTime = (value, fallback) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!m) {
    const d = fallback ? new Date(fallback) : null
    if (!d || Number.isNaN(d.getTime())) return { date: '—', time: '' }
    return {
      date: new Intl.DateTimeFormat('en-GB').format(d),
      time: new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(d),
    }
  }
  const [, y, mo, d, hh, mi] = m
  let time = ''
  if (hh) {
    const h = Number(hh)
    time = `${String(h % 12 || 12).padStart(2, '0')}:${mi} ${h >= 12 ? 'PM' : 'AM'}`
  }
  return { date: `${d}/${mo}/${y}`, time }
}

const category = (patient = {}) => {
  const age = String(patient.age || '').trim()
  const ageText = age ? (/^\d+(\.\d+)?$/.test(age) ? `${age} Year` : age) : ''
  return [patient.sex, ageText].filter(Boolean).join(' ') || '—'
}

const formatRange = (from, to) => {
  const f = splitDateTime(from).date
  const t = splitDateTime(to).date
  return from === to ? f : `${f} to ${t}`
}

const csvCell = (value) => {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/* ---------------- component ---------------- */

const SummaryTile = ({ icon, label, value, accent }) => {
  const Icon = icon
  return (
    <div className={`${ui.card} p-4 print:border-slate-300 print:shadow-none`}>
      <div className="flex items-center gap-2">
        <span className={`rounded-lg p-1.5 ${ACCENTS[accent]} print:hidden`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className={`text-xs font-medium uppercase tracking-wide ${ui.muted}`}>{label}</span>
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

const PatientReport = ({ apiBase, onPrintBill, onCreateBill, refreshKey = 0, title = 'Patient registration report' }) => {
  const [center, setCenter] = useState('')
  const [user, setUser] = useState('')
  const [openId, setOpenId] = useState(null)
  const [from, setFrom] = useState(() => toDay(new Date()))
  const [to, setTo] = useState(() => toDay(new Date()))
  const [doctor, setDoctor] = useState('')
  const [search, setSearch] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ from, to })
      const response = await authFetch(`${apiBase}/bills/report?${params}`)
      if (!response.ok) throw new Error('Patient report is not available')
      setReport(await response.json())
    } catch (err) {
      setError(err.message || 'Unable to load patient report')
    } finally {
      setLoading(false)
    }
  }, [apiBase, from, to])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const allRows = useMemo(() => (Array.isArray(report?.bills) ? report.bills : []), [report])

  const doctors = useMemo(
    () => [...new Set(allRows.map((b) => String(b.patient?.refBy || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [allRows],
  )

  const uniq = (values) => [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const centers = useMemo(() => uniq(allRows.map((b) => b.meta?.centerName)), [allRows])
  const users = useMemo(() => uniq(allRows.map((b) => b.createdBy?.name)), [allRows])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allRows.filter((bill) => {
      if (doctor && String(bill.patient?.refBy || '').trim() !== doctor) return false
      if (center && String(bill.meta?.centerName || '').trim() !== center) return false
      if (user && String(bill.createdBy?.name || '').trim() !== user) return false
      if (!q) return true
      const p = bill.patient || {}
      return [bill.id, bill.meta?.siNo, p.name, p.mobile, p.refBy].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    })
  }, [allRows, doctor, center, user, search])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, b) => {
          acc.amount += Number(b.subtotal) || 0
          acc.paid += Number(b.receivedAmt) || 0
          acc.disc += Number(b.discount) || 0
          acc.dues += Number(b.duesAmt) || 0
          return acc
        },
        { amount: 0, paid: 0, disc: 0, dues: 0 },
      ),
    [rows],
  )

  const ranges = [
    { key: 'today', label: 'Today', from: shiftDays(0), to: shiftDays(0) },
    { key: 'yesterday', label: 'Yesterday', from: shiftDays(-1), to: shiftDays(-1) },
    { key: '7d', label: 'Last 7 days', from: shiftDays(-6), to: shiftDays(0) },
    {
      key: 'month',
      label: 'This month',
      from: toDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
      to: shiftDays(0),
    },
  ]

  const exportCsv = () => {
    const header = ['S.No', 'Serial No', 'Bill No', 'Patient Name', 'Category', 'Mobile', 'Ref Doctor', 'Date', 'Time', 'Reporting', 'Amount', 'Paid', 'Disc', 'Dues', 'Remarks']
    const lines = rows.map((b, i) => {
      const billed = splitDateTime(b.meta?.billingDateTime, b.createdAt)
      const rep = splitDateTime(b.meta?.reportingTime)
      return [
        i + 1,
        b.meta?.siNo,
        b.id,
        b.patient?.name,
        category(b.patient),
        b.patient?.mobile,
        b.patient?.refBy,
        billed.date,
        billed.time,
        `${rep.date} ${rep.time}`.trim(),
        b.subtotal,
        b.receivedAmt,
        b.discount,
        b.duesAmt,
        b.narration,
      ]
    })
    lines.push(['', '', '', 'TOTAL', '', '', '', '', '', '', totals.amount, totals.paid, totals.disc, totals.dues, ''])
    const csv = [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `patient-report_${from}_to_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const cell = 'px-3 py-2.5 text-sm align-top print:px-1.5 print:py-1 print:text-[10px]'
  const head = `${ui.th} px-3 print:px-1.5 print:py-1 print:text-[9px] print:text-black`
  const num = 'text-right tabular-nums'

  return (
    <div className="space-y-6 print:space-y-3">
      {/* Print-only heading */}
      <div className="hidden text-center print:block">
        <div className="text-lg font-bold uppercase">{LAB_NAME}</div>
        <div className="text-sm font-semibold">Patient Registration Report · {formatRange(from, to)}</div>
      </div>

      {/* Filters */}
      <div className={`${ui.card} space-y-4 p-4 print:hidden`}>
        <div className="flex flex-wrap gap-2">
          {ranges.map((r) => {
            const active = from === r.from && to === r.to
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setFrom(r.from)
                  setTo(r.to)
                }}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-[auto_auto_1fr_1fr_1fr_1fr_auto] xl:items-end">
          <div>
            <label className={ui.label} htmlFor="rep-from">From</label>
            <input id="rep-from" type="date" className={ui.input} value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
          </div>
          <div>
            <label className={ui.label} htmlFor="rep-to">Upto</label>
            <input id="rep-to" type="date" className={ui.input} value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
          </div>
          <div>
            <label className={ui.label} htmlFor="rep-center">Center</label>
            <select id="rep-center" className={ui.input} value={center} onChange={(e) => setCenter(e.target.value)}>
              <option value="">All centers</option>
              {centers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={ui.label} htmlFor="rep-user">User</label>
            <select id="rep-user" className={ui.input} value={user} onChange={(e) => setUser(e.target.value)}>
              <option value="">Select User</option>
              {users.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className={ui.label} htmlFor="rep-doc">Ref doctor</label>
            <select id="rep-doc" className={ui.input} value={doctor} onChange={(e) => setDoctor(e.target.value)}>
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className={ui.label} htmlFor="rep-search">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="rep-search" className={`${ui.input} pl-9`} placeholder="Name, mobile, bill / serial no" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="col-span-2 flex gap-2 md:col-span-1">
            {onCreateBill ? (
              <button type="button" onClick={onCreateBill} className={`${ui.btn} flex-1 md:flex-none`} title="New patient bill">
                <Plus className="h-4 w-4" />
                New
              </button>
            ) : null}
            <button type="button" onClick={exportCsv} disabled={!rows.length} className={`${ui.btn} flex-1 md:flex-none`} title="Download as Excel/CSV">
              <Download className="h-4 w-4" />
              Excel
            </button>
            <button type="button" onClick={() => window.print()} disabled={!rows.length} className={`${ui.btnPrimary} flex-1 md:flex-none`}>
              <Printer className="h-4 w-4" />
              Print
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className={`${ui.alertError} print:hidden`}>{error}. Start the backend server on port 5000, then press Refresh.</div>
      ) : null}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5 print:grid-cols-5 print:gap-2">
        <SummaryTile icon={Users} label="Patients" value={loading ? '…' : rows.length} accent="blue" />
        <SummaryTile icon={IndianRupee} label="Amount" value={loading ? '…' : `₹${money(totals.amount)}`} accent="indigo" />
        <SummaryTile icon={Banknote} label="Paid" value={loading ? '…' : `₹${money(totals.paid)}`} accent="emerald" />
        <SummaryTile icon={Percent} label="Discount" value={loading ? '…' : `₹${money(totals.disc)}`} accent="amber" />
        <SummaryTile icon={Wallet} label="Dues" value={loading ? '…' : `₹${money(totals.dues)}`} accent="rose" />
      </div>

      {/* Table */}
      <Panel
        className="print:rounded-none print:border-0 print:shadow-none [&>header]:print:hidden"
        title={title}
        subtitle={`${formatRange(from, to)} · ${rows.length} patient${rows.length === 1 ? '' : 's'}${doctor ? ` · Ref: ${doctor}` : ''}`}
        icon={ClipboardList}
      >
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[1200px] text-left print:min-w-0">
            <thead className="bg-slate-50 dark:bg-slate-800/50 print:bg-white">
              <tr className="print:border-b print:border-black">
                <th className={head}>#</th>
                <th className={head}>RefNo</th>
                <th className={head}>Serial No</th>
                <th className={head}>Patient Name</th>
                <th className={head}>Category</th>
                <th className={head}>Mobile</th>
                <th className={head}>Ref Doctor</th>
                <th className={head}>Date</th>
                <th className={head}>Reporting</th>
                <th className={`${head} text-right`}>Amount</th>
                <th className={`${head} text-right`}>Paid</th>
                <th className={`${head} text-right`}>Disc</th>
                <th className={`${head} text-right`}>Dues</th>
                <th className={head}>Remarks</th>
                <th className={`${head} text-right print:hidden`}>Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
              {rows.length ? (
                rows.map((bill, index) => {
                  const billed = splitDateTime(bill.meta?.billingDateTime, bill.createdAt)
                  const rep = splitDateTime(bill.meta?.reportingTime)
                  const dues = Number(bill.duesAmt) || 0
                  const items = Array.isArray(bill.items) ? bill.items : []
                  const isOpen = openId === bill.id
                  return (
                    <React.Fragment key={bill.id}>
                    <tr
                      title={items.map((it) => it.name).join('\n')}
                      onClick={() => setOpenId(isOpen ? null : bill.id)}
                      className={`cursor-pointer transition-colors print:break-inside-avoid ${
                        isOpen ? 'bg-blue-50/70 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className={`${cell} ${ui.muted}`}>
                        <ChevronRight className={`inline h-3.5 w-3.5 transition-transform print:hidden ${isOpen ? 'rotate-90' : ''}`} /> {index + 1}
                      </td>
                      <td className={cell}>
                        <span className="inline-block whitespace-nowrap rounded bg-blue-700 px-2 py-0.5 font-mono text-xs font-semibold text-white print:bg-transparent print:p-0 print:text-black">
                          {bill.id}
                        </span>
                      </td>
                      <td className={`${cell} whitespace-nowrap font-semibold`}>{bill.meta?.siNo || '—'}</td>
                      <td className={`${cell} font-medium text-slate-900 dark:text-slate-100`}>{bill.patient?.name || 'Unnamed'}</td>
                      <td className={`${cell} whitespace-nowrap`}>{category(bill.patient)}</td>
                      <td className={`${cell} whitespace-nowrap tabular-nums`}>{bill.patient?.mobile || '—'}</td>
                      <td className={`${cell} max-w-[200px]`}>{bill.patient?.refBy || 'SELF'}</td>
                      <td className={`${cell} whitespace-nowrap`}>
                        <div>{billed.date}</div>
                        <div className={`text-xs ${ui.muted}`}>{billed.time}</div>
                      </td>
                      <td className={`${cell} whitespace-nowrap`}>
                        <div>{rep.date}</div>
                        <div className={`text-xs ${ui.muted}`}>{rep.time}</div>
                      </td>
                      <td className={`${cell} ${num} font-semibold`}>{money(bill.subtotal)}</td>
                      <td className={`${cell} ${num} text-emerald-700 dark:text-emerald-400 print:text-black`}>{money(bill.receivedAmt)}</td>
                      <td className={`${cell} ${num}`}>{money(bill.discount)}</td>
                      <td className={`${cell} ${num} ${dues > 0 ? 'font-semibold text-rose-600 dark:text-rose-400 print:text-black' : ''}`}>{money(dues)}</td>
                      <td className={`${cell} max-w-[180px] ${ui.muted}`}>{bill.narration || ''}</td>
                      <td className={`${cell} text-right print:hidden`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onPrintBill?.(bill)
                          }}
                          className={`${ui.btn} px-2.5 py-1.5`}
                          title="Print receipt"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="bg-blue-50/40 print:hidden dark:bg-blue-500/5">
                        <td colSpan={15} className="px-4 py-4">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className={`mb-2 text-xs font-semibold uppercase tracking-wide ${ui.muted}`}>
                                Tests ({items.length}) · Bill {bill.id}
                              </div>
                              {items.length ? (
                                <ol className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                                  {items.map((it, i) => (
                                    <li key={i} className="flex justify-between gap-4 text-sm">
                                      <span className="truncate">
                                        {i + 1}. {it.name}
                                      </span>
                                      <span className="shrink-0 tabular-nums font-medium">₹{money(it.amount)}</span>
                                    </li>
                                  ))}
                                </ol>
                              ) : (
                                <div className={`text-sm ${ui.muted}`}>No tests on this bill.</div>
                              )}
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button type="button" onClick={() => onPrintBill?.(bill)} className={ui.btnPrimary}>
                                <Printer className="h-4 w-4" />
                                Print Receipt
                              </button>
                              <button type="button" onClick={() => setOpenId(null)} className={ui.btn}>
                                <X className="h-4 w-4" />
                                Close
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    </React.Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={15} className={`px-4 py-14 text-center text-sm ${ui.muted}`}>
                    {loading ? 'Loading report…' : `No patients registered ${from === to ? 'on' : 'between'} ${formatRange(from, to)}.`}
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length ? (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold dark:border-slate-700 dark:bg-slate-800/50 print:border-black print:bg-white">
                <tr>
                  <td className={cell} colSpan={9}>
                    Total · {rows.length} patient{rows.length === 1 ? '' : 's'}
                  </td>
                  <td className={`${cell} ${num}`}>{money(totals.amount)}</td>
                  <td className={`${cell} ${num}`}>{money(totals.paid)}</td>
                  <td className={`${cell} ${num}`}>{money(totals.disc)}</td>
                  <td className={`${cell} ${num}`}>{money(totals.dues)}</td>
                  <td className={cell} />
                  <td className={`${cell} print:hidden`} />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </Panel>
    </div>
  )
}

export default PatientReport
