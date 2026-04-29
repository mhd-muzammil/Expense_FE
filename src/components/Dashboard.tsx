import { useMemo, useState, useEffect } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import { formatCurrency } from '@/lib/utils'
import { getCategoryHex } from '@/lib/categories'
import { CURRENCY_SYMBOL } from '@/lib/brand'
import { setPaymentModeBalance, deletePaymentModeBalance, fetchDashboard, fetchPaymentModeBalances } from '@/lib/api'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Pencil,
  Trash2,
  X,
  Check,
  Plus,
  ChevronDown,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Package,
  MoreHorizontal,
  CreditCard,
  MapPin,
  Calendar,
  Filter,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, Sector,
} from 'recharts'

function CategoryIcon({ category, className }: { category: string, className?: string }) {
  const cat = category.toLowerCase()
  if (cat.includes('food') || cat.includes('snack')) return <Utensils className={className} />
  if (cat.includes('travel') || cat.includes('petrol') || cat.includes('fuel')) return <Car className={className} />
  if (cat.includes('shop') || cat.includes('bill')) return <ShoppingBag className={className} />
  if (cat.includes('elect') || cat.includes('rent') || cat.includes('utility')) return <Zap className={className} />
  if (cat.includes('salary') || cat.includes('income')) return <CreditCard className={className} />
  if (cat.includes('misc') || cat.includes('other')) return <MoreHorizontal className={className} />
  return <Package className={className} />
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-36 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm">
      <div className="skeleton h-5 w-40 mb-4" />
      <div className="skeleton h-[250px] w-full" />
    </div>
  )
}

