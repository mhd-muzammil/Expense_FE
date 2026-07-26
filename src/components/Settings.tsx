import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, ShieldCheck, Lock, Loader2, Check, Trash2, AlertTriangle } from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import { fetchClearDataPasswordStatus, setClearDataPassword } from '@/lib/api'

export default function Settings() {
  const addToast = useExpenseStore((s) => s.addToast)
  const removeAllExpenses = useExpenseStore((s) => s.removeAllExpenses)

  const [isSet, setIsSet] = useState<boolean | null>(null)
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [saving, setSaving] = useState(false)

  // Clear All Data — password-gated (verified by the backend).
  const [showClear, setShowClear] = useState(false)
  const [clearPw, setClearPw] = useState('')
  const [clearBusy, setClearBusy] = useState(false)
  const [clearErr, setClearErr] = useState('')

  const handleClear = async () => {
    if (!clearPw) { setClearErr('Enter the clear-data password'); return }
    setClearBusy(true)
    setClearErr('')
    try {
      await removeAllExpenses(clearPw)
      setShowClear(false)
      setClearPw('')
    } catch (err: unknown) {
      const detail =
        (err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined) || 'Failed to clear data. Please try again.'
      setClearErr(detail)
    } finally {
      setClearBusy(false)
    }
  }

  useEffect(() => {
    fetchClearDataPasswordStatus()
      .then((r) => setIsSet(r.is_set))
      .catch(() => setIsSet(false))
  }, [])

  const handleSave = async () => {
    if (pw.length < 4) { addToast('error', 'Password must be at least 4 characters'); return }
    if (pw !== pw2) { addToast('error', 'Passwords do not match'); return }
    setSaving(true)
    try {
      await setClearDataPassword(pw)
      setIsSet(true)
      setPw(''); setPw2('')
      addToast('success', 'Clear-data password updated')
    } catch {
      addToast('error', 'Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full pl-9 pr-3 py-2.5 rounded-lg text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
          <SettingsIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">Settings</h2>
          <p className="text-sm text-surface-500 dark:text-surface-400">Admin-only app configuration</p>
        </div>
      </div>

      {/* Clear-data password card */}
      <div className="max-w-xl rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0">
            <ShieldCheck className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">Clear-Data Password</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              This password is required to use <strong>Clear All Data</strong> on the Expenses page.
              Share it only with people allowed to wipe data.
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="mb-4">
          {isSet === null ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-surface-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…
            </span>
          ) : isSet ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Password is set
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              Not set yet — Clear All Data is blocked until you set one
            </span>
          )}
        </div>

        {/* Set / change form */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">
              {isSet ? 'New password' : 'Set password'}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 4 characters" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !saving) handleSave() }}
                placeholder="Re-enter password"
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSet ? 'Change password' : 'Set password'}
            </button>
          </div>
        </div>
      </div>

      {/* Clear All Data card */}
      <div className="max-w-xl rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-red-200 dark:border-red-900/40 p-6 mt-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">Clear All Data</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
              Permanently deletes <strong>all</strong> expense records. This cannot be undone and
              requires the clear-data password above.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => { setClearPw(''); setClearErr(''); setShowClear(true) }}
            disabled={!isSet}
            title={isSet ? '' : 'Set a clear-data password first'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold
              bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
        </div>
        {!isSet && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-right">
            Set a clear-data password first to enable this.
          </p>
        )}
      </div>

      {/* Clear confirmation modal */}
      {showClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !clearBusy && setShowClear(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-800 rounded-2xl shadow-2xl animate-fade-in p-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2 text-center">Clear All Data?</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-5 text-center">
              This permanently deletes <strong>ALL</strong> expense data and cannot be undone.
              Enter the clear-data password to confirm.
            </p>
            <div className="relative mb-2">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="password"
                autoFocus
                value={clearPw}
                onChange={(e) => { setClearPw(e.target.value); setClearErr('') }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !clearBusy) handleClear() }}
                placeholder="Clear-data password"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-surface-50 dark:bg-surface-900
                  border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            {clearErr && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{clearErr}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowClear(false)}
                disabled={clearBusy}
                className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700
                  text-sm font-medium text-surface-700 dark:text-surface-300
                  hover:bg-surface-50 dark:hover:bg-surface-700 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={clearBusy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                  bg-red-500 hover:bg-red-600 text-sm font-medium text-white transition-all
                  active:scale-[0.98] disabled:opacity-60"
              >
                {clearBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
