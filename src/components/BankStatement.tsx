import { useEffect, useMemo, useRef, useState } from 'react'
import { Landmark, Search, Trash2, Upload, Loader2, ArrowDownCircle, ArrowUpCircle, Wallet, Pencil, X, CheckCircle2, AlertCircle, Receipt, Tag, User, Calendar } from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import ExpenseForm from './ExpenseForm'
import {
  fetchBankStatements, importBankStatement, deleteBankStatementEntry, updateBankStatementEntry, clearBankStatements,
  type BankKey, type BankStatementEntry, type MatchedExpense, type ExpenseFormData,
} from '@/lib/api'

// Fallback Expenses payment-mode label per bank, used only when the ledger has
// no prior entry to learn the user's chosen mode name from.
const FALLBACK_MODE: Record<BankKey, string> = { idfc: 'IDFC Bank', bob: 'Bank of Baroda' }

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
  const [summary, setSummary] = useState({ total: 0, matched: 0, missing: 0 })
  const [suggestedMode, setSuggestedMode] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [editing, setEditing] = useState<BankStatementEntry | null>(null)
  const [viewingMatch, setViewingMatch] = useState<MatchedExpense | null>(null)
  const [addingFor, setAddingFor] = useState<BankStatementEntry | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchBankStatements(bank, {
        search: search || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setRows(res.results)
      setSummary(res.summary)
      setSuggestedMode(res.summary.suggested_mode || '')
    } catch {
      addToast('error', `Failed to load ${title}`)
    } finally {
      setLoading(false)
    }
  }

  // Rows shown in the table (optionally only the ones missing from Expenses).
  const displayRows = useMemo(
    () => (onlyMissing ? rows.filter((r) => r.expense_status === 'missing') : rows),
    [rows, onlyMissing],
  )

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
      setSummary({ total: 0, matched: 0, missing: 0 })
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

  const saveEdit = async (id: number, data: Partial<BankStatementEntry>) => {
    await updateBankStatementEntry(bank, id, data)
    setEditing(null)
    addToast('success', 'Entry updated')
    // Reload so the reconciliation status re-computes against the new amount/date.
    await load()
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

      {/* Reconciliation strip: how many statement rows are recorded in Expenses */}
      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 px-1">
          <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">Matched with Expenses:</span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> {summary.matched} in Expenses
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-4 h-4" /> {summary.missing} not in Expenses
          </span>
          {summary.missing > 0 && (
            <button
              onClick={() => setOnlyMissing((v) => !v)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                onlyMissing
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {onlyMissing ? 'Show all rows' : 'Show only missing'}
            </button>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : displayRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {onlyMissing && rows.length > 0 ? (
              <>
                <CheckCircle2 className="w-12 h-12 text-emerald-400 dark:text-emerald-500 mb-3" />
                <p className="text-surface-500 dark:text-surface-400 font-medium">Every statement row is recorded in Expenses 🎉</p>
                <button onClick={() => setOnlyMissing(false)} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Show all rows</button>
              </>
            ) : (
              <>
                <Landmark className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
                <p className="text-surface-500 dark:text-surface-400 font-medium">No entries yet</p>
                <button onClick={() => fileRef.current?.click()} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Upload the bank's Excel statement →</button>
              </>
            )}
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
                  <th className="text-center p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">STATUS</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400"></th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r) => (
                  <tr key={r.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30 transition-colors">
                    <td className="p-3 text-surface-700 dark:text-surface-300 whitespace-nowrap align-top">{fmtDate(r.txn_date)}</td>
                    <td className="p-3 text-surface-500 dark:text-surface-400 whitespace-nowrap align-top">{fmtDate(r.value_date)}</td>
                    <td className="p-3 text-surface-700 dark:text-surface-300 align-top">{r.narration}</td>
                    <td className="p-3 text-surface-500 dark:text-surface-400 whitespace-nowrap align-top">{r.ref_no || ''}</td>
                    <td className="p-3 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap align-top">{num(r.debit) ? inr(r.debit) : ''}</td>
                    <td className="p-3 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap align-top">{num(r.credit) ? inr(r.credit) : ''}</td>
                    <td className="p-3 text-right text-surface-700 dark:text-surface-300 whitespace-nowrap align-top">{r.balance != null ? `${inr(r.balance)}${r.balance_dc ? ' ' + r.balance_dc : ''}` : ''}</td>
                    <td className="p-3 text-center whitespace-nowrap align-top">
                      {r.expense_status === 'matched' && r.matched_expense ? (
                        <button
                          onClick={() => setViewingMatch(r.matched_expense!)}
                          title="Click to see the Expenses entry"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:ring-1 hover:ring-emerald-300 dark:hover:ring-emerald-700 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> In Expenses
                        </button>
                      ) : (
                        <button
                          onClick={() => setAddingFor(r)}
                          title="Click to add this transaction to Expenses"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 hover:ring-1 hover:ring-amber-300 dark:hover:ring-amber-700 transition-colors cursor-pointer"
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Not in Expenses
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditing(r)} title="Edit row" className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeRow(r.id)} title="Delete row" className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {editing && (
        <EditEntryModal entry={editing} onClose={() => setEditing(null)} onSave={(d) => saveEdit(editing.id, d)} />
      )}

      {viewingMatch && (
        <MatchedExpenseModal match={viewingMatch} onClose={() => setViewingMatch(null)} />
      )}

      {addingFor && (() => {
        const isDebit = num(addingFor.debit) > 0
        const amt = isDebit ? num(addingFor.debit) : num(addingFor.credit)
        const mode = suggestedMode || FALLBACK_MODE[bank]
        const prefill: Partial<ExpenseFormData> = {
          date: addingFor.txn_date || undefined,
          debited_amount: isDebit ? amt : null,
          credited_amount: isDebit ? null : amt,
          debit_payment_mode: isDebit ? mode : '',
          credit_payment_mode: isDebit ? '' : mode,
          debit_remark: isDebit ? addingFor.narration : '',
          credit_remark: isDebit ? '' : addingFor.narration,
        }
        return (
          <ExpenseForm
            prefill={prefill}
            initialType={isDebit ? 'debit' : 'credit'}
            onClose={() => { setAddingFor(null); load() }}
          />
        )
      })()}
    </div>
  )
}

// Shows the Expenses entry that a bank-statement row was reconciled against.
function MatchedExpenseModal({ match, onClose }: { match: MatchedExpense; onClose: () => void }) {
  const isCredit = match.side === 'credit'
  const amtColor = isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  const rows: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    { icon: <Calendar className="w-4 h-4" />, label: 'Date', value: match.date ? fmtDate(match.date) : '—' },
    { icon: <Tag className="w-4 h-4" />, label: 'Category', value: match.category || '—' },
    { icon: <Landmark className="w-4 h-4" />, label: 'Branch', value: match.branch || '—' },
    { icon: <Wallet className="w-4 h-4" />, label: 'Payment Mode', value: match.mode || '—' },
    { icon: <User className="w-4 h-4" />, label: 'Person', value: match.person || '—' },
    { icon: <Receipt className="w-4 h-4" />, label: 'Remark', value: match.remark || '—' },
  ]
  return (
    <div className="fixed inset-0 z-[95] bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-700 shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-surface-900 dark:text-white">Matched Expenses Entry</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"><X className="w-5 h-5 text-surface-400" /></button>
        </div>
        <div className="px-5 py-4 flex items-center justify-between bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700 shrink-0">
          <span className="text-sm font-medium text-surface-500 dark:text-surface-400">{isCredit ? 'Credit (Deposit)' : 'Debit (Withdrawal)'}</span>
          <span className={`text-xl font-bold ${amtColor}`}>₹{inr(match.amount)}</span>
        </div>
        <div className="p-5 space-y-3 flex-1 overflow-y-auto">
          {rows.map((r) => (
            <div key={r.label} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-300 shrink-0">{r.icon}</span>
              <div className="min-w-0">
                <div className="text-xs text-surface-400 dark:text-surface-500">{r.label}</div>
                <div className="text-sm font-medium text-surface-800 dark:text-surface-200 break-words">{r.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 shrink-0">
          <p className="text-xs text-surface-400 dark:text-surface-500">Expenses entry #{match.id} · matched by date + amount + mode.</p>
        </div>
      </div>
    </div>
  )
}

function EditEntryModal({ entry, onClose, onSave }: {
  entry: BankStatementEntry
  onClose: () => void
  onSave: (data: Partial<BankStatementEntry>) => Promise<void>
}) {
  const [txnDate, setTxnDate] = useState(entry.txn_date ?? '')
  const [valueDate, setValueDate] = useState(entry.value_date ?? '')
  const [narration, setNarration] = useState(entry.narration)
  const [refNo, setRefNo] = useState(entry.ref_no)
  const [debit, setDebit] = useState(entry.debit ?? '0')
  const [credit, setCredit] = useState(entry.credit ?? '0')
  const [balance, setBalance] = useState(entry.balance ?? '')
  const [balanceDc, setBalanceDc] = useState(entry.balance_dc)
  const [saving, setSaving] = useState(false)

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1'

  const submit = async () => {
    setSaving(true)
    try {
      await onSave({
        txn_date: txnDate || null,
        value_date: valueDate || null,
        narration: narration.trim(),
        ref_no: refNo.trim(),
        debit: debit === '' ? '0' : String(debit),
        credit: credit === '' ? '0' : String(credit),
        balance: balance === '' ? null : String(balance),
        balance_dc: balanceDc,
      })
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[95] bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3 className="font-bold text-surface-900 dark:text-white">Edit entry</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"><X className="w-5 h-5 text-surface-400" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
          <div><label className={labelCls}>Tran Date</label><input type="date" className={inputCls} value={txnDate} onChange={(e) => setTxnDate(e.target.value)} /></div>
          <div><label className={labelCls}>Value Date</label><input type="date" className={inputCls} value={valueDate} onChange={(e) => setValueDate(e.target.value)} /></div>
          <div className="col-span-2"><label className={labelCls}>Narration</label><textarea rows={2} className={inputCls} value={narration} onChange={(e) => setNarration(e.target.value)} /></div>
          <div><label className={labelCls}>Chq / Ref No</label><input className={inputCls} value={refNo} onChange={(e) => setRefNo(e.target.value)} /></div>
          <div><label className={labelCls}>Balance Cr/Dr</label>
            <select className={inputCls} value={balanceDc} onChange={(e) => setBalanceDc(e.target.value)}>
              <option value="">—</option><option value="Cr">Cr</option><option value="Dr">Dr</option>
            </select>
          </div>
          <div><label className={labelCls}>Withdrawal (Debit)</label><input className={inputCls} value={debit} onChange={(e) => setDebit(e.target.value)} /></div>
          <div><label className={labelCls}>Deposit (Credit)</label><input className={inputCls} value={credit} onChange={(e) => setCredit(e.target.value)} /></div>
          <div className="col-span-2"><label className={labelCls}>Balance (INR)</label><input className={inputCls} value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="blank = none" /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
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
