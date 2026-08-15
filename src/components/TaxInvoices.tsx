import { useEffect, useRef, useState } from 'react'
import {
  FileText, Plus, Search, Trash2, Printer, Eye, Loader2, ArrowLeft,
} from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchTaxInvoices, fetchTaxInvoice, createTaxInvoice, deleteTaxInvoice,
  type TaxInvoice, type TaxInvoiceFormData,
} from '@/lib/api'
import TaxInvoiceDocument from '@/components/TaxInvoiceDocument'

interface ItemDraft {
  description: string
  sub_description: string
  hsn_sac: string
  quantity: string
  uom: string
  unit_price: string
  gst_rate: string
}

const emptyItem = (): ItemDraft => ({ description: '', sub_description: '', hsn_sac: '', quantity: '1', uom: 'NOS', unit_price: '', gst_rate: '18' })

export default function TaxInvoices() {
  const addToast = useExpenseStore((s) => s.addToast)

  const [invoices, setInvoices] = useState<TaxInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'list' | 'create'>('list')
  const [preview, setPreview] = useState<TaxInvoice | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setInvoices(await fetchTaxInvoices(search || undefined))
    } catch {
      addToast('error', 'Failed to load tax invoices')
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
    return <CreateTaxInvoice onDone={() => setMode('list')} onPreview={(inv) => { setMode('list'); setPreview(inv) }} />
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Tax Invoice</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">GST invoices — IGST inter-state, CGST/SGST intra-state</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice…"
              className="pl-9 pr-3 py-2.5 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-56"
            />
          </div>
          <button
            onClick={() => setMode('create')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Tax Invoice
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">No tax invoices yet</p>
            <button onClick={() => setMode('create')} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Create your first invoice →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700">
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400">Invoice #</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400">Customer</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400">Tax</th>
                  <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400">Date</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400">Amount</th>
                  <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30 transition-colors">
                    <td className="p-3 font-semibold text-surface-900 dark:text-white">{inv.ti_number}</td>
                    <td className="p-3 text-surface-700 dark:text-surface-300">{inv.customer_name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${inv.is_inter_state ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {inv.is_inter_state ? 'IGST' : 'CGST+SGST'}
                      </span>
                    </td>
                    <td className="p-3 text-surface-500 dark:text-surface-400">{inv.issue_date}</td>
                    <td className="p-3 text-right font-semibold text-surface-900 dark:text-white">₹{parseFloat(inv.grand_total).toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setPreview(inv)} title="View / Print" className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <DeleteButton id={inv.id} number={inv.ti_number} onDeleted={() => setInvoices((p) => p.filter((x) => x.id !== inv.id))} onToast={addToast} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {preview && <PreviewModal invoiceId={preview.id} onClose={() => setPreview(null)} />}
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
          try { await deleteTaxInvoice(id); onToast('success', `Deleted ${number}`); onDeleted() }
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

function PreviewModal({ invoiceId, onClose }: { invoiceId: number; onClose: () => void }) {
  const [invoice, setInvoice] = useState<TaxInvoice | null>(null)
  useEffect(() => {
    fetchTaxInvoice(invoiceId).then(setInvoice).catch(() => {})
  }, [invoiceId])

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
        {invoice ? (
          <div className="print-area bg-white shadow-2xl">
            <TaxInvoiceDocument invoice={invoice} />
          </div>
        ) : (
          <div className="flex items-center justify-center py-20 text-white"><Loader2 className="w-6 h-6 animate-spin" /></div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Create tax invoice form
// ---------------------------------------------------------------------------
function CreateTaxInvoice({ onDone, onPreview }: { onDone: () => void; onPreview: (inv: TaxInvoice) => void }) {
  const addToast = useExpenseStore((s) => s.addToast)
  const today = new Date().toISOString().split('T')[0]

  const [tiNumber, setTiNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerGstin, setCustomerGstin] = useState('')
  const [shipToName, setShipToName] = useState('')
  const [shipToAddress, setShipToAddress] = useState('')
  const [issueDate, setIssueDate] = useState(today)
  const [dueDate, setDueDate] = useState(today)
  const [placeOfSupply, setPlaceOfSupply] = useState('TN (33)')
  const [terms, setTerms] = useState('* Thanks for your support.')
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  const [saving, setSaving] = useState(false)
  const itemsRef = useRef<HTMLDivElement>(null)

  // Inter-state (IGST) when the place-of-supply state code ≠ TN (33). Mirrors backend parse_state_code.
  const stateCode = (placeOfSupply.match(/(\d{2})/) || [])[1]
  const isInterState = !!stateCode && stateCode !== '33'

  const updateItem = (i: number, key: keyof ItemDraft, value: string) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)))
  const addItem = () => setItems((prev) => [...prev, emptyItem()])
  const removeItem = (i: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))

  const runningTotal = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0
    const price = parseFloat(it.unit_price) || 0
    const gst = parseFloat(it.gst_rate) || 0
    const taxable = qty * price
    return sum + taxable + (taxable * gst) / 100
  }, 0)

  const handleSave = async () => {
    if (!customerName.trim()) { addToast('error', 'Customer name is required'); return }
    const validItems = items.filter((it) => it.description.trim())
    if (validItems.length === 0) {
      addToast('error', 'Add at least one item — fill the Item Description below')
      itemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const payload: TaxInvoiceFormData = {
      ti_number: tiNumber.trim() || undefined,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim(),
      customer_gstin: customerGstin.trim(),
      ship_to_name: shipToName.trim(),
      ship_to_address: shipToAddress.trim(),
      issue_date: issueDate,
      due_date: dueDate || null,
      place_of_supply: placeOfSupply.trim(),
      terms: terms.trim(),
      items: validItems.map((it) => ({
        description: it.description.trim(),
        sub_description: it.sub_description.trim(),
        hsn_sac: it.hsn_sac.trim(),
        quantity: parseFloat(it.quantity) || 0,
        uom: it.uom.trim(),
        unit_price: parseFloat(it.unit_price) || 0,
        gst_rate: parseFloat(it.gst_rate) || 0,
      })),
    }
    setSaving(true)
    try {
      const created = await createTaxInvoice(payload)
      addToast('success', `Invoice ${created.ti_number} created`)
      onPreview(created)
    } catch {
      addToast('error', 'Failed to create tax invoice')
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
          <h2 className="text-xl font-bold text-surface-900 dark:text-white">New Tax Invoice</h2>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Save & Preview
        </button>
      </div>

      {/* Customer + meta */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className={labelCls}>Customer name *</label><input className={inputCls} value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
        <div><label className={labelCls}>Phone</label><input className={inputCls} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Address</label><textarea rows={2} className={inputCls} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} /></div>
        <div><label className={labelCls}>Customer GSTIN</label><input className={inputCls} value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} /></div>
        <div>
          <label className={labelCls}>Place of supply</label>
          <input className={inputCls} value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)} placeholder="e.g. KA (29)" />
          <p className={`mt-1 text-[11px] font-semibold ${isInterState ? 'text-amber-600' : 'text-emerald-600'}`}>
            {isInterState ? 'Inter-state → IGST' : 'Intra-state → CGST + SGST'}
          </p>
        </div>
        <div><label className={labelCls}>Ship to name (optional)</label><input className={inputCls} value={shipToName} onChange={(e) => setShipToName(e.target.value)} placeholder="Same as customer" /></div>
        <div><label className={labelCls}>Ship to address (optional)</label><input className={inputCls} value={shipToAddress} onChange={(e) => setShipToAddress(e.target.value)} placeholder="Same as customer" /></div>
        <div><label className={labelCls}>Issue date</label><input type="date" className={inputCls} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
        <div><label className={labelCls}>Due date</label><input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <div className="md:col-span-2"><label className={labelCls}>Invoice number (optional — auto if blank)</label><input className={inputCls} value={tiNumber} onChange={(e) => setTiNumber(e.target.value)} placeholder="e.g. RT26-27-SER-11" /></div>
      </div>

      {/* Items */}
      <div ref={itemsRef} className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-surface-900 dark:text-white">Items <span className="text-red-500">*</span></h3>
          <button onClick={addItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100">
            <Plus className="w-3.5 h-3.5" /> Add item
          </button>
        </div>
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="p-3 rounded-xl bg-surface-50 dark:bg-surface-900/40 border border-surface-100 dark:border-surface-700">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <div className="md:col-span-4"><label className={labelCls}>Description *</label><input className={inputCls} value={it.description} onChange={(e) => updateItem(i, 'description', e.target.value)} /></div>
                <div className="md:col-span-2"><label className={labelCls}>HSN/SAC</label><input className={inputCls} value={it.hsn_sac} onChange={(e) => updateItem(i, 'hsn_sac', e.target.value)} /></div>
                <div className="md:col-span-1"><label className={labelCls}>Qty</label><input className={inputCls} value={it.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} /></div>
                <div className="md:col-span-1"><label className={labelCls}>UoM</label><input className={inputCls} value={it.uom} onChange={(e) => updateItem(i, 'uom', e.target.value)} /></div>
                <div className="md:col-span-2"><label className={labelCls}>Price (₹)</label><input className={inputCls} value={it.unit_price} onChange={(e) => updateItem(i, 'unit_price', e.target.value)} /></div>
                <div className="md:col-span-1"><label className={labelCls}>GST %</label><input className={inputCls} value={it.gst_rate} onChange={(e) => updateItem(i, 'gst_rate', e.target.value)} /></div>
                <div className="md:col-span-1 flex items-end">
                  <button onClick={() => removeItem(i)} className="w-full flex items-center justify-center py-2 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="md:col-span-12"><input className={inputCls} value={it.sub_description} onChange={(e) => updateItem(i, 'sub_description', e.target.value)} placeholder="Sub-description (optional)" /></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Terms + total */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-5 flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
        <div className="flex-1"><label className={labelCls}>Terms &amp; Conditions</label><textarea rows={2} className={inputCls} value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
        <div className="text-right">
          <div className="text-xs font-medium text-surface-500 dark:text-surface-400">Estimated Total ({isInterState ? 'IGST' : 'CGST+SGST'})</div>
          <div className="text-2xl font-bold text-surface-900 dark:text-white">₹{runningTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>
  )
}
