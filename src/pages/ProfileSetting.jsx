import React, { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Hand, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { api } from '../lib/api.js'
import { ui } from '../lib/ui.js'

const Column = ({ title, right, children, tone = 'border-slate-200 dark:border-slate-800' }) => (
  <section className={`${ui.card} flex max-h-[calc(100vh-13rem)] min-h-[420px] flex-col overflow-hidden border-2 ${tone}`}>
    <header className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800/50">
      <span>{title}</span>
      {right}
    </header>
    {children}
  </section>
)

const SearchInput = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input className={`${ui.input} pl-9`} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
)

/**
 * Profile Setting like E-PathoSoft: pick a profile (left), add tests to it (middle),
 * see / remove / reorder its tests (right). Every change is saved immediately.
 */
const ProfileSetting = ({ onOpenProfiles }) => {
  const [profiles, setProfiles] = useState([])
  const [tests, setTests] = useState([])
  const [error, setError] = useState('')
  const [profileQuery, setProfileQuery] = useState('')
  const [testQuery, setTestQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([api('/profiles'), api('/tests')])
      .then(([p, t]) => {
        setProfiles(p.profiles || [])
        setTests(t.tests || [])
      })
      .catch((err) => setError(err.message))
  }, [])

  const selected = profiles.find((p) => p._id === selectedId) || null
  const inProfile = useMemo(() => new Set(selected?.tests || []), [selected])
  const testByName = useMemo(() => new Map(tests.map((t) => [t.name, t])), [tests])

  const shownProfiles = useMemo(() => {
    const q = profileQuery.trim().toLowerCase()
    return q ? profiles.filter((p) => p.name.toLowerCase().includes(q)) : profiles
  }, [profiles, profileQuery])

  const shownTests = useMemo(() => {
    const q = testQuery.trim().toLowerCase()
    return q ? tests.filter((t) => [t.name, t.shortCode, t.code].filter(Boolean).some((v) => v.toLowerCase().includes(q))) : tests
  }, [tests, testQuery])

  /** Save the new test list for the selected profile (optimistic, rolls back on error). */
  const saveTests = async (next) => {
    if (!selected) return
    const before = selected.tests || []
    setProfiles((list) => list.map((p) => (p._id === selected._id ? { ...p, tests: next } : p)))
    setSaving(true)
    setError('')
    try {
      const { profile } = await api(`/profiles/${selected._id}/tests`, { method: 'PUT', body: { tests: next } })
      setProfiles((list) => list.map((p) => (p._id === profile._id ? profile : p)))
    } catch (err) {
      setProfiles((list) => list.map((p) => (p._id === selected._id ? { ...p, tests: before } : p)))
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const addTest = (name) => {
    if (!selected) {
      setError('First choose a profile on the left (click 👉).')
      return
    }
    if (inProfile.has(name)) return
    saveTests([...(selected.tests || []), name])
  }
  const removeTest = (name) => saveTests((selected?.tests || []).filter((t) => t !== name))
  const move = (index, delta) => {
    const list = [...(selected?.tests || [])]
    const to = index + delta
    if (to < 0 || to >= list.length) return
    ;[list[index], list[to]] = [list[to], list[index]]
    saveTests(list)
  }

  const profileTotal = (selected?.tests || []).reduce((sum, name) => sum + (Number(testByName.get(name)?.amount) || 0), 0)

  return (
    <div className="space-y-4">
      {error ? (
        <div className={`${ui.alertError} flex items-center justify-between gap-3`}>
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 1. Profiles */}
        <Column
          title={`Profile (${profiles.length})`}
          tone="border-blue-200 dark:border-blue-900/60"
          right={
            <button type="button" onClick={onOpenProfiles} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              Test Profile →
            </button>
          }
        >
          <div className="border-b border-slate-100 p-3 dark:border-slate-800">
            <SearchInput value={profileQuery} onChange={setProfileQuery} placeholder="Search profile" />
          </div>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {shownProfiles.length ? (
              shownProfiles.map((p) => {
                const active = p._id === selectedId
                return (
                  <li key={p._id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p._id)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                    >
                      <Hand className={`h-4 w-4 shrink-0 -rotate-90 ${active ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} />
                      <span className="min-w-0 flex-1 font-semibold">{p.name}</span>
                      <span className={`shrink-0 rounded-full px-2 text-xs ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{(p.tests || []).length}</span>
                    </button>
                  </li>
                )
              })
            ) : (
              <li className={`px-4 py-10 text-center text-sm ${ui.muted}`}>
                {profiles.length ? 'No profile matches.' : 'No profiles yet. Create them in Test Profile first.'}
              </li>
            )}
          </ul>
        </Column>

        {/* 2. Tests */}
        <Column title={`Test name (${tests.length})`} tone="border-emerald-200 dark:border-emerald-900/60">
          <div className="border-b border-slate-100 p-3 dark:border-slate-800">
            <SearchInput value={testQuery} onChange={setTestQuery} placeholder="Search test" />
          </div>
          <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
            {shownTests.map((t) => {
              const added = inProfile.has(t.name)
              const isHeading = t.format === 'Heading' || t.format === 'Multiple'
              return (
                <li key={t._id}>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => addTest(t.name)}
                    title={added ? 'Already in this profile' : selected ? `Add to ${selected.name}` : 'Choose a profile first'}
                    className={`flex w-full items-start gap-3 px-4 py-2 text-left text-sm disabled:cursor-default ${
                      isHeading ? 'bg-slate-100 dark:bg-slate-800/70' : 'hover:bg-emerald-50 dark:hover:bg-slate-800/40'
                    } ${added ? 'opacity-50' : ''}`}
                  >
                    <Plus className={`mt-0.5 h-4 w-4 shrink-0 ${isHeading ? 'text-rose-600' : 'text-blue-600 dark:text-blue-400'}`} />
                    <span className={`min-w-0 flex-1 ${isHeading ? 'font-semibold text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300'}`}>{t.name}</span>
                    {added ? <span className="shrink-0 text-xs text-emerald-600">added</span> : null}
                  </button>
                </li>
              )
            })}
            {!shownTests.length ? <li className={`px-4 py-10 text-center text-sm ${ui.muted}`}>No test matches.</li> : null}
          </ul>
        </Column>

        {/* 3. Selected profile */}
        <Column
          title={selected ? selected.name : 'Select Profile'}
          tone="border-rose-200 dark:border-rose-900/60"
          right={selected ? <span className={`text-xs font-normal ${ui.muted}`}>{saving ? 'Saving…' : `${(selected.tests || []).length} tests`}</span> : null}
        >
          {selected ? (
            <>
              <ol className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {(selected.tests || []).length ? (
                  selected.tests.map((name, i) => {
                    const t = testByName.get(name)
                    return (
                      <li key={name} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className={`w-6 shrink-0 text-right text-xs ${ui.muted}`}>{i + 1}.</span>
                        <span className="min-w-0 flex-1">
                          <span className="block">{name}</span>
                          {!t ? <span className="block text-xs text-amber-600">not in Test List any more</span> : null}
                        </span>
                        <span className={`shrink-0 text-xs tabular-nums ${ui.muted}`}>{t ? `₹${t.amount || 0}` : ''}</span>
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800" aria-label="Move up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(i, 1)}
                          disabled={i === selected.tests.length - 1}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800"
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => removeTest(name)} className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label={`Remove ${name}`}>
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  })
                ) : (
                  <li className={`px-4 py-10 text-center text-sm ${ui.muted}`}>No tests yet. Click ➕ on a test in the middle list to add it.</li>
                )}
              </ol>
              <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-sm dark:border-slate-800">
                <span className={ui.muted}>Tests total ₹{profileTotal}</span>
                <span className="font-semibold">Profile rate ₹{selected.offerRate || selected.amount || 0}</span>
              </footer>
            </>
          ) : (
            <div className={`flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm ${ui.muted}`}>
              <SlidersHorizontal className="h-8 w-8 text-slate-300" />
              Click 👉 on a profile to see and change its tests.
            </div>
          )}
        </Column>
      </div>
    </div>
  )
}

export default ProfileSetting
