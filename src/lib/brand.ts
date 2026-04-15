/**
 * Brand / app-wide display constants.
 * Override any of these per environment via Vite env vars (VITE_APP_NAME, etc).
 */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'ExpenseTrack'
export const APP_SUBTITLE = import.meta.env.VITE_APP_SUBTITLE || 'CEO Dashboard'
export const CURRENCY_SYMBOL = import.meta.env.VITE_CURRENCY_SYMBOL || '₹'
export const CURRENCY_CODE = import.meta.env.VITE_CURRENCY_CODE || 'INR'
export const LOCALE = import.meta.env.VITE_LOCALE || 'en-IN'

// How many ms toasts stay on screen.
export const TOAST_DURATION_MS = 4000
