import { useMemo, useState, useEffect } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import { formatCurrency } from '@/lib/utils'
import { getCategoryHex } from '@/lib/categories'
import { CURRENCY_SYMBOL } from '@/lib/brand'
import { ExpenseDetailModal } from '@/components/BranchCard'
import { setPaymentModeBalance, deletePaymentModeBalance, fetchDashboard, fetchPaymentModeBalances, fetchBillingReminders, createBillingReminder, updateBillingReminder, toggleBillingReminderPaid, deleteBillingReminder, fetchExpenses, type BillingReminder, type BillingReminderFormData, type Expense, fetchPettyCashSummary, createPettyCashDebit, updatePettyCashDebit, deletePettyCashDebit, type PettyCashDebit, type PettyCashDebitFormData, type PettyCashSummary } from '@/lib/api'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  Pencil,
  Trash2,
  X,
  Check,
  Plus,
  ChevronDown,
  Utensils,
  Car,
  ShoppingBag,
  Zap,
  Package,
  MoreHorizontal,
  CreditCard,
  MapPin,
  Calendar,
  Filter,
  Bell,
  Clock,
  CheckCircle2,
  AlertCircle,
  Repeat,
  ArrowLeft,
  Search,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, Sector,
} from 'recharts'

function CategoryIcon({ category, className }: { category: string, className?: string }) {
  const cat = category.toLowerCase()
  if (cat.includes('food') || cat.includes('snack')) return <Utensils className={className} />
  if (cat.includes('travel') || cat.includes('petrol') || cat.includes('fuel')) return <Car className={className} />
  if (cat.includes('shop') || cat.includes('bill')) return <ShoppingBag className={className} />
  if (cat.includes('elect') || cat.includes('rent') || cat.includes('utility')) return <Zap className={className} />
  if (cat.includes('salary') || cat.includes('income')) return <CreditCard className={className} />
  if (cat.includes('misc') || cat.includes('other')) return <MoreHorizontal className={className} />
  return <Package className={className} />
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-36 mb-2" />
      <div className="skeleton h-3 w-20" />
    </div>
  )
}

function SkeletonChart() {
  return (
    <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm">
      <div className="skeleton h-5 w-40 mb-4" />
      <div className="skeleton h-[250px] w-full" />
    </div>
  )
}

