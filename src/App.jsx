import React, { useEffect, useState } from 'react'
import CreateBill from './pages/CreateBill.jsx'
import BillPreview from './components/BillPreview.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import { API_BASE, api, authFetch, clearSession, getStoredUser, getToken, onUnauthorized, saveSession } from './lib/api.js'

const PUBLIC_VIEWS = ['login', 'reset-password']

const getViewFromPath = () => {
  if (window.location.pathname === '/login') return 'login'
  if (window.location.pathname === '/reset-password') return 'reset-password'
  if (window.location.pathname === '/ldashbord') return 'dashboard'
  return 'create'
}

const setPathForView = (view) => {
  const nextPath = view === 'login' ? '/login' : view === 'reset-password' ? '/reset-password' : view === 'dashboard' ? '/ldashbord' : '/'
  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, '', nextPath)
  }
}

const App = () => {
  const [view, setView] = useState(getViewFromPath)
  const [billData, setBillData] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null))
  const [autoPrintPreview, setAutoPrintPreview] = useState(false)
  const [previewReturnView, setPreviewReturnView] = useState('create')
  const [afterLoginView, setAfterLoginView] = useState('dashboard')
  const [prefillPatient, setPrefillPatient] = useState(null)
  const isAuthenticated = Boolean(user)

  useEffect(() => {
    const handlePopState = () => setView(getViewFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Any 401 from the API (expired/revoked session) -> back to login.
  useEffect(() => {
    onUnauthorized(() => setUser(null))
    return () => onUnauthorized(null)
  }, [])

  // Refresh the logged-in user (role/name may have changed) when the app opens.
  useEffect(() => {
    if (!getToken()) return
    api('/auth/me')
      .then(({ user: fresh }) => {
        setUser(fresh)
        saveSession(getToken(), fresh)
      })
      .catch(() => {})
  }, [])

  // Every page except login / reset needs a login.
  useEffect(() => {
    if (!isAuthenticated && !PUBLIC_VIEWS.includes(view)) {
      setAfterLoginView(view === 'create' ? 'create' : 'dashboard')
      setPathForView('login')
      setView('login')
    }
  }, [isAuthenticated, view])

  const goToView = (nextView) => {
    setPathForView(nextView)
    setView(nextView)
  }

  const handleSubmit = async (data) => {
    setSaveError('')
    setAutoPrintPreview(false)
    setPreviewReturnView('create')

    try {
      const response = await authFetch(`${API_BASE}/bills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || 'Unable to save bill')
      }

      const result = await response.json()
      setBillData(result.bill || data)
    } catch (error) {
      setSaveError(error.message)
      setBillData(data)
    }

    goToView('preview')
  }

  const handleBack = () => {
    setAutoPrintPreview(false)
    goToView(previewReturnView === 'dashboard' && isAuthenticated ? 'dashboard' : 'create')
  }
  const handleDashboard = () => {
    setAutoPrintPreview(false)
    goToView(isAuthenticated ? 'dashboard' : 'login')
  }
  // Called from buttons (gets a click event) or from a patient profile (gets the patient).
  const handleCreate = (patient) => {
    setPrefillPatient(patient?.patientId ? patient : null)
    goToView('create')
  }
  const handlePrintSavedBill = (bill) => {
    setSaveError('')
    setBillData(bill)
    setPreviewReturnView('dashboard')
    setAutoPrintPreview(true)
    goToView('preview')
  }
  const handleLogin = ({ token, user: loggedIn }) => {
    saveSession(token, loggedIn)
    setUser(loggedIn)
    goToView(afterLoginView)
  }
  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // session may already be gone
    }
    clearSession()
    setUser(null)
    goToView('login')
  }

  if (view === 'login') {
    return <Login apiBase={API_BASE} onLogin={handleLogin} />
  }

  if (view === 'reset-password') {
    return <ResetPassword apiBase={API_BASE} onGoToLogin={() => goToView('login')} />
  }

  if (!isAuthenticated) return null

  if (view === 'dashboard') {
    return <Dashboard apiBase={API_BASE} user={user} onCreateBill={handleCreate} onLogout={handleLogout} onPrintBill={handlePrintSavedBill} />
  }

  if (view === 'preview') {
    return (
      <BillPreview
        data={billData}
        onBack={handleBack}
        onDashboard={handleDashboard}
        autoPrint={autoPrintPreview}
        saveError={saveError}
      />
    )
  }

  return <CreateBill key={prefillPatient?.patientId || 'new'} initialPatient={prefillPatient} onSubmit={handleSubmit} onDashboard={handleDashboard} />
}

export default App
