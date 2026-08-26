import { useEffect, useState } from 'react'
import {
  HandCoins, Search, X, RefreshCw, MessageSquare, Clock, CheckCircle2, XCircle, Building2,
} from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import { fetchStaffRequests, type StaffRequestsData, type StaffRequestStatus } from '@/lib/api'

const inr = (v: string | number | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  if (isNaN(n as number)) return '0'
  return (n as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

const short = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '0'
  const a = Math.abs(n)
  if (a >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`
  if (a >= 100000) return `${(n / 100000).toFixed(2)}L`
  if (a >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toFixed(0)
}

/** A timestamp read the way a person would say it. */
const when = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 10)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
  if (days <= 0) return `${date} · today`
  if (days === 1) return `${date} · yesterday`
  return `${date} · ${days}d ago`
}

const STATUSES: StaffRequestStatus[] = ['Pending', 'Approved', 'Rejected']

const statusChip: Record<StaffRequestStatus, string> = {
  Pending: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
  Approved: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
  Rejected: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50',
}
const statusIcon: Record<StaffRequestStatus, typeof Clock> = {
  Pending: Clock,
  Approved: CheckCircle2,
  Rejected: XCircle,
}

export default function StaffRequests() {
  const addToast = useExpenseStore((s) => s.addToast)
  const [data, setData] = useState<StaffRequestsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StaffRequestStatus | ''>('')
  const [type, setType] = useState('')

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    try {
      setData(await fetchStaffRequests({ status, request_type: type, search }))
    } catch {
      addToast('error', 'Failed to load staff requests')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(true), search ? 350 : 0)
    return () => clearTimeout(t)
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [search, status, type])

  const s = data?.summary
  const inputCls =
    'h-9 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <HandCoins className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Staff Requests</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              What our own people have asked for — raised in Payroll
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="relative shrink-0 w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, branch, reason"
              className={`${inputCls} w-full sm:w-60 pl-8 pr-8`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                title="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-surface-400 hover:text-surface-700 dark:hover:text-surface-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className={`${inputCls} px-2.5 shrink-0`}>
            <option value="">All types</option>
            <option value="salary_advance">Salary advance</option>
            <option value="petrol_advance">Petrol advance</option>
            <option value="other_amount">Other amount</option>
            <option value="report">Report / message</option>
          </select>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {data && !data.ok && (
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <strong>Requests not loading from Payroll.</strong> {data.message} Set <code>PAYROLL_API_URL</code> /{' '}
          <code>PAYROLL_USERNAME</code> / <code>PAYROLL_PASSWORD</code> on the backend (an admin account) to pull them.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Tile label="Requests" value={data ? String(data.count) : '—'} sub={s ? `from ${s.employees} employee${s.employees === 1 ? '' : 's'}` : ''} />
        <Tile
          label="Pending"
          value={s ? String(s.pending_count) : '—'}
          sub={s ? `₹${inr(s.pending_amount)} waiting on a decision` : ''}
          accent="text-amber-600 dark:text-amber-400"
        />
        <Tile
          label="Approved"
          value={s ? `₹${short(s.by_status.Approved.amount)}` : '—'}
          sub={s ? `${s.by_status.Approved.count} request${s.by_status.Approved.count === 1 ? '' : 's'}` : ''}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <Tile
          label="Total asked"
          value={s ? `₹${short(s.total_amount)}` : '—'}
          sub="every request in view"
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => setStatus('')}
          className={`px-3 h-9 rounded-lg text-sm font-semibold border transition-colors ${
            status === ''
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50'
          }`}
        >
          All {data ? `(${data.count})` : ''}
        </button>
        {STATUSES.map((st) => {
          const Icon = statusIcon[st]
          const n = s?.by_status[st].count ?? 0
          return (
            <button
              key={st}
              onClick={() => setStatus(status === st ? '' : st)}
              className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold border transition-colors ${
                status === st
                  ? 'bg-primary-600 text-white border-primary-600'
                  : `${statusChip[st]} hover:brightness-95 dark:hover:brightness-110`
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {st} {n > 0 && `(${n})`}
            </button>
          )
        })}
      </div>

      {/* By type */}
      {data && data.by_type.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {data.by_type.map((b) => (
            <div key={b.request_type} className="rounded-xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 px-4 py-3">
              <div className="text-xs font-semibold text-surface-600 dark:text-surface-300">{b.label}</div>
              <div className="text-lg font-bold mt-0.5 text-surface-900 dark:text-white">
                {/* A report asks for nothing, so showing ₹0 beside it would read as a
                    zero-rupee request rather than one that was never about money. */}
                {b.request_type === 'report' ? `${b.count}` : `₹${inr(b.amount)}`}
              </div>
              <div className="text-[11px] text-surface-400">
                {b.request_type === 'report' ? 'raised to be read' : `${b.count} request${b.count === 1 ? '' : 's'}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Requests */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : !data || data.requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <HandCoins className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">
              {!data?.ok
                ? 'Nothing to show while Payroll is unreachable'
                : search || status || type
                  ? 'No request matches this filter'
                  : 'No requests raised yet'}
            </p>
            {(search || status || type) && (
              <button
                onClick={() => { setSearch(''); setStatus(''); setType('') }}
                className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Clear filters →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700 text-surface-600 dark:text-surface-400">
                  <th className="text-left p-3 font-semibold">Employee</th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">Type</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">Amount</th>
                  <th className="text-left p-3 font-semibold">Reason</th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">Raised</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((r) => {
                  const Icon = statusIcon[r.status] ?? Clock
                  return (
                    <tr key={r.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30 align-top">
                      <td className="p-3">
                        <div className="font-semibold text-surface-900 dark:text-white whitespace-nowrap">{r.employee_name || '—'}</div>
                        {r.branch && (
                          <div className="flex items-center gap-1 text-[11px] text-surface-400 mt-0.5">
                            <Building2 className="w-3 h-3" /> {r.branch}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-surface-700 dark:text-surface-200 whitespace-nowrap">{r.request_type_label || r.request_type}</td>
                      <td className="p-3 text-right font-bold whitespace-nowrap text-surface-900 dark:text-white">
                        {r.amount == null
                          ? <span className="text-surface-300 dark:text-surface-600 font-normal" title="A report asks to be read, not paid">—</span>
                          : `₹${inr(r.amount)}`}
                      </td>
                      <td className="p-3 text-surface-600 dark:text-surface-300 max-w-xs">
                        <div className="whitespace-pre-wrap break-words">{r.reason || '—'}</div>
                        {r.message_count > 0 && (
                          <div
                            className="inline-flex items-center gap-1 mt-1 text-[11px] text-surface-400"
                            title="Replies live in Payroll — open the request there to read or answer them"
                          >
                            <MessageSquare className="w-3 h-3" /> {r.message_count} message{r.message_count === 1 ? '' : 's'}
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${statusChip[r.status] ?? ''}`}>
                          <Icon className="w-3.5 h-3.5" /> {r.status}
                        </span>
                        {r.reviewed_by && (
                          <div className="text-[11px] text-surface-400 mt-0.5">by {r.reviewed_by}</div>
                        )}
                      </td>
                      <td className="p-3 text-surface-500 dark:text-surface-400 whitespace-nowrap">{when(r.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-surface-400">
        Read-only. Approving or rejecting stays in the Payroll system, where the decision is recorded against the
        person who made it — a second approve button here would leave the two systems disagreeing about who allowed
        what.
      </p>
    </div>
  )
}

function Tile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4 shadow-sm">
      <div className="text-xs font-medium text-surface-500 dark:text-surface-400">{label}</div>
      <div className={`text-xl font-bold mt-1 ${accent ?? 'text-surface-900 dark:text-white'}`}>{value}</div>
      {sub && <div className="text-[11px] text-surface-400 mt-0.5">{sub}</div>}
    </div>
  )
}
