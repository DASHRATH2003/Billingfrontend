import { useEffect, useState } from 'react'

export const THEME_KEY = 'billing_theme'

export const getInitialDarkMode = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'dark') return true
    if (saved === 'light') return false
  } catch {
    // storage unavailable – fall back to the system setting
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

export const applyTheme = (dark) => {
  document.documentElement.classList.toggle('dark', Boolean(dark))
}

/** Shared light/dark mode for every page. The choice is remembered in localStorage. */
export const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(getInitialDarkMode)

  useEffect(() => {
    applyTheme(darkMode)
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light')
    } catch {
      // ignore
    }
  }, [darkMode])

  return [darkMode, setDarkMode]
}
