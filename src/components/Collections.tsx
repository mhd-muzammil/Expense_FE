import { useEffect, useState } from 'react'
import {
  IndianRupee, Search, X, RefreshCw, Loader2, AlertTriangle, MessageCircle, Phone, Mail, ChevronRight,
} from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchCollections, fetchCollectionsInvoices,
  type CollectionsData, type CollectionsClient, type CollectionsInvoice, type AgingBucket,
} from '@/lib/api'

const inr = (v: string | number | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  if (isNaN(n as number)) return '0'
  return (n as number).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

/** Large sums are unreadable in full; ₹32.4L lands where ₹32,35,456 does not. */
const short = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return '0'
  const a = Math.abs(n)
  if (a >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`
  if (a >= 100000) return `${(n / 100000).toFixed(2)}L`
  if (a >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toFixed(0)
}

const BUCKETS: AgingBucket[] = ['0-30', '31-60', '61-90', '90+']

/** Older money is worse money — the colour says so before the number is read. */
const bucketTone: Record<AgingBucket, string> = {
  '0-30': 'text-emerald-600 dark:text-emerald-400',
  '31-60': 'text-amber-600 dark:text-amber-400',
  '61-90': 'text-orange-600 dark:text-orange-400',
  '90+': 'text-red-600 dark:text-red-400',
}
const bucketChip: Record<AgingBucket, string> = {
  '0-30': 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50',
  '31-60': 'bg-amber-50 dark:bg-amber-900/25 border-amber-200 dark:border-amber-800/50',
  '61-90': 'bg-orange-50 dark:bg-orange-900/25 border-orange-200 dark:border-orange-800/50',
  '90+': 'bg-red-50 dark:bg-red-900/25 border-red-200 dark:border-red-800/50',
}

/**
 * The follow-up message, written the way a person would send it.
 *
 * Everything in it comes from the invoices on file — no figure is invented, and
 * the amount is always the balance, never the invoice total, so a part-paid bill
 * is never asked for twice.
 */
function buildMessage(client: string, balance: string, invoices: CollectionsInvoice[]): string {
  const lines = invoices.slice(0, 6).map((i) => {
    const days = i.days_overdue > 0 ? ` (${i.days_overdue} days overdue)` : ''
    return `• ${i.invoice_number || 'Invoice'} — ₹${inr(i.balance)}${days}`
  })
  const more = invoices.length > 6 ? `\n…and ${invoices.length - 6} more invoice(s).` : ''
  return (
    `Dear ${client},\n\n` +
    `Hope you are doing well. Our records show a pending balance of ₹${inr(balance)} ` +
    `against ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}:\n\n` +
    lines.join('\n') + more +
    `\n\nKindly arrange the payment at your earliest convenience. ` +
    `If any of these have already been settled, please share the payment details so we can update our records.\n\n` +
    `Thank you.`
  )
}

export default function Collections() {
  const addToast = useExpenseStore((s) => s.addToast)
  const [data, setData] = useState<CollectionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [bucket, setBucket] = useState<AgingBucket | ''>('')
  const [drill, setDrill] = useState<CollectionsClient | null>(null)

  const load = async (silent = false) => {
    silent ? setRefreshing(true) : setLoading(true)
    try {
      setData(await fetchCollections({ search, bucket }))
    } catch {
      addToast('error', 'Failed to load collections')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Debounced so a search reads as typing, not as a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(true), search ? 350 : 0)
    return () => clearTimeout(t)
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [search, bucket])

  const s = data?.summary
  const collectedPct = s && parseFloat(s.billed) > 0
    ? (parseFloat(s.collected) / parseFloat(s.billed)) * 100
    : 0

  const inputCls =
    'h-9 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <IndianRupee className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Collections</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Who owes us, how long they have owed it
              {data ? ` — as of ${data.as_of}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
          <div className="relative shrink-0 w-full sm:w-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client"
              className={`${inputCls} w-full sm:w-56 pl-8 pr-8`}
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
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Tile label="Billed" value={s ? `₹${short(s.billed)}` : '—'} sub={s ? `₹${inr(s.billed)}` : ''} />
        <Tile
          label="Collected"
          value={s ? `₹${short(s.collected)}` : '—'}
          sub={s ? `${collectedPct.toFixed(1)}% of billed` : ''}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <Tile
          label="Outstanding"
          value={s ? `₹${short(s.outstanding)}` : '—'}
          sub={s ? `${s.unpaid_invoices} unpaid · ${s.clients_owing} clients` : ''}
          accent="text-red-600 dark:text-red-400"
        />
        <Tile
          label="Overdue"
          value={s ? `₹${short(s.overdue_amount)}` : '—'}
          sub={s ? `${s.overdue_invoices} past their due date` : ''}
          accent="text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Aging — clickable filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {(data?.aging ?? BUCKETS.map((b) => ({ bucket: b, count: 0, amount: '0' }))).map((a) => {
          const on = bucket === a.bucket
          return (
            <button
              key={a.bucket}
              onClick={() => setBucket(on ? '' : (a.bucket as AgingBucket))}
              title={on ? 'Show every client again' : `Show only what is ${a.bucket} days old`}
              className={`text-left rounded-xl border px-4 py-3 transition-all ${bucketChip[a.bucket as AgingBucket]} ${
                on ? 'ring-2 ring-primary-500' : 'hover:brightness-95 dark:hover:brightness-110'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-surface-600 dark:text-surface-300">
                  {a.bucket} days
                </span>
                {on && <X className="w-3.5 h-3.5 text-surface-500" />}
              </div>
              <div className={`text-lg font-bold mt-1 ${bucketTone[a.bucket as AgingBucket]}`}>
                ₹{short(a.amount)}
              </div>
              <div className="text-[11px] text-surface-500 dark:text-surface-400">{a.count} invoices</div>
            </button>
          )
        })}
      </div>

      {s && parseFloat(s.credit_notes) !== 0 && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-xs bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400">
          Outstanding counts money owed only. Credit notes of ₹{inr(s.credit_notes)} are shown here rather than
          netted off, so the total above equals the rows below it.
        </div>
      )}

      {/* Clients */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : !data || data.clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <IndianRupee className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">
              {search || bucket ? 'No client matches this filter' : 'Nothing outstanding — everything is collected'}
            </p>
            {(search || bucket) && (
              <button
                onClick={() => { setSearch(''); setBucket('') }}
                className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                Clear filters →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {bucket && (
              <div className="px-3 pt-3 text-xs text-surface-500 dark:text-surface-400">
                Showing what each client owes <strong className="text-surface-700 dark:text-surface-200">within {bucket} days</strong>, not their whole balance.
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700 text-surface-600 dark:text-surface-400">
                  <th className="text-left p-3 font-semibold">Client</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">Outstanding</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">Bills</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">Oldest</th>
                  <th className="text-left p-3 font-semibold whitespace-nowrap">Ageing</th>
                  <th className="text-right p-3 font-semibold whitespace-nowrap">Follow up</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map((c) => (
                  <tr
                    key={c.client_name}
                    className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30"
                  >
                    <td className="p-3">
                      <button
                        onClick={() => setDrill(c)}
                        className="text-left font-semibold text-surface-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 inline-flex items-center gap-1"
                      >
                        {c.client_name}
                        <ChevronRight className="w-3.5 h-3.5 text-surface-400" />
                      </button>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-surface-400">
                        {c.city && <span>{c.city}</span>}
                        {c.gstin && <span className="font-mono">{c.gstin}</span>}
                        {c.name_variants.length > 1 && (
                          <span title={c.name_variants.join('\n')} className="underline decoration-dotted">
                            {c.name_variants.length} spellings merged
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                      ₹{inr(c.balance)}
                    </td>
                    <td className="p-3 text-right text-surface-500 dark:text-surface-400">{c.bill_count}</td>
                    <td className={`p-3 text-right font-semibold whitespace-nowrap ${bucketTone[c.oldest_days > 90 ? '90+' : c.oldest_days > 60 ? '61-90' : c.oldest_days > 30 ? '31-60' : '0-30']}`}>
                      {c.oldest_days}d
                    </td>
                    <td className="p-3">
                      <MiniAging buckets={c.buckets} />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.whatsapp ? (
                          <WhatsAppButton client={c} onToast={addToast} />
                        ) : (
                          <span
                            className="text-[11px] text-surface-400 inline-flex items-center gap-1"
                            title="No usable Indian mobile number on any of this client's invoices. Add one in Sleek Bill and it appears here."
                          >
                            <Phone className="w-3.5 h-3.5" /> no mobile
                          </span>
                        )}
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            title={c.email}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-700"
                          >
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drill && <ClientInvoices client={drill} onClose={() => setDrill(null)} onToast={addToast} />}
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

/** How one client's debt is spread across the age bands, as a proportional bar. */
function MiniAging({ buckets }: { buckets: Record<AgingBucket, string> }) {
  const vals = BUCKETS.map((b) => parseFloat(buckets[b] || '0'))
  const total = vals.reduce((a, b) => a + b, 0)
  if (total <= 0) return <span className="text-surface-300 dark:text-surface-600">—</span>
  const fill: Record<AgingBucket, string> = {
    '0-30': 'bg-emerald-500', '31-60': 'bg-amber-500', '61-90': 'bg-orange-500', '90+': 'bg-red-500',
  }
  return (
    <div className="flex h-2 w-28 rounded-full overflow-hidden bg-surface-100 dark:bg-surface-700">
      {BUCKETS.map((b, i) =>
        vals[i] > 0 ? (
          <div
            key={b}
            className={fill[b]}
            style={{ width: `${(vals[i] / total) * 100}%` }}
            title={`${b} days: ₹${inr(buckets[b])}`}
          />
        ) : null,
      )}
    </div>
  )
}

/**
 * Opens WhatsApp with the follow-up already written.
 *
 * The invoices are fetched at click time rather than held for every row on the
 * board, and the message is built from what comes back — so it can never quote a
 * figure the drill-down would contradict.
 */
function WhatsAppButton({
  client, onToast, label,
}: { client: CollectionsClient; onToast: (t: 'success' | 'error', m: string) => void; label?: string }) {
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    try {
      const res = await fetchCollectionsInvoices(client.client_name)
      const text = buildMessage(client.client_name, res.balance, res.invoices)
      const phone = res.whatsapp || client.whatsapp
      if (!phone) { onToast('error', 'No usable mobile number for this client'); return }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    } catch {
      onToast('error', 'Could not build the message')
    } finally {
      setBusy(false)
    }
  }
  return (
    <button
      onClick={send}
      disabled={busy}
      title={`WhatsApp ${client.phone || client.whatsapp} — opens with the message ready; nothing is sent until you press send`}
      className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 disabled:opacity-60"
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
      {label ?? 'WhatsApp'}
    </button>
  )
}

/** Every unpaid invoice behind one client's balance, oldest debt first. */
function ClientInvoices({
  client, onClose, onToast,
}: { client: CollectionsClient; onClose: () => void; onToast: (t: 'success' | 'error', m: string) => void }) {
  const [rows, setRows] = useState<CollectionsInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState('0')

  useEffect(() => {
    let alive = true
    fetchCollectionsInvoices(client.client_name)
      .then((res) => { if (!alive) return; setRows(res.invoices); setBalance(res.balance) })
      .catch(() => { if (alive) setError('Could not load this client’s invoices') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [client.client_name])

  return (
    <div className="fixed inset-0 z-[90] bg-surface-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-surface-800 shadow-2xl border border-surface-100 dark:border-surface-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-surface-100 dark:border-surface-700">
          <div className="min-w-0">
            <h3 className="font-bold text-surface-900 dark:text-white truncate">{client.client_name}</h3>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              ₹{inr(balance)} across {rows.length} unpaid invoice{rows.length === 1 ? '' : 's'}
              {client.oldest_days > 0 ? ` · oldest ${client.oldest_days} days` : ''}
            </p>
            {client.name_variants.length > 1 && (
              <p className="text-[11px] text-surface-400 mt-0.5">
                Billed under {client.name_variants.length} spellings: {client.name_variants.join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {client.whatsapp && <WhatsAppButton client={client} onToast={onToast} label="Send reminder" />}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
              <X className="w-4 h-4 text-surface-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-surface-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" /> {error}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-surface-50 dark:bg-surface-900 border-b border-surface-100 dark:border-surface-700">
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-300">Invoice</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-300">Issued</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-300">Due</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-300">Overdue</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-300">Total</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-300">Paid</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-300">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-surface-100 dark:border-surface-700/50">
                    <td className="p-3 font-medium text-surface-800 dark:text-surface-100 whitespace-nowrap">
                      {r.invoice_number || '—'}
                    </td>
                    <td className="p-3 text-surface-600 dark:text-surface-300 whitespace-nowrap">{r.issue_date || '—'}</td>
                    <td className="p-3 text-surface-600 dark:text-surface-300 whitespace-nowrap">{r.due_date || '—'}</td>
                    <td className={`p-3 text-right font-semibold whitespace-nowrap ${bucketTone[r.bucket]}`}>
                      {r.days_overdue > 0 ? `${r.days_overdue}d` : 'not due'}
                    </td>
                    <td className="p-3 text-right text-surface-500 dark:text-surface-400 whitespace-nowrap">₹{inr(r.total)}</td>
                    <td className="p-3 text-right text-surface-500 dark:text-surface-400 whitespace-nowrap">₹{inr(r.amount_paid)}</td>
                    <td className="p-3 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">₹{inr(r.balance)}</td>
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
