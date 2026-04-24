import { useState, useEffect } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import type { Expense, ExpenseFormData } from '@/lib/api'
import { X, Calendar, Tag, Building2, ArrowUpCircle, ArrowDownCircle, FileText, User, CreditCard } from 'lucide-react'

interface ExpenseFormProps {
  expense?: Expense | null
  onClose: () => void
}

export default function ExpenseForm({ expense, onClose }: ExpenseFormProps) {
  const { branches, categories, addExpense, editExpense, submitting } = useExpenseStore()

  const [formData, setFormData] = useState<ExpenseFormData>({
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.category || categories[0] || '',
    branch: expense?.branch_location || (branches[0]?.location || ''),
    credited_amount: expense?.credited_amount ? parseFloat(expense.credited_amount) : null,
    credit_remark: expense?.credit_remark || '',
    credit_person: expense?.credit_person || '',
    credit_payment_mode: expense?.credit_payment_mode || '',
    debited_amount: expense?.debited_amount ? parseFloat(expense.debited_amount) : null,
    debit_remark: expense?.debit_remark || '',
    debit_person: expense?.debit_person || '',
    debit_payment_mode: expense?.debit_payment_mode || '',
  })

  const [type, setType] = useState<'credit' | 'debit'>(
    expense?.debited_amount && parseFloat(expense.debited_amount) > 0 ? 'debit' : 'credit'
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.date) newErrors.date = 'Date is required'
    if (!formData.category) newErrors.category = 'Category is required'
    if (!formData.branch) newErrors.branch = 'Branch is required'

    const hasCredit = formData.credited_amount !== null && formData.credited_amount > 0
    const hasDebit = formData.debited_amount !== null && formData.debited_amount > 0

    if (!hasCredit && !hasDebit) {
      newErrors.amount = 'Either credit or debit amount is required'
    }

    if (formData.credited_amount !== null && formData.credited_amount < 0) {
      newErrors.credited_amount = 'Amount must be positive'
    }

    if (formData.debited_amount !== null && formData.debited_amount < 0) {
      newErrors.debited_amount = 'Amount must be positive'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const submitData = {
        ...formData,
        credited_amount: formData.credited_amount || null,
        debited_amount: formData.debited_amount || null,
      }

      if (expense) {
        await editExpense(expense.id, submitData)
      } else {
        await addExpense(submitData)
      }
      onClose()
    } catch (err) {
      // Error handled by store
    }
  }

  const inputClass = `w-full px-4 py-2.5 rounded-xl bg-surface-50 dark:bg-surface-900
    border border-surface-200 dark:border-surface-700
    text-sm text-surface-900 dark:text-surface-100
    placeholder:text-surface-400
    focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
    transition-all duration-200`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-surface-800 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <X className="w-5 h-5 text-surface-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date + Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={inputClass}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                <Tag className="w-3.5 h-3.5" /> Category
              </label>
              <input
                type="text"
                list="category-suggestions"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={inputClass}
                placeholder="Type or select category"
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </datalist>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
          </div>

          {/* Branch */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              <Building2 className="w-3.5 h-3.5" /> Branch
            </label>
            <input
              type="text"
              list="branch-suggestions"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className={inputClass}
              placeholder="Type or select branch"
            />
            <datalist id="branch-suggestions">
              {branches.map((b) => (
                <option key={b.id} value={b.location}>{b.location}</option>
              ))}
            </datalist>
            {errors.branch && <p className="text-red-500 text-xs mt-1">{errors.branch}</p>}
          </div>

          {/* Credit / Debit Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
            <button
              type="button"
              onClick={() => {
                setType('credit')
                setFormData({ ...formData, debited_amount: null, debit_remark: '', debit_person: '', debit_payment_mode: '' })
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all ${
                type === 'credit'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-surface-50 dark:bg-surface-900 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" /> Credit
            </button>
            <button
              type="button"
              onClick={() => {
                setType('debit')
                setFormData({ ...formData, credited_amount: null, credit_remark: '', credit_person: '', credit_payment_mode: '' })
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-all ${
                type === 'debit'
                  ? 'bg-red-500 text-white'
                  : 'bg-surface-50 dark:bg-surface-900 text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" /> Debit
            </button>
          </div>

          {/* Amount, Remark, Person, Payment Mode */}
          <div className={`p-4 rounded-xl border ${
            type === 'credit'
              ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30'
              : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
          }`}>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount (₹)"
                value={type === 'credit' ? (formData.credited_amount ?? '') : (formData.debited_amount ?? '')}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null
                  setFormData(type === 'credit'
                    ? { ...formData, credited_amount: val }
                    : { ...formData, debited_amount: val })
                }}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Remark"
                value={type === 'credit' ? formData.credit_remark : formData.debit_remark}
                onChange={(e) => setFormData(type === 'credit'
                  ? { ...formData, credit_remark: e.target.value }
                  : { ...formData, debit_remark: e.target.value })}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="Person Name"
                value={type === 'credit' ? formData.credit_person : formData.debit_person}
                onChange={(e) => setFormData(type === 'credit'
                  ? { ...formData, credit_person: e.target.value }
                  : { ...formData, debit_person: e.target.value })}
                className={inputClass}
              />
              <select
                value={type === 'credit' ? formData.credit_payment_mode : formData.debit_payment_mode}
                onChange={(e) => setFormData(type === 'credit'
                  ? { ...formData, credit_payment_mode: e.target.value }
                  : { ...formData, debit_payment_mode: e.target.value })}
                className={inputClass}
              >
                <option value="">Payment Mode</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="GPay">GPay</option>
                <option value="PhonePe">PhonePe</option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {(errors.credited_amount || errors.debited_amount) && (
              <p className="text-red-500 text-xs mt-1">{errors.credited_amount || errors.debited_amount}</p>
            )}
          </div>

          {errors.amount && (
            <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 rounded-lg py-2">
              {errors.amount}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700
                text-sm font-medium text-surface-700 dark:text-surface-300
                hover:bg-surface-50 dark:hover:bg-surface-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600
                text-sm font-medium text-white shadow-lg shadow-primary-500/25
                hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:to-primary-700
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                active:scale-[0.98]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Saving...
                </span>
              ) : expense ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
