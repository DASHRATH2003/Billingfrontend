import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Accessibility,
  AlertCircle,
  Banknote,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Check,
  FileText,
  FlaskConical,
  Gauge,
  IndianRupee,
  LayoutDashboard,
  List,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sun,
  TestTube2,
  UserCog,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import logo from '../assets/logo.png'
import Panel from '../components/Panel.jsx'
import { authFetch } from '../lib/api.js'
import PatientReport from './PatientReport.jsx'
import PatientsPage from './PatientsPage.jsx'
import UsersPage from './UsersPage.jsx'
import TestEntry from './TestEntry.jsx'
import TestList from './TestList.jsx'
import TestProfile from './TestProfile.jsx'
import ProfileSetting from './ProfileSetting.jsx'
import PatientReg from './PatientReg.jsx'
import TestRequestList from './TestRequestList.jsx'
import PrintList from './PrintList.jsx'
import ResultEntry from './ResultEntry.jsx'
import { TESTS_STORAGE_KEY, getDefaultPathologyTests, getPathologyTests, savePathologyTests } from '../data/pathologyTests.js'
import { useDarkMode } from '../lib/theme.js'
import { ACCENTS, LAB_NAME, ui } from '../lib/ui.js'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)

const formatCompactCurrency = (value) => {
  const n = Number(value) || 0
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

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

const toInputDate = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

const matchesBillQuery = (bill, query) => {
  if (!query) return true
  const patient = bill.patient || {}
  return [bill.id, patient.name, patient.mobile, patient.refBy]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query))
}

const sumBills = (bills) =>
  bills.reduce(
    (acc, bill) => {
      acc.net += Number(bill.netAmount) || 0
      acc.received += Number(bill.receivedAmt) || 0
      acc.dues += Number(bill.duesAmt) || 0
      return acc
    },
    { net: 0, received: 0, dues: 0 },
  )


/* ------------------------------------------------------------------ */
/* Small components                                                    */
/* ------------------------------------------------------------------ */

