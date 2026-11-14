export const LAB_NAME = 'Radha Jyoti Diagnostics'

/** Lab letterhead printed on receipts (same as the Create Bill defaults). */
export const LAB_DETAILS = {
  name: 'Radha Jyoti Diagnostics',
  addressLine1: 'Roy Complex, Infront of ML Academy School, VIP Road, Laheriasarai, Darbhanga',
  addressLine2: 'District: Darbhanga, PIN: 846001, State: Bihar',
  contact1: '8084930463',
  contact2: '8873867062',
  email: 'radhajyotidiagnostics@gmail.com',
}

/** Shared Tailwind class strings so every page looks the same in light and dark mode. */
export const ui = {
  page: 'min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100',
  card: 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
  input:
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 read-only:bg-slate-50 read-only:text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:read-only:bg-slate-900 dark:read-only:text-slate-400 dark:[color-scheme:dark]',
  label: 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300',
  btn: 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  btnPrimary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60',
  btnDanger:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30',
  link: 'text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
  th: 'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
  td: 'px-4 py-3 text-sm',
  muted: 'text-slate-500 dark:text-slate-400',
  alertError: 'rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
  alertSuccess:
    'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200',
  alertWarn: 'rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
}

export const ACCENTS = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
}
