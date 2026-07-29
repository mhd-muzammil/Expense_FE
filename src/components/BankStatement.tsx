import { useEffect, useMemo, useRef, useState } from 'react'
import { Landmark, Search, Trash2, Upload, Loader2, ArrowDownCircle, ArrowUpCircle, Wallet, X } from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchBankStatements, importBankStatement, deleteBankStatementEntry, clearBankStatements,
  type BankKey, type BankStatementEntry,
} from '@/lib/api'

const num = (v: string | null | undefined) => {
  const n = parseFloat(v ?? '0')
  return isNaN(n) ? 0 : n
}
const inr = (v: string | number | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  if (!n || isNaN(n as number)) return '—'
  return (n as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

export default function BankStatement({ bank, title, subtitle }: { bank: BankKey; title: string; subtitle: string }) {
  const addToast = useExpenseStore((s) => s.addToast)

  const [rows, setRows] = useState<BankStatementEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      setRows(await fetchBankStatements(bank, {
        search: search || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      }))
    } catch {
      addToast('error', `Failed to load ${title}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bank])
  useEffect(() => {
    const t = setTimeout(load, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fromDate, toDate])

  const totals = useMemo(() => {
    let dr = 0, cr = 0
    rows.forEach((r) => { dr += num(r.debit); cr += num(r.credit) })
    // Rows are ordered latest-first, so the current balance is the newest row
    // that carries a balance value.
    const latest = rows.find((r) => r.balance != null && r.balance !== '')
    return { dr, cr, balance: latest?.balance ?? null, balanceDc: latest?.balance_dc ?? '' }
  }, [rows])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setUploading(true)
    try {
      const res = await importBankStatement(bank, file)
      addToast('success', res.detail || `Imported ${res.inserted} entries`)
      await load()
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Import failed — check the file format'
      addToast('error', msg)
    } finally {
      setUploading(false)
    }
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      const res = await clearBankStatements(bank)
      addToast('success', res.detail || 'Cleared')
      setRows([])
    } catch {
      addToast('error', 'Failed to clear')
    } finally {
      setClearing(false)
    }
  }

  const removeRow = async (id: number) => {
    try {
      await deleteBankStatementEntry(bank, id)
      setRows((p) => p.filter((r) => r.id !== id))
    } catch {
      addToast('error', 'Failed to delete row')
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <Landmark className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">{title}</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search narration / ref…"
              className="pl-9 pr-3 py-2.5 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-56"
            />
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors whitespace-nowrap disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Excel
          </button>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs font-semibold text-surface-500 dark:text-surface-400 mr-1">Date range</span>
        <input
          type="date"
          value={fromDate}
          max={toDate || undefined}
          onChange={(e) => setFromDate(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <span className="text-surface-400">–</span>
        <input
          type="date"
          value={toDate}
          min={fromDate || undefined}
          onChange={(e) => setToDate(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {(fromDate || toDate) && (
          <button
            onClick={() => { setFromDate(''); setToDate('') }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-surface-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4">
          <div className="text-xs font-medium text-surface-500 dark:text-surface-400">Entries</div>
          <div className="text-2xl font-bold text-surface-900 dark:text-white">{rows.length}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-500"><ArrowUpCircle className="w-3.5 h-3.5" /> Total Debit</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">₹{inr(totals.dr)}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500"><ArrowDownCircle className="w-3.5 h-3.5" /> Total Credit</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">₹{inr(totals.cr)}</div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary-500"><Wallet className="w-3.5 h-3.5" /> Current Balance</div>
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{totals.balance != null ? `₹${inr(totals.balance)}${totals.balanceDc ? ' ' + totals.balanceDc : ''}` : '—'}</div>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Landmark className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">No entries yet</p>
            <button onClick={() => fileRef.current?.click()} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Upload the bank's Excel statement →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700">
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">TRAN DATE</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">VALUE DATE</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400">NARRATION</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">CHQ. NO.</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">WITHDRAWAL (DR)</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">DEPOSIT (CR)</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">BALANCE (INR)</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30 transition-colors">
                    <td className="p-3 text-surface-700 dark:text-surface-300 whitespace-nowrap align-top">{fmtDate(r.txn_date)}</td>
                    <td className="p-3 text-surface-500 dark:text-surface-400 whitespace-nowrap align-top">{fmtDate(r.value_date)}</td>
                    <td className="p-3 text-surface-700 dark:text-surface-300 align-top">{r.narration}</td>
                    <td className="p-3 text-surface-500 dark:text-surface-400 whitespace-nowrap align-top">{r.ref_no || ''}</td>
                    <td className="p-3 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap align-top">{num(r.debit) ? inr(r.debit) : ''}</td>
                    <td className="p-3 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap align-top">{num(r.credit) ? inr(r.credit) : ''}</td>
                    <td className="p-3 text-right text-surface-700 dark:text-surface-300 whitespace-nowrap align-top">{r.balance != null ? `${inr(r.balance)}${r.balance_dc ? ' ' + r.balance_dc : ''}` : ''}</td>
                    <td className="p-3 text-right align-top">
                      <button onClick={() => removeRow(r.id)} title="Delete row" className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex justify-end mt-4">
          <ClearButton busy={clearing} onConfirm={handleClear} count={rows.length} />
        </div>
      )}
    </div>
  )
}

function ClearButton({ busy, onConfirm, count }: { busy: boolean; onConfirm: () => void; count: number }) {
  const [confirm, setConfirm] = useState(false)
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
        <Trash2 className="w-3.5 h-3.5" /> Clear all {count} entries
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-surface-500">Delete all {count} entries?</span>
      <button onClick={onConfirm} disabled={busy} className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
        {busy ? '…' : 'Yes, clear'}
      </button>
      <button onClick={() => setConfirm(false)} className="px-3 py-1.5 rounded text-xs text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700">Cancel</button>
    </div>
  )
}
