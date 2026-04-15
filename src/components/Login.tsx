import { useState } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import { APP_NAME, APP_SUBTITLE, CURRENCY_SYMBOL } from '@/lib/brand'
import { Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const { login, authLoading } = useExpenseStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) {
      setError('Username and password are required')
      return
    }
    try {
      await login(username.trim(), password)
    } catch (err: any) {
      const msg =
        err?.response?.status === 401
          ? 'Invalid username or password'
          : err?.response?.data?.detail ||
            err?.message ||
            'Login failed. Please try again.'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-surface-50 via-white to-primary-50 dark:from-surface-900 dark:via-surface-900 dark:to-surface-800">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl mb-4">
            <span className="text-white font-bold text-3xl">{CURRENCY_SYMBOL}</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            {APP_NAME}
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {APP_SUBTITLE} — sign in to continue
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl p-6 sm:p-8 border border-surface-100 dark:border-surface-700"
        >
          {/* Username */}
          <label className="block mb-4">
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
              Username
            </span>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600
                  bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  transition"
                placeholder="admin"
                disabled={authLoading}
              />
            </div>
          </label>

          {/* Password */}
          <label className="block mb-2">
            <span className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5 block">
              Password
            </span>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600
                  bg-surface-50 dark:bg-surface-900 text-surface-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  transition"
                placeholder="••••••••"
                disabled={authLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          {/* Error */}
          {error && (
            <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={authLoading}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5
              rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700
              text-white font-semibold shadow-lg shadow-primary-500/20
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-all duration-200 active:scale-[0.98]"
          >
            {authLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-xs text-center mt-4 text-surface-400 dark:text-surface-500">
          Authorized personnel only
        </p>
      </div>
    </div>
  )
}
