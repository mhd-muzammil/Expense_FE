import { useEffect, useMemo, useState } from 'react'
import { MapPin, Search, Building2 } from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import { formatCurrency } from '@/lib/utils'
import { fetchDashboard, type Expense } from '@/lib/api'
import { BranchCard, ExpenseDetailModal } from '@/components/BranchCard'

interface BranchDatum {
  name: string
  Credits: number
  Debits: number
  categories: { name: string; value: number }[]
}

export default function RegionExpense() {
  const addToast = useExpenseStore((s) => s.addToast)

  const [branches, setBranches] = useState<BranchDatum[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await fetchDashboard()
      const mapped: BranchDatum[] = (data.branch_breakdown ?? []).map((item) => ({
        name: item.branch || 'Unknown',
        Credits: Math.max(0, parseFloat(item.total_credit) || 0),
        Debits: Math.max(0, parseFloat(item.total_debit) || 0),
        categories: (item.category_breakdown ?? []).map((c) => ({
          name: c.category,
          value: Math.max(0, parseFloat(c.total_debit) || 0),
        })),
      }))
      setBranches(mapped)
    } catch {
      addToast('error', 'Failed to load region data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q ? branches.filter((b) => b.name.toLowerCase().includes(q)) : branches
    // Highest spend (Debits) first — the regions that need attention on top.
    return [...list].sort((a, b) => b.Debits - a.Debits)
  }, [branches, search])

  const totals = useMemo(() => {
    const credits = branches.reduce((s, b) => s + b.Credits, 0)
    const debits = branches.reduce((s, b) => s + b.Debits, 0)
    return { credits, debits, net: credits - debits, count: branches.length }
  }, [branches])

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30">
            <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Region Expense</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Branch-wise detailed breakdown · {totals.count} region{totals.count === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search region…"
            className="pl-9 pr-3 py-2.5 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 stagger-children">
        <SummaryCard label="Total Credits" value={totals.credits} tone="credit" />
        <SummaryCard label="Total Debits" value={totals.debits} tone="debit" />
        <SummaryCard label={totals.net >= 0 ? 'Net Balance' : 'Net Deficit'} value={Math.abs(totals.net)} tone={totals.net >= 0 ? 'credit' : 'debit'} />
      </div>

      {/* Branch cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-3xl h-96 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
          <p className="text-surface-500 dark:text-surface-400 font-medium">
            {search ? 'No region matches your search' : 'No region data yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger-children">
          {filtered.map((branch) => (
            <BranchCard
              key={branch.name}
              initialData={branch}
              // Region page has no global dashboard filter to drive, so focusing
              // a branch simply scrolls it into view (no-op link kept for parity).
              onFocus={() => {}}
              onViewExpense={(exp) => setViewingExpense(exp)}
            />
          ))}
        </div>
      )}

      {viewingExpense && (
        <ExpenseDetailModal expense={viewingExpense} onClose={() => setViewingExpense(null)} />
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'credit' | 'debit' }) {
  const color = tone === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700">
      <div className="text-sm font-medium text-surface-500 dark:text-surface-400 mb-2">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{formatCurrency(value)}</div>
    </div>
  )
}
