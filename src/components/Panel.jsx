import React from 'react'
import { ui } from '../lib/ui.js'

/** Card with a header row (icon, title, subtitle, optional actions). Used on every page. */
const Panel = ({ title, subtitle, icon, accent, actions, children, className = '' }) => {
  const Icon = icon
  return (
    <section className={`${ui.card} ${className}`}>
      <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className={`rounded-lg p-2 ${accent || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              <Icon className="h-4 w-4" />
            </span>
          ) : null}
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
            {subtitle ? <p className={`text-sm ${ui.muted}`}>{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div> : null}
      </header>
      {children}
    </section>
  )
}

export default Panel
