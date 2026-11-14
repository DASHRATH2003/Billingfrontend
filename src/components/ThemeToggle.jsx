import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { ui } from '../lib/ui.js'

const ThemeToggle = ({ darkMode, onToggle, showLabel = false, className = '' }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`${ui.btn} ${showLabel ? '' : 'px-2.5'} ${className}`}
    aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    title={darkMode ? 'Light mode' : 'Dark mode'}
  >
    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    {showLabel ? (darkMode ? 'Light mode' : 'Dark mode') : null}
  </button>
)

export default ThemeToggle