function DrillModal({ filters, onClose, onViewExpense, kind, title }: { filters: { branch?: string, category?: string, date_from?: string, date_to?: string }, onClose: () => void, onViewExpense: (exp: Expense) => void, kind?: 'credit' | 'debit', title?: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      try {
        if (kind) {
          // Credit/Debit drill: page through ALL matching entries and keep only
          // the requested side, so the list matches the card total exactly.
          const all: Expense[] = []
          let page = 1
          for (;;) {
            const res = await fetchExpenses({ ...filters, page })
            all.push(...res.results)
            if (!res.next || res.results.length === 0 || page > 60) break
            page++
          }
          const filtered = all.filter((e) =>
            kind === 'credit'
              ? parseFloat(e.credited_amount || '0') > 0
              : parseFloat(e.debited_amount || '0') > 0,
          )
          if (alive) setExpenses(filtered)
        } else {
          const res = await fetchExpenses(filters)
          if (alive) setExpenses(res.results)
        }
      } catch (err) {
        console.error('Drill load failed:', err)
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [filters, kind])

  const drillTotal = kind
    ? expenses.reduce((s, e) => s + parseFloat((kind === 'credit' ? e.credited_amount : e.debited_amount) || '0'), 0)
    : 0

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-surface-800 rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-8 py-6 border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
          <div>
            <h2 className="text-xl font-black text-surface-900 dark:text-white tracking-tight">{title || 'Detailed Entries'}</h2>
            <p className="text-xs text-surface-400 font-bold uppercase tracking-widest mt-0.5">
              {filters.branch || 'All Branches'} • {filters.category || 'All Categories'}
              {kind && !loading && (
                <span className={kind === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                  {' '}• {expenses.length} entries • {formatCurrency(drillTotal)}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white dark:hover:bg-surface-700 shadow-sm border border-transparent hover:border-surface-100 transition-all">
            <X className="w-6 h-6 text-surface-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="skeleton h-4 w-1/4" />
                  <div className="skeleton h-12 w-full" />
                </div>
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-50 dark:bg-surface-900 flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-surface-200" />
              </div>
              <p className="text-base font-bold text-surface-400 uppercase tracking-widest">No entries found for this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {expenses.map((exp) => {
                const isCredit = exp.credited_amount && parseFloat(exp.credited_amount) > 0
                return (
                  <button
                    key={exp.id}
                    onClick={() => onViewExpense(exp)}
                    className="w-full text-left group/item p-4 rounded-2xl border border-surface-100 dark:border-surface-700/50 hover:border-primary-500/50 hover:bg-primary-50/5 dark:hover:bg-primary-900/10 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCredit ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-red-50 dark:bg-red-900/20 text-red-600'}`}>
                          {isCredit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-surface-400 uppercase tracking-widest block mb-0.5">{new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="text-sm font-bold text-surface-900 dark:text-white group-hover/item:text-primary-500 transition-colors">{exp.category}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-base font-black ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isCredit ? '+' : '−'}{formatCurrency(isCredit ? exp.credited_amount! : exp.debited_amount!)}
                        </span>
                        <span className="text-[10px] text-surface-400 font-bold block mt-0.5">{exp.debit_payment_mode || exp.credit_payment_mode || '—'}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-surface-500 dark:text-surface-400 line-clamp-1 italic bg-surface-50/50 dark:bg-surface-900/30 p-2 rounded-lg border border-surface-100/50 dark:border-surface-700/30">
                      "{(exp.debit_remark || exp.credit_remark || 'No remark')}"
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One Time' },
]

const FREQUENCY_COLORS: Record<string, string> = {
  monthly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  quarterly: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  half_yearly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  yearly: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  one_time: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300',
}

export function PettyCashDrawerSection() {
  const { branches, filters } = useExpenseStore()
  const [summary, setSummary] = useState<PettyCashSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'debits' | 'credits'>('debits')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Search & local filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [localBranchFilter, setLocalBranchFilter] = useState('')
  const [localDateFrom, setLocalDateFrom] = useState('')
  const [localDateTo, setLocalDateTo] = useState('')
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc')

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    remark: '',
    person: '',
    branch: branches[0]?.location || '',
  })

  const loadSummary = async () => {
    setLoading(true)
    try {
      const data = await fetchPettyCashSummary({
        branch: filters.branch,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      setSummary(data)
    } catch (err) {
      console.error('Failed to load petty cash summary:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [filters.branch, filters.date_from, filters.date_to])

  const resetForm = () => {
    setEditingId(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      remark: '',
      person: '',
      branch: filters.branch || branches[0]?.location || '',
    })
  }

  const startEdit = (debit: PettyCashDebit) => {
    setEditingId(debit.id)
    setDeletingId(null)
    setFormData({
      date: debit.date,
      amount: parseFloat(debit.amount) || 0,
      remark: debit.remark || '',
      person: debit.person || '',
      branch: debit.branch_location || branches[0]?.location || '',
    })
    setShowAddForm(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.amount || formData.amount <= 0 || !formData.branch) return
    setSubmitting(true)
    try {
      const payload = {
        date: formData.date,
        amount: formData.amount,
        remark: formData.remark,
        person: formData.person,
        branch: formData.branch,
      }
      if (editingId !== null) {
        await updatePettyCashDebit(editingId, payload)
      } else {
        await createPettyCashDebit(payload)
      }
      await loadSummary()
      setShowAddForm(false)
      resetForm()
    } catch (err) {
      console.error('Failed to save petty cash debit:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deletePettyCashDebit(id)
      await loadSummary()
      setDeletingId(null)
    } catch (err) {
      console.error('Failed to delete petty cash debit:', err)
    }
  }

  // 0. Extract unique active branches from Petty Cash summary (credits and debits)
  const availableBranches = useMemo(() => {
    if (!summary) return []
    const branchSet = new Set<string>()
    summary.credits.forEach(c => {
      if (c.branch_location) {
        branchSet.add(c.branch_location.trim().toUpperCase())
      }
    })
    summary.debits.forEach(d => {
      if (d.branch_location) {
        branchSet.add(d.branch_location.trim().toUpperCase())
      }
    })
    return Array.from(branchSet).sort()
  }, [summary])

  // 1. Filtered Debits List
  const filteredDebits = useMemo(() => {
    if (!summary) return []
    let list = [...summary.debits]

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      list = list.filter(item => 
        (item.remark || '').toLowerCase().includes(term) ||
        (item.person || '').toLowerCase().includes(term) ||
        String(item.amount).includes(term)
      )
    }

    if (!filters.branch && localBranchFilter) {
      list = list.filter(item => (item.branch_location || '').trim().toUpperCase() === localBranchFilter.toUpperCase())
    }

    if (localDateFrom) {
      list = list.filter(item => item.date >= localDateFrom)
    }
    if (localDateTo) {
      list = list.filter(item => item.date <= localDateTo)
    }

    list.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      if (sortBy === 'amount-desc') {
        return parseFloat(b.amount) - parseFloat(a.amount)
      }
      if (sortBy === 'amount-asc') {
        return parseFloat(a.amount) - parseFloat(b.amount)
      }
      return 0
    })

    return list
  }, [summary, searchTerm, localBranchFilter, localDateFrom, localDateTo, sortBy, filters.branch])

  // 2. Filtered Credits List
  const filteredCredits = useMemo(() => {
    if (!summary) return []
    let list = [...summary.credits]

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      list = list.filter(item => 
        (item.debit_remark || item.credit_remark || '').toLowerCase().includes(term) ||
        (item.debit_person || item.credit_person || '').toLowerCase().includes(term) ||
        String(item.debited_amount || item.credited_amount || '').includes(term)
      )
    }

    if (!filters.branch && localBranchFilter) {
      list = list.filter(item => (item.branch_location || '').trim().toUpperCase() === localBranchFilter.toUpperCase())
    }

    if (localDateFrom) {
      list = list.filter(item => item.date >= localDateFrom)
    }
    if (localDateTo) {
      list = list.filter(item => item.date <= localDateTo)
    }

    list.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      if (sortBy === 'amount-desc') {
        const amtA = parseFloat(a.debited_amount || a.credited_amount || '0')
        const amtB = parseFloat(b.debited_amount || b.credited_amount || '0')
        return amtB - amtA
      }
      if (sortBy === 'amount-asc') {
        const amtA = parseFloat(a.debited_amount || a.credited_amount || '0')
        const amtB = parseFloat(b.debited_amount || b.credited_amount || '0')
        return amtA - amtB
      }
      return 0
    })

    return list
  }, [summary, searchTerm, localBranchFilter, localDateFrom, localDateTo, sortBy, filters.branch])

  // 3. Totals
  const displayedCredits = useMemo(() => {
    return filteredCredits.reduce((sum, item) => {
      const amt = parseFloat(item.debited_amount || item.credited_amount || '0')
      return sum + amt
    }, 0)
  }, [filteredCredits])

  const displayedDebits = useMemo(() => {
    return filteredDebits.reduce((sum, item) => {
      const amt = parseFloat(item.amount) || 0
      return sum + amt
    }, 0)
  }, [filteredDebits])

  const displayedBalance = displayedCredits - displayedDebits
  const isLocallyFiltered = !!(searchTerm.trim() || (!filters.branch && localBranchFilter) || localDateFrom || localDateTo)

  if (loading && !summary) {
    return (
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-6 animate-pulse">
        <div className="h-6 w-48 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
        <div className="h-24 bg-surface-100 dark:bg-surface-700/50 rounded mb-4" />
        <div className="h-48 bg-surface-50 dark:bg-surface-900 rounded" />
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white">Petty Cash Drawer</h3>
            <p className="text-[10px] text-surface-400 font-medium">
              Track petty cash credits & expenditures
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            const opening = !showAddForm
            if (opening) resetForm()
            setShowAddForm(opening)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
            bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400
            hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Record Spent Cash
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700/50">
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1">
            Petty Cash Balance {isLocallyFiltered && <span className="text-[9px] text-primary-500 font-bold lowercase italic">(filtered)</span>}
          </p>
          <p className={`text-2xl font-black ${displayedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(displayedBalance)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700/50">
          <div className="flex items-center gap-1 mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
              Total Cash Added {isLocallyFiltered && <span className="text-[9px] text-primary-500 font-bold lowercase italic">(filtered)</span>}
            </p>
          </div>
          <p className="text-xl font-bold text-surface-950 dark:text-white">
            {formatCurrency(displayedCredits)}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700/50">
          <div className="flex items-center gap-1 mb-1">
            <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
              Total Cash Spent {isLocallyFiltered && <span className="text-[9px] text-primary-500 font-bold lowercase italic">(filtered)</span>}
            </p>
          </div>
          <p className="text-xl font-bold text-surface-950 dark:text-white">
            {formatCurrency(displayedDebits)}
          </p>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSave} className="mb-6 p-5 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-surface-900 dark:text-white">{editingId !== null ? 'Edit Petty Cash Spent (Debit)' : 'Record Petty Cash Spent (Debit)'}</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData(f => ({ ...f, date: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Amount</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.amount || ''}
                onChange={(e) => setFormData(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Spent Branch</label>
              <select
                required
                value={formData.branch}
                onChange={(e) => setFormData(f => ({ ...f, branch: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.location}>{b.location}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Spent By (Person)</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={formData.person}
                onChange={(e) => setFormData(f => ({ ...f, person: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Remark / Purpose</label>
              <input
                type="text"
                placeholder="e.g. Bought tea and biscuits"
                value={formData.remark}
                onChange={(e) => setFormData(f => ({ ...f, remark: e.target.value }))}
                className="px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || !formData.amount}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {submitting ? (editingId !== null ? 'Updating...' : 'Saving...') : (editingId !== null ? 'Update Entry' : 'Save Entry')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                resetForm()
              }}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-surface-200 dark:bg-surface-700 text-surface-650 dark:text-surface-300 hover:bg-surface-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search and Filters Row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Search purpose or person..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700
              text-xs text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <Search className="w-3.5 h-3.5 text-surface-400 absolute left-3 top-3" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-surface-400 hover:text-surface-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Branch Filter */}
        {!filters.branch ? (
          <select
            value={localBranchFilter}
            onChange={(e) => setLocalBranchFilter(e.target.value)}
            className="w-40 px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700
              text-xs text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
          >
            <option value="">All Branches (Local)</option>
            {availableBranches.map(branchName => (
              <option key={branchName} value={branchName}>{branchName}</option>
            ))}
          </select>
        ) : (
          <div className="w-40 flex items-center px-3 py-2 rounded-xl bg-surface-100/50 dark:bg-surface-900/30 border border-surface-200 dark:border-surface-700 text-xs text-surface-400 font-medium">
            Branch locked
          </div>
        )}

        {/* Date Filter Range */}
        <div className="flex items-center gap-1.5 bg-surface-50 dark:bg-surface-900 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-surface-700">
          <input
            type="date"
            value={localDateFrom}
            onChange={(e) => setLocalDateFrom(e.target.value)}
            className="w-28 bg-transparent text-xs text-surface-700 dark:text-surface-300 focus:outline-none cursor-pointer border-0 p-0"
          />
          <span className="text-[10px] text-surface-400 font-bold uppercase px-0.5 select-none">to</span>
          <input
            type="date"
            value={localDateTo}
            onChange={(e) => setLocalDateTo(e.target.value)}
            className="w-28 bg-transparent text-xs text-surface-700 dark:text-surface-300 focus:outline-none cursor-pointer border-0 p-0"
          />
          {(localDateFrom || localDateTo) && (
            <button
              type="button"
              onClick={() => { setLocalDateFrom(''); setLocalDateTo(''); }}
              className="p-0.5 rounded hover:bg-surface-200 dark:hover:bg-surface-800 text-surface-450 hover:text-surface-700 cursor-pointer transition-colors"
              title="Clear dates"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Sort Selector */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="w-36 px-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700
            text-xs text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="amount-desc">Highest Amount</option>
          <option value="amount-asc">Lowest Amount</option>
        </select>
      </div>

      <div className="flex gap-2 border-b border-surface-100 dark:border-surface-700 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('debits')}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'debits'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
          }`}
        >
          Spent Cash (Debits) ({filteredDebits.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('credits')}
          className={`pb-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'credits'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
          }`}
        >
          Added Cash (Credits) ({filteredCredits.length})
        </button>
      </div>

      <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {activeTab === 'debits' ? (
          filteredDebits.length === 0 ? (
            <div className="text-center py-8 text-surface-400 text-xs">
              No matching spent cash entries (debits).
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-700/50">
              {filteredDebits.map(debit => {
                const amt = parseFloat(debit.amount) || 0
                return (
                  <div key={debit.id} className="py-3 flex items-start justify-between gap-3 group/item">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-surface-400">
                          {new Date(debit.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                          {debit.branch_location}
                        </span>
                        {debit.person && (
                          <span className="text-[10px] text-surface-500 font-medium">
                            • By {debit.person}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-surface-800 dark:text-surface-200 italic">
                        "{debit.remark || 'No description'}"
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-sm font-extrabold text-red-600 dark:text-red-400">
                        -{formatCurrency(amt)}
                      </span>
                      {deletingId === debit.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in duration-200">
                          <button
                            type="button"
                            onClick={() => handleDelete(debit.id)}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500 text-white hover:bg-red-650 transition-colors cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="p-0.5 rounded hover:bg-surface-200 dark:hover:bg-surface-700 cursor-pointer"
                          >
                            <X className="w-3 h-3 text-surface-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(debit)}
                            title="Edit entry"
                            className="p-1 rounded opacity-0 group-hover/item:opacity-100 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-500 text-surface-400 transition-all cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(debit.id)}
                            title="Delete entry"
                            className="p-1 rounded opacity-0 group-hover/item:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-505 text-surface-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          filteredCredits.length === 0 ? (
            <div className="text-center py-8 text-surface-400 text-xs">
              No matching cash additions (credits).
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-700/50">
              {filteredCredits.map(credit => {
                const amt = parseFloat(credit.debited_amount || credit.credited_amount || '0')
                const remark = credit.debit_remark || credit.credit_remark || 'Petty Cash Funding'
                const person = credit.debit_person || credit.credit_person
                return (
                  <div key={credit.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-surface-400">
                          {new Date(credit.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                          {credit.branch_location}
                        </span>
                        {person && (
                          <span className="text-[10px] text-surface-500 font-medium">
                            • By {person}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-surface-650 dark:text-surface-200 italic">
                        "{remark}"
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(amt)}
                      </span>
                      <span className="text-[9px] font-bold text-surface-400 block mt-0.5">
                        {credit.category}
                      </span>
                    </div>
                  </div>
                )
              })}
              <p className="text-[10px] text-surface-400 text-center pt-3 italic">
                * To edit/delete credit entries, use the main Expenses page.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}


function BillingRemindersSection() {
  const { branches } = useExpenseStore()
  const [reminders, setReminders] = useState<BillingReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<BillingReminderFormData>({
    title: '',
    amount: 0,
    due_day: 1,
    frequency: 'monthly',
    category: '',
    notes: '',
    next_due_date: null,
    branch: null,
  })
  const [regionInput, setRegionInput] = useState('')

  const loadReminders = async () => {
    try {
      const data = await fetchBillingReminders()
      setReminders(data)
    } catch (err) {
      console.error('Failed to load billing reminders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReminders()
  }, [])

  const handleSave = async () => {
    if (!formData.title || !formData.amount) return
    try {
      if (editingId) {
        await updateBillingReminder(editingId, formData)
      } else {
        await createBillingReminder(formData)
      }
      await loadReminders()
      setShowAddForm(false)
      setEditingId(null)
      setFormData({ title: '', amount: 0, due_day: 1, frequency: 'monthly', category: '', notes: '', next_due_date: null, branch: null })
      setRegionInput('')
    } catch (err) {
      console.error('Failed to save reminder:', err)
    }
  }

  const handleEdit = (r: BillingReminder) => {
    setFormData({
      title: r.title,
      amount: parseFloat(r.amount) || 0,
      due_day: r.due_day,
      frequency: r.frequency,
      category: r.category || '',
      notes: r.notes || '',
      next_due_date: r.next_due_date,
      branch: r.branch
    })
    setRegionInput(r.branch_location || '')
    setEditingId(r.id)
    setShowAddForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTogglePaid = async (id: number) => {
    try {
      await toggleBillingReminderPaid(id)
      await loadReminders()
    } catch (err) {
      console.error('Failed to toggle paid:', err)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteBillingReminder(id)
      await loadReminders()
      setDeletingId(null)
    } catch (err) {
      console.error('Failed to delete reminder:', err)
    }
  }

  const totalMonthly = reminders
    .filter(r => !r.is_paid)
    .reduce((sum, r) => {
      const amt = parseFloat(r.amount) || 0
      if (r.frequency === 'monthly') return sum + amt
      if (r.frequency === 'quarterly') return sum + amt / 3
      if (r.frequency === 'half_yearly') return sum + amt / 6
      if (r.frequency === 'yearly') return sum + amt / 12
      return sum
    }, 0)

  const unpaidCount = reminders.filter(r => !r.is_paid).length
  const paidCount = reminders.filter(r => r.is_paid).length

  const groupedReminders = useMemo(() => {
    const groups: Record<string, BillingReminder[]> = {}
    reminders.forEach(r => {
      const loc = r.branch_location || 'Global'
      if (!groups[loc]) groups[loc] = []
      groups[loc].push(r)
    })
    return groups
  }, [reminders])

  return (
    <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Bell className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-surface-900 dark:text-white">Billing Reminders</h3>
            <p className="text-[10px] text-surface-400 font-medium">
              {unpaidCount} pending • {paidCount} paid • ~{formatCurrency(totalMonthly)}/mo
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setFormData({ title: '', amount: 0, due_day: 1, frequency: 'monthly', category: '', notes: '', next_due_date: null, branch: null })
            setRegionInput('')
            setShowAddForm(true)
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400
            hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
        >
          <Plus className="w-3.5 h-3.5" /> Add Reminder
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-5 p-4 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-surface-900 dark:text-white">
              {editingId ? 'Edit Reminder' : 'Add New Reminder'}
            </h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Title (e.g. WiFi Bill)"
              value={formData.title}
              onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
              className="px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
            <input
              type="number"
              placeholder="Amount"
              value={formData.amount || ''}
              onChange={(e) => setFormData(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
              className="px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1 block">Due Day</label>
              <input
                type="text"
                list="due-day-options"
                placeholder="e.g. 5"
                value={formData.due_day === 0 ? '' : formData.due_day}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '')
                  setFormData(f => ({ ...f, due_day: val === '' ? 0 : parseInt(val) }))
                }}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <datalist id="due-day-options">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                  <option key={day} value={day} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1 block">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData(f => ({ ...f, frequency: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer"
              >
                {FREQUENCY_OPTIONS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1 block">Category</label>
              <input
                type="text"
                placeholder="e.g. Utilities"
                value={formData.category}
                onChange={(e) => setFormData(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1 block">Region</label>
              <input
                type="text"
                list="region-options"
                placeholder="Type or select region"
                value={regionInput}
                onChange={(e) => {
                  setRegionInput(e.target.value)
                  const match = branches.find(b => b.location.toLowerCase() === e.target.value.toLowerCase())
                  setFormData(f => ({ ...f, branch: match ? match.id : null }))
                }}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <datalist id="region-options">
                {branches.map(b => (
                  <option key={b.id} value={b.location} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1 block">Next Due Date (Optional)</label>
            <input
              type="date"
              value={formData.next_due_date || ''}
              onChange={(e) => setFormData(f => ({ ...f, next_due_date: e.target.value || null }))}
              className="w-full sm:w-auto px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleSave}
              disabled={!formData.title || !formData.amount}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {editingId ? 'Update Reminder' : 'Save Reminder'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setEditingId(null); setFormData({ title: '', amount: 0, due_day: 1, frequency: 'monthly', category: '', notes: '', next_due_date: null, branch: null }); setRegionInput('') }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-300 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reminders List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl p-5 border border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
              <div className="skeleton h-4 w-32 mb-3" />
              <div className="skeleton h-6 w-24 mb-3" />
              <div className="skeleton h-3 w-full" />
            </div>
          ))}
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3">
            <Bell className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-sm text-surface-500 font-medium">No billing reminders yet</p>
          <p className="text-xs text-surface-400 mt-1">Add WiFi, electricity, rent and other recurring bills</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(groupedReminders).map(([region, regionReminders]) => (
            <div key={region} className="rounded-2xl p-5 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 flex flex-col hover:shadow-xl transition-all duration-500 relative group overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-surface-900 dark:text-white leading-tight">{region}</h4>
                  <p className="text-[9px] text-surface-400 font-bold uppercase tracking-widest">{regionReminders.length} Reminders</p>
                </div>
              </div>

              {/* List of Reminders in this Region */}
              <div className="flex-1 space-y-3 relative z-10 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                {regionReminders.map(r => {
                  const amount = parseFloat(r.amount) || 0
                  const isOverdue = r.next_due_date && new Date(r.next_due_date) < new Date() && !r.is_paid
                  return (
                    <div key={r.id} className="group/item flex flex-col gap-1.5 pb-3 border-b border-surface-50 dark:border-surface-700/50 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className={`text-sm font-bold truncate ${r.is_paid ? 'line-through text-surface-400' : 'text-surface-800 dark:text-surface-200'}`}>
                              {r.title}
                            </h5>
                            {isOverdue && <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 animate-pulse" />}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${FREQUENCY_COLORS[r.frequency] || FREQUENCY_COLORS.one_time}`}>
                            <Repeat className="w-2.5 h-2.5" />
                            {FREQUENCY_OPTIONS.find(f => f.value === r.frequency)?.label || r.frequency}
                          </span>
                        </div>
                        <span className={`text-sm font-black flex-shrink-0 ${r.is_paid ? 'text-emerald-600/50' : isOverdue ? 'text-red-600 dark:text-red-400' : 'text-surface-900 dark:text-white'}`}>
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-surface-400" />
                          <span className="text-[10px] font-bold text-surface-400">
                            {r.next_due_date
                              ? `Due: ${new Date(r.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                              : `Due Day: ${r.due_day}`
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.is_paid ? (
                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Paid ✓</span>
                          ) : isOverdue ? (
                            <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider animate-pulse">Overdue!</span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Pending</span>
                          )}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTogglePaid(r.id)}
                              className={`p-1.5 rounded-lg transition-all ${r.is_paid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'hover:bg-surface-200 dark:hover:bg-surface-700 text-surface-400 hover:text-emerald-500'}`}
                              title={r.is_paid ? 'Mark as unpaid' : 'Mark as paid'}
                            >
                              {r.is_paid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            </button>
                            {deletingId === r.id ? (
                              <div className="flex items-center gap-1 animate-in fade-in duration-200">
                                <button onClick={() => handleDelete(r.id)} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white hover:bg-red-600">Yes</button>
                                <button onClick={() => setDeletingId(null)} className="p-0.5 rounded hover:bg-surface-200"><X className="w-3 h-3 text-surface-400" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEdit(r)}
                                  className="p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 text-surface-400 hover:text-amber-500 transition-colors"
                                  title="Edit reminder"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingId(r.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-surface-400 hover:text-red-500 transition-colors"
                                  title="Delete reminder"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'GPay', 'PhonePe', 'UPI', 'Cheque', 'Other']

// Generate financial year options (current + last 5 years)
function getFinancialYears(): { label: string; value: string }[] {
  const now = new Date()
  const currentMonth = now.getMonth() // 0-indexed
  const currentYear = now.getFullYear()
  // If we're in Jan-Mar, current FY started last year
  const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1
  const years: { label: string; value: string }[] = []
  for (let i = 0; i < 6; i++) {
    const start = fyStartYear - i
    const end = start + 1
    years.push({ label: `FY ${start}-${end}`, value: `${start}-${end}` })
  }
  return years
}

export default function Dashboard() {
  const { dashboard, loadingDashboard, branches, categories, filters, setFilters, loadDashboard, loadExpenses, paymentModeBalances, loadPaymentModeBalances, setActiveTab } = useExpenseStore()
  const [editingMode, setEditingMode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showAddMode, setShowAddMode] = useState(false)
  const [newMode, setNewMode] = useState('')
  const [newModeBalance, setNewModeBalance] = useState('')
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)
  const [activePreset, setActivePreset] = useState('all')
  const [showCustom, setShowCustom] = useState(false)
  const [deletingMode, setDeletingMode] = useState<string | null>(null)
  const [pmFy, setPmFy] = useState(() => getFinancialYears()[0]?.value || '')
  const [pmMonth, setPmMonth] = useState(() => String(new Date().getMonth() + 1))
  const [pmLoading, setPmLoading] = useState(false)
  const [localPmBalances, setLocalPmBalances] = useState(paymentModeBalances)
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)
  const [drillFilters, setDrillFilters] = useState<{ branch?: string, category?: string, date_from?: string, date_to?: string } | null>(null)
  // Credit/Debit drill from the "Overall Total Credits/Debits" cards.
  const [creditDebitDrill, setCreditDebitDrill] = useState<'credit' | 'debit' | null>(null)
  const cdFilters = useMemo(
    () => ({ branch: filters.branch, category: filters.category, date_from: filters.date_from, date_to: filters.date_to }),
    [filters.branch, filters.category, filters.date_from, filters.date_to],
  )

  const financialYears = useMemo(() => getFinancialYears(), [])

  // Reload payment mode balances when FY changes
  useEffect(() => {
    const loadFiltered = async () => {
      setPmLoading(true)
      try {
        const data = await fetchPaymentModeBalances({
          fy: pmFy || undefined,
          month: pmMonth || undefined
        })
        setLocalPmBalances(data)
      } catch (err) {
        console.error('Failed to load payment mode balances:', err)
      } finally {
        setPmLoading(false)
      }
    }
    loadFiltered()
  }, [pmFy, pmMonth])

  // Sync with global store when no FY filter
  useEffect(() => {
    if (!pmFy && !pmMonth) {
      setLocalPmBalances(paymentModeBalances)
    }
  }, [paymentModeBalances, pmFy, pmMonth])

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(undefined)
  }

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 12}
          outerRadius={outerRadius + 15}
          fill={fill}
        />
      </g>
    )
  }

  const handleFilterChange = async (key: string, value: string) => {
    if (key === 'date_from' || key === 'date_to') {
      setActivePreset('custom')
      setShowCustom(true)
    }
    setFilters({ [key]: value || undefined })
    // Use the actions provided by the hook instead of reach into global state if avoidable
    // But since filters are updated in the store, we need to ensure they are picked up
    try {
      await Promise.all([loadDashboard(), loadExpenses()])
    } catch (err) {
      console.error('Filter update failed:', err)
    }
  }

  // Prepare chart data with extra safety
  const categoryData = useMemo(() => {
    if (!dashboard || !dashboard.category_breakdown) return []
    return dashboard.category_breakdown
      .map((item) => ({
        name: item.category || 'Unknown',
        value: Math.max(0, parseFloat(item.total_debit) || 0),
        credit: Math.max(0, parseFloat(item.total_credit) || 0),
      }))
      .sort((a, b) => b.value - a.value)
  }, [dashboard])

  const monthlyData = useMemo(() => {
    if (!dashboard || !dashboard.monthly_trend) return []
    return dashboard.monthly_trend.map((item) => ({
      month: item.month || 'Other',
      Credits: Math.max(0, parseFloat(item.credits) || 0),
      Debits: Math.max(0, parseFloat(item.debits) || 0),
    }))
  }, [dashboard])

  const applyPreset = async (preset: string) => {
    setActivePreset(preset)
    const now = new Date()
    let from = ''
    let to = now.toISOString().split('T')[0]

    if (preset === 'all') {
      from = ''
      to = ''
    } else if (preset === 'today') {
      from = to
    } else if (preset === '7d') {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      from = d.toISOString().split('T')[0]
    } else if (preset === '30d') {
      const d = new Date()
      d.setDate(d.getDate() - 30)
      from = d.toISOString().split('T')[0]
    } else if (preset === 'this_month') {
      const d = new Date()
      from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      to = lastDay.toISOString().split('T')[0]
    }

    if (preset !== 'custom') {
      setShowCustom(false)
      setFilters({ date_from: from || undefined, date_to: to || undefined })
      setTimeout(() => {
        loadDashboard()
        loadExpenses()
      }, 0)
    } else {
      setShowCustom(true)
    }
  }

  const totalCredits = dashboard ? parseFloat(dashboard.total_credits) || 0 : 0
  const totalDebits = dashboard ? parseFloat(dashboard.total_debits) || 0 : 0
  const totalBalance = totalCredits - totalDebits

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <input
            type="text"
            list="branch-suggestions"
            value={filters.branch || ''}
            onChange={(e) => handleFilterChange('branch', e.target.value)}
            placeholder="All Branches"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
              text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
              focus:border-primary-500 transition-all min-w-[160px]"
          />
          <datalist id="branch-suggestions">
            {branches.map((b) => (
              <option key={b.id} value={b.location}>{b.location}</option>
            ))}
          </datalist>
        </div>

        <div className="relative">
          <input
            type="text"
            list="category-suggestions"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            placeholder="All Categories"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
              text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
              focus:border-primary-500 transition-all min-w-[160px]"
          />
          <datalist id="category-suggestions">
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </datalist>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700/50">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '7d', label: '7 Days' },
            { id: '30d', label: '30 Days' },
            { id: 'this_month', label: 'This Month' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activePreset === p.id 
                  ? 'bg-white dark:bg-surface-800 text-primary-600 shadow-sm border border-surface-100 dark:border-surface-700' 
                  : 'text-surface-400 hover:text-surface-600 dark:hover:text-surface-300'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => applyPreset('custom')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              showCustom || activePreset === 'custom'
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' 
                : 'text-surface-400 hover:text-surface-600'
            }`}
          >
            Custom
          </button>
        </div>

        {showCustom && (
          <>
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              placeholder="From Date"
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
                focus:border-primary-500 transition-all"
            />

            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              placeholder="To Date"
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
                text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30
                focus:border-primary-500 transition-all"
            />
          </>
        )}

        {(filters.branch || filters.category || filters.date_from || filters.date_to) && (
          <button
            onClick={() => {
              useExpenseStore.getState().resetFilters()
              setTimeout(() => {
                useExpenseStore.getState().loadDashboard()
                useExpenseStore.getState().loadExpenses()
              }, 0)
            }}
            className="px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400
              text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Stat Cards */}
      {loadingDashboard ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
          {/* Total Balance */}
          <button 
            onClick={() => setActiveTab('expenses')}
            className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-xl shadow-primary-500/20 text-left group transition-all hover:scale-[1.02]"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-white/80">Total Balance</span>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-sm text-white/60 mt-1">For selected period</p>
            </div>
          </button>

          {/* Total Credits */}
          <button
            onClick={() => setCreditDebitDrill('credit')}
            title="Click to see all credit entries"
            className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700
            hover:shadow-md hover:shadow-emerald-500/5 transition-all duration-300 text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-sm font-medium text-surface-500 dark:text-surface-400"> Overall Total Credits</span>
            </div>
            <p className="text-3xl font-bold text-surface-900 dark:text-white">{formatCurrency(totalCredits)}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-sm text-emerald-600 dark:text-emerald-400">Income</span>
            </div>
          </button>

          {/* Total Debits */}
          <button
            onClick={() => setCreditDebitDrill('debit')}
            title="Click to see all debit entries"
            className="relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700
            hover:shadow-md hover:shadow-red-500/5 transition-all duration-300 text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm font-medium text-surface-500 dark:text-surface-400">Overall Total Debits</span>
            </div>
            <p className="text-3xl font-bold text-surface-900 dark:text-white">{formatCurrency(totalDebits)}</p>
            <div className="flex items-center gap-1 mt-1">
              <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">Expenses</span>
            </div>
          </button>
        </div>
      )}



      {/* Payment Mode Balances */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Landmark className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-surface-900 dark:text-white">Payment Mode Balances</h3>
              <p className="text-[10px] text-surface-400 font-medium">
                {pmFy ? `Showing ${pmFy}` : 'All time'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Financial Year Filter */}
            <select
              value={pmFy}
              onChange={(e) => setPmFy(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer"
            >
              <option value="">All Time</option>
              {financialYears.map(fy => (
                <option key={fy.value} value={fy.value}>{fy.label}</option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={pmMonth}
              onChange={(e) => setPmMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 cursor-pointer"
            >
              <option value="">Full Year</option>
              {['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'].map((m, i) => {
                const val = ((i + 3) % 12) + 1; // 4, 5, ..., 12, 1, 2, 3
                return <option key={val} value={String(val)}>{m}</option>
              })}
            </select>
            <button
              onClick={() => setShowAddMode(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400
                hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Mode
            </button>
          </div>
        </div>

        {/* Add new mode form */}
        {showAddMode && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
            <div className="flex-1 relative">
              <input
                type="text"
                list="payment-mode-suggestions"
                value={newMode}
                onChange={(e) => setNewMode(e.target.value)}
                placeholder="Select or type mode"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm"
              />
              <datalist id="payment-mode-suggestions">
                {PAYMENT_MODES.filter(m => !localPmBalances.find(b => b.payment_mode === m)).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </datalist>
            </div>
            <input
              type="number"
              placeholder="Initial Balance"
              value={newModeBalance}
              onChange={(e) => setNewModeBalance(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-sm"
            />
            <button
              onClick={async () => {
                if (newMode && newModeBalance) {
                  await setPaymentModeBalance(newMode, parseFloat(newModeBalance))
                  await loadPaymentModeBalances()
                  setPmFy('') // reset FY to refresh
                  setShowAddMode(false)
                  setNewMode('')
                  setNewModeBalance('')
                }
              }}
              className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-all"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setShowAddMode(false); setNewMode(''); setNewModeBalance('') }}
              className="p-2 rounded-lg bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-300 transition-all"
            >
              <span className="text-xs font-medium px-1">Cancel</span>
            </button>
          </div>
        )}

        {pmLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl p-5 border border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50">
                <div className="skeleton h-4 w-24 mb-3" />
                <div className="skeleton h-7 w-32 mb-4" />
                <div className="skeleton h-3 w-full mb-2" />
                <div className="skeleton h-3 w-full" />
              </div>
            ))}
          </div>
        ) : localPmBalances.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-4">No payment modes configured. Click "Add Mode" to set initial balances.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {localPmBalances.map((bal) => {
              const current = parseFloat(bal.current_balance)
              const initial = parseFloat(bal.initial_balance)
              const credits = parseFloat(bal.total_credits || '0')
              const debits = parseFloat(bal.total_debits || '0')
              const periodAvailable = parseFloat(bal.period_available || '0')
              const maxFlow = Math.max(credits, debits, 1)
              return (
                <div key={bal.payment_mode} className="group/card relative rounded-xl p-5 border border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-900/50 hover:shadow-lg hover:border-primary-200 dark:hover:border-primary-800 transition-all duration-300 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="text-sm font-bold text-surface-800 dark:text-surface-200">{bal.payment_mode}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => { setEditingMode(bal.payment_mode); setEditValue(initial.toString()) }}
                        className="p-1 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                        title="Edit initial balance"
                      >
                        <Pencil className="w-3 h-3 text-surface-400" />
                      </button>
                      {deletingMode === bal.payment_mode ? (
                        <div className="flex items-center gap-1 animate-in fade-in duration-200">
                          <button
                            onClick={async () => {
                              await deletePaymentModeBalance(bal.payment_mode)
                              await loadPaymentModeBalances()
                              setDeletingMode(null)
                              // Refresh local list
                              const data = await fetchPaymentModeBalances(pmFy ? { fy: pmFy } : undefined)
                              setLocalPmBalances(data)
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                            title="Confirm delete"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeletingMode(null)}
                            className="p-0.5 rounded hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3 h-3 text-surface-400" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingMode(bal.payment_mode)}
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group/del"
                          title="Delete payment mode"
                        >
                          <Trash2 className="w-3 h-3 text-surface-400 group-hover/del:text-red-500 transition-colors" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Current Balance */}
                  <div className="mb-4 relative z-10">
                    <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest mb-1">Current Balance</p>
                    <p className={`text-2xl font-black tracking-tight ${current >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(current)}
                    </p>
                  </div>

                  {/* Period Available */}
                  <div className="mb-4 relative z-10 border-t border-surface-100 dark:border-surface-700/50 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest">Monthly Net Balance</p>
                      <p className={`text-sm font-bold ${periodAvailable >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(periodAvailable)}
                      </p>
                    </div>
                  </div>

                  {/* Credits & Debits Breakdown */}
                  <div className="space-y-3 mb-4 relative z-10">
                    {/* Credits */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Credits</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(credits)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-900/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out"
                          style={{ width: `${(credits / maxFlow) * 100}%`, boxShadow: '0 0 8px rgba(16,185,129,0.3)' }}
                        />
                      </div>
                    </div>
                    {/* Debits */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <ArrowDownRight className="w-3 h-3 text-red-500" />
                          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Debits</span>
                        </div>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(debits)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-900/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-500 transition-all duration-1000 ease-out"
                          style={{ width: `${(debits / maxFlow) * 100}%`, boxShadow: '0 0 8px rgba(239,68,68,0.3)' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Initial Balance / Edit */}
                  <div className="pt-3 border-t border-surface-100 dark:border-surface-700/50 relative z-10">
                    {editingMode === bal.payment_mode ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-xs"
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            await setPaymentModeBalance(bal.payment_mode, parseFloat(editValue))
                            await loadPaymentModeBalances()
                            setEditingMode(null)
                            // Refresh local
                            const data = await fetchPaymentModeBalances(pmFy ? { fy: pmFy } : undefined)
                            setLocalPmBalances(data)
                          }}
                          className="p-1 rounded bg-primary-500 text-white"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Opening Balance</span>
                        <span className="text-xs font-bold text-surface-600 dark:text-surface-300">{formatCurrency(initial)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Petty Cash Drawer moved to its own "Petty Cash" tab. */}

      {/* Billing Reminders Section */}
      <BillingRemindersSection />

      {/* Charts */}
      {loadingDashboard ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-children items-stretch">
          {/* Category Breakdown — Premium Horizontal List */}
          <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-surface-900 dark:text-white">
                  Expenses by Category
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">Distribution of total spending</p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase tracking-wider border border-red-100 dark:border-red-900/30">
                Total: {formatCurrency(totalDebits)}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-5 max-h-[300px]">
              {categoryData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-surface-50 dark:bg-surface-900 flex items-center justify-center mb-3">
                    <Package className="w-6 h-6 text-surface-300" />
                  </div>
                  <p className="text-sm text-surface-400">No expense data available</p>
                </div>
              ) : (
                categoryData.map((item, index) => {
                  const percentage = totalDebits > 0 ? (item.value / totalDebits) * 100 : 0
                  const color = getCategoryHex(item.name, index)
                  
                  return (
                    <div key={item.name} className="group relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm"
                            style={{ backgroundColor: `${color}15`, color: color }}
                          >
                            <CategoryIcon category={item.name} className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-surface-700 dark:text-surface-200">{item.name}</p>
                            <p className="text-[10px] font-medium text-surface-400 dark:text-surface-500 uppercase tracking-wider">
                              {percentage.toFixed(1)}% of total
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <button 
                            onClick={() => {
                              setDrillFilters({ 
                                category: item.name, 
                                date_from: filters.date_from, 
                                date_to: filters.date_to 
                              })
                            }}
                            className="text-sm font-bold text-surface-900 dark:text-white hover:text-primary-500 transition-colors cursor-pointer underline decoration-dotted decoration-surface-300 underline-offset-4"
                          >
                            {formatCurrency(item.value)}
                          </button>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="text-[10px] text-surface-400 font-medium">Category</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar Container */}
                      <div className="h-1.5 w-full bg-surface-100 dark:bg-surface-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]"
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: color,
                            boxShadow: `0 0 12px ${color}40`
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          {/* Line Chart — Monthly Trend */}
          <div className="rounded-2xl p-6 bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 min-h-[420px] flex flex-col">
            <h3 className="text-base font-semibold text-surface-900 dark:text-white mb-4">
              Monthly Trend
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${CURRENCY_SYMBOL}${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                    fontSize: '13px',
                  }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Credits"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Debits"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Branch-wise Detailed Breakdown moved to its own "Region Expense" tab. */}

      {/* Detailed Entry Modals */}
      {drillFilters && (
        <DrillModal
          filters={drillFilters}
          onClose={() => setDrillFilters(null)}
          onViewExpense={(exp) => setViewingExpense(exp)}
        />
      )}

      {creditDebitDrill && (
        <DrillModal
          filters={cdFilters}
          kind={creditDebitDrill}
          title={creditDebitDrill === 'credit' ? 'Credit Entries' : 'Debit Entries'}
          onClose={() => setCreditDebitDrill(null)}
          onViewExpense={(exp) => setViewingExpense(exp)}
        />
      )}

      {viewingExpense && (
        <ExpenseDetailModal 
          expense={viewingExpense} 
          onClose={() => setViewingExpense(null)} 
        />
      )}
    </div>
  )
}
