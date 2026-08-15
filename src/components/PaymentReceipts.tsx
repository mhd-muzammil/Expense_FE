import { useEffect, useRef, useState } from 'react'
import {
  ReceiptText, Plus, Search, Trash2, Printer, X, Eye, Loader2, ArrowLeft,
} from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchReceipts, fetchReceipt, createReceipt, deleteReceipt,
  type PaymentReceipt, type ReceiptFormData,
} from '@/lib/api'
import PaymentReceiptDocument from '@/components/PaymentReceiptDocument'

interface LineDraft {
  document_number: string
  document_date: string
  document_amount: string
  payment_amount: string
}

const PAYMENT_METHODS = ['Bank Transfer', 'Cash', 'GPay', 'PhonePe', 'UPI', 'Cheque', 'Other']

const emptyLine = (): LineDraft => ({ document_number: '', document_date: '', document_amount: '', payment_amount: '' })

export default function PaymentReceipts() {
  const addToast = useExpenseStore((s) => s.addToast)

  const [receipts, setReceipts] = useState<PaymentReceipt[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'list' | 'create'>('list')
  const [preview, setPreview] = useState<PaymentReceipt | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setReceipts(await fetchReceipts(search || undefined))
    } catch {
      addToast('error', 'Failed to load receipts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'list') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    const t = setTimeout(() => { if (mode === 'list') load() }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  if (mode === 'create') {
    return <CreateReceipt onDone={() => setMode('list')} onPreview={(r) => { setMode('list'); setPreview(r) }} />
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <ReceiptText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Payment Receipts</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">Record payments received from customers</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search receipt…"
              className="pl-9 pr-3 py-2.5 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-56"
            />
          </div>
          <button
            onClick={() => setMode('create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Receipt
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ReceiptText className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">No receipts yet</p>
            <button onClick={() => setMode('create')} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Create your first receipt →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700">
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400">Receipt #</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400">Received From</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400">Date</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400">Amount</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30 transition-colors">
                    <td className="p-3 font-semibold text-surface-900 dark:text-white">{r.receipt_number}</td>
                    <td className="p-3 text-surface-700 dark:text-surface-300">{r.receipt_to_name}</td>
                    <td className="p-3 text-surface-500 dark:text-surface-400">{r.payment_date}</td>
                    <td className="p-3 text-right font-semibold text-surface-900 dark:text-white">₹{parseFloat(r.amount_received).toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPreview(r)} title="View / Print" className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <DeleteButton id={r.id} number={r.receipt_number} onDeleted={() => setReceipts((p) => p.filter((x) => x.id !== r.id))} onToast={addToast} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview && <PreviewModal receiptId={preview.id} onClose={() => setPreview(null)} />}
    </div>
  )
}

function DeleteButton({ id, number, onDeleted, onToast }: { id: number; number: string; onDeleted: () => void; onToast: (t: 'success' | 'error', m: string) => void }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} title="Delete" className="p-2 rounded-lg text-surface-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={async () => {
          setBusy(true)
          try { await deleteReceipt(id); onToast('success', `Deleted ${number}`); onDeleted() }
          catch { onToast('error', 'Failed to delete'); setBusy(false) }
        }}
        className="px-2 py-1 rounded text-[11px] font-semibold bg-red-600 text-white hover:bg-red-700"
      >
        {busy ? '…' : 'Delete'}
      </button>
      <button onClick={() => setConfirm(false)} className="px-2 py-1 rounded text-[11px] text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700">Cancel</button>
    </div>
  )
}

