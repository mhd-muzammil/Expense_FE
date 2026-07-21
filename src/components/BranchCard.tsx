import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import { getCategoryHex } from '@/lib/categories'
import { fetchDashboard, fetchExpenses, type Expense } from '@/lib/api'
import {
  TrendingUp,
  TrendingDown,
  X,
  Package,
  MapPin,
  Calendar,
  Filter,
  ArrowLeft,
} from 'lucide-react'

// Shared branch summary card — used by both the Dashboard and the Region Expense
// page. Renders a single branch's credits/debits, a category-distribution
// breakdown (with drill-down into individual expenses), and local date filters.
export function BranchCard({ initialData, onFocus, onViewExpense }: { initialData: any, onFocus: (name: string) => void, onViewExpense: (exp: Expense) => void }) {
  const [localFilters, setLocalFilters] = useState({
    date_from: '',
    date_to: '',
  })
  const [activePreset, setActivePreset] = useState('all')
  const [showCustom, setShowCustom] = useState(false)
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [drillCategory, setDrillCategory] = useState<string | null>(null)
  const [drillExpenses, setDrillExpenses] = useState<Expense[]>([])
  const [loadingDrill, setLoadingDrill] = useState(false)

  const handleLocalFilterChange = (key: string, value: string) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }))
    setActivePreset('custom')
  }

  const applyPreset = (preset: string) => {
    setActivePreset(preset)
    const now = new Date()
    let from = ''
    let to = now.toISOString().split('T')[0]

    if (preset === 'all') {
      setLocalFilters({ date_from: '', date_to: '' })
      setShowCustom(false)
      return
    }

    if (preset === 'today') {
      from = to
    } else if (preset === '7d') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      from = d.toISOString().split('T')[0]
    } else if (preset === '30d') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      from = d.toISOString().split('T')[0]
    }

    setLocalFilters({ date_from: from, date_to: to })
    setShowCustom(false)
  }

  const isFiltered = localFilters.date_from || localFilters.date_to

  const updateData = async () => {
    if (!isFiltered) {
      setData(initialData)
      return
    }
    setLoading(true)
    try {
      const result = await fetchDashboard({
        branch: initialData.name,
        date_from: localFilters.date_from || undefined,
        date_to: localFilters.date_to || undefined
      })
      const branchResult = result.branch_breakdown.find((b: any) => b.branch === initialData.name)
      if (branchResult) {
        setData({
          name: branchResult.branch,
          Credits: Math.max(0, parseFloat(branchResult.total_credit) || 0),
          Debits: Math.max(0, parseFloat(branchResult.total_debit) || 0),
          categories: branchResult.category_breakdown?.map((c: any) => ({
            name: c.category,
            value: Math.max(0, parseFloat(c.total_debit) || 0)
          })) || []
        })
      } else {
        setData({
          name: initialData.name,
          Credits: 0,
          Debits: 0,
          categories: []
        })
      }
    } catch (err) {
      console.error('Failed to update branch card:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    updateData()
  }, [localFilters])

  useEffect(() => {
    if (!isFiltered) {
      setData(initialData)
    }
  }, [initialData, isFiltered])

  const handleCategoryClick = async (category: string) => {
    setDrillCategory(category)
    setLoadingDrill(true)
    try {
      const result = await fetchExpenses({
        branch: initialData.name,
        category: category,
        date_from: localFilters.date_from || undefined,
        date_to: localFilters.date_to || undefined
      })
      setDrillExpenses(result.results)
    } catch (err) {
      console.error('Failed to fetch drill expenses:', err)
    } finally {
      setLoadingDrill(false)
    }
  }

  const handleBack = () => {
    setDrillCategory(null)
    setDrillExpenses([])
  }

  return (
    <div className={`rounded-3xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 flex flex-col hover:shadow-xl transition-all duration-500 relative group overflow-hidden ${loading ? 'opacity-60' : ''}`}>
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-12 translate-x-12 blur-3xl group-hover:bg-indigo-500/10 transition-all duration-500" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-surface-800/40 z-20 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-bold text-primary-600 animate-pulse">Syncing...</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 mb-6 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-surface-900 dark:text-white leading-tight">{data.name}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isFiltered ? 'bg-emerald-500 animate-pulse' : 'bg-surface-300 dark:bg-surface-600'}`} />
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-widest">
                  {isFiltered ? 'Local Filter Active' : 'Global Context'}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => onFocus(data.name)}
            className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-all group/btn"
            title="Filter entire dashboard to this branch"
          >
            <Filter className="w-4 h-4 text-surface-400 group-hover/btn:text-primary-500 group-hover/btn:scale-110 transition-all" />
          </button>
        </div>

        {/* Advanced Filter UI */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-1 p-1 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700/50">
            {[
              { id: 'all', label: 'All' },
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                  activePreset === p.id
                    ? 'bg-white dark:bg-surface-800 text-primary-600 shadow-sm border border-surface-100 dark:border-surface-700'
                    : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                showCustom || activePreset === 'custom'
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'text-surface-400 hover:text-surface-600'
              }`}
            >
              Custom
            </button>
          </div>

          {showCustom && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex-1 relative">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-400" />
                <input
                  type="date"
                  value={localFilters.date_from}
                  onChange={(e) => handleLocalFilterChange('date_from', e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-[10px] rounded-lg bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
              <div className="flex-1 relative">
                <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-400" />
                <input
                  type="date"
                  value={localFilters.date_to}
                  onChange={(e) => handleLocalFilterChange('date_to', e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-[10px] rounded-lg bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
        <div className="group/stat relative p-4 rounded-2xl bg-emerald-50/20 dark:bg-emerald-900/5 border border-emerald-100/20 dark:border-emerald-900/10 hover:border-emerald-500/30 transition-all">
          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1.5">Credits</p>
          <p className="text-base font-bold text-surface-900 dark:text-white">{formatCurrency(data.Credits)}</p>
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500/20 group-hover/stat:bg-emerald-500 transition-all" />
        </div>
        <div className="group/stat relative p-4 rounded-2xl bg-red-50/20 dark:bg-red-900/5 border border-red-100/20 dark:border-red-900/10 hover:border-red-500/30 transition-all">
          <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mb-1.5">Debits</p>
          <p className="text-base font-bold text-surface-900 dark:text-white">{formatCurrency(data.Debits)}</p>
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500/20 group-hover/stat:bg-red-500 transition-all" />
        </div>
      </div>

      <div className="flex-1 space-y-4 relative z-10">
        <div className="flex items-center justify-between border-b border-surface-50 dark:border-surface-700/50 pb-2">
          <div className="flex items-center gap-2">
            {drillCategory && (
              <button
                onClick={handleBack}
                className="p-1 rounded-md hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-surface-400" />
              </button>
            )}
            <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">
              {drillCategory ? `Expenses: ${drillCategory}` : 'Category Distribution'}
            </span>
          </div>
          <span className="text-[10px] font-black text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20">
            -{formatCurrency(data.Debits)}
          </span>
        </div>

        <div className="space-y-4 pr-1 custom-scrollbar max-h-[180px] overflow-y-auto">
          {drillCategory ? (
            loadingDrill ? (
              <div className="space-y-3 py-2">
                {[1,2,3].map(i => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="skeleton h-3 w-3/4" />
                    <div className="skeleton h-2 w-1/2" />
                  </div>
                ))}
              </div>
            ) : drillExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-tighter">No expenses found</p>
              </div>
            ) : (
              drillExpenses.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => onViewExpense(exp)}
                  className="w-full text-left group/exp border-b border-surface-50 dark:border-surface-700/30 pb-3 last:border-0 hover:bg-surface-50/50 dark:hover:bg-surface-900/30 transition-all rounded-lg p-1 -m-1"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-surface-900 dark:text-white">
                      {exp.debited_amount ? formatCurrency(exp.debited_amount) : formatCurrency(exp.credited_amount || 0)}
                    </span>
                    <span className="text-[9px] text-surface-400 font-medium">{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className="text-[10px] text-surface-500 dark:text-surface-400 line-clamp-1">
                    {(exp.debit_remark || exp.credit_remark || 'No remark')}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] font-bold text-surface-400 uppercase tracking-tighter">By {exp.debit_person || exp.credit_person || '—'}</span>
                    <span className="text-[9px] text-primary-500 font-bold">{exp.debit_payment_mode || exp.credit_payment_mode || '—'}</span>
                  </div>
                </button>
              ))
            )
          ) : (
            data.categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-surface-50 dark:bg-surface-900 flex items-center justify-center mb-2">
                  <Package className="w-5 h-5 text-surface-200" />
                </div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-tighter">No data for selected period</p>
              </div>
            ) : (
              data.categories.map((cat: any, cIdx: number) => {
                const percentage = data.Debits > 0 ? (cat.value / data.Debits) * 100 : 0
                const color = getCategoryHex(cat.name, cIdx)
                return (
                  <div key={cat.name} className="group/item">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                        <span className="text-xs font-bold text-surface-700 dark:text-surface-300 group-hover/item:text-surface-900 dark:group-hover/item:text-white transition-colors">{cat.name}</span>
                      </div>
                      <button
                        onClick={() => handleCategoryClick(cat.name)}
                        className="text-xs font-black text-surface-900 dark:text-white hover:text-primary-500 dark:hover:text-primary-400 hover:scale-105 transition-all cursor-pointer underline decoration-dotted decoration-surface-300 underline-offset-4"
                      >
                        {formatCurrency(cat.value)}
                      </button>
                    </div>
                    <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-900/80 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                          boxShadow: `0 0 10px ${color}40`
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-surface-100 dark:border-surface-700 flex items-center justify-between relative z-10">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-surface-400 uppercase tracking-widest">Net Balance</span>
          <span className={`text-lg font-black tracking-tight ${data.Credits - data.Debits >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(data.Credits - data.Debits)}
          </span>
        </div>
        <div className={`p-2 rounded-xl ${data.Credits - data.Debits >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          {data.Credits - data.Debits >= 0 ? (
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600" />
          )}
        </div>
      </div>
    </div>
  )
}

// Shared expense-detail modal — opened when drilling into a single expense.
export function ExpenseDetailModal({ expense, onClose }: { expense: Expense, onClose: () => void }) {
  const isCredit = expense.credited_amount && parseFloat(expense.credited_amount) > 0
  const amount = isCredit ? expense.credited_amount : expense.debited_amount
  const remark = isCredit ? expense.credit_remark : expense.debit_remark
  const person = isCredit ? expense.credit_person : expense.debit_person
  const mode = isCredit ? expense.credit_payment_mode : expense.debit_payment_mode

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-surface-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-700">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Expense Details</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors">
            <X className="w-5 h-5 text-surface-500" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-surface-50 dark:border-surface-700/50">
            <span className="text-sm text-surface-500 dark:text-surface-400 font-medium">Amount</span>
            <span className={`text-lg font-black ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
              {isCredit ? '+' : '−'}{formatCurrency(amount || 0)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Date</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Category</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{expense.category}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Branch</p>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{expense.branch_location}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Payment Mode</p>
              <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">{mode || '—'}</p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Remark</p>
            <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed bg-surface-50 dark:bg-surface-900/50 p-3 rounded-xl border border-surface-100 dark:border-surface-700/50">
              {remark || 'No remark provided'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Person</p>
            <p className="text-sm font-semibold text-surface-900 dark:text-white">{person || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
