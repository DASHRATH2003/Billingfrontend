import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ListFilter, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { ui } from '../lib/ui.js'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** "2026-11-14T10:55" -> "14/11/2026" and "14/11/2026/10:55AM" (wall-clock, like E-PathoSoft). */
const fmt = (value, withTime) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (!m) return ''
  const [, y, mo, d, hh, mi] = m
  const date = `${d}/${mo}/${y}`
  if (!withTime || !hh) return date
  const h = Number(hh)
  return `${date}/${h % 12 || 12}:${mi}${h >= 12 ? 'PM' : 'AM'}`
}

const category = (p = {}) => {
  const age = String(p.age || '').trim()
  return [p.sex, age ? (/^\d+(\.\d+)?$/.test(age) ? `${age} Year` : age) : ''].filter(Boolean).join(' ')
}

const amount = (v) => {
  const n = Number(v) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/**
 * Dashboard "List of Test Request" — same as E-PathoSoft: From / Upto / Center / User, View, and the table.
 * RefNo is yellow while the report is pending and blue once it is ready or delivered.
 */
/* ---------------- barcode (Code 39: digits, A-Z, "-") ---------------- */

// 9 elements per character (bar, space, bar, …); 1 = wide, 0 = narrow.
const CODE39 = {
  0: '000110100', 1: '100100001', 2: '001100001', 3: '101100000', 4: '000110001',
  5: '100110000', 6: '001110000', 7: '000100101', 8: '100100100', 9: '001100100',
  A: '100001001', B: '001001001', C: '101001000', D: '000011001', E: '100011000',
  F: '001011000', G: '000001101', H: '100001100', I: '001001100', J: '000011100',
  K: '100000011', L: '001000011', M: '101000010', N: '000010011', O: '100010010',
  P: '001010010', Q: '000000111', R: '100000110', S: '001000110', T: '000010110',
  U: '110000001', V: '011000001', W: '111000000', X: '010010001', Y: '110010000',
  Z: '011010000', '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
}

const barcodeSvg = (text, height = 50) => {
  const chars = `*${String(text).toUpperCase().replace(/[^0-9A-Z. -]/g, '')}*`
  const narrow = 1.5
  const wide = narrow * 3
  let x = 10
  let bars = ''
  for (const ch of chars) {
    ;[...CODE39[ch]].forEach((bit, i) => {
      const w = bit === '1' ? wide : narrow
      if (i % 2 === 0) bars += `<rect x="${x}" y="0" width="${w}" height="${height}"/>`
      x += w
    })
    x += narrow // gap between characters
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x + 10}" height="${height}" viewBox="0 0 ${x + 10} ${height}">${bars}</svg>`
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/** Small sample-tube label: barcode of the RefNo + patient name. */
const printBarcode = (bill) => {
  const win = window.open('', '_blank', 'width=420,height=320')
  if (!win) return alert('Allow pop-ups to print the barcode.')
  const p = bill.patient || {}
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(bill.id)}</title>
<style>
  @page { size: 50mm 25mm; margin: 0 }
  body { margin: 0; font-family: Arial, sans-serif }
  .label { width: 50mm; height: 25mm; box-sizing: border-box; padding: 1.5mm 2mm; text-align: center; overflow: hidden }
  .name { font-size: 9px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
  .meta { font-size: 8px }
  svg { width: 100%; height: 11mm }
</style></head><body>
<div class="label">
  <div class="name">${esc(p.name)}</div>
  ${barcodeSvg(bill.id)}
  <div class="meta"><b>${esc(bill.id)}</b> · ${esc(bill.meta?.siNo || '')} · ${esc(category(p))}</div>
</div>
<script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300) }</` + `script>
</body></html>`)
  win.document.close()
}

/* ---------------- Select Option popup ---------------- */

const PAY_MODES = ['Cash', 'UPI', 'Card', 'Online', 'Cheque']

const SelectOption = ({ bill, onClose, onPrintBill, onEditBill, onResultEntry, onPaid }) => {
  const dues = Number(bill.duesAmt) || 0
  const [payOpen, setPayOpen] = useState(false)
  const [payAmount, setPayAmount] = useState(String(dues))
  const [payMode, setPayMode] = useState('Cash')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const collect = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg({ type: '', text: '' })
    try {
      const { bill: updated } = await api(`/bills/${encodeURIComponent(bill.id)}/payment`, { method: 'POST', body: { amount: Number(payAmount), payMode } })
      onPaid(updated)
      setPayOpen(false)
      setPayAmount(String(Number(updated.duesAmt) || 0))
      setMsg({ type: 'ok', text: `✓ Received ₹${amount(payAmount)} (${payMode}).` })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setBusy(false)
    }
  }

  const btn = 'w-full rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-60'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-xs overflow-hidden rounded-md bg-white shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-red-600 px-3 py-2 text-white">
          <span className="text-lg">Select Option</span>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-white/20" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 p-3">
          <input readOnly value={bill.id} className="w-full rounded border border-red-500 bg-white px-3 py-1.5 text-sm text-slate-900 dark:bg-slate-950 dark:text-slate-100" />
          <div className={`truncate px-1 text-xs ${ui.muted}`} title={bill.patient?.name}>
            {bill.patient?.name} · {category(bill.patient)}
          </div>

          <button type="button" onClick={() => printBarcode(bill)} className={`${btn} bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600`}>
            Barcode
          </button>
          <button type="button" onClick={() => onEditBill(bill)} className={`${btn} bg-blue-500 hover:bg-blue-600`}>
            Edit Registration
          </button>
          <button type="button" onClick={() => onPrintBill(bill)} className={`${btn} bg-slate-600 hover:bg-slate-700`}>
            Print Receipt
          </button>
          <button type="button" onClick={() => onResultEntry(bill)} className={`${btn} bg-purple-700 hover:bg-purple-800`}>
            Result Entry
          </button>
          {dues > 0 ? (
            <button type="button" onClick={() => setPayOpen((o) => !o)} className={`${btn} bg-red-600 hover:bg-red-700`}>
              Amount ₹{amount(dues)} Dues
            </button>
          ) : (
            <div className="w-full rounded bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white">No Dues · Paid ₹{amount(bill.receivedAmt)}</div>
          )}

          {payOpen && dues > 0 ? (
            <form onSubmit={collect} className="space-y-2 rounded border border-slate-200 p-2 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  max={dues}
                  step="any"
                  className={ui.input}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  aria-label="Amount received"
                  autoFocus
                />
                <select className={ui.input} value={payMode} onChange={(e) => setPayMode(e.target.value)} aria-label="Pay mode">
                  {PAY_MODES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={busy} className={`${btn} bg-emerald-600 hover:bg-emerald-700`}>
                {busy ? 'Saving…' : 'Receive Payment'}
              </button>
            </form>
          ) : null}

          {msg.text ? (
            <div
              className={`rounded px-2 py-1.5 text-xs ${
                msg.type === 'error'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                  : msg.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
              }`}
            >
              {msg.text}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const TestRequestList = ({ onPrintBill, onEditBill, onResultEntry }) => {
  const [from, setFrom] = useState(todayStr)
  const [to, setTo] = useState(todayStr)
  const [center, setCenter] = useState('')
  const [user, setUser] = useState('')
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState(null)

  const view = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api(`/bills/report?${new URLSearchParams({ from, to })}`)
      // newest first, like E-PathoSoft
      setBills([...(data.bills || [])].reverse())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  const [refs, setRefs] = useState({ users: [], centers: [] })

  // Load today's list, plus all staff users and centers for the dropdowns, when the page opens.
  useEffect(() => {
    view()
    api('/bills/references')
      .then((r) => setRefs({ users: r.users || [], centers: r.centers || [] }))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const uniq = (values) => [...new Set(values.map((v) => String(v || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  const centers = useMemo(() => uniq(['Main', ...refs.centers, ...bills.map((b) => b.meta?.centerName)]), [bills, refs.centers])
  const users = useMemo(() => uniq([...refs.users, ...bills.map((b) => b.createdBy?.name)]), [bills, refs.users])

  const rows = bills.filter(
    (b) => (!center || String(b.meta?.centerName || '').trim() === center) && (!user || String(b.createdBy?.name || '').trim() === user),
  )

  const th = 'border border-slate-200 px-2 py-2 text-left text-xs font-semibold dark:border-slate-700'
  const td = 'border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700'

  return (
    <section className={`${ui.card} overflow-hidden`}>
      <header className="flex items-center gap-2 bg-gradient-to-r from-violet-700 to-fuchsia-700 px-5 py-3 text-lg font-semibold text-white">
        <ListFilter className="h-5 w-5" />
        List of Test Request
      </header>

      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto] md:items-end">
        <div>
          <label className={ui.label} htmlFor="tr-from">From</label>
          <input id="tr-from" type="date" className={ui.input} value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </div>
        <div>
          <label className={ui.label} htmlFor="tr-to">Upto</label>
          <input id="tr-to" type="date" className={ui.input} value={to} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </div>
        <select className={ui.input} value={center} onChange={(e) => setCenter(e.target.value)} aria-label="Center">
          <option value="">Select</option>
          {centers.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className={ui.input} value={user} onChange={(e) => setUser(e.target.value)} aria-label="User">
          <option value="">Select User</option>
          {users.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <button type="button" onClick={view} disabled={loading} className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {loading ? 'Loading…' : 'View'}
        </button>
      </div>

      {error ? <div className={`${ui.alertError} mx-4 mb-4`}>{error}</div> : null}

      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full min-w-[1150px] border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-800/60">
            <tr>
              <th className={th}>RefNo</th>
              <th className={th}>Serial No</th>
              <th className={th}>Patient Name</th>
              <th className={th}>Category</th>
              <th className={th}>Mobile</th>
              <th className={th}>Ref Doctor</th>
              <th className={th}>Date</th>
              <th className={th}>Reporting</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={`${th} text-right`}>Paid</th>
              <th className={`${th} text-right`}>Disc</th>
              <th className={`${th} text-right`}>Dues</th>
              <th className={th}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((b) => {
                const done = b.status === 'ready' || b.status === 'delivered'
                const dues = Number(b.duesAmt) || 0
                return (
                  <tr
                    key={b.id}
                    onClick={() => setPicked(b)}
                    title={(b.items || []).map((i) => i.name).join('\n')}
                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800/50"
                  >
                    <td className={`${td} whitespace-nowrap font-mono text-xs font-semibold ${done ? 'bg-blue-700 text-white' : 'bg-yellow-300 text-slate-900'}`}>{b.id}</td>
                    <td className={`${td} whitespace-nowrap`}>{b.meta?.siNo || ''}</td>
                    <td className={td}>{b.patient?.name || ''}</td>
                    <td className={`${td} whitespace-nowrap`}>{category(b.patient)}</td>
                    <td className={`${td} whitespace-nowrap`}>{b.patient?.mobile || ''}</td>
                    <td className={td}>{b.patient?.refBy || ''}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmt(b.meta?.billingDateTime || b.createdAt?.slice?.(0, 16))}</td>
                    <td className={`${td} whitespace-nowrap`}>{fmt(b.meta?.reportingTime, true)}</td>
                    <td className={`${td} text-right tabular-nums`}>{amount(b.subtotal)}</td>
                    <td className={`${td} text-right tabular-nums`}>{amount(b.receivedAmt)}</td>
                    <td className={`${td} text-right tabular-nums`}>{amount(b.discount)}</td>
                    <td className={`${td} text-right tabular-nums ${dues > 0 ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>{amount(dues)}</td>
                    <td className={td}>{b.narration || ''}</td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={13} className={`${td} py-16 text-center ${ui.muted}`}>
                  {loading ? 'Loading…' : 'No test request in this date range.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Clicking a row opens the "Select Option" box, like E-PathoSoft. */}
      {picked ? (
        <SelectOption
          bill={picked}
          onClose={() => setPicked(null)}
          onPrintBill={(bill) => {
            setPicked(null)
            onPrintBill?.(bill)
          }}
          onEditBill={(bill) => {
            setPicked(null)
            onEditBill?.(bill)
          }}
          onResultEntry={(bill) => {
            setPicked(null)
            onResultEntry?.(bill)
          }}
          onPaid={(bill) => {
            setPicked(bill)
            setBills((list) => list.map((b) => (b.id === bill.id ? bill : b)))
          }}
        />
      ) : null}
    </section>
  )
}

export default TestRequestList
