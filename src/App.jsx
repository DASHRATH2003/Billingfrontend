import React, { useEffect, useState } from 'react'
import CreateBill from './pages/CreateBill.jsx'
import BillPreview from './components/BillPreview.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

const API_BASE = String(import.meta.env.VITE_API_BASE || 'http://localhost:5000/api').replace(/\/+$/, '')
const AUTH_KEY = 'billing_auth'

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem(AUTH_KEY) === 'true')
  const [autoPrintPreview, setAutoPrintPreview] = useState(false)
  const [previewReturnView, setPreviewReturnView] = useState('create')

  useEffect(() => {
    const handlePopState = () => setView(getViewFromPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (view === 'dashboard' && !isAuthenticated) {
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
      const response = await fetch(`${API_BASE}/bills`, {
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
  const handleCreate = () => goToView('create')
  const handlePrintSavedBill = (bill) => {
    setSaveError('')
    setBillData(bill)
    setPreviewReturnView('dashboard')
    setAutoPrintPreview(true)
    goToView('preview')
  }
  const handleLogin = () => {
    localStorage.setItem(AUTH_KEY, 'true')
    setIsAuthenticated(true)
    goToView('dashboard')
  }
  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY)
    setIsAuthenticated(false)
    goToView('login')
  }

  if (view === 'login') {
    return <Login apiBase={API_BASE} onLogin={handleLogin} />
  }

  if (view === 'reset-password') {
    return <ResetPassword apiBase={API_BASE} onGoToLogin={() => goToView('login')} />
  }

  if (view === 'dashboard') {
    return <Dashboard apiBase={API_BASE} onCreateBill={handleCreate} onLogout={handleLogout} onPrintBill={handlePrintSavedBill} />
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

  return <CreateBill onSubmit={handleSubmit} onDashboard={handleDashboard} />
}

export default App
