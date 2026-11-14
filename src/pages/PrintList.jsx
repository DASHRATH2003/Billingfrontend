import React, { useCallback, useEffect, useState } from 'react'
import { FileText, Printer, ReceiptText, Search } from 'lucide-react'
import { api } from '../lib/api.js'
import { ui } from '../lib/ui.js'
import { openReportWindow, printPatientReport } from '../lib/reportPrint.js'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const dmy = (v) => {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
const money = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(v) || 0)

const STATUS = {
  registered: { text: 'Result pending', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  collected: { text: 'Sample collected', cls: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300' },
  ready: { text: 'Report ready', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300' },
  delivered: { text: 'Delivered', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
}

/**
 * Two separate pages built on one list:
 *  - mode "receipt": Patient Receipt — the money slip (tests, prices, paid, dues).
 *  - mode "lab":     Lab Report — the test results; printing comes with Result Entry.
 */
const PrintList = ({ mode = 'receipt', onPrintBill, onResultEntry }) => {
  const isLab = mode === 'lab'
  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)
  const [search, setSearch] = useState('')
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api(`/bills/report?${new URLSearchParams({ from, to, search: search.trim() })}`)
      setBills([...(data.bills || [])].reverse())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to, search])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [printError, setPrintError] = useState('')
  const printReport = async (b) => {
    setPrintError('')
    const win = openReportWindow()
    if (!win) return setPrintError('Allow pop-ups for this site to print the report.')
    try {
      const data = await api(`/bills/${encodeURIComponent(b.id)}/results`)
      printPatientReport(data.bill, data.sheet.groups, data.sheet.comment, win)
    } catch (err) {
      win.close()
      setPrintError(err.message)
    }
  }

  const Icon = isLab ? FileText : ReceiptText

  return (
    <section className={`${ui.card} overflow-hidden`}>
      <header className={`flex items-center gap-2 px-5 py-3 text-lg font-semibold text-white ${isLab ? 'bg-gradient-to-r from-teal-700 to-cyan-700' : 'bg-gradient-to-r from-slate-700 to-slate-600'}`}>
        <Icon className="h-5 w-5" />
        {isLab ? 'Patient Report' : 'Patient Receipt'}
      </header>

      {isLab ? (
        <div className={`mx-4 mt-4 text-sm ${ui.muted}`}>
          Click <b>Enter Result</b> to type the test values. After <b>Save &amp; Report Ready</b>, the <b>Print</b> button prints the patient report.
        </div>
      ) : null}
      {printError ? <div className={`${ui.alertError} mx-4 mt-3`}>{printError}</div> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
        className="grid grid-cols-2 gap-3 p-4 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end"
      >
        <div>
          <label className={ui.label} htmlFor={`${mode}-from`}>From</label>
          <input id={`${mode}-from`} type="date" className={ui.input} value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </div>
        <div>
          <label className={ui.label} htmlFor={`${mode}-to`}>Upto</label>
          <input id={`${mode}-to`} type="date" className={ui.input} value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </div>
        <div className="relative col-span-2 md:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className={`${ui.input} pl-9`} placeholder="Patient name, mobile or RefNo" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button type="submit" disabled={loading} className="col-span-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 md:col-span-1">
          {loading ? 'Loading…' : 'View'}
        </button>
      </form>

      {error ? <div className={`${ui.alertError} mx-4 mb-4`}>{error}</div> : null}

      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className={ui.th}>RefNo</th>
              <th className={ui.th}>Date</th>
              <th className={ui.th}>Patient</th>
              <th className={ui.th}>Tests</th>
              {isLab ? <th className={ui.th}>Status</th> : (
                <>
                  <th className={`${ui.th} text-right`}>Amount</th>
                  <th className={`${ui.th} text-right`}>Paid</th>
                  <th className={`${ui.th} text-right`}>Dues</th>
                </>
              )}
              <th className={`${ui.th} text-center`}>Print</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {bills.length ? (
              bills.map((b) => {
                const st = STATUS[b.status] || STATUS.registered
                const reportReady = b.status === 'ready' || b.status === 'delivered'
                return (
                  <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className={`${ui.td} whitespace-nowrap font-mono text-xs font-semibold`}>{b.id}</td>
                    <td className={`${ui.td} whitespace-nowrap`}>{dmy(b.meta?.billingDateTime || b.createdAt)}</td>
                    <td className={ui.td}>
                      <div className="font-medium">{b.patient?.name}</div>
                      <div className={`text-xs ${ui.muted}`}>{[b.patient?.sex, b.patient?.age, b.patient?.mobile].filter(Boolean).join(' · ')}</div>
                    </td>
                    <td className={`${ui.td} max-w-xs text-xs`}>{(b.items || []).map((i) => i.name).join(', ')}</td>
                    {isLab ? (
                      <td className={ui.td}>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.text}</span>
                      </td>
                    ) : (
                      <>
                        <td className={`${ui.td} text-right tabular-nums`}>{money(b.netAmount)}</td>
                        <td className={`${ui.td} text-right tabular-nums`}>{money(b.receivedAmt)}</td>
                        <td className={`${ui.td} text-right tabular-nums ${b.duesAmt > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>{money(b.duesAmt)}</td>
                      </>
                    )}
                    <td className={`${ui.td} text-center`}>
                      {isLab ? (
                        <div className="flex justify-center gap-2">
                          <button type="button" onClick={() => onResultEntry?.(b)} className="inline-flex items-center gap-1 rounded-md bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-800">
                            <FileText className="h-3.5 w-3.5" />
                            {reportReady ? 'Edit Result' : 'Enter Result'}
                          </button>
                          <button
                            type="button"
                            disabled={!reportReady}
                            onClick={() => printReport(b)}
                            title={reportReady ? 'Print patient report' : 'Enter results first'}
                            className={`${ui.btnPrimary} px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => onPrintBill?.(b)} className={`${ui.btnPrimary} px-3 py-1.5 text-xs`}>
                          <Printer className="h-3.5 w-3.5" />
                          Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={isLab ? 6 : 8} className={`px-4 py-14 text-center text-sm ${ui.muted}`}>
                  {loading ? 'Loading…' : 'No patient in this date range.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default PrintList
