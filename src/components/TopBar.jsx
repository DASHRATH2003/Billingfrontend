import React from 'react'
import logo from '../assets/logo.png'
import ThemeToggle from './ThemeToggle.jsx'
import { LAB_NAME, ui } from '../lib/ui.js'

/** Sticky header used by the Create Bill and Bill Preview pages. */
const TopBar = ({ section, darkMode, onToggleTheme, children, className = '' }) => (
  <header className={`sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 ${className}`}>
    <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <img src={logo} alt="" className="h-9 w-9 rounded-xl bg-white object-contain ring-1 ring-slate-200 dark:ring-slate-700" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{LAB_NAME}</div>
          {section ? <div className={`truncate text-xs ${ui.muted}`}>{section}</div> : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {children}
        <ThemeToggle darkMode={darkMode} onToggle={onToggleTheme} />
      </div>
    </div>
  </header>
)

export default TopBar