function PreviewModal({ receiptId, onClose }: { receiptId: number; onClose: () => void }) {
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)
  useEffect(() => {
    fetchReceipt(receiptId).then(setReceipt).catch(() => {})
  }, [receiptId])

  return (
    <div className="fixed inset-0 z-[90] bg-surface-900/70 backdrop-blur-sm overflow-auto">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-surface-800 text-white">
        <button onClick={onClose} className="flex items-center gap-2 text-sm hover:text-primary-300">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>
      <div className="flex justify-start sm:justify-center py-6">
        {receipt ? (
          <div className="print-area bg-white shadow-2xl">
            <PaymentReceiptDocument receipt={receipt} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-white"><Loader2 className="w-6 h-6 animate-spin" /></div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create receipt form
// ---------------------------------------------------------------------------
function CreateReceipt({ onDone, onPreview }: { onDone: () => void; onPreview: (r: PaymentReceipt) => void }) {
  const addToast = useExpenseStore((s) => s.addToast)
  const today = new Date().toISOString().split('T')[0]

  const [receiptNumber, setReceiptNumber] = useState('')
  const [receiptToName, setReceiptToName] = useState('')
  const [receiptToPhone, setReceiptToPhone] = useState('')
  const [receiptToAddress, setReceiptToAddress] = useState('')
  const [paymentDate, setPaymentDate] = useState(today)
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [saving, setSaving] = useState(false)
  const linesRef = useRef<HTMLDivElement>(null)

  const updateLine = (i: number, key: keyof LineDraft, value: string) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)))
  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (i: number) => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const total = lines.reduce((s, l) => s + (parseFloat(l.payment_amount) || 0), 0)

  const handleSave = async () => {
    if (!receiptToName.trim()) { addToast('error', 'Received-from name is required'); return }
    const validLines = lines.filter((l) => (parseFloat(l.payment_amount) || 0) > 0 || l.document_number.trim())
    if (validLines.length === 0) {
      addToast('error', 'Add at least one document line with a payment amount')
      linesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const payload: ReceiptFormData = {
      receipt_number: receiptNumber.trim() || undefined,
      receipt_to_name: receiptToName.trim(),
      receipt_to_phone: receiptToPhone.trim(),
      receipt_to_address: receiptToAddress.trim(),
      payment_date: paymentDate,
      payment_method: paymentMethod,
      lines: validLines.map((l) => ({
        document_number: l.document_number.trim(),
        document_date: l.document_date || null,
        document_amount: parseFloat(l.document_amount) || 0,
        payment_amount: parseFloat(l.payment_amount) || 0,
      })),
    }
    setSaving(true)
    try {
      const created = await createReceipt(payload)
      addToast('success', `Receipt ${created.receipt_number} created`)
      onPreview(created)
    } catch {
      addToast('error', 'Failed to create receipt')
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500'
  const labelCls = 'block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1'

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onDone} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"><ArrowLeft className="w-5 h-5 text-surface-500" /></button>
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">New Payment Receipt</h2>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Save & Preview
        </button>
      </div>

      {/* Receipt To + meta */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelCls}>Received from (name) *</label><input className={inputCls} value={receiptToName} onChange={(e) => setReceiptToName(e.target.value)} /></div>
        <div><label className={labelCls}>Phone</label><input className={inputCls} value={receiptToPhone} onChange={(e) => setReceiptToPhone(e.target.value)} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Address</label><textarea rows={2} className={inputCls} value={receiptToAddress} onChange={(e) => setReceiptToAddress(e.target.value)} /></div>
        <div><label className={labelCls}>Payment date</label><input type="date" className={inputCls} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></div>
        <div>
          <label className={labelCls}>Payment method</label>
          <select className={inputCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="md:col-span-2"><label className={labelCls}>Receipt number (optional — auto if blank)</label><input className={inputCls} value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="e.g. RT/26-27/SER-2816" /></div>
      </div>

      {/* Document lines */}
      <div ref={linesRef} className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-surface-900 dark:text-white">Documents Paid <span className="text-red-500">*</span></h3>
          <button onClick={addLine} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100">
            <Plus className="w-3.5 h-3.5" /> Add line
          </button>
        </div>
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-100 dark:border-surface-700">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-4"><label className={labelCls}>Document number</label><input className={inputCls} value={l.document_number} onChange={(e) => updateLine(i, 'document_number', e.target.value)} placeholder="e.g. RT26-27-REN-2483" /></div>
                <div className="md:col-span-3"><label className={labelCls}>Document date</label><input type="date" className={inputCls} value={l.document_date} onChange={(e) => updateLine(i, 'document_date', e.target.value)} /></div>
                <div className="md:col-span-2"><label className={labelCls}>Doc amount (₹)</label><input className={inputCls} value={l.document_amount} onChange={(e) => updateLine(i, 'document_amount', e.target.value)} /></div>
                <div className="md:col-span-2"><label className={labelCls}>Paid (₹) *</label><input className={inputCls} value={l.payment_amount} onChange={(e) => updateLine(i, 'payment_amount', e.target.value)} /></div>
                <div className="md:col-span-1 flex items-end">
                  <button onClick={() => removeLine(i)} className="w-full flex items-center justify-center py-2 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-4 pt-3 border-t border-surface-100 dark:border-surface-700">
          <div className="text-right">
            <div className="text-xs font-medium text-surface-500 dark:text-surface-400">Amount Received</div>
            <div className="text-2xl font-bold text-surface-900 dark:text-white">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
