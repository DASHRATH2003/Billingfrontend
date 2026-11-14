import React, { useEffect, useMemo, useState } from 'react'
import { ChevronRight, List, Pencil, Plus, Search } from 'lucide-react'
import Panel from '../components/Panel.jsx'
import { api } from '../lib/api.js'
import { DEPARTMENTS, WINGS } from '../data/testOptions.js'
import { ACCENTS, ui } from '../lib/ui.js'

const money = (v) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(v) || 0)

const FORMAT_STYLE = {
  Single: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  Multiple: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  Heading: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
}

/** Test List like E-PathoSoft: search, Wing / Department filters, click a row to open it in Test Entry. */
const TestList = ({ onOpen, onNew, refreshKey = 0 }) => {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [wing, setWing] = useState('')
  const [department, setDepartment] = useState('')

  useEffect(() => {
    let alive = true
    api('/tests')
      .then((d) => alive && (setTests(d.tests || []), setError('')))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [refreshKey])

  const wings = useMemo(() => [...new Set([...WINGS, ...tests.map((t) => t.wing).filter(Boolean)])], [tests])
  const departments = useMemo(() => [...new Set([...DEPARTMENTS, ...tests.map((t) => t.department).filter(Boolean)])], [tests])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tests.filter((t) => {
      if (wing && (t.wing || 'PATHOLOGY') !== wing) return false
      if (department && t.department !== department) return false
      if (!q) return true
      return [t.name, t.code, t.shortCode, t.underTest].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    })
  }, [tests, query, wing, department])

  const singleCount = tests.filter((t) => (t.format || 'Single') === 'Single').length
  const multiCount = tests.length - singleCount

  return (
    <div className="space-y-6">
      {error ? <div className={ui.alertError}>{error}</div> : null}

      <Panel
        title="Test List"
        subtitle={`${singleCount} single test${singleCount === 1 ? '' : 's'} · ${multiCount} multi / heading · click a test to edit it`}
        icon={List}
        accent={ACCENTS.violet}
        actions={
          <button type="button" onClick={onNew} className={ui.btnPrimary}>
            <Plus className="h-4 w-4" />
            Test Entry
          </button>
        }
      >
        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_220px_240px] dark:border-slate-800">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className={`${ui.input} pl-9`} placeholder="Search test from here (name, code, parent)" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className={ui.input} value={wing} onChange={(e) => setWing(e.target.value)}>
            <option value="">All wings</option>
            {wings.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
          <select className={ui.input} value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className={ui.th}>Test name</th>
                <th className={ui.th}>Vial</th>
                <th className={ui.th}>Sample</th>
                <th className={ui.th}>Wing</th>
                <th className={ui.th}>Department</th>
                <th className={`${ui.th} text-right`}>Rate</th>
                <th className={`${ui.th} text-center`}>Format</th>
                <th className={`${ui.th} text-center`}>Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length ? (
                rows.map((t) => (
                  <tr key={t._id} onClick={() => onOpen(t._id)} className="cursor-pointer hover:bg-blue-50/60 dark:hover:bg-slate-800/50">
                    <td className={ui.td}>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <div className="font-medium">{t.name}</div>
                          {t.underTest ? <div className={`text-xs ${ui.muted}`}>under {t.underTest}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td className={`${ui.td} ${ui.muted}`}>{t.vial || '—'}</td>
                    <td className={`${ui.td} ${ui.muted}`}>{t.sample || '—'}</td>
                    <td className={ui.td}>{t.wing || 'PATHOLOGY'}</td>
                    <td className={ui.td}>{t.department || <span className={ui.muted}>—</span>}</td>
                    <td className={`${ui.td} text-right font-semibold tabular-nums`}>{money(t.amount)}</td>
                    <td className={`${ui.td} text-center`}>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${FORMAT_STYLE[t.format || 'Single']}`}>{t.format || 'Single'}</span>
                    </td>
                    <td className={`${ui.td} text-center`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onOpen(t._id)
                        }}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}className={`px-4 py-12 text-center text-sm ${ui.muted}`}>
                    {loading ? 'Loading tests…' : 'No test matches these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className={`border-t border-slate-100 px-5 py-3 text-xs dark:border-slate-800 ${ui.muted}`}>
          Showing {rows.length} of {tests.length} tests
        </div>
      </Panel>
    </div>
  )
}

export default TestList
