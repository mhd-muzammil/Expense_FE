import { useEffect, useRef, useState } from 'react'
import { FileText, Search, Upload, Loader2, Trash2, X, Receipt, FileCheck2, IndianRupee, Wallet, Eye, Paperclip, FolderUp } from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchSleekBillInvoices, importSleekBillInvoices, clearSleekBillInvoices,
  openInvoicePdf, attachInvoicePdf, bulkAttachInvoicePdfs,
  type SleekBillInvoice, type SleekBillSummary,
} from '@/lib/api'

const TYPE_TAX = 'Tax Invoice'
const TYPE_BOS = 'Bill of Supply'
const PAGE_SIZE = 50

const inr = (v: string | number | null | undefined) => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
  if (!n || isNaN(n as number)) return '—'
  return (n as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const fmtDate = (d: string | null) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

// Status colour badge (Paid = green, Overdue = red, else amber/grey).
function statusClass(s: string): string {
  const t = (s || '').toLowerCase()
  if (t.includes('paid')) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  if (t.includes('overdue')) return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  if (t.includes('partial')) return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  return 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300'
}
const typeClass = (t: string) => t === TYPE_TAX
  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
  : 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'

export default function InvoiceRegister() {
  const addToast = useExpenseStore((s) => s.addToast)

  const [rows, setRows] = useState<SleekBillInvoice[]>([])
  const [summary, setSummary] = useState<SleekBillSummary>({ count: 0, tax_invoice: 0, bill_of_supply: 0, amount: '0', tax: '0', total: '0', paid: '0', balance: '0' })
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [pdfUploading, setPdfUploading] = useState(false)
  const [attachingId, setAttachingId] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const pdfBulkRef = useRef<HTMLInputElement>(null)
  const pdfRowRef = useRef<HTMLInputElement>(null)
  const attachTargetRef = useRef<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetchSleekBillInvoices({ type: typeFilter || undefined, search: search || undefined, page })
      setRows(res.results)
      setSummary(res.summary)
      setCount(res.count)
    } catch {
      addToast('error', 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [typeFilter])
  useEffect(() => {
    const t = setTimeout(load, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, search, page])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setUploading(true)
    try {
      const res = await importSleekBillInvoices(file)
      addToast('success', res.detail || 'Imported')
      setPage(1)
      await load()
    } catch (err: any) {
      addToast('error', err?.response?.data?.detail || 'Import failed — upload the Sleek Bill "Invoices Export" .xls')
    } finally {
      setUploading(false)
    }
  }

  const handleClear = async () => {
    setClearing(true)
    try {
      const res = await clearSleekBillInvoices()
      addToast('success', res.detail || 'Cleared')
      await load()
    } catch {
      addToast('error', 'Failed to clear')
    } finally {
      setClearing(false)
    }
  }

  // Bulk PDF upload — each file matched to an invoice by the invoice number in its filename.
  const handleBulkPdfs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (pdfBulkRef.current) pdfBulkRef.current.value = ''
    if (!files.length) return
    setPdfUploading(true)
    try {
      const res = await bulkAttachInvoicePdfs(files)
      addToast(res.matched > 0 ? 'success' : 'error', res.detail)
      await load()
    } catch {
      addToast('error', 'PDF upload failed')
    } finally {
      setPdfUploading(false)
    }
  }

  // Attach a PDF to one specific invoice (from its row).
  const handleRowPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const id = attachTargetRef.current
    if (pdfRowRef.current) pdfRowRef.current.value = ''
    if (!file || id == null) return
    setAttachingId(id)
    try {
      await attachInvoicePdf(id, file)
      addToast('success', 'PDF attached')
      await load()
    } catch {
      addToast('error', 'Failed to attach PDF')
    } finally {
      setAttachingId(null)
    }
  }

  const viewPdf = async (id: number) => {
    try { await openInvoicePdf(id) } catch { addToast('error', 'Could not open PDF') }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">Invoice Register</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">Invoices imported from Sleek Bill</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search invoice / client / GSTIN…"
              className="pl-9 pr-3 py-2.5 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-64"
            />
          </div>
          <input ref={fileRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleFile} />
          <input ref={pdfBulkRef} type="file" accept="application/pdf" multiple className="hidden" onChange={handleBulkPdfs} />
          <input ref={pdfRowRef} type="file" accept="application/pdf" className="hidden" onChange={handleRowPdf} />
          <button
            onClick={() => pdfBulkRef.current?.click()}
            disabled={pdfUploading}
            title="Upload invoice PDFs — matched to invoices by the number in each filename (e.g. RT26-27-SER-15.pdf)"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors whitespace-nowrap disabled:opacity-60"
          >
            {pdfUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderUp className="w-4 h-4" />}
            Upload PDFs
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors whitespace-nowrap disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import from Sleek Bill
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-5">
        <Tile icon={<Receipt className="w-4 h-4" />} label="Invoices" value={summary.count.toLocaleString('en-IN')} tone="primary" />
        <Tile icon={<FileCheck2 className="w-4 h-4" />} label="Tax Invoices" value={summary.tax_invoice.toLocaleString('en-IN')} tone="primary" />
        <Tile icon={<FileText className="w-4 h-4" />} label="Bills of Supply" value={summary.bill_of_supply.toLocaleString('en-IN')} tone="violet" />
        <Tile icon={<IndianRupee className="w-4 h-4" />} label="Total Amount" value={`₹${inr(summary.total)}`} tone="emerald" />
        <Tile icon={<Wallet className="w-4 h-4" />} label="Balance Due" value={`₹${inr(summary.balance)}`} tone="red" />
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[{ k: '', l: 'All' }, { k: TYPE_TAX, l: 'Tax Invoice' }, { k: TYPE_BOS, l: 'Bill of Supply' }].map((t) => (
          <button
            key={t.k}
            onClick={() => setTypeFilter(t.k)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              typeFilter === t.k
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">No invoices yet</p>
            <button onClick={() => fileRef.current?.click()} className="mt-3 text-sm font-semibold text-primary-600 hover:text-primary-700">Import the Sleek Bill export →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700 text-left">
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">ISSUE DATE</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">DOC NO.</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">TYPE</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400">CLIENT NAME</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">DUE DATE</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-right whitespace-nowrap">TAX</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-right whitespace-nowrap">AMOUNT</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">PAYMENT DATE</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-right whitespace-nowrap">BALANCE</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-center whitespace-nowrap">STATUS</th>
                  <th className="p-3 font-semibold text-surface-600 dark:text-surface-400 text-center whitespace-nowrap">PDF</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-surface-100 dark:border-surface-700/50 hover:bg-surface-50/50 dark:hover:bg-surface-700/30 transition-colors">
                    <td className="p-3 text-surface-700 dark:text-surface-300 whitespace-nowrap">{fmtDate(r.issue_date)}</td>
                    <td className="p-3 font-medium text-surface-800 dark:text-surface-200 whitespace-nowrap">{r.invoice_number}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${typeClass(r.invoice_type)}`}>
                        {r.invoice_type === TYPE_TAX ? 'Tax' : r.invoice_type === TYPE_BOS ? 'BoS' : r.invoice_type}
                      </span>
                    </td>
                    <td className="p-3 text-surface-700 dark:text-surface-300">{r.client_name}</td>
                    <td className="p-3 text-surface-500 dark:text-surface-400 whitespace-nowrap">{fmtDate(r.due_date)}</td>
                    <td className="p-3 text-right tabular-nums text-surface-600 dark:text-surface-400 whitespace-nowrap">{parseFloat(r.tax) ? inr(r.tax) : '—'}</td>
                    <td className="p-3 text-right tabular-nums font-semibold text-surface-800 dark:text-surface-200 whitespace-nowrap">₹{inr(r.total)}</td>
                    <td className="p-3 text-surface-500 dark:text-surface-400 whitespace-nowrap">{fmtDate(r.date_of_payment)}</td>
                    <td className={`p-3 text-right tabular-nums whitespace-nowrap font-medium ${parseFloat(r.balance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-surface-400'}`}>{parseFloat(r.balance) ? inr(r.balance) : '—'}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusClass(r.status)}`}>{r.status || '—'}</span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {r.has_pdf ? (
                        <button onClick={() => viewPdf(r.id)} title="View invoice PDF" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      ) : (
                        <button
                          onClick={() => { attachTargetRef.current = r.id; pdfRowRef.current?.click() }}
                          disabled={attachingId === r.id}
                          title="Attach this invoice's PDF"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-surface-400 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors disabled:opacity-60"
                        >
                          {attachingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />} Attach
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-surface-700">
            <span className="text-sm text-surface-500 dark:text-surface-400">
              Showing {rows.length} of {count.toLocaleString('en-IN')} invoices
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg text-sm hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30">Prev</button>
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300 px-1">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg text-sm hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30">Next</button>
            </div>
          </div>
        )}
      </div>

      {count > 0 && (
        <div className="flex justify-end mt-4">
          <ClearButton busy={clearing} onConfirm={handleClear} count={summary.count} />
        </div>
      )}
    </div>
  )
}

function Tile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'primary' | 'violet' | 'emerald' | 'red' }) {
  const c = {
    primary: 'text-primary-600 dark:text-primary-400',
    violet: 'text-violet-600 dark:text-violet-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    red: 'text-red-600 dark:text-red-400',
  }[tone]
  return (
    <div className="rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 p-4">
      <div className={`flex items-center gap-1.5 text-xs font-medium ${c}`}>{icon} {label}</div>
      <div className={`text-2xl font-bold mt-0.5 ${c}`}>{value}</div>
    </div>
  )
}

function ClearButton({ busy, onConfirm, count }: { busy: boolean; onConfirm: () => void; count: number }) {
  const [confirm, setConfirm] = useState(false)
  if (!confirm) {
    return (
      <button onClick={() => setConfirm(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
        <Trash2 className="w-3.5 h-3.5" /> Clear all {count.toLocaleString('en-IN')} invoices
      </button>
    )
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-surface-500">Delete all imported invoices?</span>
      <button onClick={onConfirm} disabled={busy} className="px-3 py-1.5 rounded text-xs font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">{busy ? '…' : 'Yes, clear'}</button>
      <button onClick={() => setConfirm(false)} className="px-3 py-1.5 rounded text-xs text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700"><X className="w-3.5 h-3.5" /></button>
    </div>
  )
}
