import { useMemo, useState } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import { formatCurrency } from '@/lib/utils'
import { getCategoryHex } from '@/lib/categories'
import { CURRENCY_SYMBOL } from '@/lib/brand'
import { setPaymentModeBalance } from '@/lib/api'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Pencil,
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

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'GPay', 'PhonePe', 'UPI', 'Cheque', 'Other']

export default function Dashboard() {
  const { dashboard, loadingDashboard, branches, categories, filters, setFilters, loadDashboard, loadExpenses, paymentModeBalances, loadPaymentModeBalances } = useExpenseStore()
  const [editingMode, setEditingMode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddMode, setShowAddMode] = useState(false)
  const [newMode, setNewMode] = useState('')
  const [newModeBalance, setNewModeBalance] = useState('')
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

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
    }))
  }, [dashboard])

  const totalBalance = dashboard ? parseFloat(dashboard.total_balance) || 0 : 0
  const totalCredits = dashboard ? parseFloat(dashboard.total_credits) || 0 : 0
  const totalDebits = dashboard ? parseFloat(dashboard.total_debits) || 0 : 0

  // Set default selected month if not set
  if (dashboard?.monthly_trend?.length && !selectedMonth) {
    setSelectedMonth(dashboard.monthly_trend[dashboard.monthly_trend.length - 1].month)
  }

  const selectedMonthData = dashboard?.monthly_trend?.find(m => m.month === selectedMonth)

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
              <p className="text-sm text-white/60 mt-1">Company-wide balance</p>
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

      {/* Monthly Trend Summary Card */}
      {!loadingDashboard && dashboard && (
        <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-white">Monthly Total Expenses</h3>
              </div>
              
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 cursor-pointer"
                >
                  {dashboard.monthly_trend.map(m => (
                    <option key={m.month} value={m.month}>{m.month}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1"> Month Total Credits</p>
                <p className="text-xl font-bold text-surface-900 dark:text-white">
                  {formatCurrency(parseFloat(selectedMonthData?.credits || '0'))}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/20">
                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1"> Month Total Debits</p>
                <p className="text-xl font-bold text-surface-900 dark:text-white">
                  {formatCurrency(parseFloat(selectedMonthData?.debits || '0'))}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700">
                <p className="text-[10px] font-bold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-1">Month Net Balance</p>
                <p className={`text-xl font-bold ${(parseFloat(selectedMonthData?.credits || '0') - parseFloat(selectedMonthData?.debits || '0')) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(parseFloat(selectedMonthData?.credits || '0') - parseFloat(selectedMonthData?.debits || '0'))}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Mode Balances */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h3 className="text-base font-semibold text-surface-900 dark:text-white">Payment Mode Balances</h3>
          </div>
          <button
            onClick={() => setShowAddMode(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
              bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400
              hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Mode
          </button>
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
                {PAYMENT_MODES.filter(m => !paymentModeBalances.find(b => b.payment_mode === m)).map(m => (
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

        {paymentModeBalances.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-4">No payment modes configured. Click "Add Mode" to set initial balances.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paymentModeBalances.map((bal) => {
              const current = parseFloat(bal.current_balance)
              const initial = parseFloat(bal.initial_balance)
              return (
                <div key={bal.payment_mode} className="rounded-xl p-4 border border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">{bal.payment_mode}</span>
                    <button
                      onClick={() => { setEditingMode(bal.payment_mode); setEditValue(initial.toString()) }}
                      className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                      title="Edit initial balance"
                    >
                      <Pencil className="w-3 h-3 text-surface-400" />
                    </button>
                  </div>
                  <p className={`text-xl font-bold ${current >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(current)}
                  </p>
                  {editingMode === bal.payment_mode ? (
                    <div className="flex items-center gap-1 mt-2">
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
                        }}
                        className="p-1 rounded bg-primary-500 text-white"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-surface-400 mt-1">Initial: {formatCurrency(initial)}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Charts */}
      {loadingDashboard ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-children items-stretch">
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

          {/* Branch-wise Breakdown — Premium Horizontal List */}
          <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-white">
                  Branch-wise Expenses
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">Spending breakdown by location</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 max-h-[300px]">
              {branchData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-surface-50 dark:bg-surface-900 flex items-center justify-center mb-3">
                    <MapPin className="w-6 h-6 text-surface-300" />
                  </div>
                  <p className="text-sm text-surface-400">No branch data available</p>
                </div>
              ) : (
                branchData.map((item, index) => {
                  const percentage = totalDebits > 0 ? (item.Debits / totalDebits) * 100 : 0
                  // Use a distinct color for branches
                  const color = `hsl(${200 + (index * 40)}, 70%, 50%)`
                  
                  return (
                    <div key={item.name} className="group relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm"
                            style={{ backgroundColor: `${color}15`, color: color }}
                          >
                            <MapPin className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">{item.name}</p>
                            <p className="text-[10px] font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                              {percentage.toFixed(1)}% of total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-surface-900 dark:text-white">{formatCurrency(item.Debits)}</p>
                        </div>
                      </div>
                      
                      {/* Progress Bar Container */}
                      <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out"
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
        </div>
      )}
    </div>
  )
}
