import { useEffect, useState } from 'react'
import {
  Lightbulb, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Info,
  Building2, ArrowUpRight, ArrowDownRight, Loader2, RefreshCw, CalendarDays, X,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import useExpenseStore from '@/store/useExpenseStore'
import { formatCurrency } from '@/lib/utils'
import { CURRENCY_SYMBOL } from '@/lib/brand'
import { fetchInsights, type InsightsData, type InsightsFilters } from '@/lib/api'

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const mi = parseInt(m, 10) - 1
  if (mi < 0 || mi > 11) return key
  return `${MONTH_ABBR[mi]} ${y.slice(2)}`
}

function monthLabelFull(key: string): string {
  const [y, m] = key.split('-')
  const mi = parseInt(m, 10) - 1
  if (mi < 0 || mi > 11) return key
  return `${MONTH_FULL[mi]} ${y}`
}

const num = (v: string | number | null | undefined) =>
  (typeof v === 'string' ? parseFloat(v) : v) || 0

export default function Insights() {
  const addToast = useExpenseStore((s) => s.addToast)
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters: either a trailing window (months) OR an explicit date range.
  const [months, setMonths] = useState<number | undefined>(12)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [branch, setBranch] = useState('')
  const [showDates, setShowDates] = useState(false)

  const load = async (f: InsightsFilters) => {
    setLoading(true)
    try {
      setData(await fetchInsights(f))
    } catch {
      addToast('error', 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const usingRange = !!(dateFrom && dateTo)
  const filters: InsightsFilters = usingRange
    ? { date_from: dateFrom, date_to: dateTo, branch: branch || undefined }
    : { months, branch: branch || undefined }

  useEffect(() => {
    load(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, dateFrom, dateTo, branch])

  const pickWindow = (m: number) => {
    setDateFrom('')
    setDateTo('')
    setShowDates(false)
    setMonths(m)
  }

  const clearDates = () => {
    setDateFrom('')
    setDateTo('')
    setMonths(12)
  }

  const summary = data?.summary
  const netProfit = num(summary?.net_profit)
  const isProfit = !!summary?.is_profit

  const chartData = (data?.monthly_trend ?? []).map((r) => ({
    month: monthLabel(r.month),
    Income: num(r.income),
    Expense: num(r.expense),
  }))

  const monthRows = (data?.monthly_breakdown ?? []).filter((m) => m.has_data)

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30 shrink-0">
          <Lightbulb className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">Business Insights</h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 truncate">
            {data?.window_label ?? 'Analysing your entries'} · how the business is actually doing
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4 mb-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wide mr-1">
            Period
          </span>
          {[6, 12, 24].map((m) => (
            <button
              key={m}
              onClick={() => pickWindow(m)}
              className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                !usingRange && months === m
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-surface-50 dark:bg-surface-900 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700'
              }`}
            >
              Last {m} months
            </button>
          ))}
          <button
            onClick={() => setShowDates((v) => !v)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              usingRange
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-surface-50 dark:bg-surface-900 text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Pick dates
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="pl-9 pr-8 py-2 rounded-lg text-sm font-medium bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none cursor-pointer"
              >
                <option value="">All Branches</option>
                {(data?.branches ?? []).map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => load(filters)}
              disabled={loading}
              className="p-2.5 rounded-lg bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-300 disabled:opacity-60"
              aria-label="Refresh"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {(showDates || usingRange) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-surface-100 dark:border-surface-700">
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">From date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1">To date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {usingRange && (
              <div className="flex items-end">
                <button
                  onClick={clearDates}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-surface-600 dark:text-surface-300 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600"
                >
                  <X className="w-4 h-4" /> Clear dates
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && !data ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : !data || (!monthRows.length && !data.recommendations.length) ? (
        <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 py-16 text-center">
          <Lightbulb className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
          <p className="text-surface-500 dark:text-surface-400 font-medium">No entries in this period</p>
          <p className="text-sm text-surface-400 dark:text-surface-500 mt-1">Try a wider date range or another branch</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Headline numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label={isProfit ? 'Net Profit' : 'Net Loss'}
              value={formatCurrency(Math.abs(netProfit))}
              tone={isProfit ? 'good' : 'bad'}
              icon={isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              hint={
                summary?.margin_pct != null
                  ? `${summary.margin_pct}% of income kept`
                  : data.window_label
              }
            />
            <StatCard
              label="Money In (Income)"
              value={formatCurrency(num(summary?.total_income))}
              tone="good"
              icon={<ArrowUpRight className="w-4 h-4" />}
              hint={`over ${summary?.active_months ?? 0} months`}
            />
            <StatCard
              label="Money Out (Expense)"
              value={formatCurrency(num(summary?.total_expense))}
              tone="bad"
              icon={<ArrowDownRight className="w-4 h-4" />}
              hint={`over ${summary?.active_months ?? 0} months`}
            />
            <StatCard
              label={`Next month · ${monthLabel(data.forecast.month)}`}
              value={formatCurrency(Math.abs(num(data.forecast.net)))}
              tone={num(data.forecast.net) >= 0 ? 'good' : 'bad'}
              icon={<Lightbulb className="w-4 h-4" />}
              hint={num(data.forecast.net) >= 0 ? 'likely profit (estimate)' : 'likely shortfall (estimate)'}
            />
          </div>

          {/* Plain-language read-out */}
          {data.recommendations.length > 0 && (
            <Section
              title="What your numbers are saying"
              subtitle="Written from your own entries — read these first"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {data.recommendations.map((r, i) => <RecCard key={i} rec={r} />)}
              </div>
            </Section>
          )}

          {/* Month-by-month table — the core view */}
          {monthRows.length > 0 && (
            <Section
              title="Month by month"
              subtitle="Each month's result, and the single biggest expense that month"
            >
              <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-200 dark:border-surface-700">
                        <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Month</th>
                        <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Money In</th>
                        <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Money Out</th>
                        <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Profit / Loss</th>
                        <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Kept %</th>
                        <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Biggest expense</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthRows.map((m) => {
                        const net = num(m.net)
                        const isBest = summary?.best_month === m.month
                        const isWorst = summary?.worst_month === m.month
                        return (
                          <tr
                            key={m.month}
                            className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/60 dark:hover:bg-surface-700/30 transition-colors"
                          >
                            <td className="p-3 font-medium text-surface-800 dark:text-surface-100 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {monthLabelFull(m.month)}
                                {isBest && <Badge tone="good">Best</Badge>}
                                {isWorst && net < 0 && <Badge tone="bad">Worst</Badge>}
                              </div>
                            </td>
                            <td className="p-3 text-right tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(num(m.income))}
                            </td>
                            <td className="p-3 text-right tabular-nums whitespace-nowrap text-red-600 dark:text-red-400">
                              {formatCurrency(num(m.expense))}
                            </td>
                            <td className={`p-3 text-right tabular-nums font-bold whitespace-nowrap ${
                              m.is_profit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {m.is_profit ? '+' : '−'}{formatCurrency(Math.abs(net))}
                            </td>
                            <td className={`p-3 text-right tabular-nums whitespace-nowrap ${
                              m.margin_pct == null
                                ? 'text-surface-300 dark:text-surface-600'
                                : m.margin_pct >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-red-600 dark:text-red-400'
                            }`}>
                              {m.margin_pct == null ? '–' : `${m.margin_pct}%`}
                            </td>
                            <td className="p-3 text-surface-600 dark:text-surface-300 whitespace-nowrap">
                              {m.top_expense ? (
                                <span>
                                  {m.top_expense}
                                  <span className="text-surface-400 dark:text-surface-500">
                                    {' '}· {formatCurrency(num(m.top_expense_amount))}
                                  </span>
                                </span>
                              ) : '–'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-surface-50 dark:bg-surface-900/40 border-t border-surface-100 dark:border-surface-700 text-xs text-surface-500 dark:text-surface-400">
                  <b>Kept %</b> is how much of that month&apos;s income stayed as profit. A negative number means the
                  month spent more than it earned. {summary?.profit_months ?? 0} of {summary?.active_months ?? 0} months
                  made money.
                </div>
              </div>
            </Section>
          )}

          {/* Trend chart */}
          <Section title="Income vs Expense trend" subtitle="Green above red means a profitable month">
            <div className="rounded-2xl p-4 sm:p-5 bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 shadow-sm">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    width={52}
                    tickFormatter={(v) => `${CURRENCY_SYMBOL}${(Number(v) / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.12)', fontSize: '13px' }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Branch performance */}
          {data.branch_ranking.length > 0 && (
            <Section title="Which branch is making money" subtitle="Profit or loss per branch for this period">
              <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 shadow-sm overflow-hidden">
                {data.branch_ranking.map((b, i) => {
                  const net = num(b.net)
                  const max = Math.max(...data.branch_ranking.map((x) => Math.abs(num(x.net))), 1)
                  return (
                    <div key={b.branch} className={`p-4 ${i > 0 ? 'border-t border-surface-100 dark:border-surface-700/60' : ''}`}>
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="flex items-center gap-2 font-semibold text-surface-800 dark:text-surface-100 min-w-0">
                          <Building2 className="w-4 h-4 text-surface-400 shrink-0" />
                          <span className="truncate">{b.branch}</span>
                        </span>
                        <span className={`font-bold tabular-nums whitespace-nowrap ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(net))}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${net >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.max(3, (Math.abs(net) / max) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-1.5 text-xs text-surface-400 dark:text-surface-500">
                        Earned {formatCurrency(num(b.income))} · Spent {formatCurrency(num(b.expense))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Section>
          )}

          {/* Expense breakdown */}
          {data.top_expenses.length > 0 && (
            <Section title="Where the money is going" subtitle="Your biggest expense heads, largest first">
              <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 shadow-sm overflow-hidden">
                {data.top_expenses.map((c, i) => (
                  <div key={c.category} className={`p-4 ${i > 0 ? 'border-t border-surface-100 dark:border-surface-700/60' : ''}`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-surface-800 dark:text-surface-100 truncate">{c.category}</div>
                        <div className="text-xs text-surface-400 dark:text-surface-500 truncate">{c.group}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold tabular-nums text-surface-800 dark:text-surface-100 whitespace-nowrap">
                          {formatCurrency(num(c.total))}
                        </div>
                        {c.growth_pct !== null && (
                          <div className={`text-xs font-semibold ${c.growth_pct > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {c.growth_pct > 0 ? '▲ up' : '▼ down'} {Math.abs(c.growth_pct)}% recently
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                      <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.max(3, c.share * 100)}%` }} />
                    </div>
                    <div className="mt-1.5 text-xs text-surface-400 dark:text-surface-500">
                      {Math.round(c.share * 100)}% of everything you spent
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Spikes */}
          {data.anomalies.length > 0 && (
            <Section title="Unusual spending this month" subtitle="Compared against that category's own normal">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {data.anomalies.map((a) => (
                  <div key={a.category} className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-semibold text-amber-900 dark:text-amber-200">{a.category}</div>
                        <div className="text-sm text-amber-800/80 dark:text-amber-200/70 mt-0.5">
                          You spent {formatCurrency(num(a.amount))} in {monthLabelFull(a.month)} — about <b>{a.times}×</b> the
                          usual {formatCurrency(num(a.avg))}. Worth checking whether this was expected.
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <p className="text-xs text-surface-400 dark:text-surface-500 px-1 pb-2">
            All figures are calculated from your own entries — nothing is sent to any outside service. The next-month
            figure is an estimate from your last 3 months, so treat it as a direction, not a promise.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 px-1">
        <h3 className="text-base font-bold text-surface-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-surface-400 dark:text-surface-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Badge({ tone, children }: { tone: 'good' | 'bad'; children: React.ReactNode }) {
  const cls = tone === 'good'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${cls}`}>{children}</span>
}

function StatCard({ label, value, tone, icon, hint }: {
  label: string
  value: string
  tone: 'good' | 'bad'
  icon: React.ReactNode
  hint?: string
}) {
  const color = tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  const chip = tone === 'good'
    ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400'
    : 'bg-red-50 dark:bg-red-900/25 text-red-600 dark:text-red-400'
  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-surface-500 dark:text-surface-400 truncate">{label}</span>
        <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${chip}`}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {hint && <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5 truncate">{hint}</div>}
    </div>
  )
}

function RecCard({ rec }: { rec: { kind: 'good' | 'alert' | 'tip'; title: string; text: string } }) {
  const styles = {
    good: {
      box: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50',
      title: 'text-emerald-900 dark:text-emerald-200',
      text: 'text-emerald-800/80 dark:text-emerald-200/70',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    },
    alert: {
      box: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50',
      title: 'text-red-900 dark:text-red-200',
      text: 'text-red-800/80 dark:text-red-200/70',
      icon: <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
    },
    tip: {
      box: 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/50',
      title: 'text-sky-900 dark:text-sky-200',
      text: 'text-sky-800/80 dark:text-sky-200/70',
      icon: <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
    },
  }[rec.kind]

  return (
    <div className={`rounded-2xl p-4 border ${styles.box}`}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div className="min-w-0">
          <div className={`font-semibold ${styles.title}`}>{rec.title}</div>
          <div className={`text-sm mt-0.5 ${styles.text}`}>{rec.text}</div>
        </div>
      </div>
    </div>
  )
}