const StatCard = ({ icon, label, value, hint, accent = 'blue', loading }) => {
  const Icon = icon
  return (
  <div className={`${ui.card} p-5`}>
    <div className="flex items-center justify-between gap-3">
      <p className={`text-sm font-medium ${ui.muted}`}>{label}</p>
      <span className={`rounded-xl p-2 ${ACCENTS[accent]}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    {loading ? (
      <div className="mt-3 h-8 w-28 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
    ) : (
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-slate-50">{value}</p>
    )}
    {hint ? <p className={`mt-1 text-xs ${ui.muted}`}>{hint}</p> : null}
  </div>
  )
}

const SearchBox = ({ value, onChange, placeholder, className = 'w-full md:w-72' }) => (
  <div className={`relative ${className}`}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input className={`${ui.input} pl-9`} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
)

const StatusPill = ({ dues }) => {
  const amount = Number(dues) || 0
  return amount > 0 ? (
    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
      Due {formatCurrency(amount)}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
      Paid
    </span>
  )
}

const EmptyRow = ({ colSpan, children }) => (
  <tr>
    <td colSpan={colSpan} className={`px-4 py-12 text-center text-sm ${ui.muted}`}>
      {children}
    </td>
  </tr>
)

const BillsTable = ({ bills, loading, onPrint, showTests = true, emptyText = 'No bills found.' }) => {
  const colSpan = 6 + (showTests ? 1 : 0) + (onPrint ? 1 : 0)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            <th className={ui.th}>Bill</th>
            <th className={ui.th}>Patient</th>
            {showTests ? <th className={`${ui.th} text-center`}>Tests</th> : null}
            <th className={`${ui.th} text-right`}>Net</th>
            <th className={`${ui.th} text-right`}>Received</th>
            <th className={ui.th}>Status</th>
            <th className={ui.th}>Date</th>
            {onPrint ? <th className={`${ui.th} text-right`}>Action</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {bills.length ? (
            bills.map((bill) => (
              <tr key={bill.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className={`${ui.td} font-mono text-xs font-semibold text-slate-700 dark:text-slate-300`}>{bill.id}</td>
                <td className={ui.td}>
                  <div className="font-medium text-slate-900 dark:text-slate-100">{bill.patient?.name || 'Unnamed'}</div>
                  <div className={`text-xs ${ui.muted}`}>
                    {bill.patient?.mobile || 'No mobile'}
                    {bill.patient?.refBy ? ` · Ref: ${bill.patient.refBy}` : ''}
                  </div>
                </td>
                {showTests ? (
                  <td className={`${ui.td} text-center text-slate-700 dark:text-slate-300`}>{Array.isArray(bill.items) ? bill.items.length : 0}</td>
                ) : null}
                <td className={`${ui.td} text-right font-semibold tabular-nums text-slate-900 dark:text-slate-100`}>{formatCurrency(bill.netAmount)}</td>
                <td className={`${ui.td} text-right tabular-nums text-slate-700 dark:text-slate-300`}>{formatCurrency(bill.receivedAmt)}</td>
                <td className={ui.td}>
                  <StatusPill dues={bill.duesAmt} />
                </td>
                <td className={`${ui.td} whitespace-nowrap ${ui.muted}`}>{formatDate(bill.meta?.billingDateTime || bill.createdAt)}</td>
                {onPrint ? (
                  <td className={ui.td}>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => onPrint(bill)} className={`${ui.btn} px-2.5 py-1.5`} title="Print bill">
                        <Printer className="h-4 w-4" />
                        Print
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))
          ) : (
            <EmptyRow colSpan={colSpan}>{loading ? 'Loading bills…' : emptyText}</EmptyRow>
          )}
        </tbody>
      </table>
    </div>
  )
}

/** Vertical bar chart for the last 7 days. Days without bills are shown as zero. */
const RevenueChart = ({ rows }) => {
  const days = useMemo(() => {
    const byDate = new Map(rows.map((row) => [row.date, row]))
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i))
      const key = toInputDate(date)
      const row = byDate.get(key)
      return {
        key,
        label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date),
        dayNum: date.getDate(),
        amount: Number(row?.amount) || 0,
        bills: Number(row?.bills) || 0,
        isToday: i === 6,
      }
    })
  }, [rows])

  const max = Math.max(...days.map((d) => d.amount), 1)

  return (
    <div className="flex h-56 items-end gap-2 sm:gap-4">
      {days.map((day) => (
        <div key={day.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300">
            {day.amount ? formatCompactCurrency(day.amount) : ''}
          </span>
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              title={`${day.key}: ${formatCurrency(day.amount)} · ${day.bills} bill${day.bills === 1 ? '' : 's'}`}
              className={`w-full max-w-[44px] rounded-t-md transition-all group-hover:opacity-80 ${
                day.isToday ? 'bg-blue-600 dark:bg-blue-500' : 'bg-blue-200 dark:bg-blue-900'
              }`}
              style={{ height: `${day.amount ? Math.max(4, (day.amount / max) * 100) : 1.5}%` }}
            />
          </div>
          <div className="text-center leading-tight">
            <div className={`text-xs font-medium ${day.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{day.label}</div>
            <div className="text-[11px] text-slate-400">{day.dayNum}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Sidebar menu. An entry is a page ({ key }) or a group ({ group, children }) that opens and closes. */
const MENU = [
  { key: 'overview', label: 'Overview', title: 'Overview', subtitle: 'Today at a glance, revenue trend and latest bills.', icon: LayoutDashboard },
  { key: 'dashboard', label: 'Dashboard', title: 'Dashboard', subtitle: 'List of test requests — click a patient to see tests and print the receipt.', icon: Gauge },
  { key: 'report', label: 'Registration Report', title: 'Registration Report', subtitle: 'Patients registered in a date range, with amount, paid, discount and dues.', icon: ClipboardList },
  { key: 'receipts', label: 'Patient Receipt', title: 'Patient Receipt', subtitle: 'The money slip — tests, prices, paid and dues. Find a patient and print the receipt.', icon: Printer },
  { key: 'lab-report', label: 'Patient Report', title: 'Patient Report', subtitle: 'Test results for the patient (blood, urine …). Enter results, then print the report.', icon: FileText },
  { key: 'history', label: 'Billing History', title: 'Billing History', subtitle: 'Search, review and reprint saved bills.', icon: ReceiptText },
  {
    group: 'patient',
    label: 'Patient',
    icon: Accessibility,
    children: [
      { key: 'patient-reg', label: 'Patient Reg.', title: 'Patient Registration', subtitle: 'Register a patient, add tests or profiles, take payment and print the receipt.', icon: Plus },
      { key: 'patients', label: 'Patient List', title: 'Patient List', subtitle: 'Every patient with visit history.', icon: List },
    ],
  },
  { key: 'payments', label: 'Payment Report', title: 'Payment Report', subtitle: 'Collections and dues for any date range.', icon: Wallet },
  {
    group: 'test',
    label: 'Test',
    icon: TestTube2,
    adminOnly: true,
    children: [
      { key: 'test-entry', label: 'Test Entry', title: 'Test Entry', subtitle: 'Add a new test with its price.', icon: FlaskConical },
      { key: 'tests', label: 'Test List', title: 'Test List', subtitle: 'All tests and the prices used when billing.', icon: List },
      { key: 'test-profile', label: 'Test Profile', title: 'Test Profile', subtitle: 'Group several tests into one profile or package.', icon: Shuffle },
      { key: 'profile-setting', label: 'Profile Setting', title: 'Profile Setting', subtitle: 'Parameters, units and normal ranges for each test report.', icon: SlidersHorizontal },
    ],
  },
  { key: 'users', label: 'Users', title: 'Users & Roles', subtitle: 'Staff logins and who can do what.', icon: UserCog, adminOnly: true },
]

const SidebarLink = ({ item, active, onSelect, small = false }) => {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={() => onSelect(item.key)}
      aria-current={active ? 'page' : undefined}
      className={`relative flex w-full items-center gap-3 rounded-lg px-3 text-left transition-colors ${small ? 'py-2 text-[13px]' : 'py-2.5 text-sm'} ${
        active
          ? 'bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
          : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      }`}
    >
      {active && !small ? <span className="absolute inset-y-2 left-0 w-1 rounded-r bg-blue-600 dark:bg-blue-400" /> : null}
      <Icon className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {item.label}
    </button>
  )
}

/** Tabs that manage their own data (they don't need the bill list loaded). */
const NON_BILL_TABS = ['dashboard', 'receipts', 'lab-report','tests', 'test-entry', 'test-profile', 'profile-setting', 'report', 'patients', 'patient-reg', 'users']

/** All pages in menu order, flattened (group children inherit adminOnly). */
const NAV_ITEMS = MENU.flatMap((entry) => (entry.children ? entry.children.map((c) => ({ ...c, adminOnly: entry.adminOnly })) : [entry]))

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

const Dashboard = ({ apiBase, user, onLogout, onCreateBill, onPrintBill }) => {
  const isAdmin = user?.role === 'admin'
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
  const menu = MENU.filter((entry) => !entry.adminOnly || isAdmin)
  const [openGroups, setOpenGroups] = useState([])
  const [activeTab, setActiveTabState] = useState(() => {
    try {
      return sessionStorage.getItem('billing_tab') || 'overview'
    } catch {
      return 'overview'
    }
  })
  const setActiveTab = (tab) => {
    setActiveTabState(tab)
    try {
      sessionStorage.setItem('billing_tab', tab)
    } catch {
      // ignore
    }
  }
  const [darkMode, setDarkMode] = useDarkMode()
  const [stats, setStats] = useState(null)
  const [recentBills, setRecentBills] = useState([])
  const [recentSearch, setRecentSearch] = useState('')
  const [reportRefreshKey, setReportRefreshKey] = useState(0)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')

  const [allBills, setAllBills] = useState([])
  const [allBillsLoading, setAllBillsLoading] = useState(false)
  const [allBillsError, setAllBillsError] = useState('')

  const [historySearch, setHistorySearch] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [paymentFrom, setPaymentFrom] = useState('')
  const [paymentTo, setPaymentTo] = useState('')
  const [editTestId, setEditTestId] = useState(null)
  const [editBill, setEditBill] = useState(null) // Dashboard → Edit Registration
  const [resultBillId, setResultBillId] = useState(null) // Result Entry (full screen)
  const [testsRefreshKey, setTestsRefreshKey] = useState(0)
  // Menu clicks: "Test Entry" / "Patient Reg." from the menu always open an empty form.
  const selectTab = (key) => {
    if (key === 'test-entry') setEditTestId(null)
    if (key === 'patient-reg') setEditBill(null)
    setActiveTab(key)
  }

  /* ---------------- data loading ---------------- */

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError('')

    try {
      const [statsResponse, billsResponse] = await Promise.all([
        authFetch(`${apiBase}/bills/dashboard`),
        authFetch(`${apiBase}/bills?limit=8`),
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
      const response = await authFetch(`${apiBase}/bills?limit=200`)
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
        const response = await authFetch(`${apiBase}/tests`)
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
          const seedResponse = await authFetch(`${apiBase}/tests`, {
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
    if (['overview', ...NON_BILL_TABS].includes(activeTab)) return
    if (allBillsLoading) return
    if (allBills.length) return
    loadAllBills()
  }, [activeTab, allBills.length, allBillsLoading, loadAllBills])

  // Keep the local price list used by Create Bill in sync whenever a test page opens.
  useEffect(() => {
    if (activeTab === 'tests' || activeTab === 'test-entry') loadTestsFromServer(() => {})
  }, [activeTab, loadTestsFromServer])

  const syncTests = () => {
    setTestsRefreshKey((k) => k + 1)
    loadTestsFromServer(() => {})
  }

  const handleRefresh = () => {
    if (activeTab === 'report' || activeTab === 'dashboard') setReportRefreshKey((k) => k + 1)
    loadOverview()
    if (!['overview', ...NON_BILL_TABS].includes(activeTab)) {
      loadAllBills()
    }
    if (activeTab === 'tests' || activeTab === 'test-entry') syncTests()
  }

  /* ---------------- derived data ---------------- */

  const selectedTab = navItems.find((item) => item.key === activeTab) || navItems[0]

  const recentFilteredBills = useMemo(() => {
    const query = recentSearch.trim().toLowerCase()
    return recentBills.filter((bill) => matchesBillQuery(bill, query))
  }, [recentBills, recentSearch])

  const dailyRevenue = Array.isArray(stats?.dailyRevenue) ? stats.dailyRevenue : []
  const topTests = Array.isArray(stats?.topTests) ? stats.topTests : []
  const maxTestCount = Math.max(...topTests.map((test) => Number(test.count) || 0), 1)
  const weekTotal = dailyRevenue.reduce((sum, day) => sum + (Number(day.amount) || 0), 0)
  const weekBills = dailyRevenue.reduce((sum, day) => sum + (Number(day.bills) || 0), 0)

  const totalNet = Number(stats?.totals?.netAmount) || 0
  const totalReceived = Number(stats?.totals?.receivedAmount) || 0
  const collectionRate = totalNet > 0 ? Math.round((totalReceived / totalNet) * 100) : 0
  const totalBillsCount = Number(stats?.totals?.totalBills) || 0

  const billHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase()
    return allBills.filter((bill) => matchesBillQuery(bill, query))
  }, [allBills, historySearch])

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
    const start = paymentFrom ? new Date(`${paymentFrom}T00:00:00`) : null
    const end = paymentTo ? new Date(`${paymentTo}T23:59:59`) : null

    return allBills.filter((bill) => {
      if (!matchesBillQuery(bill, query)) return false
      if (!start && !end) return true
      const date = getBillDate(bill)
      if (!date) return false
      if (start && date < start) return false
      if (end && date > end) return false
      return true
    })
  }, [allBills, paymentFrom, paymentSearch, paymentTo])

  const paymentTotals = useMemo(() => sumBills(paymentRows), [paymentRows])
  const historyTotals = useMemo(() => sumBills(allBills), [allBills])

  /* ---------------- payment quick ranges ---------------- */

  const quickRanges = useMemo(() => {
    const today = new Date()
    const todayStr = toInputDate(today)
    return [
      { key: 'today', label: 'Today', from: todayStr, to: todayStr },
      { key: '7d', label: 'Last 7 days', from: toInputDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)), to: todayStr },
      { key: 'month', label: 'This month', from: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: todayStr },
      { key: 'all', label: 'All', from: '', to: '' },
    ]
  }, [])

  const todayStatsPatients = Number(stats?.today?.patientsToday)
  const patientsTodayValue = Number.isFinite(todayStatsPatients) && todayStatsPatients > 0 ? todayStatsPatients : todayPatientsCount

  const isDataLoading = activeTab === 'overview' ? overviewLoading : NON_BILL_TABS.includes(activeTab) ? false : allBillsLoading
  const currentError = activeTab === 'overview' ? overviewError : NON_BILL_TABS.includes(activeTab) ? '' : allBillsError
  const loadedNote = totalBillsCount > allBills.length ? `Showing the latest ${allBills.length} of ${totalBillsCount} bills.` : null

  const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

  /* ---------------- render ---------------- */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex md:h-screen md:overflow-hidden print:!block print:!h-auto print:!overflow-visible print:bg-white print:text-black dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar (desktop) */}
      <aside className="hidden print:!hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src={logo} alt="" className="h-10 w-10 rounded-xl bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-700" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{LAB_NAME}</div>
            <div className={`truncate text-xs ${ui.muted}`}>{user?.name || 'Billing dashboard'}{user?.role ? ` · ${user.role === 'admin' ? 'Admin' : 'Staff'}` : ''}</div>
          </div>
        </div>

        <div className="px-4">
          <button type="button" onClick={onCreateBill} className={`${ui.btnPrimary} w-full`}>
            <Plus className="h-4 w-4" />
            New Bill
          </button>
        </div>

        <nav className="mt-6 min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Menu</div>
          {menu.map((entry) => {
            if (!entry.children) return <SidebarLink key={entry.key} item={entry} active={entry.key === activeTab} onSelect={selectTab} />
            const Icon = entry.icon
            const hasActive = entry.children.some((c) => c.key === activeTab)
            const isOpen = openGroups.includes(entry.group) || hasActive
            return (
              <div key={entry.group}>
                <button
                  type="button"
                  onClick={() => setOpenGroups((g) => (g.includes(entry.group) ? g.filter((x) => x !== entry.group) : [...g, entry.group]))}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    hasActive ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{entry.label}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                </button>
                {isOpen ? (
                  <div className="ml-5 mt-1 space-y-0.5 border-l border-slate-200 pl-2 dark:border-slate-700">
                    {entry.children.map((child) => (
                      <SidebarLink key={child.key} item={child} active={child.key === activeTab} onSelect={selectTab} small />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <button type="button" onClick={() => setDarkMode((value) => !value)} className={`${ui.btn} w-full`}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {darkMode ? 'Light mode' : 'Dark mode'}
          </button>
          <button type="button" onClick={onLogout} className={`${ui.btn} w-full text-rose-600 dark:text-rose-300`}>
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 md:overflow-y-auto print:!overflow-visible">
        {/* Top bar (mobile) */}
        <div className="sticky top-0 z-10 print:hidden border-b border-slate-200 bg-white/90 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <img src={logo} alt="" className="h-8 w-8 rounded-lg bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-700" />
              <span className="truncate text-sm font-bold">{LAB_NAME}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDarkMode((value) => !value)} className={`${ui.btn} px-2.5`} aria-label="Toggle theme">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button type="button" onClick={onLogout} className={`${ui.btn} px-2.5`} aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => selectTab(item.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  item.key === activeTab
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
          {/* Page header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
            <div>
              <p className={`text-sm ${ui.muted}`}>{todayLabel}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{selectedTab.title}</h1>
              <p className={`mt-1 text-sm ${ui.muted}`}>{selectedTab.subtitle}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleRefresh} className={ui.btn} disabled={isDataLoading}>
                <RefreshCw className={`h-4 w-4 ${isDataLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button type="button" onClick={onCreateBill} className={`${ui.btnPrimary} md:hidden`}>
                <Plus className="h-4 w-4" />
                New Bill
              </button>
            </div>
          </div>

          {currentError ? (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="font-semibold">{currentError}</div>
                <p className="mt-0.5 text-sm">Start the backend server on port 5000, then press Refresh.</p>
              </div>
            </div>
          ) : null}

          {/* ============================ OVERVIEW ============================ */}
          {activeTab === 'overview' ? (
            <>
              {/* Today banner */}
              <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-100">
                  <CalendarDays className="h-4 w-4" />
                  Today
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    { label: 'Bills', value: stats?.today?.billsToday || 0 },
                    { label: 'Patients', value: patientsTodayValue },
                    { label: 'Net amount', value: formatCurrency(stats?.today?.revenueToday) },
                    { label: 'Received', value: formatCurrency(stats?.today?.receivedToday) },
                    { label: 'Dues', value: formatCurrency(stats?.today?.duesToday), warn: Number(stats?.today?.duesToday) > 0 },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="text-xs font-medium uppercase tracking-wide text-blue-200">{item.label}</div>
                      <div className={`mt-1 text-2xl font-bold tabular-nums ${item.warn ? 'text-amber-200' : ''}`}>
                        {overviewLoading ? '…' : item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* All-time KPIs */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  icon={IndianRupee}
                  label="Net revenue"
                  value={formatCurrency(totalNet)}
                  hint="All time"
                  accent="blue"
                  loading={overviewLoading}
                />
                <StatCard
                  icon={Banknote}
                  label="Collected"
                  value={formatCurrency(totalReceived)}
                  hint={`${collectionRate}% of net revenue`}
                  accent="emerald"
                  loading={overviewLoading}
                />
                <StatCard
                  icon={Wallet}
                  label="Pending dues"
                  value={formatCurrency(stats?.totals?.duesAmount)}
                  hint="To be collected"
                  accent="rose"
                  loading={overviewLoading}
                />
                <StatCard
                  icon={FileText}
                  label="Bills / Patients"
                  value={`${totalBillsCount} / ${stats?.totals?.totalPatients || 0}`}
                  hint="Total bills and unique patients"
                  accent="indigo"
                  loading={overviewLoading}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Panel
                  className="lg:col-span-2"
                  title="Revenue — last 7 days"
                  subtitle={`${formatCurrency(weekTotal)} from ${weekBills} bill${weekBills === 1 ? '' : 's'}`}
                  icon={CalendarDays}
                >
                  <div className="p-5">
                    <RevenueChart rows={dailyRevenue} />
                  </div>
                </Panel>

                <Panel title="Popular tests" subtitle="Most billed test items" icon={TestTube2}>
                  <ol className="space-y-4 p-5">
                    {topTests.length ? (
                      topTests.map((test, index) => (
                        <li key={test.name} className="flex items-center gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="truncate font-medium text-slate-800 dark:text-slate-100" title={test.name}>{test.name}</span>
                              <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">{test.count}×</span>
                            </div>
                            <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-1.5 rounded-full bg-emerald-500"
                                style={{ width: `${Math.max(6, ((Number(test.count) || 0) / maxTestCount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className={`py-8 text-center text-sm ${ui.muted}`}>{overviewLoading ? 'Loading…' : 'No test data yet.'}</li>
                    )}
                  </ol>
                </Panel>
              </div>

              <Panel
                title="Recent bills"
                subtitle="Latest saved billing records"
                icon={ReceiptText}
                actions={
                  <>
                    <SearchBox value={recentSearch} onChange={setRecentSearch} placeholder="Search recent bills" />
                    <button type="button" onClick={() => setActiveTab('history')} className={ui.btn}>
                      View all
                    </button>
                  </>
                }
              >
                <BillsTable bills={recentFilteredBills} loading={overviewLoading} onPrint={onPrintBill} />
              </Panel>
            </>
          ) : null}

          {/* ============================ HISTORY ============================ */}
          {activeTab === 'history' ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={FileText} label="Bills" value={billHistory.length} hint={historySearch ? 'Matching search' : 'Loaded'} accent="blue" loading={isDataLoading} />
                <StatCard icon={IndianRupee} label="Net total" value={formatCurrency(historyTotals.net)} accent="amber" loading={isDataLoading} />
                <StatCard icon={Banknote} label="Received" value={formatCurrency(historyTotals.received)} accent="emerald" loading={isDataLoading} />
                <StatCard icon={Wallet} label="Dues" value={formatCurrency(historyTotals.dues)} accent="rose" loading={isDataLoading} />
              </div>

              <Panel
                title="All bills"
                subtitle={loadedNote || 'Search and reprint saved bills.'}
                icon={ReceiptText}
                actions={<SearchBox value={historySearch} onChange={setHistorySearch} placeholder="Bill no, patient, mobile, ref by" className="w-full md:w-80" />}
              >
                <BillsTable bills={billHistory} loading={isDataLoading} onPrint={onPrintBill} />
              </Panel>
            </>
          ) : null}

          {/* ============================ DASHBOARD (new, content to be decided) ============================ */}
          {activeTab === 'dashboard' ? (
            <TestRequestList
              key={reportRefreshKey}
              onPrintBill={onPrintBill}
              onEditBill={(bill) => {
                setEditBill(bill)
                setActiveTab('patient-reg')
              }}
              onResultEntry={(bill) => setResultBillId(bill.id)}
            />
          ) : null}

          {/* ============================ PATIENT REGISTRATION ============================ */}
          {activeTab === 'patient-reg' ? (
            <PatientReg key={editBill?.id || 'new'} editBill={editBill} onPrintBill={onPrintBill} onOpenReport={() => setActiveTab('report')} />
          ) : null}

          {/* ============================ PATIENTS ============================ */}
          {activeTab === 'patients' ? <PatientsPage onPrintBill={onPrintBill} onNewBill={onCreateBill} refreshKey={reportRefreshKey} /> : null}

          {/* ============================ USERS (admin) ============================ */}
          {activeTab === 'users' && isAdmin ? <UsersPage currentUser={user} /> : null}

          {/* ============================ PATIENT REPORT ============================ */}
          {activeTab === 'receipts' ? <PrintList key="receipt" mode="receipt" onPrintBill={onPrintBill} /> : null}
          {activeTab === 'lab-report' ? <PrintList key={`lab-${reportRefreshKey}`} mode="lab" onResultEntry={(bill) => setResultBillId(bill.id)} /> : null}

          {/* Result Entry opens full-screen over any page. */}
          {resultBillId ? (
            <ResultEntry
              billId={resultBillId}
              onClose={() => {
                setResultBillId(null)
                setReportRefreshKey((k) => k + 1) // RefNo colour / status refresh
              }}
            />
          ) : null}
          {activeTab === 'report' ? <PatientReport apiBase={apiBase} onPrintBill={onPrintBill} onCreateBill={onCreateBill} refreshKey={reportRefreshKey} /> : null}

          {/* ============================ PAYMENTS ============================ */}
          {activeTab === 'payments' ? (
            <>
              <div className={`${ui.card} flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between`}>
                <div className="flex flex-wrap gap-2">
                  {quickRanges.map((range) => {
                    const active = paymentFrom === range.from && paymentTo === range.to
                    return (
                      <button
                        key={range.key}
                        type="button"
                        onClick={() => {
                          setPaymentFrom(range.from)
                          setPaymentTo(range.to)
                        }}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                          active
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {range.label}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <input type="date" aria-label="From date" className={`${ui.input} w-auto`} value={paymentFrom} onChange={(event) => setPaymentFrom(event.target.value)} />
                    <span className={`text-sm ${ui.muted}`}>to</span>
                    <input type="date" aria-label="To date" className={`${ui.input} w-auto`} value={paymentTo} onChange={(event) => setPaymentTo(event.target.value)} />
                  </div>
                  <SearchBox value={paymentSearch} onChange={setPaymentSearch} placeholder="Bill no, patient, mobile" className="w-full sm:w-64" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={FileText} label="Bills" value={paymentRows.length} hint="In selected range" accent="blue" loading={isDataLoading} />
                <StatCard icon={IndianRupee} label="Net amount" value={formatCurrency(paymentTotals.net)} accent="amber" loading={isDataLoading} />
                <StatCard
                  icon={Banknote}
                  label="Received"
                  value={formatCurrency(paymentTotals.received)}
                  hint={paymentTotals.net > 0 ? `${Math.round((paymentTotals.received / paymentTotals.net) * 100)}% collected` : undefined}
                  accent="emerald"
                  loading={isDataLoading}
                />
                <StatCard icon={Wallet} label="Dues" value={formatCurrency(paymentTotals.dues)} accent="rose" loading={isDataLoading} />
              </div>

              <Panel title="Payment history" subtitle={loadedNote || 'Bills in the selected date range.'} icon={Wallet}>
                <BillsTable bills={paymentRows} loading={isDataLoading} showTests={false} emptyText="No payments in this range." />
              </Panel>
            </>
          ) : null}

          {/* ============================ TEST ENTRY / TEST LIST ============================ */}
          {activeTab === 'test-entry' ? (
            <TestEntry
              key={editTestId || 'new'}
              editId={editTestId}
              onSaved={() => syncTests()}
              onNew={() => setEditTestId(null)}
              onOpenList={() => setActiveTab('tests')}
              onDeleted={() => {
                setEditTestId(null)
                syncTests()
                setActiveTab('tests')
              }}
            />
          ) : null}
          {activeTab === 'tests' ? (
            <TestList
              refreshKey={testsRefreshKey}
              onOpen={(id) => {
                setEditTestId(id)
                setActiveTab('test-entry')
              }}
              onNew={() => {
                setEditTestId(null)
                setActiveTab('test-entry')
              }}
            />
          ) : null}

          {/* ============================ TEST PROFILE ============================ */}
          {activeTab === 'test-profile' ? <TestProfile /> : null}

          {/* ============================ PROFILE SETTING ============================ */}
          {activeTab === 'profile-setting' ? <ProfileSetting onOpenProfiles={() => setActiveTab('test-profile')} /> : null}

        </main>
      </div>
    </div>
  )
}

export default Dashboard
