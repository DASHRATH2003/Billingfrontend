import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertCircle,
  Banknote,
  CalendarDays,
  Check,
  FileText,
  IndianRupee,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sun,
  TestTube2,
  Trash2,
  Users,
} from 'lucide-react'
import { TESTS_STORAGE_KEY, getDefaultPathologyTests, getPathologyTests, resetPathologyTests, savePathologyTests } from '../data/pathologyTests.js'

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatDate = (value) => {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const THEME_KEY = 'billing_theme'

const getInitialDarkMode = () => {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark') return true
  if (saved === 'light') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

const StatCard = ({ icon, label, value, tone }) => {
  const CardIcon = icon

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${tone}`}>
          <CardIcon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

const getBillDate = (bill) => {
  const value = bill?.meta?.billingDateTime || bill?.createdAt || bill?.updatedAt
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const isSameDay = (a, b) => {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

const buildPatientKey = (patient = {}) => {
  const mobile = String(patient.mobile || '').trim()
  if (mobile) return mobile
  return String(patient.name || '').trim().toLowerCase()
}

const Dashboard = ({ apiBase, onLogout, onCreateBill, onPrintBill }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)
  const [stats, setStats] = useState(null)
  const [recentBills, setRecentBills] = useState([])
  const [recentSearch, setRecentSearch] = useState('')
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')

  const [allBills, setAllBills] = useState([])
  const [allBillsLoading, setAllBillsLoading] = useState(false)
  const [allBillsError, setAllBillsError] = useState('')

  const [historySearch, setHistorySearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentFrom, setPaymentFrom] = useState('')
  const [paymentTo, setPaymentTo] = useState('')
  const [testsSearch, setTestsSearch] = useState('')
  const [testsDraft, setTestsDraft] = useState([])
  const [testsDirty, setTestsDirty] = useState(false)
  const [editingTestIndex, setEditingTestIndex] = useState(null)
  const [editingTestAmount, setEditingTestAmount] = useState('')
  const [newTestName, setNewTestName] = useState('')
  const [newTestAmount, setNewTestAmount] = useState('')
  const [newTestError, setNewTestError] = useState('')

  useEffect(() => {
    const root = document.documentElement
    if (darkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light')
  }, [darkMode])

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError('')

    try {
      const [statsResponse, billsResponse] = await Promise.all([
        fetch(`${apiBase}/bills/dashboard`),
        fetch(`${apiBase}/bills?limit=8`),
      ])

      if (!statsResponse.ok || !billsResponse.ok) {
        throw new Error('Dashboard data is not available')
      }

      const statsData = await statsResponse.json()
      const billsData = await billsResponse.json()
      setStats(statsData)
      setRecentBills(Array.isArray(billsData.bills) ? billsData.bills : [])
    } catch (err) {
      setOverviewError(err.message || 'Unable to load dashboard')
    } finally {
      setOverviewLoading(false)
    }
  }, [apiBase])

  const loadAllBills = useCallback(async () => {
    setAllBillsLoading(true)
    setAllBillsError('')

    try {
      const response = await fetch(`${apiBase}/bills?limit=200`)
      if (!response.ok) {
        throw new Error('Billing history is not available')
      }
      const payload = await response.json()
      setAllBills(Array.isArray(payload.bills) ? payload.bills : [])
    } catch (err) {
      setAllBillsError(err.message || 'Unable to load billing history')
    } finally {
      setAllBillsLoading(false)
    }
  }, [apiBase])

  const loadTestsFromServer = useCallback(
    async (onLoaded) => {
      try {
        const defaults = getDefaultPathologyTests()
        const fallbackLocal = getPathologyTests()
        const response = await fetch(`${apiBase}/tests`)
        if (!response.ok) {
          onLoaded(fallbackLocal)
          return
        }

        const payload = await response.json()
        const tests = Array.isArray(payload?.tests) ? payload.tests : []
        const hasStoredLocalTests = Boolean(localStorage.getItem(TESTS_STORAGE_KEY))
        const local = hasStoredLocalTests ? getPathologyTests() : []
        const cleanName = (value) => String(value || '').trim()
        const cleanAmount = (value) => Math.max(0, Number(value) || 0)
        const defaultMap = new Map(defaults.map((t) => [cleanName(t?.name), cleanAmount(t?.amount)]).filter(([name]) => name))
        const serverMap = new Map(tests.map((t) => [cleanName(t?.name), cleanAmount(t?.amount)]).filter(([name]) => name))
        const localMap = new Map(local.map((t) => [cleanName(t?.name), cleanAmount(t?.amount)]).filter(([name]) => name))

        const allNames = new Set(
          serverMap.size
            ? [...serverMap.keys(), ...localMap.keys()]
            : [...defaultMap.keys(), ...localMap.keys()],
        )

        const merged = Array.from(allNames)
          .map((name) => ({
            name,
            amount: localMap.has(name) ? localMap.get(name) : serverMap.has(name) ? serverMap.get(name) : defaultMap.get(name) || 0,
          }))
          .filter((t) => t.name)

        if (merged.length && serverMap.size < merged.length) {
          const seedResponse = await fetch(`${apiBase}/tests`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tests: merged }),
          })

          if (seedResponse.ok) {
            const seededPayload = await seedResponse.json()
            const seeded = Array.isArray(seededPayload?.tests) ? seededPayload.tests : merged
            onLoaded(savePathologyTests(seeded))
            return
          }
        }

        onLoaded(savePathologyTests(merged))
      } catch {
        onLoaded(getPathologyTests())
      }
    },
    [apiBase],
  )

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'tests') return
    if (allBillsLoading) return
    if (allBills.length) return
    loadAllBills()
  }, [activeTab, allBills.length, allBillsLoading, loadAllBills])

  useEffect(() => {
    if (activeTab !== 'tests') return
    let isActive = true

    loadTestsFromServer((tests) => {
      if (!isActive) return
      setTestsDraft(tests)
    })
    setTestsSearch('')
    setTestsDirty(false)
    setEditingTestIndex(null)
    setEditingTestAmount('')
    setNewTestName('')
    setNewTestAmount('')
    setNewTestError('')
    return () => {
      isActive = false
    }
  }, [activeTab, loadTestsFromServer])

  const handleRefresh = () => {
    loadOverview()
    if (activeTab !== 'overview' && activeTab !== 'tests') {
      loadAllBills()
    }
    if (activeTab === 'tests') {
      loadTestsFromServer((tests) => setTestsDraft(tests))
      setTestsDirty(false)
      setEditingTestIndex(null)
      setEditingTestAmount('')
      setNewTestName('')
      setNewTestAmount('')
      setNewTestError('')
    }
  }

  const navItems = useMemo(
    () => [
      { key: 'overview', label: 'Dashboard', icon: FileText },
      { key: 'history', label: 'Billing History', icon: FileText },
      { key: 'patients', label: 'Patient List', icon: Users },
      { key: 'payments', label: 'Payment Report', icon: Banknote },
      { key: 'tests', label: 'Test Price', icon: TestTube2 },
    ],
    [],
  )

  const selectedTab = navItems.find((item) => item.key === activeTab) || navItems[0]

  const recentFilteredBills = useMemo(() => {
    const query = recentSearch.trim().toLowerCase()
    if (!query) return recentBills

    return recentBills.filter((bill) => {
      const patient = bill.patient || {}
      return [bill.id, patient.name, patient.mobile, patient.refBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [recentBills, recentSearch])

  const dailyRevenue = Array.isArray(stats?.dailyRevenue) ? stats.dailyRevenue : []
  const topTests = Array.isArray(stats?.topTests) ? stats.topTests : []
  const maxDailyAmount = Math.max(...dailyRevenue.map((day) => Number(day.amount) || 0), 1)
  const maxTestCount = Math.max(...topTests.map((test) => Number(test.count) || 0), 1)

  const billHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase()
    if (!query) return allBills

    return allBills.filter((bill) => {
      const patient = bill.patient || {}
      return [bill.id, patient.name, patient.mobile, patient.refBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [allBills, historySearch])

  const patientRows = useMemo(() => {
    const map = new Map()
    for (const bill of allBills) {
      const patient = bill.patient || {}
      const key = buildPatientKey(patient)
      if (!key) continue

      const current = map.get(key) || {
        key,
        name: patient.name || 'Unnamed',
        mobile: patient.mobile || '',
        refBy: patient.refBy || '',
        visits: 0,
        totalNet: 0,
        totalReceived: 0,
        totalDues: 0,
        lastVisitAt: null,
      }

      current.visits += 1
      current.totalNet += Number(bill.netAmount) || 0
      current.totalReceived += Number(bill.receivedAmt) || 0
      current.totalDues += Number(bill.duesAmt) || 0

      const date = getBillDate(bill)
      if (date && (!current.lastVisitAt || date > current.lastVisitAt)) {
        current.lastVisitAt = date
      }

      map.set(key, current)
    }

    const query = patientSearch.trim().toLowerCase()
    const rows = Array.from(map.values())
    const filtered = query
      ? rows.filter((row) => [row.name, row.mobile, row.refBy].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)))
      : rows

    return filtered.sort((a, b) => {
      const aTime = a.lastVisitAt ? a.lastVisitAt.getTime() : 0
      const bTime = b.lastVisitAt ? b.lastVisitAt.getTime() : 0
      return bTime - aTime
    })
  }, [allBills, patientSearch])

  const todayPatientsCount = useMemo(() => {
    const today = new Date()
    const keys = new Set()
    for (const bill of allBills) {
      const date = getBillDate(bill)
      if (!date || !isSameDay(date, today)) continue
      const key = buildPatientKey(bill.patient)
      if (key) keys.add(key)
    }
    return keys.size
  }, [allBills])

  const paymentRows = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase()
    const filteredByText = query
      ? allBills.filter((bill) => {
          const patient = bill.patient || {}
          return [bill.id, patient.name, patient.mobile, patient.refBy]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query))
        })
      : allBills

    const start = paymentFrom ? new Date(`${paymentFrom}T00:00:00`) : null
    const end = paymentTo ? new Date(`${paymentTo}T23:59:59`) : null

    return filteredByText.filter((bill) => {
      if (!start && !end) return true
      const date = getBillDate(bill)
      if (!date) return false
      if (start && date < start) return false
      if (end && date > end) return false
      return true
    })
  }, [allBills, paymentFrom, paymentSearch, paymentTo])

  const paymentTotals = useMemo(() => {
    return paymentRows.reduce(
      (acc, bill) => {
        acc.net += Number(bill.netAmount) || 0
        acc.received += Number(bill.receivedAmt) || 0
        acc.dues += Number(bill.duesAmt) || 0
        return acc
      },
      { net: 0, received: 0, dues: 0 },
    )
  }, [paymentRows])

  const historyTotals = useMemo(() => {
    return allBills.reduce(
      (acc, bill) => {
        acc.net += Number(bill.netAmount) || 0
        acc.received += Number(bill.receivedAmt) || 0
        acc.dues += Number(bill.duesAmt) || 0
        return acc
      },
      { net: 0, received: 0, dues: 0 },
    )
  }, [allBills])

  const filteredTests = useMemo(() => {
    const query = testsSearch.trim().toLowerCase()
    const rows = testsDraft.map((test, index) => ({ test, index }))
    if (!query) return rows
    return rows.filter((row) => String(row.test?.name || '').toLowerCase().includes(query))
  }, [testsDraft, testsSearch])

  const handleResetTests = useCallback(async () => {
    resetPathologyTests()
    const defaults = getDefaultPathologyTests()
    setTestsDraft(defaults)
    setTestsSearch('')
    setNewTestError('')
    setTestsDirty(true)
    try {
      const response = await fetch(`${apiBase}/tests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tests: defaults }),
      })
      if (response.ok) {
        const payload = await response.json()
        const serverTests = Array.isArray(payload?.tests) ? payload.tests : defaults
        const saved = savePathologyTests(serverTests)
        setTestsDraft(saved)
        setTestsDirty(false)
      }
    } catch {
      setTestsDirty(true)
    }
  }, [apiBase])

  const handleAddTest = useCallback(async (event) => {
    event.preventDefault()

    const name = newTestName.trim()
    const amount = Math.max(0, Number(newTestAmount) || 0)

    if (!name) {
      setNewTestError('Enter test name.')
      return
    }

    const alreadyExists = testsDraft.some((test) => String(test?.name || '').trim().toLowerCase() === name.toLowerCase())
    if (alreadyExists) {
      setNewTestError('This test already exists.')
      return
    }

    const next = [...testsDraft, { name, amount }].sort((a, b) => String(a.name).localeCompare(String(b.name)))
    const localSaved = savePathologyTests(next)
    setTestsDraft(localSaved)
    setTestsSearch('')
    setNewTestName('')
    setNewTestAmount('')
    setNewTestError('')

    let savedToDb = false
    try {
      const response = await fetch(`${apiBase}/tests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tests: [{ name, amount }] }),
      })

      if (response.ok) {
        const payload = await response.json()
        const serverTests = Array.isArray(payload?.tests) ? payload.tests : localSaved
        setTestsDraft(savePathologyTests(serverTests))
        savedToDb = true
      }
    } catch {
      savedToDb = false
    }

    setTestsDirty(!savedToDb)
    if (!savedToDb) {
      setNewTestError('Saved locally. Refresh after backend sync is available.')
    }
  }, [apiBase, newTestAmount, newTestName, testsDraft])

  const handleEditTestRow = useCallback((index) => {
    const current = testsDraft[index]
    setEditingTestIndex(index)
    setEditingTestAmount(current?.amount === 0 ? '0' : String(current?.amount ?? ''))
    setTestsDirty(true)
  }, [testsDraft])

  const handleSaveTestRow = useCallback(async () => {
    if (editingTestIndex === null) return
    const current = testsDraft[editingTestIndex]
    if (!current?.name) return

    const amount = Math.max(0, Number(editingTestAmount) || 0)

    const next = [...testsDraft]
    next[editingTestIndex] = { ...current, amount }
    setTestsDraft(next)

    const localSaved = savePathologyTests(next)
    setTestsDraft(localSaved)

    let savedToDb = false
    try {
      const response = await fetch(`${apiBase}/tests`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tests: [{ name: current.name, amount }] }),
      })
      savedToDb = response.ok
    } catch {
      savedToDb = false
    }

    setEditingTestIndex(null)
    setEditingTestAmount('')
    setTestsDirty(!savedToDb)
  }, [apiBase, editingTestAmount, editingTestIndex, testsDraft])

  const handleDeleteTestRow = useCallback(async (index) => {
    const current = testsDraft[index]
    const name = String(current?.name || '').trim()
    if (!name) return

    const shouldDelete = window.confirm(`Delete "${name}" from test prices?`)
    if (!shouldDelete) return

    const next = testsDraft.filter((_, itemIndex) => itemIndex !== index)
    const localSaved = savePathologyTests(next)
    setTestsDraft(localSaved)
    setEditingTestIndex(null)
    setEditingTestAmount('')

    let deletedFromDb = false
    try {
      const response = await fetch(`${apiBase}/tests/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const payload = await response.json()
        const serverTests = Array.isArray(payload?.tests) ? payload.tests : localSaved
        setTestsDraft(savePathologyTests(serverTests))
        deletedFromDb = true
      }
    } catch {
      deletedFromDb = false
    }

    setTestsDirty(!deletedFromDb)
    if (!deletedFromDb) {
      setNewTestError('Deleted locally. Backend delete did not complete.')
    }
  }, [apiBase, testsDraft])

  const todayStatsPatients = Number(stats?.today?.patientsToday)
  const patientsTodayValue = Number.isFinite(todayStatsPatients) && todayStatsPatients > 0 ? todayStatsPatients : todayPatientsCount

  const SidebarButton = ({ item }) => {
    const Icon = item.icon
    const isActive = item.key === activeTab
    return (
      <button
        type="button"
        onClick={() => setActiveTab(item.key)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
          isActive
            ? 'bg-gray-100 font-semibold text-gray-900 dark:bg-slate-800/60 dark:text-slate-100'
            : 'font-medium text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/40'
        }`}
      >
        <Icon className={`h-4 w-4 ${isActive ? 'text-gray-700 dark:text-slate-200' : 'text-gray-500 dark:text-slate-400'}`} />
        {item.label}
      </button>
    )
  }

  const isDataLoading = activeTab === 'overview' ? overviewLoading : activeTab === 'tests' ? false : allBillsLoading
  const currentError = activeTab === 'overview' ? overviewError : activeTab === 'tests' ? '' : allBillsError

  return (
    <div className="min-h-screen bg-gray-100 md:flex md:h-screen md:overflow-hidden dark:bg-slate-950">
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white md:flex md:sticky md:top-0 md:h-screen dark:border-slate-800 dark:bg-slate-900">
        <div className="px-5 py-4">
          <div className="text-lg font-bold text-gray-900 dark:text-slate-100">Payment Report</div>
          <div className="text-sm text-gray-500 dark:text-slate-400">{selectedTab.label}</div>
        </div>

        <div className="px-3">
          <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Options</div>
          <nav className="space-y-1">
            <button
              type="button"
              onClick={onCreateBill}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800/40"
            >
              <Plus className="h-4 w-4 text-gray-600 dark:text-slate-300" />
              Create Bill
            </button>
            {navItems.map((item) => (
              <SidebarButton key={item.key} item={item} />
            ))}
            <button
              type="button"
              onClick={handleRefresh}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-slate-800/40"
            >
              <RefreshCw className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              Refresh
            </button>
          </nav>
        </div>

        <div className="mt-auto border-t border-gray-100 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 p-4 md:h-screen md:overflow-y-auto md:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">{selectedTab.label}</h1>
              {activeTab === 'overview' ? (
                <p className="mt-1 text-gray-600 dark:text-slate-300">Revenue, dues, patient count, and recent laboratory bills.</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <div className="grid grid-cols-1 gap-2 md:hidden">
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                  value={activeTab}
                  onChange={(event) => setActiveTab(event.target.value)}
                >
                  {navItems.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onCreateBill}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Bill
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDarkMode((value) => !value)}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                >
                  {darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  {darkMode ? 'Light' : 'Dark'}
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {currentError ? (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <div className="flex items-center font-semibold">
                <AlertCircle className="mr-2 h-5 w-5" />
                {currentError}
              </div>
              <p className="mt-1 text-sm text-red-700 dark:text-red-200">Start the backend server on port 5000, then refresh this page.</p>
            </div>
          ) : null}

          {activeTab === 'overview' ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={FileText}
                  label="Total Bills"
                  value={overviewLoading ? '...' : stats?.totals?.totalBills || 0}
                  tone="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                />
                <StatCard
                  icon={Users}
                  label="Total Patients"
                  value={overviewLoading ? '...' : stats?.totals?.totalPatients || 0}
                  tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200"
                />
                <StatCard
                  icon={IndianRupee}
                  label="Net Revenue"
                  value={overviewLoading ? '...' : formatCurrency(stats?.totals?.netAmount)}
                  tone="bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-200"
                />
                <StatCard
                  icon={Banknote}
                  label="Pending Dues"
                  value={overviewLoading ? '...' : formatCurrency(stats?.totals?.duesAmount)}
                  tone="bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Last 7 Days Revenue</h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Daily bill count and net amount</p>
                    </div>
                    <CalendarDays className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>

                  <div className="space-y-3">
                    {dailyRevenue.length ? dailyRevenue.map((day) => (
                      <div key={day.date} className="grid grid-cols-[90px_1fr_110px] items-center gap-3">
                        <div className="text-sm font-medium text-gray-600 dark:text-slate-300">{day.date}</div>
                        <div className="h-3 rounded-full bg-gray-100 dark:bg-slate-800">
                          <div
                            className="h-3 rounded-full bg-blue-600"
                            style={{ width: `${Math.max(6, ((Number(day.amount) || 0) / maxDailyAmount) * 100)}%` }}
                          />
                        </div>
                        <div className="text-right text-sm font-semibold text-gray-800 dark:text-slate-200">
                          {formatCurrency(day.amount)}
                          <span className="ml-2 text-gray-400 dark:text-slate-500">({day.bills})</span>
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500 dark:bg-slate-800/60 dark:text-slate-400">No revenue data yet.</div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Popular Tests</h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Most billed test items</p>
                    </div>
                    <TestTube2 className="h-5 w-5 text-gray-400 dark:text-slate-500" />
                  </div>

                  <div className="space-y-3">
                    {topTests.length ? topTests.map((test) => (
                      <div key={test.name}>
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span className="font-medium text-gray-700 dark:text-slate-200">{test.name}</span>
                          <span className="text-gray-500 dark:text-slate-400">{test.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${Math.max(8, ((Number(test.count) || 0) / maxTestCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )) : (
                      <div className="rounded-lg bg-gray-50 p-6 text-center text-gray-500 dark:bg-slate-800/60 dark:text-slate-400">No test data yet.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-200">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-slate-400">Bills Today</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{overviewLoading ? '...' : stats?.today?.billsToday || 0}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-slate-400">Patients Today</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-slate-100">{overviewLoading ? '...' : patientsTodayValue}</p>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 dark:border-slate-800">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-slate-400">Net Today</span>
                          <span className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(stats?.today?.revenueToday)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-slate-400">Received Today</span>
                          <span className="font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(stats?.today?.receivedToday)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-slate-400">Dues Today</span>
                          <span className="font-semibold text-rose-700 dark:text-rose-300">{formatCurrency(stats?.today?.duesToday)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-gray-200 p-4 dark:border-slate-800">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Recent Bills</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Latest saved billing records</p>
                      </div>
                      <div className="relative w-full md:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                          placeholder="Search bills"
                          value={recentSearch}
                          onChange={(event) => setRecentSearch(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left">
                      <thead className="bg-gray-50 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-200">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Bill ID</th>
                          <th className="px-4 py-3 font-semibold">Patient</th>
                          <th className="px-4 py-3 font-semibold">Tests</th>
                          <th className="px-4 py-3 text-right font-semibold">Net Amount</th>
                          <th className="px-4 py-3 text-right font-semibold">Received</th>
                          <th className="px-4 py-3 text-right font-semibold">Dues</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {recentFilteredBills.length ? recentFilteredBills.map((bill) => (
                          <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{bill.id}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-800 dark:text-slate-100">{bill.patient?.name || 'Unnamed'}</div>
                              <div className="text-sm text-gray-500 dark:text-slate-400">{bill.patient?.mobile || 'No mobile'}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{Array.isArray(bill.items) ? bill.items.length : 0}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(bill.netAmount)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(bill.receivedAmt)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-rose-700 dark:text-rose-300">{formatCurrency(bill.duesAmt)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{formatDate(bill.meta?.billingDateTime || bill.createdAt)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-slate-400">
                              {overviewLoading ? 'Loading bills...' : 'No bills found.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {activeTab === 'history' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={FileText}
                  label="Bills (loaded)"
                  value={isDataLoading ? '...' : billHistory.length}
                  tone="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                />
                <StatCard
                  icon={IndianRupee}
                  label="Net Total"
                  value={isDataLoading ? '...' : formatCurrency(historyTotals.net)}
                  tone="bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-200"
                />
                <StatCard
                  icon={Banknote}
                  label="Received Total"
                  value={isDataLoading ? '...' : formatCurrency(historyTotals.received)}
                  tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200"
                />
                <StatCard
                  icon={Banknote}
                  label="Dues Total"
                  value={isDataLoading ? '...' : formatCurrency(historyTotals.dues)}
                  tone="bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-gray-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Billing History</h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Search and review saved bills.</p>
                    </div>
                    <div className="relative w-full md:w-80">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                        placeholder="Search by bill, patient, mobile, ref by"
                        value={historySearch}
                        onChange={(event) => setHistorySearch(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1080px] text-left">
                    <thead className="bg-gray-50 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Bill ID</th>
                        <th className="px-4 py-3 font-semibold">Patient</th>
                        <th className="px-4 py-3 font-semibold">Tests</th>
                        <th className="px-4 py-3 text-right font-semibold">Net</th>
                        <th className="px-4 py-3 text-right font-semibold">Received</th>
                        <th className="px-4 py-3 text-right font-semibold">Dues</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {billHistory.length ? billHistory.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{bill.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800 dark:text-slate-100">{bill.patient?.name || 'Unnamed'}</div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">{bill.patient?.mobile || 'No mobile'}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{Array.isArray(bill.items) ? bill.items.length : 0}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(bill.netAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(bill.receivedAmt)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-700 dark:text-rose-300">{formatCurrency(bill.duesAmt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{formatDate(bill.meta?.billingDateTime || bill.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => onPrintBill?.(bill)}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                              >
                                <Printer className="h-4 w-4" />
                                Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-10 text-center text-gray-500 dark:text-slate-400">
                            {isDataLoading ? 'Loading bills...' : 'No bills found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'patients' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={Users}
                  label="Patients (unique)"
                  value={isDataLoading ? '...' : patientRows.length}
                  tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200"
                />
                <StatCard
                  icon={Activity}
                  label="Patients Today"
                  value={isDataLoading ? '...' : patientsTodayValue}
                  tone="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/25 dark:text-indigo-200"
                />
                <StatCard
                  icon={IndianRupee}
                  label="Net Total"
                  value={isDataLoading ? '...' : formatCurrency(historyTotals.net)}
                  tone="bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-200"
                />
                <StatCard
                  icon={Banknote}
                  label="Dues Total"
                  value={isDataLoading ? '...' : formatCurrency(historyTotals.dues)}
                  tone="bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-gray-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Patient List</h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Unique patient list from saved bills.</p>
                    </div>
                    <div className="relative w-full md:w-80">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                        placeholder="Search patient name / mobile / ref"
                        value={patientSearch}
                        onChange={(event) => setPatientSearch(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1060px] text-left">
                    <thead className="bg-gray-50 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Patient</th>
                        <th className="px-4 py-3 font-semibold">Mobile</th>
                        <th className="px-4 py-3 font-semibold">Ref By</th>
                        <th className="px-4 py-3 text-right font-semibold">Visits</th>
                        <th className="px-4 py-3 text-right font-semibold">Net Total</th>
                        <th className="px-4 py-3 text-right font-semibold">Received</th>
                        <th className="px-4 py-3 text-right font-semibold">Dues</th>
                        <th className="px-4 py-3 font-semibold">Last Visit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {patientRows.length ? patientRows.map((row) => (
                        <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{row.name}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{row.mobile || '-'}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-slate-200">{row.refBy || '-'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{row.visits}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(row.totalNet)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(row.totalReceived)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-700 dark:text-rose-300">{formatCurrency(row.totalDues)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{row.lastVisitAt ? formatDate(row.lastVisitAt) : 'No date'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="8" className="px-4 py-10 text-center text-gray-500 dark:text-slate-400">
                            {isDataLoading ? 'Loading patients...' : 'No patients found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'payments' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={Banknote}
                  label="Net (filtered)"
                  value={isDataLoading ? '...' : formatCurrency(paymentTotals.net)}
                  tone="bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-200"
                />
                <StatCard
                  icon={Banknote}
                  label="Received (filtered)"
                  value={isDataLoading ? '...' : formatCurrency(paymentTotals.received)}
                  tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200"
                />
                <StatCard
                  icon={Banknote}
                  label="Dues (filtered)"
                  value={isDataLoading ? '...' : formatCurrency(paymentTotals.dues)}
                  tone="bg-rose-50 text-rose-700 dark:bg-rose-900/25 dark:text-rose-200"
                />
                <StatCard
                  icon={FileText}
                  label="Bills (filtered)"
                  value={isDataLoading ? '...' : paymentRows.length}
                  tone="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-gray-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Payment History Report</h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Filter by date range and search bills.</p>
                    </div>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                          value={paymentFrom}
                          onChange={(event) => setPaymentFrom(event.target.value)}
                        />
                        <span className="text-sm text-gray-400 dark:text-slate-500">to</span>
                        <input
                          type="date"
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                          value={paymentTo}
                          onChange={(event) => setPaymentTo(event.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date()
                            const yyyy = today.getFullYear()
                            const mm = String(today.getMonth() + 1).padStart(2, '0')
                            const dd = String(today.getDate()).padStart(2, '0')
                            const value = `${yyyy}-${mm}-${dd}`
                            setPaymentFrom(value)
                            setPaymentTo(value)
                          }}
                          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentFrom('')
                            setPaymentTo('')
                          }}
                          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="relative w-full md:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                          placeholder="Search by bill, patient, mobile, ref"
                          value={paymentSearch}
                          onChange={(event) => setPaymentSearch(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-left">
                    <thead className="bg-gray-50 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Bill ID</th>
                        <th className="px-4 py-3 font-semibold">Patient</th>
                        <th className="px-4 py-3 text-right font-semibold">Net</th>
                        <th className="px-4 py-3 text-right font-semibold">Received</th>
                        <th className="px-4 py-3 text-right font-semibold">Dues</th>
                        <th className="px-4 py-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {paymentRows.length ? paymentRows.map((bill) => (
                        <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{bill.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800 dark:text-slate-100">{bill.patient?.name || 'Unnamed'}</div>
                            <div className="text-sm text-gray-500 dark:text-slate-400">{bill.patient?.mobile || 'No mobile'}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(bill.netAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">{formatCurrency(bill.receivedAmt)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-rose-700 dark:text-rose-300">{formatCurrency(bill.duesAmt)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-300">{formatDate(bill.meta?.billingDateTime || bill.createdAt)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="6" className="px-4 py-10 text-center text-gray-500 dark:text-slate-400">
                            {isDataLoading ? 'Loading payments...' : 'No payments found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'tests' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={TestTube2}
                  label="Total Tests"
                  value={testsDraft.length}
                  tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-200"
                />
                <StatCard
                  icon={FileText}
                  label="Unsaved Changes"
                  value={testsDirty ? 'Yes' : 'No'}
                  tone="bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-200"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-gray-200 p-4 dark:border-slate-800">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Test Master</h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400">Add tests and edit prices (these prices show in Create Bill).</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="relative w-full sm:w-80">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                        <input
                          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                          placeholder="Search test"
                          value={testsSearch}
                          onChange={(event) => setTestsSearch(event.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleResetTests}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                  <form onSubmit={handleAddTest} className="mt-4 grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-[1fr_180px_auto] md:items-start dark:border-slate-800 dark:bg-slate-950/50">
                    <div>
                      <label className="sr-only" htmlFor="new-test-name">Test name</label>
                      <input
                        id="new-test-name"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                        placeholder="New test name"
                        value={newTestName}
                        onChange={(event) => {
                          setNewTestName(event.target.value)
                          setNewTestError('')
                        }}
                      />
                      {newTestError ? (
                        <p className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-300">{newTestError}</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="sr-only" htmlFor="new-test-amount">Price</label>
                      <input
                        id="new-test-amount"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-right text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-900/40"
                        placeholder="Price"
                        value={newTestAmount}
                        onChange={(event) => setNewTestAmount(event.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Add Test
                    </button>
                  </form>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left">
                    <thead className="bg-gray-50 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Test Name</th>
                        <th className="px-4 py-3 text-right font-semibold">Price (₹)</th>
                        <th className="px-4 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                      {filteredTests.length ? filteredTests.map((row) => (
                        <tr
                          key={`${row.index}-${row.test?.name || ''}`}
                          className="group transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{row.test?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                inputMode="numeric"
                                min="0"
                                disabled={editingTestIndex !== row.index}
                                className={`w-36 appearance-none rounded-xl border px-3 py-2 text-right text-sm outline-none transition ${
                                  editingTestIndex === row.index
                                    ? 'border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-900/40'
                                    : 'border-transparent bg-transparent text-gray-900 group-hover:border-gray-200 dark:text-slate-100 dark:group-hover:border-slate-700'
                                }`}
                                value={editingTestIndex === row.index ? editingTestAmount : String(row.test?.amount ?? '')}
                                onChange={(event) => setEditingTestAmount(event.target.value)}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {editingTestIndex === row.index ? (
                                <button
                                  type="button"
                                  onClick={handleSaveTestRow}
                                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                >
                                  <Check className="h-4 w-4" />
                                  Save
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleEditTestRow(row.index)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/40"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTestRow(row.index)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="3" className="px-4 py-10 text-center text-gray-500 dark:text-slate-400">
                            No tests found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
