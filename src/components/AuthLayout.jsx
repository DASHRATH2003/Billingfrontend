import React from 'react'
import logo from '../assets/logo.png'
import ThemeToggle from './ThemeToggle.jsx'
import { useDarkMode } from '../lib/theme.js'
import { LAB_NAME, ui } from '../lib/ui.js'

/** Centered card layout shared by the Login and Reset Password pages. */
const AuthLayout = ({ title, subtitle, children, footer }) => {
  const [darkMode, setDarkMode] = useDarkMode()

  return (
    <div className={`${ui.page} relative flex min-h-screen items-center justify-center p-4`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-blue-100/70 to-transparent dark:from-blue-950/40" />
      <div className="absolute right-4 top-4">
        <ThemeToggle darkMode={darkMode} onToggle={() => setDarkMode((v) => !v)} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={logo} alt="" className="h-16 w-16 rounded-2xl bg-white object-contain p-1 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" />
          <div className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{LAB_NAME}</div>
        </div>

        <div className={`${ui.card} p-6 sm:p-8`}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className={`mt-1 text-sm ${ui.muted}`}>{subtitle}</p> : null}
          </div>
          {children}
        </div>

        {footer ? <div className={`mt-6 text-center text-xs ${ui.muted}`}>{footer}</div> : null}
      </div>
    </div>
  )
}

export default AuthLayout
