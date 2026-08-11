import { useEffect, useState } from 'react'
import { CalendarClock, Plus, Pencil, Trash2, X, Loader2, AlertTriangle, CheckCircle2, Clock, RefreshCw } from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchSubscriptions, createSubscription, updateSubscription, deleteSubscription,
  type Subscription, type SubscriptionFormData,
} from '@/lib/api'

const CYCLES = [
  { v: 'monthly', l: 'Monthly' }, { v: 'quarterly', l: 'Quarterly' },
  { v: 'half_yearly', l: 'Half Yearly' }, { v: 'yearly', l: 'Yearly' }, { v: 'one_time', l: 'One Time' },
]
const cycleLabel = (v: string) => CYCLES.find((c) => c.v === v)?.l ?? v

const inr = (v: string | number) => {
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (!n || isNaN(n)) return '—'
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

const emptyForm = (): SubscriptionFormData => ({
  name: '', vendor: '', amount: 0, cycle: 'yearly',
  renewal_date: new Date().toISOString().split('T')[0],
  reminder_days_before: 7, auto_renew: false, notes: '', active: true,
})

export default function Subscriptions() {
  const addToast = useExpenseStore((s) => s.addToast)
  const [rows, setRows] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<null | { id?: number; data: SubscriptionFormData }>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try { setRows(await fetchSubscriptions()) }
    catch { addToast('error', 'Failed to load subscriptions') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  const expiringSoon = rows.filter((r) => r.status === 'expiring_soon').length
  const expired = rows.filter((r) => r.status === 'expired').length

  const remove = async (id: number) => {
    try { await deleteSubscription(id); setRows((p) => p.filter((r) => r.id !== id)); addToast('success', 'Deleted') }
    catch { addToast('error', 'Failed to delete') }
    finally { setDeleteId(null) }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <CalendarClock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Subscriptions</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">Track renewals so nothing lapses</p>
          </div>
        </div>
        <button
          onClick={() => setEditing({ data: emptyForm() })}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-sm font-medium text-white shadow-lg shadow-primary-500/25 hover:from-primary-600 hover:to-primary-700 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Tile icon={<CheckCircle2 className="w-4 h-4" />} label="Total" value={String(rows.length)} tone="primary" />
        <Tile icon={<Clock className="w-4 h-4" />} label="Expiring Soon" value={String(expiringSoon)} tone="amber" />
        <Tile icon={<AlertTriangle className="w-4 h-4" />} label="Expired" value={String(expired)} tone="red" />
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CalendarClock className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">No subscriptions yet</p>
            <button onClick={() => setEditing({ data: emptyForm() })} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Add your first subscription →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700 text-left">
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400">NAME</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400">VENDOR</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-right whitespace-nowrap">AMOUNT</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">CYCLE</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">RENEWAL</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-center whitespace-nowrap">DAYS LEFT</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-center">STATUS</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30 transition-colors">
                    <td className="p-3 font-medium text-surface-800 dark:text-surface-200">
                      <span className="inline-flex items-center gap-1.5">{r.name}{r.auto_renew && <RefreshCw className="w-3 h-3 text-emerald-500" aria-label="Auto-renew" />}</span>
                    </td>
                    <td className="p-3 text-surface-500 dark:text-surface-400">{r.vendor || '—'}</td>
                    <td className="p-3 text-right tabular-nums whitespace-nowrap text-surface-700 dark:text-surface-300">{inr(r.amount)}</td>
                    <td className="p-3 text-surface-500 dark:text-surface-400 whitespace-nowrap">{cycleLabel(r.cycle)}</td>
                    <td className="p-3 text-surface-700 dark:text-surface-300 whitespace-nowrap">{fmtDate(r.renewal_date)}</td>
                    <td className={`p-3 text-center tabular-nums font-semibold whitespace-nowrap ${
                      r.status === 'expired' ? 'text-red-600 dark:text-red-400'
                        : r.status === 'expiring_soon' ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {r.days_left == null ? '—' : r.days_left < 0 ? `${Math.abs(r.days_left)}d ago` : `${r.days_left}d`}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === 'expired' ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : r.status === 'expiring_soon' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                        {r.status === 'expired' ? 'Expired' : r.status === 'expiring_soon' ? 'Renew Soon' : 'Active'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditing({ id: r.id, data: { name: r.name, vendor: r.vendor, amount: parseFloat(r.amount) || 0, cycle: r.cycle, renewal_date: r.renewal_date, reminder_days_before: r.reminder_days_before, auto_renew: r.auto_renew, notes: r.notes, active: r.active } })} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30" title="Edit">
                          <Pencil className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                        </button>
                        <button onClick={() => setDeleteId(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30" title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <SubscriptionForm state={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} onToast={addToast} />}

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-800 rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4"><Trash2 className="w-6 h-6 text-red-500" /></div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">Delete subscription?</h3>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700">Cancel</button>
              <button onClick={() => remove(deleteId)} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-medium text-white">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Tile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'primary' | 'amber' | 'red' }) {
  const c = { primary: 'text-primary-600 dark:text-primary-400', amber: 'text-amber-600 dark:text-amber-400', red: 'text-red-600 dark:text-red-400' }[tone]
  return (
    <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4">
      <div className={`flex items-center gap-1.5 text-xs font-medium ${c}`}>{icon} {label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${c}`}>{value}</div>
    </div>
  )
}

function SubscriptionForm({ state, onClose, onSaved, onToast }: {
  state: { id?: number; data: SubscriptionFormData }
  onClose: () => void
  onSaved: () => void
  onToast: (t: 'success' | 'error', m: string) => void
}) {
  const [form, setForm] = useState<SubscriptionFormData>(state.data)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof SubscriptionFormData, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }))
  const input = 'w-full px-3 py-2 rounded-lg text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500'
  const label = 'block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1'

  const submit = async () => {
    if (!form.name.trim()) { onToast('error', 'Name is required'); return }
    if (!form.renewal_date) { onToast('error', 'Renewal date is required'); return }
    setSaving(true)
    try {
      if (state.id) { await updateSubscription(state.id, form); onToast('success', 'Updated') }
      else { await createSubscription(form); onToast('success', `Added ${form.name}`) }
      onSaved()
    } catch { onToast('error', 'Failed to save'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white dark:bg-surface-800 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-700">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{state.id ? 'Edit Subscription' : 'Add Subscription'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"><X className="w-5 h-5 text-surface-500" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className={label}>Name *</label><input className={input} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Sleek Bill Premium" /></div>
          <div><label className={label}>Vendor</label><input className={input} value={form.vendor} onChange={(e) => set('vendor', e.target.value)} placeholder="e.g. Sleek Bill" /></div>
          <div><label className={label}>Amount (₹)</label><input type="number" step="0.01" className={input} value={form.amount || ''} onChange={(e) => set('amount', e.target.value ? parseFloat(e.target.value) : 0)} /></div>
          <div><label className={label}>Billing Cycle</label>
            <select className={input} value={form.cycle} onChange={(e) => set('cycle', e.target.value)}>{CYCLES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}</select>
          </div>
          <div><label className={label}>Renewal / Expiry Date *</label><input type="date" className={input} value={form.renewal_date} onChange={(e) => set('renewal_date', e.target.value)} /></div>
          <div><label className={label}>Remind (days before)</label><input type="number" min="0" className={input} value={form.reminder_days_before} onChange={(e) => set('reminder_days_before', e.target.value ? parseInt(e.target.value) : 0)} /></div>
          <div className="flex items-center gap-2 pt-6">
            <input id="autorenew" type="checkbox" checked={form.auto_renew} onChange={(e) => set('auto_renew', e.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="autorenew" className="text-sm text-surface-700 dark:text-surface-300">Auto-renews</label>
          </div>
          <div className="col-span-2"><label className={label}>Notes</label><textarea rows={2} className={input} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {state.id ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