function BranchCard({ initialData, onFocus }: { initialData: any, onFocus: (name: string) => void }) {
  const [localFilters, setLocalFilters] = useState({
    date_from: '',
    date_to: '',
  })
  const [activePreset, setActivePreset] = useState('all')
  const [showCustom, setShowCustom] = useState(false)
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

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
          <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Category Distribution</span>
          <span className="text-[10px] font-black text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-900/20">
            -{formatCurrency(data.Debits)}
          </span>
        </div>

        <div className="space-y-4 pr-1 custom-scrollbar max-h-[180px] overflow-y-auto">
          {data.categories.length === 0 ? (
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
                    <span className="text-xs font-black text-surface-900 dark:text-white">{formatCurrency(cat.value)}</span>
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

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'GPay', 'PhonePe', 'UPI', 'Cheque', 'Other']

// Generate financial year options (current + last 5 years)
function getFinancialYears(): { label: string; value: string }[] {
  const now = new Date()
  const currentMonth = now.getMonth() // 0-indexed
  const currentYear = now.getFullYear()
  // If we're in Jan-Mar, current FY started last year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1
  const years: { label: string; value: string }[] = []
  for (let i = 0; i < 6; i++) {
    const start = fyStartYear - i
    const end = start + 1
    years.push({ label: `FY ${start}-${end}`, value: `${start}-${end}` })
  }
  return years
}

export default function Dashboard() {
  const { dashboard, loadingDashboard, branches, categories, filters, setFilters, loadDashboard, loadExpenses, paymentModeBalances, loadPaymentModeBalances } = useExpenseStore()
  const [editingMode, setEditingMode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddMode, setShowAddMode] = useState(false)
  const [newMode, setNewMode] = useState('')
  const [newModeBalance, setNewModeBalance] = useState('')
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const [activePreset, setActivePreset] = useState('all')
  const [showCustom, setShowCustom] = useState(false)
  const [deletingMode, setDeletingMode] = useState<string | null>(null)
  const [pmFy, setPmFy] = useState('')
  const [pmLoading, setPmLoading] = useState(false)
  const [localPmBalances, setLocalPmBalances] = useState(paymentModeBalances)

  const financialYears = useMemo(() => getFinancialYears(), [])

  // Reload payment mode balances when FY changes
  useEffect(() => {
    const loadFiltered = async () => {
      setPmLoading(true)
      try {
        const data = await fetchPaymentModeBalances(pmFy ? { fy: pmFy } : undefined)
        setLocalPmBalances(data)
      } catch (err) {
        console.error('Failed to load payment mode balances:', err)
      } finally {
        setPmLoading(false)
      }
    }
    loadFiltered()
  }, [pmFy])

  // Sync with global store when no FY filter
  useEffect(() => {
    if (!pmFy) {
      setLocalPmBalances(paymentModeBalances)
    }
  }, [paymentModeBalances, pmFy])

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 15}
          fill={fill}
        />
      </g>
    )
  }

  const handleFilterChange = async (key: string, value: string) => {
    if (key === 'date_from' || key === 'date_to') {
      setActivePreset('custom')
      setShowCustom(true)
    }
    setFilters({ [key]: value || undefined })
    // Use the actions provided by the hook instead of reach into global state if avoidable
    // But since filters are updated in the store, we need to ensure they are picked up
    try {
      await Promise.all([loadDashboard(), loadExpenses()])
    } catch (err) {
      console.error('Filter update failed:', err)
    }
  }

  // Prepare chart data with extra safety
  const categoryData = useMemo(() => {
    if (!dashboard || !dashboard.category_breakdown) return []
    return dashboard.category_breakdown
      .map((item) => ({
        name: item.category || 'Unknown',
        value: Math.max(0, parseFloat(item.total_debit) || 0),
        credit: Math.max(0, parseFloat(item.total_credit) || 0),
      }))
      .sort((a, b) => b.value - a.value)
  }, [dashboard])

  const monthlyData = useMemo(() => {
    if (!dashboard || !dashboard.monthly_trend) return []
    return dashboard.monthly_trend.map((item) => ({
      month: item.month || 'Other',
      Credits: Math.max(0, parseFloat(item.credits) || 0),
      Debits: Math.max(0, parseFloat(item.debits) || 0),
    }))
  }, [dashboard])

  const branchData = useMemo(() => {
    if (!dashboard || !dashboard.branch_breakdown) return []
    return dashboard.branch_breakdown.map((item) => ({
      name: item.branch || 'Unknown',
      Credits: Math.max(0, parseFloat(item.total_credit) || 0),
      Debits: Math.max(0, parseFloat(item.total_debit) || 0),
      categories: item.category_breakdown?.map(c => ({
        name: c.category,
        value: Math.max(0, parseFloat(c.total_debit) || 0)
      })) || []
    }))
  }, [dashboard])

  const applyPreset = async (preset: string) => {
    setActivePreset(preset)
    const now = new Date()
    let from = ''
    let to = now.toISOString().split('T')[0]

    if (preset === 'all') {
      from = ''
      to = ''
    } else if (preset === 'today') {
      from = to
    } else if (preset === '7d') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      from = d.toISOString().split('T')[0]
    } else if (preset === '30d') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      from = d.toISOString().split('T')[0]
    } else if (preset === 'this_month') {
      const d = new Date()
      from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      to = lastDay.toISOString().split('T')[0]
    }

    if (preset !== 'custom') {
      setShowCustom(false)
      setFilters({ date_from: from || undefined, date_to: to || undefined })
      setTimeout(() => {
        loadDashboard()
        loadExpenses()
      }, 0)
    } else {
      setShowCustom(true)
    }
  }

  const totalCredits = dashboard ? parseFloat(dashboard.total_credits) || 0 : 0
  const totalDebits = dashboard ? parseFloat(dashboard.total_debits) || 0 : 0
  const totalBalance = totalCredits - totalDebits

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <input
            type="text"
            list="branch-suggestions"
            value={filters.branch || ''}
            onChange={(e) => handleFilterChange('branch', e.target.value)}
            placeholder="All Branches"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
              text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
              focus:border-primary-500 transition-all min-w-[160px]"
          />
          <datalist id="branch-suggestions">
            {branches.map((b) => (
              <option key={b.id} value={b.location}>{b.location}</option>
            ))}
          </datalist>
        </div>

        <div className="relative">
          <input
            type="text"
            list="category-suggestions"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            placeholder="All Categories"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
              text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
              focus:border-primary-500 transition-all min-w-[160px]"
          />
          <datalist id="category-suggestions">
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </datalist>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700/50">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: 'this_month', label: 'This Month' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activePreset === p.id 
                  ? 'bg-white dark:bg-surface-800 text-primary-600 shadow-sm border border-surface-100 dark:border-surface-700' 
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => applyPreset('custom')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              showCustom || activePreset === 'custom'
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' 
                : 'text-surface-400 hover:text-surface-600'
            }`}
          >
            Custom
          </button>
        </div>

        {showCustom && (
          <>
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              placeholder="From Date"
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
                focus:border-primary-500 transition-all"
            />

            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              placeholder="To Date"
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
                focus:border-primary-500 transition-all"
            />
          </>
        )}

        {(filters.branch || filters.category || filters.date_from || filters.date_to) && (
          <button
            onClick={() => {
              useExpenseStore.getState().resetFilters()
              setTimeout(() => {
                useExpenseStore.getState().loadDashboard()
                useExpenseStore.getState().loadExpenses()
              }, 0)
            }}
            className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400
              text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Stat Cards */}
      {loadingDashboard ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          {/* Total Balance */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-white/80">Total Balance</span>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-sm text-white/60 mt-1">For selected period</p>
            </div>
          </div>

          {/* Total Credits */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700
            hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-surface-500 dark:text-surface-400"> Overall Total Credits</span>
            </div>
            <p className="text-3xl font-bold text-surface-900 dark:text-white">{formatCurrency(totalCredits)}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Income</span>
            </div>
          </div>

          {/* Total Debits */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700
            hover:shadow-md hover:shadow-red-500/5 transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm font-medium text-surface-500 dark:text-surface-400">Overall Total Debits</span>
            </div>
            <p className="text-3xl font-bold text-surface-900 dark:text-white">{formatCurrency(totalDebits)}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Expenses</span>
            </div>
          </div>
        </div>
      )}



      {/* Payment Mode Balances */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Landmark className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-surface-900 dark:text-white">Payment Mode Balances</h3>
              <p className="text-[10px] text-surface-400 font-medium">
                {pmFy ? `Showing ${pmFy}` : 'All time'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Financial Year Filter */}
            <select
              value={pmFy}
              onChange={(e) => setPmFy(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer"
            >
              <option value="">All Time</option>
              {financialYears.map(fy => (
                <option key={fy.value} value={fy.value}>{fy.label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddMode(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400
                hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Mode
            </button>
          </div>
        </div>

        {/* Add new mode form */}
        {showAddMode && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
            <div className="flex-1 relative">
              <input
                type="text"
                list="payment-mode-suggestions"
                value={newMode}
                onChange={(e) => setNewMode(e.target.value)}
                placeholder="Select or type mode"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm"
              />
              <datalist id="payment-mode-suggestions">
                {PAYMENT_MODES.filter(m => !localPmBalances.find(b => b.payment_mode === m)).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </datalist>
            </div>
            <input
              type="number"
              placeholder="Initial Balance"
              value={newModeBalance}
              onChange={(e) => setNewModeBalance(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm"
            />
            <button
              onClick={async () => {
                if (newMode && newModeBalance) {
                  await setPaymentModeBalance(newMode, parseFloat(newModeBalance))
                  await loadPaymentModeBalances()
                  setPmFy('') // reset FY to refresh
                  setShowAddMode(false)
                  setNewMode('')
                  setNewModeBalance('')
                }
              }}
              className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowAddMode(false); setNewMode(''); setNewModeBalance('') }}
              className="p-2 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-300 transition-all"
            >
              <span className="text-xs font-medium px-1">Cancel</span>
            </button>
          </div>
        )}

        {pmLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl p-5 border border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="skeleton h-7 w-32 mb-4" />
                <div className="skeleton h-3 w-full mb-2" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))}
          </div>
        ) : localPmBalances.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-4">No payment modes configured. Click "Add Mode" to set initial balances.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {localPmBalances.map((bal) => {
              const current = parseFloat(bal.current_balance)
              const initial = parseFloat(bal.initial_balance)
              const credits = parseFloat(bal.total_credits || '0')
              const debits = parseFloat(bal.total_debits || '0')
              const maxFlow = Math.max(credits, debits, 1)
              return (
                <div key={bal.payment_mode} className="group/card relative rounded-xl p-5 border border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300 overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-primary-500/5 rounded-full -translate-y-8 translate-x-8 group-hover/card:bg-primary-500/10 transition-all duration-500" />
                  
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="text-sm font-bold text-surface-800 dark:text-surface-200">{bal.payment_mode}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => { setEditingMode(bal.payment_mode); setEditValue(initial.toString()) }}
                        className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        title="Edit initial balance"
                      >
                        <Pencil className="w-3 h-3 text-surface-400" />
                      </button>
                      {deletingMode === bal.payment_mode ? (
                        <div className="flex items-center gap-1 animate-in fade-in duration-200">
                          <button
                            onClick={async () => {
                              await deletePaymentModeBalance(bal.payment_mode)
                              await loadPaymentModeBalances()
                              setDeletingMode(null)
                              // Refresh local list
                              const data = await fetchPaymentModeBalances(pmFy ? { fy: pmFy } : undefined)
                              setLocalPmBalances(data)
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                            title="Confirm delete"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingMode(null)}
                            className="p-0.5 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3 h-3 text-surface-400" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingMode(bal.payment_mode)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group/del"
                          title="Delete payment mode"
                        >
                          <Trash2 className="w-3 h-3 text-surface-400 group-hover/del:text-red-500 transition-colors" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Current Balance */}
                  <div className="mb-4 relative z-10">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Current Balance</p>
                    <p className={`text-2xl font-black tracking-tight ${current >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(current)}
                    </p>
                  </div>

                  {/* Credits & Debits Breakdown */}
                  <div className="space-y-3 mb-4 relative z-10">
                    {/* Credits */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Credits</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(credits)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-900/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                          style={{ width: `${(credits / maxFlow) * 100}%`, boxShadow: '0 0 8px rgba(16,185,129,0.3)' }}
                        />
                      </div>
                    </div>
                    {/* Debits */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowDownRight className="w-3 h-3 text-red-500" />
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Debits</span>
                        </div>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(debits)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-900/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-500 transition-all duration-1000 ease-out"
                          style={{ width: `${(debits / maxFlow) * 100}%`, boxShadow: '0 0 8px rgba(239,68,68,0.3)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Initial Balance / Edit */}
                  <div className="pt-3 border-t border-surface-100 dark:border-surface-700/50 relative z-10">
                    {editingMode === bal.payment_mode ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            await setPaymentModeBalance(bal.payment_mode, parseFloat(editValue))
                            await loadPaymentModeBalances()
                            setEditingMode(null)
                            // Refresh local
                            const data = await fetchPaymentModeBalances(pmFy ? { fy: pmFy } : undefined)
                            setLocalPmBalances(data)
                          }}
                          className="p-1 rounded bg-primary-500 text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Initial Balance</span>
                        <span className="text-xs font-bold text-surface-600 dark:text-surface-300">{formatCurrency(initial)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Charts */}
      {loadingDashboard ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-children items-stretch">
          {/* Category Breakdown — Premium Horizontal List */}
          <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-white">
                  Expenses by Category
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">Distribution of total spending</p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-100 dark:border-red-900/30">
                Total: {formatCurrency(totalDebits)}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 max-h-[300px]">
              {categoryData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-surface-50 dark:bg-surface-900 flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-surface-300" />
                  </div>
                  <p className="text-sm text-surface-400">No expense data available</p>
                </div>
              ) : (
                categoryData.map((item, index) => {
                  const percentage = totalDebits > 0 ? (item.value / totalDebits) * 100 : 0
                  const color = getCategoryHex(item.name, index)
                  
                  return (
                    <div key={item.name} className="group relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm"
                            style={{ backgroundColor: `${color}15`, color: color }}
                          >
                            <CategoryIcon category={item.name} className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">{item.name}</p>
                            <p className="text-[10px] font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                              {percentage.toFixed(1)}% of total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-surface-900 dark:text-white">{formatCurrency(item.value)}</p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-[10px] text-surface-400 font-medium">Category</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar Container */}
                      <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]"
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: color,
                            boxShadow: `0 0 12px ${color}40`
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          {/* Line Chart — Monthly Trend */}
          <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 min-h-[420px] flex flex-col">
            <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
              Monthly Trend
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${CURRENCY_SYMBOL}${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                    fontSize: '13px',
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Credits"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Debits"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Branch Detailed Breakdown Section */}
      {!loadingDashboard && branchData.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-surface-900 dark:text-white">Branch-wise Detailed Breakdown</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 stagger-children">
            {branchData.map((branch) => (
              <BranchCard 
                key={branch.name} 
                initialData={branch} 
                onFocus={(name) => handleFilterChange('branch', name)} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
