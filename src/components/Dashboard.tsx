import { useMemo } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import { formatCurrency } from '@/lib/utils'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar,
} from 'recharts'

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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

export default function Dashboard() {
  const { dashboard, loadingDashboard, branches, filters, setFilters, loadDashboard, loadExpenses } = useExpenseStore()

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
    return dashboard.category_breakdown.map((item) => ({
      name: item.category || 'Unknown',
      value: Math.max(0, parseFloat(item.total_debit) || 0),
      credit: Math.max(0, parseFloat(item.total_credit) || 0),
    }))
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filters.branch || ''}
          onChange={(e) => handleFilterChange('branch', e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
            text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
            focus:border-primary-500 transition-all"
        >
          <option value="">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select
          value={filters.category || ''}
          onChange={(e) => handleFilterChange('category', e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
            text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
            focus:border-primary-500 transition-all"
        >
          <option value="">All Categories</option>
          {['Petrol', 'Food', 'Travel', 'Snacks', 'Misc'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

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
              <span className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Credits</span>
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
              <span className="text-sm font-medium text-surface-500 dark:text-surface-400">Total Debits</span>
            </div>
            <p className="text-3xl font-bold text-surface-900 dark:text-white">{formatCurrency(totalDebits)}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Expenses</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {loadingDashboard ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
          <SkeletonChart />
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
          {/* Pie Chart — Category Breakdown */}
          <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700">
            <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
              Expenses by Category
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={55}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                    fontSize: '13px',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart — Monthly Trend */}
          <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700">
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
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
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

          {/* Bar Chart — Branch-wise */}
          <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700">
            <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
              Branch-wise Expenses
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={branchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
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
                <Bar dataKey="Credits" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Debits" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
