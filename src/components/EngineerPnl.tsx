import { useEffect, useRef, useState } from 'react'
import {
  Cpu, Plus, RefreshCw, Trash2, Pencil, X, Loader2, TrendingUp, TrendingDown, Wifi, WifiOff, UserPlus, IndianRupee,
} from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchEngineerPnlBoard, createEngineerPnl, updateEngineerPnl, fetchEngineerClosedCalls, fetchPayrollEmployees,
  type EngineerPnlBoard, type EngineerPnlRow, type EngineerPnlFormData, type EngineerClosedCall,
  type PayrollEmployees,
} from '@/lib/api'

const inr = (v: string | number | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  if (isNaN(n as number)) return '0'
  return (n as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
const currentDay = () => new Date().toISOString().slice(0, 10)

const emptyForm = (): EngineerPnlFormData => ({
  engineer_name: '', email: '', engg_count: 1, per_day_target: 10,
  per_call_rate: 350, engg_salary: 25000, total_working_days: 30, actual_working_days: 25, active: true,
})

export default function EngineerPnl() {
  const addToast = useExpenseStore((s) => s.addToast)
  const [board, setBoard] = useState<EngineerPnlBoard | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  // Default view = today. Change the From/To pickers to look at any past date/range.
  const [fromDate, setFromDate] = useState(currentDay())
  const [toDate, setToDate] = useState(currentDay())
  // Which engineer's closed calls to drill into (null = no drill-down open).
  const [drill, setDrill] = useState<{ engineer: string; expected: number } | null>(null)
  /**
   * Work Location / Segment per engineer for the current window, rolled up from the
   * same closed-call detail the drill-down shows. Loaded separately so a failure here
   * can only blank those two columns — the board itself never depends on it.
   */
  const [callFacets, setCallFacets] = useState<Record<string, { locations: string[]; segments: string[] }>>({})
  const [showAll, setShowAll] = useState(false)
  const [cycleMonth, setCycleMonth] = useState('')
  const [editing, setEditing] = useState<null | { id?: number; data: EngineerPnlFormData }>(null)

  const isToday = fromDate === currentDay() && toDate === currentDay()

  // Salary cycle = 25th of the previous month → 24th of the selected month.
  const applyCycle = (ym: string) => {
    setCycleMonth(ym)
    if (!ym) return
    const [y, m] = ym.split('-').map(Number)
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setFromDate(fmt(new Date(y, m - 2, 25)))
    setToDate(fmt(new Date(y, m - 1, 24)))
  }

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true)
    try {
      setBoard(await fetchEngineerPnlBoard({ from: fromDate || currentDay(), to: toDate || currentDay(), all: showAll }))
    } catch {
      addToast('error', 'Failed to load Engineer P&L')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  // Roll the closed calls up per engineer to fill the Work Location / Segment columns.
  // Deliberately its own request: the board must render identically whether or not this
  // succeeds, so a failure just leaves those two cells blank.
  const loadFacets = async () => {
    try {
      const res = await fetchEngineerClosedCalls({ from: fromDate || currentDay(), to: toDate || currentDay() })
      const acc: Record<string, { locations: Set<string>; segments: Set<string> }> = {}
      for (const c of res.calls) {
        const key = (c.engineer || '').trim().toLowerCase()
        if (!key) continue
        const bucket = acc[key] || (acc[key] = { locations: new Set(), segments: new Set() })
        const loc = (c.work_location_name || c.work_location || '').trim()
        const seg = (c.segment || '').trim()
        if (loc) bucket.locations.add(loc)
        if (seg) bucket.segments.add(seg)
      }
      setCallFacets(Object.fromEntries(
        Object.entries(acc).map(([k, v]) => [k, {
          locations: [...v.locations].sort(),
          segments: [...v.segments].sort(),
        }]),
      ))
    } catch {
      setCallFacets({})
    }
  }

  useEffect(() => { load(); loadFacets() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [fromDate, toDate, showAll])
  // Live auto-refresh every 60s (closed calls update in near real time).
  useEffect(() => {
    const t = setInterval(() => load(true), 60000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, showAll])

  const openAdd = (prefillName?: string) => setEditing({ data: { ...emptyForm(), engineer_name: prefillName || '' } })
  const openEdit = (r: EngineerPnlRow) => setEditing({ id: r.id, data: {
    engineer_name: r.engineer_name, email: r.email, engg_count: r.engg_count, per_day_target: r.per_day_target,
    per_call_rate: parseFloat(r.per_call_rate), engg_salary: parseFloat(r.engg_salary),
    total_working_days: r.total_working_days, actual_working_days: r.actual_working_days, active: true,
  } })

  // Soft-hide (active=false) rather than hard-delete, so the OpenCall auto-sync
  // doesn't just recreate the engineer on the next refresh.
  const remove = async (id: number, name: string) => {
    try { await updateEngineerPnl(id, { active: false }); addToast('success', `Removed ${name}`); load(true) }
    catch { addToast('error', 'Failed to remove') }
  }

  const t = board?.totals

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <Cpu className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Engineer P&amp;L</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">Live profit/loss — closed calls from OpenCall</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Live status */}
          {board && (
            board.live_ok
              ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><Wifi className="w-3.5 h-3.5" /> OpenCall</span>
              : <span title={board.message} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"><WifiOff className="w-3.5 h-3.5" /> OpenCall off</span>
          )}
          {board && board.payroll_ok !== null && (
            board.payroll_ok
              ? <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><IndianRupee className="w-3.5 h-3.5" /> Payroll</span>
              : <span title={board.payroll_message} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"><IndianRupee className="w-3.5 h-3.5" /> Payroll off</span>
          )}
          <button onClick={() => { setCycleMonth(''); setFromDate(currentDay()); setToDate(currentDay()) }} disabled={isToday}
            title="Back to today (live)"
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${isToday ? 'bg-primary-600 text-white' : 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100'}`}>
            Today
          </button>
          <div className="flex items-center gap-1" title="Salary cycle: 25th of previous month → 24th of this month">
            <span className="text-xs font-semibold text-surface-400">Cycle</span>
            <input type="month" value={cycleMonth} onChange={(e) => applyCycle(e.target.value)}
              className={`px-2.5 py-2 rounded-lg text-sm bg-white dark:bg-surface-800 border text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${cycleMonth ? 'border-primary-400' : 'border-surface-200 dark:border-surface-700'}`} />
          </div>
          <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => { setCycleMonth(''); setFromDate(e.target.value) }} title="From date"
            className="px-2.5 py-2 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <span className="text-surface-400">–</span>
          <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => { setCycleMonth(''); setToDate(e.target.value) }} title="To date"
            className="px-2.5 py-2 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <button onClick={() => setShowAll((v) => !v)}
            title={showAll ? 'Showing every engineer — click for only those with data' : 'Overall: show every engineer, not just those with closed calls'}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${showAll ? 'bg-primary-600 text-white' : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50'}`}>
            Overall
          </button>
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={() => openAdd()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white">
            <Plus className="w-4 h-4" /> Add Engineer
          </button>
        </div>
      </div>

      {/* OpenCall offline notice */}
      {board && !board.live_ok && (
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <strong>Closed calls not live yet.</strong> {board.message} Set <code>OPENCALL_USERNAME</code> / <code>OPENCALL_PASSWORD</code> (and <code>OPENCALL_API_URL</code>) on the backend to pull real-time closed calls. Everything else works; revenue shows once closed calls arrive.
        </div>
      )}
      {board && board.payroll_ok === true && (board.payroll_unmatched?.length ?? 0) > 0 && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200">
          <strong>{board.payroll_unmatched.length} engineer{board.payroll_unmatched.length === 1 ? '' : 's'} not matched in Payroll.</strong>{' '}
          The salary shown for {board.payroll_unmatched.slice(0, 4).join(', ')}
          {board.payroll_unmatched.length > 4 ? ` and ${board.payroll_unmatched.length - 4} more` : ''}{' '}
          is a manual/default figure, not their real pay — so their Profit / Loss is off too. Salary is matched
          by email only (a name can belong to two people), so edit each one (pencil) and enter the exact email
          they have in Payroll.
        </div>
      )}
      {board && board.payroll_ok === false && (
        <div className="mb-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <strong>Salary not from Payroll yet.</strong> {board.payroll_message} Set <code>PAYROLL_USERNAME</code> / <code>PAYROLL_PASSWORD</code> / <code>PAYROLL_API_URL</code> (an admin account) to auto-fill each engineer's real salary. Until then the salary shown is the manual/default value.
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Tile label="Engineers" value={board ? String(board.rows.length) : '—'} />
        <Tile label="Closed Calls (P/M)" value={t ? inr(t.closed_calls) : '—'} accent="text-primary-600 dark:text-primary-400" />
        <Tile label="Total Engg Earning" value={t ? `₹${inr(t.revenue)}` : '—'} accent="text-emerald-600 dark:text-emerald-400" />
        <Tile label="Total Profit / Loss" value={t ? `₹${inr(t.nett)}` : '—'} accent={t && parseFloat(t.nett) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} />
      </div>

      {/* Board table */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : !board || board.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Cpu className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            {board && board.total_configured > 0 ? (
              <>
                <p className="text-surface-500 dark:text-surface-400 font-medium">No engineer has closed calls in this period</p>
                <button onClick={() => setShowAll(true)} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Show all {board.total_configured} engineers (Overall) →</button>
              </>
            ) : (
              <>
                <p className="text-surface-500 dark:text-surface-400 font-medium">No engineers configured yet</p>
                <button onClick={() => openAdd()} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Add your first engineer →</button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700 text-surface-600 dark:text-surface-400">
                  <th className="text-left p-3 font-semibold">Engineer</th>
                  <th className="text-left p-3 font-semibold">Work<br/>Location</th>
                  <th className="text-left p-3 font-semibold">Segment</th>
                  <th className="text-right p-3 font-semibold">Per Day<br/>Target</th>
                  <th className="text-right p-3 font-semibold">Closed<br/>P/D</th>
                  <th className="text-right p-3 font-semibold text-primary-600 dark:text-primary-400">Total Closed<br/>P/M</th>
                  <th className="text-right p-3 font-semibold">Per Call<br/>Rate</th>
                  <th className="text-right p-3 font-semibold">Engg<br/>Salary</th>
                  <th className="text-right p-3 font-semibold">1 Day<br/>Salary</th>
                  <th className="text-right p-3 font-semibold">Total<br/>WD</th>
                  <th className="text-right p-3 font-semibold">Actual<br/>WD</th>
                  <th className="text-right p-3 font-semibold text-emerald-600 dark:text-emerald-400">Engg<br/>Earning</th>
                  <th className="text-right p-3 font-semibold">Profit /<br/>Loss</th>
                  <th className="text-right p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {board.rows.map((r) => {
                  const nett = parseFloat(r.nett)
                  return (
                    <tr key={r.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30">
                      <td className="p-3 font-semibold text-surface-900 dark:text-white">{r.engineer_name}</td>
                      <td className="p-3 text-surface-600 dark:text-surface-300 whitespace-nowrap">
                        <FacetCell values={callFacets[r.engineer_name.trim().toLowerCase()]?.locations} />
                      </td>
                      <td className="p-3 text-surface-600 dark:text-surface-300 whitespace-nowrap">
                        <FacetCell values={callFacets[r.engineer_name.trim().toLowerCase()]?.segments} />
                      </td>
                      <td className="p-3 text-right text-surface-500 dark:text-surface-400">{r.per_day_target}</td>
                      <td className="p-3 text-right text-surface-700 dark:text-surface-300">{r.actual_closed_pd}</td>
                      <td className="p-3 text-right font-bold text-primary-600 dark:text-primary-400">
                        {r.total_calls_closed_pm > 0 ? (
                          <button
                            onClick={() => setDrill({ engineer: r.engineer_name, expected: r.total_calls_closed_pm })}
                            className="underline decoration-dotted underline-offset-4 hover:text-primary-700 dark:hover:text-primary-300"
                            title={`Show the ${r.total_calls_closed_pm} closed calls — Segment, Product, Work Location, WO OTC CODE`}
                          >
                            {inr(r.total_calls_closed_pm)}
                          </button>
                        ) : inr(r.total_calls_closed_pm)}
                      </td>
                      <td className="p-3 text-right text-surface-500 dark:text-surface-400">₹{inr(r.per_call_rate)}</td>
                      <td className="p-3 text-right text-surface-500 dark:text-surface-400 whitespace-nowrap">
                        ₹{inr(r.engg_salary)}
                        {r.salary_source === 'payroll' ? (
                          <span className="ml-1 text-[9px] font-bold text-primary-500" title="Salary from Payroll">● PR</span>
                        ) : board?.payroll_ok ? (
                          <span
                            className="ml-1 text-[9px] font-bold text-amber-500"
                            title={`No Payroll email set (or it doesn't match) — this is a manual/default figure, not ${r.engineer_name}'s real salary. Edit the engineer and enter the exact email they have in Payroll.`}
                          >
                            ● SET
                          </span>
                        ) : null}
                      </td>
                      <td className="p-3 text-right text-surface-500 dark:text-surface-400">₹{inr(r.per_day)}</td>
                      <td className="p-3 text-right text-surface-500 dark:text-surface-400">{r.total_working_days}</td>
                      <td className="p-3 text-right text-surface-500 dark:text-surface-400">{r.actual_working_days}</td>
                      <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">₹{inr(r.revenue)}</td>
                      <td className={`p-3 text-right font-bold ${nett >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        <span className="inline-flex items-center gap-1 justify-end">{nett >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}₹{inr(Math.abs(nett))}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(r)} title="Edit" className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-700"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => remove(r.id, r.engineer_name)} title="Delete" className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {t && (
                <tfoot>
                  <tr className="border-t-2 border-surface-200 dark:border-surface-600 font-bold text-surface-900 dark:text-white bg-surface-50/50 dark:bg-surface-900/40">
                    <td className="p-3">Total ({t.engg_count})</td>
                    {/* Work Location + Segment + Per Day Target + Closed P/D */}
                    <td colSpan={4}></td>
                    <td className="p-3 text-right text-primary-600 dark:text-primary-400">{inr(t.closed_calls)}</td>
                    <td colSpan={5}></td>
                    <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">₹{inr(t.revenue)}</td>
                    <td className={`p-3 text-right ${parseFloat(t.nett) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>₹{inr(t.nett)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* Unmatched OpenCall engineers */}
      {board && board.unmatched_engineers.length > 0 && (
        <div className="mt-5 rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-5">
          <h3 className="font-semibold text-surface-900 dark:text-white mb-1">In OpenCall but not added here</h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">These engineers have closed calls in OpenCall this month but no P&amp;L config. Add them to count their revenue.</p>
          <div className="flex flex-wrap gap-2">
            {board.unmatched_engineers.map((u) => (
              <button key={u.engineer_name} onClick={() => openAdd(u.engineer_name)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:border-primary-400 hover:text-primary-600">
                <UserPlus className="w-3.5 h-3.5" /> {u.engineer_name} <span className="text-surface-400">({u.closed_calls})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && <EngineerForm state={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(true) }} onToast={addToast} />}
      {drill && (
        <ClosedCallsModal
          engineer={drill.engineer}
          expected={drill.expected}
          from={fromDate || currentDay()}
          to={toDate || currentDay()}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  )
}

/**
 * One engineer's distinct Work Locations (or Segments) for the period. An engineer can
 * close calls across several of either, so the first two are shown and the rest collapse
 * into a "+N" whose tooltip lists them — the row stays one line either way.
 */
function FacetCell({ values }: { values?: string[] }) {
  if (!values || values.length === 0) {
    return <span className="text-surface-300 dark:text-surface-600">—</span>
  }
  const shown = values.slice(0, 2)
  const rest = values.length - shown.length
  return (
    <span title={values.join(', ')}>
      {shown.join(', ')}
      {rest > 0 && <span className="ml-1 text-xs text-surface-400">+{rest}</span>}
    </span>
  )
}

/**
 * The individual closed calls behind one engineer's count, with the OpenCall columns:
 * Segment, Product Name, Work Location and WO OTC CODE. Read-only.
 */
function ClosedCallsModal({ engineer, expected, from, to, onClose }: {
  engineer: string
  expected: number
  from: string
  to: string
  onClose: () => void
}) {
  const [calls, setCalls] = useState<EngineerClosedCall[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetchEngineerClosedCalls({ from, to, engineer })
        if (!alive) return
        setCalls(res.calls)
        setError(res.live_ok ? '' : (res.message || 'Closed-call details are not live yet.'))
      } catch {
        if (alive) setError('Could not load closed calls.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [engineer, from, to])

  return (
    <div className="fixed inset-0 z-[90] bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-surface-800 shadow-2xl border border-surface-100 dark:border-surface-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-700">
          <div className="min-w-0">
            <h3 className="font-bold text-surface-900 dark:text-white truncate">{engineer} — closed calls</h3>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              {from} to {to}
              {!loading && !error && (
                <>
                  {' · '}{calls.length} call{calls.length === 1 ? '' : 's'}
                  {calls.length !== expected && (
                    <span className="ml-1 text-amber-600 dark:text-amber-400">(board shows {expected})</span>
                  )}
                </>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 shrink-0">
            <X className="w-5 h-5 text-surface-400" />
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <WifiOff className="w-10 h-10 mx-auto text-surface-300 dark:text-surface-600 mb-2" />
              <p className="text-sm text-surface-600 dark:text-surface-300 font-medium">{error}</p>
              <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                The count above still comes from OpenCall; only the per-call detail needs the newer endpoint.
              </p>
            </div>
          ) : calls.length === 0 ? (
            <div className="p-10 text-center text-surface-500 dark:text-surface-400">No closed calls in this period.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700 text-left">
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Date</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Ticket ID</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Case ID</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Segment</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Product Name</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">Work Location</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap">WO OTC CODE</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c, i) => (
                  <tr key={`${c.ticket_id}-${c.date}-${i}`} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/60 dark:hover:bg-surface-700/30">
                    <td className="p-3 whitespace-nowrap text-surface-600 dark:text-surface-300">{c.date}</td>
                    <td className="p-3 whitespace-nowrap font-medium text-surface-800 dark:text-surface-100">{c.ticket_id || '—'}</td>
                    <td className="p-3 whitespace-nowrap text-surface-700 dark:text-surface-200">{c.case_id || '—'}</td>
                    <td className="p-3 whitespace-nowrap text-surface-700 dark:text-surface-200">{c.segment || '—'}</td>
                    <td className="p-3 text-surface-700 dark:text-surface-200">{c.product_name || '—'}</td>
                    <td className="p-3 whitespace-nowrap text-surface-700 dark:text-surface-200">
                      {c.work_location_name || c.work_location || '—'}
                      {c.work_location_name && c.work_location && c.work_location_name !== c.work_location && (
                        <span className="block text-[11px] text-surface-400">{c.work_location}</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono text-xs text-surface-700 dark:text-surface-200">{c.wo_otc_code || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4">
      <div className="text-xs font-medium text-surface-500 dark:text-surface-400">{label}</div>
      <div className={`text-2xl font-bold ${accent || 'text-surface-900 dark:text-white'}`}>{value}</div>
    </div>
  )
}

function EngineerForm({ state, onClose, onSaved, onToast }: {
  state: { id?: number; data: EngineerPnlFormData }
  onClose: () => void; onSaved: () => void; onToast: (t: 'success' | 'error', m: string) => void
}) {
  const [form, setForm] = useState<EngineerPnlFormData>(state.data)
  const [saving, setSaving] = useState(false)
  // Payroll's people, so the email can be PICKED instead of typed. Salary matches on
  // an exact email and nothing else, so one wrong character silently leaves the
  // engineer on a default figure — that is the mistake this list exists to remove.
  const [payroll, setPayroll] = useState<PayrollEmployees | null>(null)
  useEffect(() => {
    let alive = true
    fetchPayrollEmployees()
      .then((d) => { if (alive) setPayroll(d) })
      .catch(() => { if (alive) setPayroll({ ok: false, message: 'Could not reach Payroll.', count: 0, employees: [] }) })
    return () => { alive = false }
  }, [])
  const set = (k: keyof EngineerPnlFormData, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }))
  const num = (v: string) => (v === '' ? 0 : parseFloat(v))

  const save = async () => {
    if (!form.engineer_name.trim()) { onToast('error', 'Engineer name is required (must match the OpenCall name)'); return }
    setSaving(true)
    try {
      if (state.id) { await updateEngineerPnl(state.id, form); onToast('success', 'Updated') }
      else { await createEngineerPnl(form); onToast('success', `Added ${form.engineer_name}`) }
      onSaved()
    } catch { onToast('error', 'Failed to save'); setSaving(false) }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1'

  // Only people who actually have an email can be matched on one; the rest are still
  // counted by `payroll.count` so a missing email reads as missing, not as absent.
  const withEmail = (payroll?.employees ?? []).filter((p) => p.email)
  const emailTyped = (form.email ?? '').trim().toLowerCase()
  const matched = withEmail.find((p) => p.email.toLowerCase() === emailTyped)
  // The dropdown only shows a selection when the email really is one of Payroll's,
  // so a hand-typed near-miss never looks like a confirmed pick.
  const pickedEmail = matched ? matched.email : ''
  // A same-name employee is a hint worth offering, never an automatic choice —
  // names are not unique, so the person confirms it with a click.
  const suggestion = !emailTyped
    ? withEmail.find((p) => p.name.trim().toLowerCase() === form.engineer_name.trim().toLowerCase())
    : undefined

  return (
    <div className="fixed inset-0 z-[90] bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-surface-800 shadow-2xl border border-surface-100 dark:border-surface-700" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-700">
          <h3 className="font-bold text-surface-900 dark:text-white">{state.id ? 'Edit engineer' : 'Add engineer'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"><X className="w-4 h-4 text-surface-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className={labelCls}>Engineer name * <span className="text-surface-400">(exact OpenCall name)</span></label><input className={inputCls} value={form.engineer_name} onChange={(e) => set('engineer_name', e.target.value)} /></div>
          <div className="col-span-2">
            <label className={labelCls}>
              Payroll email <span className="text-surface-400">(this is what salary matches on)</span>
            </label>
            {payroll === null ? (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-surface-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading Payroll employees…
              </div>
            ) : payroll.ok && withEmail.length > 0 ? (
              <select
                className={inputCls}
                value={pickedEmail}
                onChange={(e) => set('email', e.target.value)}
              >
                <option value="">— Select the person from Payroll —</option>
                {withEmail.map((p) => (
                  <option key={p.email} value={p.email}>
                    {p.name} — {p.email}{p.salary != null ? ` (₹${inr(p.salary)})` : ''}
                  </option>
                ))}
              </select>
            ) : null}

            <input
              className={`${inputCls} ${payroll?.ok && withEmail.length > 0 ? 'mt-2' : ''}`}
              placeholder="name@company.com"
              value={form.email ?? ''}
              onChange={(e) => set('email', e.target.value)}
            />

            {payroll && !payroll.ok ? (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                Payroll list unavailable — type the email exactly as it appears in Payroll.
                {payroll.message ? ` (${payroll.message})` : ''}
              </p>
            ) : emailTyped && matched ? (
              <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Matches {matched.name} in Payroll{matched.salary != null ? ` — ₹${inr(matched.salary)} will be pulled in` : ''}.
              </p>
            ) : emailTyped ? (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                No Payroll employee has this email — salary will stay at the manual figure. Check for a typo.
              </p>
            ) : suggestion ? (
              <button
                type="button"
                onClick={() => set('email', suggestion.email)}
                className="mt-1 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Payroll has a “{suggestion.name}” — use {suggestion.email}?
              </button>
            ) : (
              <p className="mt-1 text-[11px] text-surface-400">
                Leave blank and this engineer keeps the manual salary below.
              </p>
            )}
          </div>
          <div><label className={labelCls}>Per call rate (₹)</label><input className={inputCls} value={form.per_call_rate} onChange={(e) => set('per_call_rate', num(e.target.value))} /></div>
          <div><label className={labelCls}>Engineer salary (₹)</label><input className={inputCls} value={form.engg_salary} onChange={(e) => set('engg_salary', num(e.target.value))} /></div>
          <div><label className={labelCls}>Per day target</label><input className={inputCls} value={form.per_day_target} onChange={(e) => set('per_day_target', num(e.target.value))} /></div>
          <div><label className={labelCls}>Engg count</label><input className={inputCls} value={form.engg_count} onChange={(e) => set('engg_count', num(e.target.value))} /></div>
          <div><label className={labelCls}>Total working days</label><input className={inputCls} value={form.total_working_days} onChange={(e) => set('total_working_days', num(e.target.value))} /></div>
          <div><label className={labelCls}>Actual working days</label><input className={inputCls} value={form.actual_working_days} onChange={(e) => set('actual_working_days', num(e.target.value))} /></div>
        </div>
        <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-surface-100 dark:border-surface-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700">Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save
          </button>
        </div>
      </div>
    </div>
  )
}
