import { useEffect, useMemo } from 'react'
import { BarChart3, TrendingUp, TrendingDown, Building2, Calendar } from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import { formatCurrency } from '@/lib/utils'
import { CURRENCY_SYMBOL } from '@/lib/brand'
import type { PnlRow } from '@/lib/api'

// 'YYYY-MM' -> 'Apr 25'
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const mi = parseInt(m, 10) - 1
  if (mi < 0 || mi > 11) return key
  return `${MONTH_ABBR[mi]} ${y.slice(2)}`
}

// Full amount for grid cells with Indian grouping, e.g. ₹14,62,000. Zero → "–".
function fullAmount(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (!n || isNaN(n)) return '–'
  const sign = n < 0 ? '-' : ''
  return `${sign}${CURRENCY_SYMBOL}${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export default function ProfitLoss() {
  const { pnl, loadingPnl, pnlFilters, setPnlFilters, loadProfitLoss } = useExpenseStore()

  // Load on mount and whenever the P&L filters (fy / branch) change.
  useEffect(() => {
    loadProfitLoss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pnlFilters.fy, pnlFilters.branch])

  const months = pnl?.months ?? []

  const totalIncome = useMemo(() => parseFloat(pnl?.total_income ?? '0'), [pnl])
  const totalExpense = useMemo(() => parseFloat(pnl?.total_expense ?? '0'), [pnl])
  const netProfit = useMemo(() => parseFloat(pnl?.net_profit ?? '0'), [pnl])
  const isProfit = netProfit >= 0

  const hasData = !!pnl && (pnl.income.length > 0 || pnl.expense.length > 0)

  return (
    <div className="animate-fade-in">
      {/* Header + filters */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <BarChart3 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Profit &amp; Loss</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {pnl?.fy_label ?? 'Financial year'} · Income vs Expense by month
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Financial Year */}
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <select
              value={pnl?.fy_start ?? ''}
              onChange={(e) => setPnlFilters({ fy: e.target.value ? Number(e.target.value) : undefined })}
              className="pl-9 pr-8 py-2.5 rounded-lg text-sm font-medium bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
            >
              {(pnl?.available_fys ?? []).map((fy) => (
                <option key={fy} value={fy}>
                  FY {fy}-{String(fy + 1).slice(-2)}
                </option>
              ))}
            </select>
          </div>

          {/* Branch */}
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <select
              value={pnlFilters.branch ?? ''}
              onChange={(e) => setPnlFilters({ branch: e.target.value || undefined })}
              className="pl-9 pr-8 py-2.5 rounded-lg text-sm font-medium bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {(pnl?.branches ?? []).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 stagger-children">
        <SummaryCard
          label="Total Income"
          value={totalIncome}
          icon={<TrendingUp className="w-5 h-5" />}
          tone="income"
        />
        <SummaryCard
          label="Total Expense"
          value={totalExpense}
          icon={<TrendingDown className="w-5 h-5" />}
          tone="expense"
        />
        <SummaryCard
          label={isProfit ? 'Net Profit' : 'Net Loss'}
          value={Math.abs(netProfit)}
          icon={isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          tone={isProfit ? 'profit' : 'loss'}
        />
      </div>

      {/* Grid */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loadingPnl ? (
          <GridSkeleton />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart3 className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">No data for this period</p>
            <p className="text-sm text-surface-400 dark:text-surface-500 mt-1">
              Try another financial year or branch
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-200 dark:border-surface-700">
                  <th className="sticky left-0 z-20 bg-surface-50 dark:bg-surface-900/50 text-left p-3 font-semibold text-surface-600 dark:text-surface-300 min-w-[160px] whitespace-nowrap">
                    Category
                  </th>
                  {months.map((mk) => (
                    <th key={mk} className="p-3 font-semibold text-surface-600 dark:text-surface-300 text-right whitespace-nowrap min-w-[92px]">
                      {monthLabel(mk)}
                    </th>
                  ))}
                  <th className="sticky right-0 z-20 bg-surface-50 dark:bg-surface-900/50 p-3 font-bold text-surface-700 dark:text-surface-200 text-right whitespace-nowrap min-w-[110px] border-l border-surface-200 dark:border-surface-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* INCOME */}
                <SectionHeader label="Income" months={months.length} tone="income" />
                {pnl!.income.map((row) => (
                  <DataRow key={`inc-${row.category}`} row={row} months={months} tone="income" />
                ))}
                <TotalsRow
                  label="Total Income"
                  byMonth={pnl!.income_by_month}
                  months={months}
                  total={pnl!.total_income}
                  tone="income"
                />

                {/* EXPENSE */}
                <SectionHeader label="Expense" months={months.length} tone="expense" />
                {pnl!.expense.map((row) => (
                  <DataRow key={`exp-${row.category}`} row={row} months={months} tone="expense" />
                ))}
                <TotalsRow
                  label="Total Expense"
                  byMonth={pnl!.expense_by_month}
                  months={months}
                  total={pnl!.total_expense}
                  tone="expense"
                />

                {/* NET PROFIT / LOSS */}
                <NetRow
                  byMonth={pnl!.net_by_month}
                  months={months}
                  total={pnl!.net_profit}
                />
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-surface-400 dark:text-surface-500 mt-3 px-1">
        Income &amp; expense are auto-classified from the ledger; branches merged case-insensitively.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: 'income' | 'expense' | 'profit' | 'loss'
}) {
  const tones = {
    income: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    expense: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    profit: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    loss: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  }
  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-surface-500 dark:text-surface-400">{label}</span>
        <span className={`flex items-center justify-center w-9 h-9 rounded-lg ${tones[tone]}`}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${tone === 'expense' || tone === 'loss' ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
        {formatCurrency(value)}
      </div>
    </div>
  )
}

function SectionHeader({ label, months, tone }: { label: string; months: number; tone: 'income' | 'expense' }) {
  const bg = tone === 'income'
    ? 'bg-emerald-50/70 dark:bg-emerald-900/20'
    : 'bg-sky-50/70 dark:bg-sky-900/20'
  const text = tone === 'income'
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-sky-700 dark:text-sky-300'
  return (
    <tr className={bg}>
      <td className={`sticky left-0 z-10 ${bg} p-2.5 pl-3 font-bold uppercase text-xs tracking-wide ${text} whitespace-nowrap`}>
        {label}
      </td>
      <td colSpan={months + 1} className={`p-2.5 ${bg}`} />
    </tr>
  )
}

function DataRow({ row, months, tone }: { row: PnlRow; months: string[]; tone: 'income' | 'expense' }) {
  const amountColor = tone === 'income'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'
  return (
    <tr className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/60 dark:hover:bg-surface-700/30 transition-colors">
      <td className="sticky left-0 z-10 bg-white dark:bg-surface-800 hover:bg-surface-50/60 dark:hover:bg-surface-700/30 p-3 font-medium text-surface-700 dark:text-surface-200 whitespace-nowrap">
        {row.category}
      </td>
      {months.map((mk) => {
        const raw = row.monthly[mk] ?? '0'
        const n = parseFloat(raw)
        return (
          <td
            key={mk}
            title={n ? formatCurrency(raw) : ''}
            className={`p-3 text-right tabular-nums whitespace-nowrap ${n ? amountColor : 'text-surface-300 dark:text-surface-600'}`}
          >
            {fullAmount(raw)}
          </td>
        )
      })}
      <td
        title={formatCurrency(row.total)}
        className={`sticky right-0 z-10 bg-white dark:bg-surface-800 p-3 text-right font-semibold tabular-nums whitespace-nowrap border-l border-surface-100 dark:border-surface-700 ${amountColor}`}
      >
        {fullAmount(row.total)}
      </td>
    </tr>
  )
}

function TotalsRow({
  label,
  byMonth,
  months,
  total,
  tone,
}: {
  label: string
  byMonth: Record<string, string>
  months: string[]
  total: string
  tone: 'income' | 'expense'
}) {
  const bg = tone === 'income'
    ? 'bg-emerald-50 dark:bg-emerald-900/25'
    : 'bg-sky-50 dark:bg-sky-900/25'
  const color = tone === 'income'
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-sky-700 dark:text-sky-300'
  return (
    <tr className={`${bg} border-b-2 border-surface-200 dark:border-surface-700 font-semibold`}>
      <td className={`sticky left-0 z-10 ${bg} p-3 ${color} whitespace-nowrap`}>{label}</td>
      {months.map((mk) => {
        const raw = byMonth[mk] ?? '0'
        const n = parseFloat(raw)
        return (
          <td key={mk} title={n ? formatCurrency(raw) : ''} className={`p-3 text-right tabular-nums whitespace-nowrap ${n ? color : 'text-surface-300 dark:text-surface-600'}`}>
            {fullAmount(raw)}
          </td>
        )
      })}
      <td title={formatCurrency(total)} className={`sticky right-0 z-10 ${bg} p-3 text-right font-bold tabular-nums whitespace-nowrap border-l border-surface-200 dark:border-surface-700 ${color}`}>
        {fullAmount(total)}
      </td>
    </tr>
  )
}

function NetRow({ byMonth, months, total }: { byMonth: Record<string, string>; months: string[]; total: string }) {
  const netTotal = parseFloat(total)
  const totalProfit = netTotal >= 0
  return (
    <tr className="bg-surface-800 dark:bg-surface-900 text-white font-bold border-t-2 border-surface-300 dark:border-surface-600">
      <td className="sticky left-0 z-10 bg-surface-800 dark:bg-surface-900 p-3.5 whitespace-nowrap uppercase text-xs tracking-wide">
        Net {totalProfit ? 'Profit' : 'Loss'}
      </td>
      {months.map((mk) => {
        const raw = byMonth[mk] ?? '0'
        const n = parseFloat(raw)
        const cls = n === 0
          ? 'text-surface-500'
          : n > 0
            ? 'text-emerald-400'
            : 'text-red-400'
        return (
          <td key={mk} title={n ? formatCurrency(raw) : ''} className={`p-3.5 text-right tabular-nums whitespace-nowrap ${cls}`}>
            {fullAmount(raw)}
          </td>
        )
      })}
      <td
        title={formatCurrency(total)}
        className={`sticky right-0 z-10 bg-surface-800 dark:bg-surface-900 p-3.5 text-right tabular-nums whitespace-nowrap border-l border-surface-600 ${totalProfit ? 'text-emerald-400' : 'text-red-400'}`}
      >
        {fullAmount(total)}
      </td>
    </tr>
  )
}

function GridSkeleton() {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="skeleton h-9 rounded-lg" style={{ animationDelay: `${i * 40}ms` }} />
      ))}
    </div>
  )
}
