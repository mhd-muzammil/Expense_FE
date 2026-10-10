import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Cpu, Plus, RefreshCw, Trash2, Pencil, X, Loader2, TrendingUp, TrendingDown, WifiOff, UserPlus, Search, ChevronDown, ChevronRight, Filter, Download,
  MapPin, Upload, AlertTriangle, Info, CheckCircle2, HelpCircle, ChevronLeft,
} from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchEngineerPnlBoard, createEngineerPnl, updateEngineerPnl, fetchEngineerClosedCalls, fetchPayrollEmployees,
  fetchRegionHistory, uploadFlexRawData, syncFlexRawData,
  type EngineerPnlBoard, type EngineerPnlRow, type EngineerPnlFormData, type EngineerClosedCall,
  type PayrollEmployees, type RegionValue, type RegionCycle,
} from '@/lib/api'

const inr = (v: string | number | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  if (isNaN(n as number)) return '0'
  return (n as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}
/** Whole rupees for the board — exact paise stay in the tooltips and the export. */
const rs = (v: string | number | null | undefined, signed = false) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  const x = isNaN(n as number) ? 0 : (n as number)
  const body = `₹${Math.round(Math.abs(x)).toLocaleString('en-IN')}`
  return x < 0 && signed ? `−${body}` : body
}
const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
/** "10 Oct 2026" or "25 Sep – 24 Oct 2026". */
const fmtRange = (from: string, to: string) => {
  if (from === to) return fmtDay(from)
  const a = new Date(`${from}T00:00:00`), b = new Date(`${to}T00:00:00`)
  const head = a.toLocaleDateString('en-IN', a.getFullYear() === b.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
  return `${head} – ${fmtDay(to)}`
}
const titleCase = (v: string) => v.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
const currentDay = () => new Date().toISOString().slice(0, 10)
/** "5 min ago", "3 h ago", "2 days ago". */
const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`
}
/** The column-filter option for engineers with no value in that column, as Excel names it. */
const BLANK = '(Blanks)'

/**
 * The quick periods above the board. Each one sets the date range rather than a
 * separate setting, so the cards, the From/To pickers and the figures are always
 * describing the same days.
 */
const shift = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
const PERIODS = [
  {
    key: 'today', label: 'Today', days: '1 day', hint: 'Just today',
    range: () => ({ from: currentDay(), to: currentDay() }),
  },
  {
    key: 'week', label: 'This Week', days: '7 days', hint: 'The last 7 days, today included',
    range: () => ({ from: shift(-6), to: currentDay() }),
  },
  {
    key: 'cycle', label: 'Salary Cycle', days: '25th to 24th',
    hint: 'The salary cycle: 25th of one month to the 24th of the next',
    range: () => {
      const n = new Date()
      const f = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      // Before the 25th the cycle in progress is still the one that began last month.
      const started = n.getDate() >= 25
      const from = new Date(n.getFullYear(), n.getMonth() - (started ? 0 : 1), 25)
      const to = new Date(n.getFullYear(), n.getMonth() + (started ? 1 : 0), 24)
      return { from: f(from), to: f(to) }
    },
  },
] as const

const emptyForm = (): EngineerPnlFormData => ({
  engineer_name: '', email: '', engg_count: 1, per_day_target: 10,
  per_call_rate: 420, engg_salary: 25000, total_working_days: 30, actual_working_days: 25, active: true,
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
  const [search, setSearch] = useState('')
  const [cycleMonth, setCycleMonth] = useState('')
  const [editing, setEditing] = useState<null | { id?: number; data: EngineerPnlFormData }>(null)
  /**
   * The engineer whose calls are expanded inline (null = none). Only one at a time:
   * two open rows push the table's own numbers off the screen, which is what the
   * reader opened the row to compare against.
   */
  const [expanded, setExpanded] = useState<number | null>(null)
  /** Calls already fetched, per engineer, so re-opening a row costs nothing. */
  const [rowCalls, setRowCalls] = useState<Record<number, { loading: boolean; error: string; calls: EngineerClosedCall[] }>>({})


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
        // Canonical name first: OpenCall aliases some engineers, and keying on the
        // raw report text leaves those rows unable to find their own board row.
        const key = (c.engineer_name || c.engineer || '').trim().toLowerCase()
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
    // The configured figures, not this window's attendance, so saving the form
    // never turns one period's Payroll count into a setting.
    total_working_days: r.manual_total_working_days ?? r.total_working_days,
    actual_working_days: r.manual_actual_working_days ?? r.actual_working_days, active: true,
  } })

  // Soft-hide (active=false) rather than hard-delete, so the OpenCall auto-sync
  // doesn't just recreate the engineer on the next refresh.
  const remove = async (id: number, name: string) => {
    try { await updateEngineerPnl(id, { active: false }); addToast('success', `Removed ${name}`); load(true) }
    catch { addToast('error', 'Failed to remove') }
  }

  // Search across the three things a row is identified by — who the engineer is,
  // where they worked and what segment — since a reader looking for "vellore" does
  // not know or care which column the word lives in. Every term must appear
  // somewhere, so a second word narrows rather than widens.
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean)
  const allRows = board?.rows ?? []
  const rowMatches = (r: EngineerPnlRow) => {
    if (!terms.length) return true
    const f = callFacets[r.engineer_name.trim().toLowerCase()]
    const hay = [r.engineer_name, ...(f?.locations ?? []), ...(f?.segments ?? [])].join(' ').toLowerCase()
    return terms.every((term) => hay.includes(term))
  }
  // Excel-style column filters on Work Location / Segment. null = no filter (all ticked).
  // A row passes if ANY of its values is ticked — an engineer who worked Salem and
  // Hosur shows under either — and BLANK picks the rows with no calls in the window.
  const facetsOf = (r: EngineerPnlRow) => callFacets[r.engineer_name.trim().toLowerCase()]
  const [locFilter, setLocFilter] = useState<Set<string> | null>(null)
  const [segFilter, setSegFilter] = useState<Set<string> | null>(null)
  const [engFilter, setEngFilter] = useState<Set<string> | null>(null)
  const facetPasses = (sel: Set<string> | null, values: string[] | undefined) => {
    if (!sel) return true
    if (!values?.length) return sel.has(BLANK)
    return values.some((v) => sel.has(v))
  }
  const optionsOf = (pick: (f: { locations: string[]; segments: string[] }) => string[]) => {
    const all = new Set<string>()
    let blank = false
    for (const r of allRows) {
      const f = facetsOf(r)
      const v = f ? pick(f) : []
      if (v.length) v.forEach((x) => all.add(x)); else blank = true
    }
    return [...[...all].sort((a, b) => a.localeCompare(b)), ...(blank ? [BLANK] : [])]
  }
  const locOptions = optionsOf((f) => f.locations)
  const segOptions = optionsOf((f) => f.segments)
  const engOptions = [...new Set(allRows.map((r) => r.engineer_name))].sort((a, b) => a.localeCompare(b))
  const filtering = terms.length > 0 || !!engFilter || !!locFilter || !!segFilter
  const rows = filtering
    ? allRows.filter((r) => rowMatches(r)
        && (!engFilter || engFilter.has(r.engineer_name))
        && facetPasses(locFilter, facetsOf(r)?.locations)
        && facetPasses(segFilter, facetsOf(r)?.segments))
    : allRows
  const clearFilters = () => { setSearch(''); setEngFilter(null); setLocFilter(null); setSegFilter(null) }

  // Exports what is on screen: filtered rows when a filter/search is on, else the full board.
  const [exporting, setExporting] = useState(false)
  const exportXlsx = async () => {
    setExporting(true)
    try {
      const { exportEngineerPnl } = await import('@/lib/engineerPnlExport')
      const filters = [
        ...(search.trim() ? [`Search: "${search.trim()}"`] : []),
        ...(engFilter ? [`Engineer: ${[...engFilter].join(', ')}`] : []),
        ...(locFilter ? [`Work Location: ${[...locFilter].join(', ')}`] : []),
        ...(segFilter ? [`Segment: ${[...segFilter].join(', ')}`] : []),
      ]
      await exportEngineerPnl({
        rows, facets: facetsOf, from: fromDate || currentDay(), to: toDate || currentDay(),
        days: board?.period_days ?? 1, filters,
      })
      addToast('success', filters.length ? `Exported ${rows.length} filtered engineers` : `Exported full report (${rows.length} engineers)`)
    } catch {
      addToast('error', 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  // With a search on, the footer must add up what is actually on screen — a total
  // that counts hidden rows would quietly contradict the rows above it. With no
  // search the server's own totals are used untouched.
  const sum = (f: (r: EngineerPnlRow) => number) => rows.reduce((n, r) => n + (f(r) || 0), 0)
  const toggleRow = (r: EngineerPnlRow) => {
    if (expanded === r.id) { setExpanded(null); return }
    setExpanded(r.id)
    if (rowCalls[r.id] && !rowCalls[r.id].error) return  // already have it
    setRowCalls((p) => ({ ...p, [r.id]: { loading: true, error: '', calls: [] } }))
    fetchEngineerClosedCalls({ from: fromDate || currentDay(), to: toDate || currentDay(), engineer: r.engineer_name })
      .then((res) => setRowCalls((p) => ({
        ...p,
        [r.id]: {
          loading: false,
          // A window OpenCall cannot reach returns an empty list rather than an
          // error, so say which it was instead of showing a bare "no calls".
          error: res.live_ok ? '' : (res.message || 'OpenCall is not reachable right now'),
          calls: res.calls,
        },
      })))
      .catch(() => setRowCalls((p) => ({ ...p, [r.id]: { loading: false, error: 'Could not load these calls', calls: [] } })))
  }

  // Anything that changes which calls a row covers invalidates what was fetched.
  useEffect(() => { setRowCalls({}); setExpanded(null) }, [fromDate, toDate])

  const t = filtering
    ? {
        engg_count: sum((r) => r.engg_count),
        closed_calls: sum((r) => r.total_calls_closed_pm),
        revenue: String(sum((r) => parseFloat(r.revenue))),
        total_engg_salary: String(sum((r) => parseFloat(r.engg_salary))),
        nett: String(sum((r) => parseFloat(r.nett))),
        window_salary: String(sum((r) => parseFloat(r.window_salary ?? r.per_day))),
        raw_revenue: String(sum((r) => parseFloat(r.raw_earning))),
        raw_nett: String(sum((r) => parseFloat(r.raw_profit_loss))),
      }
    : board?.totals

  const totNett = t ? parseFloat(t.nett) : 0
  const totRawNett = t ? parseFloat(t.raw_nett ?? '0') : 0
  // Days the figures cover. Both halves of Profit/Loss are charged to this same
  // span, so it is stated on screen rather than left to be counted off the dates.
  const days = board?.period_days ?? 1
  const daysLabel = days === 1 ? '1 day' : `${days} days`
  const cycleDays = board?.cycle_days ?? 30
  // A window that is exactly the cycle costs exactly one salary; saying so stops
  // "Salary for 31 days" reading as though someone were paid extra for a long month.
  const isFullCycle = days === cycleDays
  // On a one-day view the period's salary IS the per-day salary, so that column
  // would only repeat the one beside it.
  const multiDay = days > 1

  // Which quick period the dates match, if any; anything else is a custom range.
  const [mode, setMode] = useState<'today' | 'week' | 'cycle' | 'custom'>('today')
  const currentCycleMonth = PERIODS[2].range().to.slice(0, 7)
  const pickQuick = (key: 'today' | 'week') => {
    const r = PERIODS.find((p) => p.key === key)!.range()
    setMode(key); setCycleMonth(''); setFromDate(r.from); setToDate(r.to)
  }
  const pickCycle = () => { setMode('cycle'); applyCycle(cycleMonth || currentCycleMonth) }
  const pickCustom = () => { setMode('custom'); setCycleMonth('') }

  // Region tiles filter the table to the engineers who closed calls there.
  const tableRef = useRef<HTMLDivElement>(null)
  const selectedRegion = locFilter && locFilter.size === 1 ? [...locFilter][0].toUpperCase() : null
  const pickRegion = (region: string) => {
    if (selectedRegion === region.toUpperCase()) { setLocFilter(null); return }
    const option = locOptions.find((o) => o.toUpperCase() === region.toUpperCase()) ?? region
    setLocFilter(new Set([option]))
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  // Everything that needs the admin's eye, as one short list rather than a wall of banners.
  const attention: Array<{ tone: 'warn' | 'info'; lead: string; text: ReactNode }> = []
  if (board) {
    if (!board.live_ok) attention.push({ tone: 'warn', lead: 'OpenCall not connected.', text: <>Closed calls cannot be pulled, so earnings show as zero. {board.message}</> })
    if (board.payroll_ok === false) attention.push({ tone: 'warn', lead: 'Payroll not connected.', text: <>Salaries shown are the figures entered here, not real pay. {board.payroll_message}</> })
    if (board.payroll_ok === true && (board.payroll_unmatched?.length ?? 0) > 0) {
      const names = board.payroll_unmatched
      attention.push({
        tone: 'warn',
        lead: `${names.length} engineer${names.length === 1 ? ' is' : 's are'} not linked to Payroll:`,
        text: <>{names.slice(0, 5).join(', ')}{names.length > 5 ? ` and ${names.length - 5} more` : ''}. Their salary and working days are manual figures, so their profit may be off. Click the pencil on the row and pick them from the Payroll list to link them.</>,
      })
    }
    if (board.working_days_ok === false && board.working_days_message) attention.push({ tone: 'warn', lead: 'Attendance not available.', text: <>Working days show each engineer&rsquo;s configured figures. {board.working_days_message}</> })
    if (board.raw_ok === false) attention.push({ tone: 'warn', lead: 'HP raw data rate unavailable.', text: board.raw_message })
    const linked = (board.email_synced ?? 0) + (board.payroll_auto_linked?.length ?? 0)
    if (linked > 0) attention.push({ tone: 'info', lead: `${linked} engineer${linked === 1 ? ' was' : 's were'} linked to Payroll automatically.`, text: 'Their real salary is now used. Emails typed by hand are never overwritten.' })
  }
  const [attentionOpen, setAttentionOpen] = useState(false)
  const warnCount = attention.filter((a) => a.tone === 'warn').length

  const totRaw = t ? parseFloat(t.raw_revenue ?? '0') : 0
  const totSalary = t ? parseFloat(t.window_salary) : 0
  const estCalls = rows.reduce((n, r) => n + (r.raw_estimated_calls || 0), 0)
  const closedTotal = t ? Number(t.closed_calls) : 0

  return (
    <div className="animate-fade-in space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <Cpu className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Engineer P&amp;L</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">What each engineer earns the company against what they cost</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing} title="Reload now (it also refreshes every minute)"
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={exportXlsx} disabled={exporting || !board || rows.length === 0}
            title={filtering ? `Export the ${rows.length} engineers shown to Excel` : 'Export the full report to Excel'}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-60">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {filtering ? `Export (${rows.length})` : 'Export'}
          </button>
          <button onClick={() => openAdd()}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white">
            <Plus className="w-4 h-4" /> Add Engineer
          </button>
        </div>
      </div>

      {/* ── Period + search ────────────────────────────────────── */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 rounded-xl bg-surface-100 dark:bg-surface-900/60" role="tablist" aria-label="Period">
              {([
                ['today', 'Today', 'Just today', () => pickQuick('today')],
                ['week', 'This Week', 'The last 7 days, today included', () => pickQuick('week')],
                ['cycle', 'Salary Cycle', 'Pick a salary month: 25th of one month to the 24th of the next', pickCycle],
                ['custom', 'Custom', 'Choose any From and To dates', pickCustom],
              ] as const).map(([key, label, hint, onClick]) => (
                <button key={key} role="tab" aria-selected={mode === key} title={hint} onClick={onClick}
                  className={`h-8 px-3.5 rounded-lg text-sm font-semibold transition-colors ${mode === key ? 'bg-white dark:bg-surface-700 text-primary-700 dark:text-primary-300 shadow-sm' : 'text-surface-500 hover:text-surface-800 dark:hover:text-surface-200'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="text-sm">
              <span className="font-semibold text-surface-800 dark:text-surface-100">{fmtRange(fromDate || currentDay(), toDate || currentDay())}</span>
              <span className="text-surface-400"> · {daysLabel}{isFullCycle ? ' · full salary cycle' : ''}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search engineer, location or segment"
                className="h-9 w-full pl-8 pr-8 rounded-lg text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              {search && (
                <button onClick={() => setSearch('')} title="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-surface-400 hover:text-surface-700 dark:hover:text-surface-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 h-9 px-3 rounded-lg border border-surface-200 dark:border-surface-700 text-sm text-surface-600 dark:text-surface-300 cursor-pointer whitespace-nowrap select-none"
              title="By default only engineers with closed calls in the period are listed">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="accent-primary-600" />
              All engineers
            </label>
          </div>
        </div>
        {mode === 'cycle' && (
          <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-700">
            <MonthPicker value={cycleMonth || currentCycleMonth} max={currentCycleMonth} onPick={applyCycle} />
          </div>
        )}
        {mode === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t border-surface-100 dark:border-surface-700">
            <label className="flex flex-col gap-1 text-xs font-semibold text-surface-500">
              From
              <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => e.target.value && setFromDate(e.target.value)}
                className="h-9 w-44 px-2.5 rounded-lg text-sm font-normal bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-surface-500">
              To
              <input type="date" value={toDate} min={fromDate || undefined} max={currentDay()} onChange={(e) => e.target.value && setToDate(e.target.value)}
                className="h-9 w-44 px-2.5 rounded-lg text-sm font-normal bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </label>
            <div className="flex flex-wrap gap-1.5 pb-0.5">
              {([['Last 30 days', 29], ['Last 90 days', 89]] as const).map(([label, back]) => (
                <button key={label} onClick={() => { setFromDate(shift(-back)); setToDate(currentDay()) }}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700">
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Data sources + anything that needs attention ──────── */}
      {board && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-surface-400 font-medium mr-1">Data from</span>
            <SourceChip ok={board.live_ok} label="OpenCall" detail={board.live_ok ? 'closed calls, live' : 'not connected'} />
            <SourceChip ok={board.payroll_ok !== false} label="Payroll" detail={board.payroll_ok === false ? 'not connected' : board.working_days_ok === false ? 'salary only' : 'salary + attendance'} />
            <SourceChip ok={!!board.raw_status?.count} label="HP raw data"
              detail={board.raw_status?.closed_to ? `paid amounts up to ${fmtDay(board.raw_status.closed_to)}` : 'not loaded'} />
            {warnCount > 0 && (
              <button onClick={() => setAttentionOpen((v) => !v)}
                className="ml-auto inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                <AlertTriangle className="w-3.5 h-3.5" /> {warnCount} thing{warnCount === 1 ? '' : 's'} to check
                {attentionOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {(attentionOpen || attention.some((a) => a.tone === 'info')) && attention.length > 0 && (
            <ul className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 divide-y divide-surface-100 dark:divide-surface-700 text-sm">
              {attention.filter((a) => attentionOpen || a.tone === 'info').map((a, i) => (
                <li key={i} className="flex gap-2.5 px-4 py-2.5">
                  {a.tone === 'warn'
                    ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    : <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary-500" />}
                  <p className="text-surface-600 dark:text-surface-300"><strong className="text-surface-900 dark:text-white">{a.lead}</strong> {a.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Summary ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Closed calls"
          value={t ? closedTotal.toLocaleString('en-IN') : '—'}
          sub={board ? `by ${rows.length} engineer${rows.length === 1 ? '' : 's'}${filtering ? ` (of ${allRows.length})` : ''}` : ''}
        />
        <StatCard
          label={`Salary cost · ${daysLabel}`}
          value={t ? rs(totSalary) : '—'}
          sub="what each engineer earns for the days paid"
        />
        <StatCard
          label="Profit at flat rate"
          value={t ? rs(totNett, true) : '—'}
          tone={totNett >= 0 ? 'good' : 'bad'}
          sub={t ? `earned ${rs(t.revenue)} at ₹420 a call` : ''}
        />
        <StatCard
          label="Profit at HP raw rate"
          value={t ? rs(totRawNett, true) : '—'}
          tone={totRawNett >= 0 ? 'good' : 'bad'}
          accent
          sub={t ? `earned ${rs(totRaw)} at HP's prices${closedTotal ? ` · ${Math.round((estCalls / closedTotal) * 100)}% estimated` : ''}` : ''}
        />
      </div>

      {/* ── Region price card ──────────────────────────────────── */}
      {board && board.live_ok && (
        <RegionCard
          selected={selectedRegion}
          onPick={pickRegion}
          regions={board.regions ?? []}
          totals={board.region_totals}
          status={board.raw_status}
          from={fromDate || currentDay()}
          to={toDate || currentDay()}
          onUploaded={() => load(true)}
        />
      )}

      {/* ── Engineers ──────────────────────────────────────────── */}
      <div ref={tableRef} className="scroll-mt-4 rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4 pb-3">
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white">Engineers</h3>
            <p className="text-xs text-surface-400">Click a name to see the calls behind the numbers</p>
          </div>
          {filtering && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500 dark:text-surface-400">
              <span>Showing <strong className="text-surface-700 dark:text-surface-200">{rows.length}</strong> of {allRows.length}</span>
              {engFilter && <FilterChip label="Engineer" sel={engFilter} onClear={() => setEngFilter(null)} />}
              {locFilter && <FilterChip label="Location" sel={locFilter} onClear={() => setLocFilter(null)} />}
              {segFilter && <FilterChip label="Segment" sel={segFilter} onClear={() => setSegFilter(null)} />}
              <button onClick={clearFilters} className="font-semibold text-primary-600 hover:text-primary-700">Clear all</button>
            </div>
          )}
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : !board || board.rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Cpu className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            {board && board.total_configured > 0 ? (
              <>
                <p className="text-surface-500 dark:text-surface-400 font-medium">No engineer closed a call in this period</p>
                <button onClick={() => setShowAll(true)} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Show all {board.total_configured} engineers →</button>
              </>
            ) : (
              <>
                <p className="text-surface-500 dark:text-surface-400 font-medium">No engineers yet</p>
                <button onClick={() => openAdd()} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Add your first engineer →</button>
              </>
            )}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">
              {search ? <>No engineer matches &ldquo;{search}&rdquo;</> : 'No engineer matches these filters'}
            </p>
            <button onClick={clearFilters} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Clear all filters →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="text-surface-500 dark:text-surface-400">
                <tr className="text-[11px] uppercase tracking-wide">
                  <th rowSpan={2} className={`${TH} text-left sticky left-0 z-20 bg-surface-50 dark:bg-surface-900`}>
                    <ColumnFilter label="Engineer" title="Engineer" options={engOptions} value={engFilter} onChange={setEngFilter} />
                  </th>
                  <th rowSpan={2} className={`${TH} text-left bg-surface-50 dark:bg-surface-900`}>
                    <ColumnFilter label="Location" title="Work Location" options={locOptions} value={locFilter} onChange={setLocFilter} />
                  </th>
                  <th rowSpan={2} className={`${TH} text-left bg-surface-50 dark:bg-surface-900`}>
                    <ColumnFilter label="Segment" title="Segment" options={segOptions} value={segFilter} onChange={setSegFilter} />
                  </th>
                  <GroupTh span={3}>Calls</GroupTh>
                  <GroupTh span={2}>Attendance</GroupTh>
                  <GroupTh span={multiDay ? 3 : 2}>Salary</GroupTh>
                  <GroupTh span={2}>Flat rate</GroupTh>
                  <GroupTh span={3} accent>HP raw data</GroupTh>
                  <th rowSpan={2} className={`${TH} bg-surface-50 dark:bg-surface-900`}><span className="sr-only">Actions</span></th>
                </tr>
                <tr className="text-xs">
                  <SubTh title="Calls each engineer is expected to close a day">Target / day</SubTh>
                  <SubTh title="Calls closed ÷ days present">Avg / day</SubTh>
                  <SubTh title="Calls closed in the period — click a number for the list">Closed</SubTh>
                  <SubTh first title="Days in the period, Sundays excluded (from Payroll)">Working days</SubTh>
                  <SubTh title="Days the engineer was present (Payroll attendance)">Present</SubTh>
                  <SubTh first title="Monthly salary (from Payroll)">Monthly</SubTh>
                  <SubTh title={`Monthly salary ÷ ${cycleDays} days in this salary cycle${multiDay ? '' : '. Both Profit columns subtract this.'}`}>Per day</SubTh>
                  {multiDay && <SubTh title={`What the engineer earns for these ${daysLabel}: per-day salary × paid days. Sundays are paid; working days they missed are cut. Both Profit columns subtract this.`}>Earned</SubTh>}
                  <SubTh first title="Calls closed × the engineer's per-call rate (₹420 by default)">Earning</SubTh>
                  <SubTh title="Flat-rate earning minus salary for the period">Profit</SubTh>
                  <SubTh first accent title="Average HP payment per call: exact amount where the call is in HP's data, else the same product's recent price">Avg / call</SubTh>
                  <SubTh accent title="Calls priced at HP's amounts">Earning</SubTh>
                  <SubTh accent title="HP-rate earning minus salary for the period">Profit</SubTh>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const facets = callFacets[r.engineer_name.trim().toLowerCase()]
                  const open = expanded === r.id
                  return (
                    <Fragment key={r.id}>
                      <tr className={`group border-t border-surface-100 dark:border-surface-700/60 ${open ? 'bg-primary-50/40 dark:bg-primary-900/10' : 'hover:bg-surface-50/70 dark:hover:bg-surface-700/30'}`}>
                        <td className={`p-3 sticky left-0 z-10 ${open ? 'bg-primary-50 dark:bg-surface-800' : 'bg-white dark:bg-surface-800 group-hover:bg-surface-50 dark:group-hover:bg-surface-700'}`}>
                          <button onClick={() => toggleRow(r)}
                            title={open ? 'Hide the calls' : `Show the calls ${r.engineer_name} closed`}
                            className="inline-flex items-center gap-1.5 font-semibold text-surface-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400">
                            {open ? <ChevronDown className="w-4 h-4 text-primary-500" /> : <ChevronRight className="w-4 h-4 text-surface-400" />}
                            {r.engineer_name}
                          </button>
                        </td>
                        <td className="p-3 text-surface-600 dark:text-surface-300"><FacetCell values={facets?.locations} /></td>
                        <td className="p-3 text-surface-600 dark:text-surface-300"><FacetCell values={facets?.segments} /></td>
                        <td className={`${TD} ${G1} text-surface-400`}>{r.per_day_target}</td>
                        <td className={`${TD} text-surface-700 dark:text-surface-300`}>{r.actual_closed_pd}</td>
                        <td className={`${TD} font-bold`}>
                          {r.total_calls_closed_pm > 0 ? (
                            <button onClick={() => setDrill({ engineer: r.engineer_name, expected: r.total_calls_closed_pm })}
                              className="text-primary-600 dark:text-primary-400 underline decoration-dotted underline-offset-4 hover:text-primary-700"
                              title="Open the full list of calls">
                              {r.total_calls_closed_pm}
                            </button>
                          ) : <span className="text-surface-400">0</span>}
                        </td>
                        <td className={`${TD} ${G1} text-surface-600 dark:text-surface-300`}>{r.total_working_days}</td>
                        <td className={`${TD} text-surface-700 dark:text-surface-200`}>
                          <Sourced from={r.working_days_source === 'payroll' ? 'payroll' : board?.working_days_ok ? 'manual' : undefined}>{r.actual_working_days}</Sourced>
                        </td>
                        <td className={`${TD} ${G1} text-surface-600 dark:text-surface-300`}>
                          <Sourced from={r.salary_source === 'payroll' ? 'payroll' : board?.payroll_ok ? 'manual' : undefined}>{rs(r.engg_salary)}</Sourced>
                        </td>
                        <td className={`${TD} text-surface-600 dark:text-surface-300`} title={`${rs(r.engg_salary)} ÷ ${cycleDays} days`}>{rs(r.daily_rate ?? r.per_day)}</td>
                        {multiDay && (
                          <td className={`${TD} text-surface-700 dark:text-surface-200`}
                            title={`${rs(r.daily_rate ?? r.per_day)} a day × ${r.paid_days ?? days} paid days`
                              + ((r.absent_days ?? 0) > 0 ? ` (${days} days − ${r.absent_days} working day${r.absent_days === 1 ? '' : 's'} missed)` : '')
                              + (r.working_days_source === 'payroll' ? '' : ' — no Payroll attendance, so every day is counted')}>
                            {rs(r.window_salary ?? r.per_day)}
                            <div className={`text-[10px] font-normal ${(r.absent_days ?? 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-surface-400'}`}>
                              {(r.absent_days ?? 0) > 0 ? `${r.paid_days} of ${days} days · ${r.absent_days} missed` : `${r.paid_days ?? days} of ${days} days`}
                            </div>
                          </td>
                        )}
                        <td className={`${TD} ${G1} text-surface-700 dark:text-surface-200`} title={`${r.total_calls_closed_pm} calls × ₹${inr(r.per_call_rate)}`}>
                          {rs(r.revenue)}
                          {parseFloat(r.per_call_rate) !== 420 && <div className="text-[10px] text-surface-400">₹{inr(r.per_call_rate)} / call</div>}
                        </td>
                        <td className={TD}><Money value={r.nett} /></td>
                        <td className={`${TD} ${G1} bg-violet-50/40 dark:bg-violet-900/10`}>
                          {r.total_calls_closed_pm > 0 ? <AvgRaw r={r} /> : <span className="text-surface-300">—</span>}
                        </td>
                        <td className={`${TD} bg-violet-50/40 dark:bg-violet-900/10 text-surface-700 dark:text-surface-200`}>{rs(r.raw_earning)}</td>
                        <td className={`${TD} bg-violet-50/40 dark:bg-violet-900/10`}><Money value={r.raw_profit_loss} /></td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100">
                            <button onClick={() => openEdit(r)} title="Edit engineer" className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-700"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => remove(r.id, r.engineer_name)} title="Remove engineer" className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={multiDay ? 17 : 16} className="p-0 bg-surface-50/70 dark:bg-surface-900/40 border-t border-surface-100 dark:border-surface-700">
                            <RowCalls state={rowCalls[r.id]} engineer={r.engineer_name} expected={r.total_calls_closed_pm} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
              {t && (
                <tfoot>
                  <tr className="border-t-2 border-surface-200 dark:border-surface-600 font-bold text-surface-900 dark:text-white bg-surface-50 dark:bg-surface-900/60">
                    <td className="p-3 sticky left-0 z-10 bg-surface-50 dark:bg-surface-900">Total</td>
                    <td colSpan={4}></td>
                    <td className={TD}>{inr(t.closed_calls)}</td>
                    <td colSpan={multiDay ? 4 : 3}></td>
                    <td className={TD}>{rs(totSalary)}</td>
                    <td className={TD}>{rs(t.revenue)}</td>
                    <td className={TD}><Money value={totNett} /></td>
                    <td></td>
                    <td className={TD}>{rs(totRaw)}</td>
                    <td className={TD}><Money value={totRawNett} /></td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
        {board && rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3 border-t border-surface-100 dark:border-surface-700 text-[11px] text-surface-500 dark:text-surface-400">
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary-500" /> from Payroll</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> entered by hand (not linked to Payroll)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-emerald-500" /> HP paid (exact)</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-amber-400" /> estimated from the product&rsquo;s recent price</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-red-400" /> rejected by HP (₹0)</span>
          </div>
        )}
      </div>

      {/* In OpenCall but not set up here */}
      {board && board.unmatched_engineers.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-5">
          <h3 className="font-semibold text-surface-900 dark:text-white mb-1">In OpenCall but not added here</h3>
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">These engineers closed calls in this period but have no P&amp;L set up. Add them to count their earnings.</p>
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

      <HowItWorks />

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
 * An Excel-style filter on a column header: a funnel that opens a checklist of the
 * column's values with Search and Select All, applied on OK. `value` null means no
 * filter. The panel is position:fixed because the table scrolls sideways and would
 * clip anything positioned inside it; it follows its button when the page scrolls.
 */
function ColumnFilter({ label, title, options, value, onChange }: {
  label: ReactNode
  title: string
  options: string[]
  value: Set<string> | null
  onChange: (v: Set<string> | null) => void
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  const place = () => {
    const r = btn.current!.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - 272)) })
  }
  const open = () => {
    place()
    setDraft(new Set(value ?? options))
    setQ('')
  }
  const close = () => setPos(null)

  const isOpen = !!pos
  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    // Scrolling the panel's own list must not touch it; scrolling the page or the
    // table moves the panel along with its button instead of closing it.
    const onScroll = (e: Event) => {
      if (panel.current?.contains(e.target as Node)) return
      place()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', place)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', place)
    }
  }, [isOpen])

  const shown = q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : options
  const allShownOn = shown.length > 0 && shown.every((o) => draft.has(o))
  const toggle = (o: string) => setDraft((d) => { const n = new Set(d); if (n.has(o)) n.delete(o); else n.add(o); return n })
  const toggleAll = () => setDraft((d) => {
    const n = new Set(d)
    shown.forEach((o) => (allShownOn ? n.delete(o) : n.add(o)))
    return n
  })
  const apply = () => {
    // Like Excel's search box: OK with a search typed keeps only the matching ticks.
    const picked = q ? new Set(shown.filter((o) => draft.has(o))) : draft
    onChange(options.every((o) => picked.has(o)) ? null : picked)
    close()
  }
  const active = !!value

  return (
    <div className="inline-flex items-center gap-1">
      <span>{label}</span>
      <button
        ref={btn}
        onClick={() => (pos ? close() : open())}
        title={active ? `${title}: ${[...value!].join(', ')}` : `Filter by ${title}`}
        className={`p-1 rounded-md transition-colors ${active
          ? 'bg-primary-600 text-white'
          : 'text-surface-400 hover:text-primary-600 hover:bg-surface-100 dark:hover:bg-surface-700'}`}
      >
        <Filter className="w-3.5 h-3.5" />
      </button>
      {pos && (
        <div
          ref={panel}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-50 w-64 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-xl text-sm font-normal text-surface-700 dark:text-surface-200 whitespace-normal"
        >
          <div className="p-2 border-b border-surface-100 dark:border-surface-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400 pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') apply() }}
                placeholder={`Search ${title.toLowerCase()}`}
                className="h-8 w-full pl-7 pr-2 rounded-lg text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto overscroll-contain py-1">
            {shown.length === 0 ? (
              <div className="px-3 py-2 text-xs text-surface-400">No matches</div>
            ) : (
              <>
                <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50 font-semibold">
                  <input type="checkbox" checked={allShownOn} onChange={toggleAll} className="accent-primary-600" />
                  {q ? '(Select All Search Results)' : '(Select All)'}
                </label>
                {shown.map((o) => (
                  <label key={o} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-700/50">
                    <input type="checkbox" checked={draft.has(o)} onChange={() => toggle(o)} className="accent-primary-600" />
                    <span className={o === BLANK ? 'italic text-surface-400' : ''}>{o}</span>
                  </label>
                ))}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 p-2 border-t border-surface-100 dark:border-surface-700">
            <button
              onClick={() => { onChange(null); close() }}
              disabled={!active}
              className="mr-auto text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:text-surface-300 dark:disabled:text-surface-600"
            >
              Clear filter
            </button>
            <button onClick={close} className="h-8 px-3 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700">
              Cancel
            </button>
            <button
              onClick={apply}
              disabled={draft.size === 0}
              className="h-8 px-4 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** A removable "Location: Salem, Hosur" chip summarising an active column filter. */
function FilterChip({ label, sel, onClear }: { label: string; sel: Set<string>; onClear: () => void }) {
  const list = [...sel]
  return (
    <span className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold">
      {label}: {list.slice(0, 3).join(', ')}{list.length > 3 ? ` +${list.length - 3}` : ''}
      <button onClick={onClear} title={`Clear ${label} filter`} className="p-0.5 rounded-full hover:bg-primary-100 dark:hover:bg-primary-800/50">
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

/**
 * One engineer's distinct Work Locations (or Segments) for the period. An engineer can
 * close calls across several of either, so the first is shown and the rest collapse
 * into a "+N" whose tooltip lists them — the row stays one line either way.
 */
/**
 * The calls one engineer closed in the current window, opened inline under their row.
 *
 * Deliberately a compact list rather than the full drill-down table: it sits inside
 * the board, and a second wide table there would push the very numbers the reader
 * opened it to check off the screen. The modal on the count stays for the full view.
 */
function RowCalls({ state, engineer, expected }: {
  state?: { loading: boolean; error: string; calls: EngineerClosedCall[] }
  engineer: string
  expected: number
}) {
  if (!state || state.loading) {
    return (
      <div className="flex items-center gap-2 px-5 py-4 text-sm text-surface-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading {engineer}&rsquo;s calls&hellip;
      </div>
    )
  }
  if (state.error) {
    return (
      <div className="px-5 py-4 text-sm text-amber-600 dark:text-amber-400">{state.error}</div>
    )
  }
  if (state.calls.length === 0) {
    return (
      <div className="px-5 py-4 text-sm text-surface-500">
        No closed calls for {engineer} in this period.
      </div>
    )
  }
  return (
    <div className="px-5 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-surface-400 mb-2">
        {state.calls.length} closed call{state.calls.length === 1 ? '' : 's'}
        {/* The count above comes from OpenCall's own total; if the list is shorter,
            saying so beats quietly showing fewer rows than the number promised. */}
        {state.calls.length !== expected && (
          <span className="ml-2 font-normal normal-case text-amber-600 dark:text-amber-400">
            (the board counts {expected} &mdash; open the count for the full list)
          </span>
        )}
      </div>
      <div className="rounded-xl border border-surface-100 dark:border-surface-700 bg-white dark:bg-surface-800 overflow-x-auto">
        <table className="w-full text-xs whitespace-normal">
          <thead>
            <tr className="text-left text-surface-400 border-b border-surface-100 dark:border-surface-700">
              <th className="px-3 py-2 font-semibold w-8">#</th>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Work order</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Region</th>
              <th className="px-3 py-2 font-semibold">Call type</th>
              <th className="px-3 py-2 font-semibold text-right">HP amount</th>
              <th className="px-3 py-2 font-semibold">How it was priced</th>
            </tr>
          </thead>
          <tbody>
            {state.calls.map((c, i) => (
              <tr key={`${c.ticket_id}-${c.date}-${i}`} className="border-t border-surface-50 dark:border-surface-700/50 hover:bg-surface-50/60 dark:hover:bg-surface-700/30">
                <td className="px-3 py-2 text-surface-400 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 whitespace-nowrap text-surface-500">{c.date ? fmtDay(c.date) : '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="font-semibold text-surface-800 dark:text-surface-100">{c.ticket_id || 'No ticket'}</div>
                  {c.case_id && <div className="text-[10px] text-surface-400">Case {c.case_id}</div>}
                </td>
                <td className="px-3 py-2 text-surface-700 dark:text-surface-200 min-w-[14rem]">
                  {c.product_name || '—'}
                  {c.segment && <span className="ml-1.5 text-[10px] text-surface-400">{c.segment}</span>}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-surface-600 dark:text-surface-300">{titleCase(c.work_location_name || c.work_location || '—')}</td>
                <td className="px-3 py-2 whitespace-nowrap text-surface-500">{c.wo_otc_code || '—'}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right"><RawValue c={c} /></td>
                <td className="px-3 py-2 text-[11px] text-surface-400 min-w-[12rem] max-w-[18rem]">
                  {c.raw_source === 'actual' ? 'Exact amount from HP raw data'
                    : c.raw_source === 'rejected' ? 'Rejected by HP, nothing paid'
                    : (c.raw_basis || '').replace(/^Not in raw data yet · /, 'Estimated: ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FacetCell({ values }: { values?: string[] }) {
  if (!values || values.length === 0) {
    return <span className="text-surface-300 dark:text-surface-600">—</span>
  }
  const shown = values.slice(0, 1)
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
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-300 whitespace-nowrap text-right">Raw Value</th>
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
                    <td className="p-3 whitespace-nowrap text-right"><RawValue c={c} /></td>
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

const RAW_SOURCE = {
  actual: { label: 'actual', cls: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
  estimated: { label: 'est.', cls: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
  rejected: { label: 'rejected', cls: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
} as const

/**
 * A month calendar for the salary cycle. Picking a month shows its cycle: the 25th
 * of the month before to the 24th of that month. Months after the current cycle are
 * disabled — there is nothing in them yet.
 */
function MonthPicker({ value, max, onPick }: { value: string; max: string; onPick: (ym: string) => void }) {
  const [year, setYear] = useState(() => Number(value.slice(0, 4)))
  const maxYear = Number(max.slice(0, 4))
  const short = (y: number, m: number) => new Date(y, m, 1).toLocaleDateString('en-IN', { month: 'short' })
  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setYear((y) => y - 1)} title="Previous year"
          className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-bold text-surface-800 dark:text-surface-100">{year}</span>
        <button onClick={() => setYear((y) => y + 1)} disabled={year >= maxYear} title="Next year"
          className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, m) => {
          const ym = `${year}-${String(m + 1).padStart(2, '0')}`
          const on = ym === value
          const future = ym > max
          return (
            <button key={ym} disabled={future} onClick={() => onPick(ym)}
              className={`rounded-xl border px-2 py-2 text-left transition-colors ${on ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-500' : 'border-surface-200 dark:border-surface-700 hover:border-primary-300 disabled:opacity-35 disabled:hover:border-surface-200'}`}>
              <div className={`text-sm font-bold ${on ? 'text-primary-700 dark:text-primary-300' : 'text-surface-800 dark:text-surface-100'}`}>
                {short(year, m)}{ym === max && <span className="ml-1 text-[9px] font-semibold text-primary-500 align-middle">NOW</span>}
              </div>
              <div className="text-[10px] text-surface-400">25 {short(year, m - 1)} – 24 {short(year, m)}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** One call's HP amount, tagged exact / estimated / rejected; the basis is on hover. */
function RawValue({ c }: { c: EngineerClosedCall }) {
  if (c.raw_value === undefined || !c.raw_source) return null
  const src = RAW_SOURCE[c.raw_source]
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={c.raw_basis}>
      <span className="font-semibold tabular-nums text-violet-600 dark:text-violet-400">{rs(c.raw_value)}</span>
      <span className={`px-1 rounded text-[10px] font-semibold ${src.cls}`}>{src.label}</span>
    </span>
  )
}

/**
 * What every closed call in the period is worth by region (ASP code), priced from HP
 * raw data. "This period" follows the dates above (Today / This Week / a cycle); the
 * month-wise view lists the last salary cycles side by side.
 */
function RegionCard({ regions, totals, status, from, to, onUploaded, selected, onPick }: {
  selected: string | null
  onPick: (region: string) => void
  regions: RegionValue[]
  totals: Partial<RegionValue>
  status: EngineerPnlBoard['raw_status']
  from: string
  to: string
  onUploaded: () => void
}) {
  const addToast = useExpenseStore((s) => s.addToast)
  const isAdmin = useExpenseStore((s) => !!s.user?.is_admin)
  const [tab, setTab] = useState<'period' | 'months'>('period')
  const [history, setHistory] = useState<{ loading: boolean; error: string; cycles: RegionCycle[] } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadHistory = async () => {
    setHistory({ loading: true, error: '', cycles: [] })
    try {
      const res = await fetchRegionHistory(6)
      setHistory({ loading: false, error: res.ok ? '' : res.message, cycles: res.cycles })
    } catch {
      setHistory({ loading: false, error: 'Could not load the month-wise figures.', cycles: [] })
    }
  }
  const showMonths = () => { setTab('months'); if (!history || history.error) loadHistory() }

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const res = await uploadFlexRawData(file)
      addToast('success', `Raw data loaded: ${res.created} new, ${res.updated} updated calls`)
      setHistory(null)
      onUploaded()
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      addToast('error', msg || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const [syncing, setSyncing] = useState(false)
  const syncNow = async () => {
    setSyncing(true)
    try {
      const res = await syncFlexRawData()
      addToast('success', res.unchanged ? 'Raw data is already up to date'
        : `Synced from rawdata.systimus.in: ${res.created ?? 0} new, ${res.updated ?? 0} updated calls`)
      setHistory(null)
      onUploaded()
    } catch (e) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      addToast('error', msg || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const total = parseFloat(totals?.value ?? '0')
  const regionNames = [...new Set((history?.cycles ?? []).flatMap((c) => c.regions.map((r) => r.region)))].sort()
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="mb-5 rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-violet-500 shrink-0" />
          <h3 className="font-semibold text-surface-900 dark:text-white">Region price card</h3>
          <span className="text-xs text-surface-400 truncate">what the closed calls are worth at HP&rsquo;s prices, by region</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden text-xs font-semibold">
            <button onClick={() => setTab('period')}
              className={`px-3 h-8 ${tab === 'period' ? 'bg-primary-600 text-white' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'}`}>
              This period
            </button>
            <button onClick={showMonths}
              className={`px-3 h-8 ${tab === 'months' ? 'bg-primary-600 text-white' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'}`}>
              Month-wise
            </button>
          </div>
          {isAdmin && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} />
              <button onClick={syncNow} disabled={syncing}
                title="Pull the latest raw data from rawdata.systimus.in now (it also syncs by itself every 30 minutes)"
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-60">
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync now
              </button>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                title="Fallback: load a Flex raw export (.xlsx) by hand"
                className="flex items-center justify-center h-8 w-8 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-500 hover:bg-surface-50 dark:hover:bg-surface-700 disabled:opacity-60">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {tab === 'period' && regions.length > 0 && (
        <p className="-mt-1 mb-2.5 text-xs text-surface-400">
          {selected ? <>Showing engineers who closed calls in <strong className="text-violet-600 dark:text-violet-400">{titleCase(selected)}</strong>. Click it again, or All regions, to show everyone.</> : 'Click a region to see only the engineers who worked there.'}
        </p>
      )}
      {tab === 'period' ? (
        regions.length === 0 ? (
          <p className="text-sm text-surface-400 py-3">No closed calls in this period.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <button onClick={() => selected && onPick(selected)} title={selected ? 'Show every engineer again' : 'Every region together'}
              className={`text-left rounded-xl border px-3.5 py-3 transition-all ${selected ? 'border-violet-200 dark:border-violet-800/60 opacity-70 hover:opacity-100' : 'border-violet-300 dark:border-violet-700 bg-violet-50/60 dark:bg-violet-900/20'}`}>
              <div className="text-[11px] font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">All regions</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-violet-700 dark:text-violet-300">{rs(total)}</div>
              <div className="text-[11px] text-surface-500">{totals?.calls ?? 0} calls · {fmtRange(from, to)}</div>
            </button>
            {regions.map((r) => {
              const share = total > 0 ? (parseFloat(r.value) / total) * 100 : 0
              return (
                <button key={r.region} onClick={() => onPick(r.region)} aria-pressed={selected === r.region.toUpperCase()}
                  className={`text-left rounded-xl border px-3.5 py-3 transition-all ${selected === r.region.toUpperCase() ? 'border-violet-500 ring-2 ring-violet-500/40 bg-violet-50/50 dark:bg-violet-900/20' : selected ? 'border-surface-100 dark:border-surface-700 opacity-60 hover:opacity-100' : 'border-surface-100 dark:border-surface-700 hover:border-violet-300 hover:shadow-sm'}`}
                  title={`${selected === r.region.toUpperCase() ? 'Click again to show every engineer' : `Show only engineers who closed calls in ${titleCase(r.region)}`} — ${r.actual} paid by HP · ${r.estimated} estimated · ${r.rejected} rejected`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-surface-500 dark:text-surface-400 truncate">{titleCase(r.region)}</span>
                    <span className="text-[11px] font-semibold text-surface-400 tabular-nums">{Math.round(share)}%</span>
                  </div>
                  <div className="mt-0.5 text-xl font-bold tabular-nums text-surface-900 dark:text-white">{rs(r.value)}</div>
                  <div className="mt-1.5 h-1 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${share}%` }} />
                  </div>
                  <div className="mt-1 text-[11px] text-surface-400">
                    {r.calls} call{r.calls === 1 ? '' : 's'}{r.estimated > 0 ? ` · ${r.estimated} estimated` : ' · all exact'}
                  </div>
                </button>
              )
            })}
          </div>
        )
      ) : !history || history.loading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-surface-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading the last 6 salary cycles&hellip;</div>
      ) : history.error && history.cycles.length === 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-400 py-3">{history.error}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-700 text-surface-500 dark:text-surface-400">
                <th className="text-left p-2 font-semibold">Salary cycle</th>
                {regionNames.map((n) => <th key={n} className="text-right p-2 font-semibold">{titleCase(n)}</th>)}
                <th className="text-right p-2 font-semibold text-violet-600 dark:text-violet-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {history.cycles.map((c) => (
                <tr key={c.from} className="border-b border-surface-100 dark:border-surface-700/50">
                  <td className="p-2">
                    <div className="font-semibold text-surface-800 dark:text-surface-100">{c.label}{c.current && <span className="ml-1.5 text-[10px] font-semibold text-primary-500">in progress</span>}</div>
                    <div className="text-[10px] text-surface-400">{fmtRange(c.from, c.to)}</div>
                  </td>
                  {regionNames.map((n) => {
                    const r = c.regions.find((x) => x.region === n)
                    return (
                      <td key={n} className="p-2 text-right text-surface-700 dark:text-surface-200"
                        title={r ? `${r.calls} calls · ${r.actual} actual, ${r.estimated} estimated, ${r.rejected} rejected` : ''}>
                        {r ? rs(r.value) : '—'}
                      </td>
                    )
                  })}
                  <td className="p-2 text-right font-bold tabular-nums text-violet-600 dark:text-violet-400">{rs(c.total.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'period' && selected && (() => {
        const r = regions.find((x) => x.region.toUpperCase() === selected)
        if (!r) return null
        return (
          <div className="mt-3 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-900/10 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-semibold text-surface-900 dark:text-white">
                How {titleCase(r.region)}&rsquo;s {rs(r.value)} is made up
              </h4>
              <span className="text-xs text-surface-500">{r.calls} calls closed in {titleCase(r.region)} · {fmtRange(from, to)}</span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
              <div className="rounded-lg bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-surface-500"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Paid by HP (exact)</div>
                <div className="font-bold tabular-nums text-surface-900 dark:text-white">{rs(r.actual_value)} <span className="text-xs font-normal text-surface-400">· {r.actual} calls</span></div>
              </div>
              <div className="rounded-lg bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-surface-500"><span className="w-2 h-2 rounded-full bg-amber-400" /> Estimated (not in HP data yet)</div>
                <div className="font-bold tabular-nums text-surface-900 dark:text-white">{rs(r.estimated_value)} <span className="text-xs font-normal text-surface-400">· {r.estimated} calls</span></div>
              </div>
              <div className="rounded-lg bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 px-3 py-2">
                <div className="flex items-center gap-1.5 text-xs text-surface-500"><span className="w-2 h-2 rounded-full bg-red-400" /> Rejected by HP</div>
                <div className="font-bold tabular-nums text-surface-900 dark:text-white">₹0 <span className="text-xs font-normal text-surface-400">· {r.rejected} calls</span></div>
              </div>
            </div>
            {(r.engineers?.length ?? 0) > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-surface-500 mb-1.5">By engineer, {titleCase(r.region)} calls only</div>
                <div className="flex flex-wrap gap-2">
                  {r.engineers!.map((e) => (
                    <span key={e.engineer_name} className="inline-flex items-center gap-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 px-3 py-1.5 text-sm">
                      <strong className="text-surface-800 dark:text-surface-100">{e.engineer_name}</strong>
                      <span className="text-surface-400">{e.calls} calls</span>
                      <span className="font-semibold tabular-nums text-violet-700 dark:text-violet-300">{rs(e.value)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="mt-3 text-[11px] text-surface-500">
              The engineers table below lists these people with their figures across <em>all</em> regions, salary included, so its totals will not match this card.
            </p>
          </div>
        )
      })()}
      <p className="mt-3 text-[11px] text-surface-400">
        {status && status.count > 0
          ? <>Raw data from <a href="https://rawdata.systimus.in" target="_blank" rel="noreferrer" className="underline decoration-dotted hover:text-violet-600">rawdata.systimus.in</a>: {status.count.toLocaleString('en-IN')} calls closed {fmtDate(status.closed_from)} to {fmtDate(status.closed_to)}{status.synced_at ? `, synced ${ago(status.synced_at)}` : ''}. Calls in it show the exact amount HP paid; newer calls are estimated from what HP paid for the same product over its last 3 months.</>
          : <>No raw data yet, so every value is an overall estimate. It syncs from rawdata.systimus.in by itself{isAdmin ? ', or press Sync now' : ''}.</>}
        {status?.sync_error && <span className="block mt-1 text-amber-600 dark:text-amber-400">Last sync failed: {status.sync_error}</span>}
      </p>
    </div>
  )
}

/* ── Table + summary building blocks ─────────────────────────────── */

const TH = 'p-3 font-semibold align-bottom'
const TD = 'p-3 text-right tabular-nums'
/** Left rule that opens a column group, so the groups read as blocks. */
const G1 = 'border-l border-surface-100 dark:border-surface-700'

function GroupTh({ span, accent, children }: { span: number; accent?: boolean; children: ReactNode }) {
  return (
    <th colSpan={span}
      className={`px-3 pt-3 pb-1 text-center font-bold border-l border-surface-200 dark:border-surface-700 ${accent ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'bg-surface-50 dark:bg-surface-900 text-surface-500 dark:text-surface-400'}`}>
      {children}
    </th>
  )
}

function SubTh({ first, accent, title, children }: { first?: boolean; accent?: boolean; title?: string; children: ReactNode }) {
  return (
    <th title={title}
      className={`px-3 pb-2.5 pt-1 text-right font-semibold cursor-help ${first ? 'border-l border-surface-200 dark:border-surface-700' : ''} ${accent ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'bg-surface-50 dark:bg-surface-900 text-surface-600 dark:text-surface-300'}`}>
      {children}
    </th>
  )
}

function StatCard({ label, value, sub, tone, accent }: {
  label: string; value: string; sub?: string; tone?: 'good' | 'bad'; accent?: boolean
}) {
  const color = tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'bad' ? 'text-red-600 dark:text-red-400' : 'text-surface-900 dark:text-white'
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-violet-50/60 dark:bg-violet-900/15 border-violet-200 dark:border-violet-800/50' : 'bg-white dark:bg-surface-800 border-surface-100 dark:border-surface-700'}`}>
      <div className={`text-xs font-semibold ${accent ? 'text-violet-700 dark:text-violet-300' : 'text-surface-500 dark:text-surface-400'}`}>{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-surface-400">{sub}</div>}
    </div>
  )
}

function SourceChip({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border ${ok ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'}`}>
      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      <strong className="font-semibold">{label}</strong>
      <span className="opacity-80">{detail}</span>
    </span>
  )
}

/** A figure with a dot saying whether Payroll supplied it or it was typed in here. */
function Sourced({ from, children }: { from?: 'payroll' | 'manual'; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 justify-end">
      {children}
      {from && (
        <span title={from === 'payroll' ? 'From Payroll' : 'Entered by hand — not linked to Payroll'}
          className={`w-1.5 h-1.5 rounded-full ${from === 'payroll' ? 'bg-primary-500' : 'bg-amber-400'}`} />
      )}
    </span>
  )
}

/** Profit / loss as a coloured amount: green gain, red loss. */
function Money({ value }: { value: string | number }) {
  const n = typeof value === 'string' ? parseFloat(value) : value
  const good = (n || 0) >= 0
  return (
    <span className={`inline-flex items-center justify-end gap-1 font-bold ${good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
      title={`${good ? 'Profit' : 'Loss'} ₹${inr(Math.abs(n || 0))}`}>
      {good ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      {rs(Math.abs(n || 0))}
    </span>
  )
}

/** Average HP rate per call, with a bar showing how much of it is exact vs estimated. */
function AvgRaw({ r }: { r: EngineerPnlRow }) {
  const total = r.raw_actual_calls + r.raw_estimated_calls + r.raw_rejected_calls || 1
  const pct = (n: number) => `${(n / total) * 100}%`
  return (
    <div className="inline-flex flex-col items-end gap-1"
      title={`${r.raw_actual_calls} paid by HP (exact) · ${r.raw_estimated_calls} estimated from recent prices · ${r.raw_rejected_calls} rejected by HP`}>
      <span className="font-semibold text-violet-700 dark:text-violet-300">{rs(r.raw_rate)}</span>
      <span className="flex w-14 h-1.5 rounded-full overflow-hidden bg-surface-100 dark:bg-surface-700">
        <span className="bg-emerald-500" style={{ width: pct(r.raw_actual_calls) }} />
        <span className="bg-amber-400" style={{ width: pct(r.raw_estimated_calls) }} />
        <span className="bg-red-400" style={{ width: pct(r.raw_rejected_calls) }} />
      </span>
    </div>
  )
}

/** Plain-language explanation of every number on the page, folded away by default. */
function HowItWorks() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-surface-100 dark:border-surface-700 bg-white dark:bg-surface-800">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-surface-700 dark:text-surface-200">
        <HelpCircle className="w-4 h-4 text-primary-500" /> How these numbers are worked out
        {open ? <ChevronDown className="w-4 h-4 ml-auto text-surface-400" /> : <ChevronRight className="w-4 h-4 ml-auto text-surface-400" />}
      </button>
      {open && (
        <dl className="grid gap-x-8 gap-y-3 px-4 pb-4 sm:grid-cols-2 text-sm">
          {[
            ['Closed calls', 'Pulled live from OpenCall for the period chosen at the top.'],
            ['Attendance: Working days', 'Days in the chosen period, leaving out Sundays.'],
            ['Attendance: Present', 'Days Payroll attendance marks the engineer Present, Late or Overtime. Leave and Absent do not count; a Sunday they actually worked does. Avg / day = calls closed ÷ days present.'],
            ['Salary: Monthly', 'The engineer’s full monthly salary from Payroll. A teal dot means it came from Payroll; amber means it was typed in here because the engineer is not linked yet.'],
            ['Salary: Per day', 'Monthly salary ÷ days in that salary cycle (25th–24th, 28–31 days). ₹24,000 over a 30-day cycle is ₹800 a day.'],
            ['Salary: Earned', 'Per-day salary × paid days, which is what both Profit columns subtract. Every day is paid, Sundays included, except working days the engineer missed (only days already over count). Example: ₹26,207 over a 31-day cycle is ₹845 a day; 26 working days, present 24, so 2 are cut: ₹845 × 29 = ₹24,517.'],
            ['Flat rate profit', 'Closed calls × ₹420 (or the rate set for that engineer), minus the salary for the period.'],
            ['HP raw data profit', 'Each call priced at what HP pays for it, minus the same salary. This is the closer-to-real figure.'],
            ['Exact vs estimated', 'A call already in HP\'s raw data gets the exact amount HP paid. Newer calls (HP sends each cycle\'s data on the 17th of the next month) use what HP paid for the same product over its last 3 months, and become exact once that data is uploaded.'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-surface-800 dark:text-surface-100">{k}</dt>
              <dd className="text-surface-500 dark:text-surface-400">{v}</dd>
            </div>
          ))}
        </dl>
      )}
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
  const engNameKey = form.engineer_name.trim().toLowerCase()
  // Requires a real name on both sides: empty matching empty would offer a stranger.
  // Two Payroll people with the same name is not a suggestion, it is a guess, so the
  // offer is withheld and the dropdown is left to settle it.
  const namesakes = engNameKey ? withEmail.filter((p) => p.name.trim().toLowerCase() === engNameKey) : []
  const suggestion = !emailTyped && namesakes.length === 1 ? namesakes[0] : undefined

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

            {payroll === null ? (
              <p className="mt-1 text-[11px] text-surface-400">Checking Payroll…</p>
            ) : !payroll.ok || withEmail.length === 0 ? (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                {payroll.ok
                  ? 'No Payroll employee has an email yet, so nothing can be matched against.'
                  : 'Payroll list unavailable — type the email exactly as it appears in Payroll.'}
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
                Left blank, this is filled in automatically from OpenCall (or from a Payroll employee whose name
                matches exactly) on the next board load — clearing it does not detach the engineer. To change who
                they are paid as, pick the right person above instead of emptying the field.
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
