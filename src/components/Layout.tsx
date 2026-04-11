import { useEffect } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import { Moon, Sun, X } from 'lucide-react'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme, toasts, removeToast } = useExpenseStore()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  return (
    <div className="min-h-screen transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">₹</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-surface-900 dark:text-white leading-tight">
                  ExpenseTrack
                </h1>
                <p className="text-xs text-surface-500 dark:text-surface-400 leading-tight">
                  CEO Dashboard
                </p>
              </div>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="relative w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800
                hover:bg-surface-200 dark:hover:bg-surface-700
                flex items-center justify-center transition-all duration-200
                hover:scale-105 active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-surface-600" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl
              animate-fade-in text-sm font-medium text-white
              ${toast.type === 'success'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                : 'bg-gradient-to-r from-red-500 to-red-600'
              }
            `}
          >
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
