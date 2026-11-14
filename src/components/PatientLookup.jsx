import React, { useEffect, useState } from 'react'
import { Search, UserCheck, UserPlus, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { ui } from '../lib/ui.js'

/**
 * Search box for existing patients on the Create Bill page.
 * Picking one links the bill to that patient ID; otherwise a new patient is created on save.
 */
const PatientLookup = ({ linked, onPick, onUnlink }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return undefined
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await api(`/patients?${new URLSearchParams({ q, limit: 8 })}`)
        setResults(data.patients || [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  if (linked) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <span className="flex min-w-0 items-center gap-2 text-emerald-800 dark:text-emerald-200">
          <UserCheck className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Existing patient <b className="font-mono">{linked.patientId}</b> · {linked.name}
          </span>
        </span>
        <button type="button" onClick={onUnlink} className="shrink-0 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
          Change
        </button>
      </div>
    )
  }

  const showList = open && query.trim().length >= 2

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className={`${ui.input} pl-9 pr-9`}
        placeholder="Find existing patient by name, mobile or ID (P000123)…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {query ? (
        <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700" aria-label="Clear search">
          <X className="h-4 w-4" />
        </button>
      ) : null}
      {showList ? (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading && !results.length ? <div className={`px-3 py-2 text-sm ${ui.muted}`}>Searching…</div> : null}
          {!loading && !results.length ? (
            <div className={`flex items-center gap-2 px-3 py-2 text-sm ${ui.muted}`}>
              <UserPlus className="h-4 w-4" />
              No match — fill the form below to add a new patient.
            </div>
          ) : null}
          {results.map((p) => (
            <button
              key={p.patientId}
              type="button"
              onMouseDown={() => {
                onPick(p)
                setQuery('')
                setOpen(false)
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-slate-800"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className={`block text-xs ${ui.muted}`}>
                  {[p.sex, p.age && `${p.age} Y`, p.mobile].filter(Boolean).join(' · ') || 'No details'} · {p.visits} visit{p.visits === 1 ? '' : 's'}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-slate-500">{p.patientId}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default PatientLookup
