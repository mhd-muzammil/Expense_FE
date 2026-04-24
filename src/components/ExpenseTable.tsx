import { useState } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getCategoryBadgeClass } from '@/lib/categories'
import type { Expense } from '@/lib/api'
import { downloadExport } from '@/lib/api'
import ExpenseForm from './ExpenseForm'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Filter,
  RotateCcw,
  Calendar,
  Building2,
  Tag,
} from 'lucide-react'

function SkeletonRow() {
  return (
    <tr className="border-b border-surface-100 dark:border-surface-700/50">
      {Array.from({ length: 10 }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="skeleton h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

export default function ExpenseTable() {
  const {
    expenses, totalCount, pageSize, loadingExpenses,
    branches, categories, filters, setFilters, resetFilters,
    removeExpense, loadExpenses, loadDashboard,
  } = useExpenseStore()

  const [showFilters, setShowFilters] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const currentPage = filters.page || 1
  const totalPages = Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)))

  const handleSearch = () => {
    setFilters({ search: searchTerm || undefined, page: 1 })
    setTimeout(() => loadExpenses(), 0)
  }

  const handlePageChange = (page: number) => {
    setFilters({ page })
    setTimeout(() => loadExpenses(), 0)
  }

  const handleDelete = async (id: number) => {
    await removeExpense(id)
    setDeleteConfirm(null)
  }

  const handleExport = async (fileType: 'csv' | 'excel') => {
    try {
      await downloadExport(fileType, filters)
    } catch (err) {
      console.error('Export failed:', err)
      useExpenseStore.getState().addToast('error', 'Export failed')
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-surface-800
              border border-surface-200 dark:border-surface-700
              text-sm text-surface-900 dark:text-surface-100
              placeholder:text-surface-400
              focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500
              transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('')
                setFilters({ search: undefined })
                setTimeout(() => loadExpenses(), 0)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-100 dark:hover:bg-surface-700 rounded"
            >
              <X className="w-3.5 h-3.5 text-surface-400" />
            </button>
          )}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
              text-sm font-medium text-surface-700 dark:text-surface-300
              hover:bg-surface-50 dark:hover:bg-surface-700 transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700
              text-sm font-medium text-surface-700 dark:text-surface-300
              hover:bg-surface-50 dark:hover:bg-surface-700 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
        </div>

        {/* Advanced Filters Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all relative ${
            showFilters || Object.keys(filters).filter(k => k !== 'page').length > 0
              ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400'
              : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {Object.keys(filters).filter(k => k !== 'page' && filters[k as keyof typeof filters]).length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white shadow-sm">
              {Object.keys(filters).filter(k => k !== 'page' && filters[k as keyof typeof filters]).length}
            </span>
          )}
        </button>

        {/* Add Button */}
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl
            bg-gradient-to-r from-primary-500 to-primary-600
            text-sm font-medium text-white shadow-lg shadow-primary-500/25
            hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:to-primary-700
            transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-surface-100 dark:border-surface-700 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary-500" /> Advanced Filters
            </h3>
            <button
              onClick={() => {
                resetFilters()
                setSearchTerm('')
                setTimeout(() => loadExpenses(), 0)
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-surface-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-[11px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-1.5 ml-1">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                <input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(e) => {
                    setFilters({ date_from: e.target.value || undefined, page: 1 })
                    setTimeout(() => loadExpenses(), 0)
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-1.5 ml-1">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                <input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(e) => {
                    setFilters({ date_to: e.target.value || undefined, page: 1 })
                    setTimeout(() => loadExpenses(), 0)
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-[11px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-1.5 ml-1">
                Branch
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                <input
                  type="text"
                  list="filter-branch-suggestions"
                  placeholder="All Branches"
                  value={filters.branch || ''}
                  onChange={(e) => {
                    setFilters({ branch: e.target.value || undefined, page: 1 })
                    setTimeout(() => loadExpenses(), 0)
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
                <datalist id="filter-branch-suggestions">
                  {branches.map(b => (
                    <option key={b.id} value={b.location}>{b.location}</option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-1.5 ml-1">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
                <input
                  type="text"
                  list="filter-category-suggestions"
                  placeholder="All Categories"
                  value={filters.category || ''}
                  onChange={(e) => {
                    setFilters({ category: e.target.value || undefined, page: 1 })
                    setTimeout(() => loadExpenses(), 0)
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
                <datalist id="filter-category-suggestions">
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </datalist>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-900/50 border-b border-surface-100 dark:border-surface-700">
                <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">S.No</th>
                <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Date</th>
                <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Category</th>
                <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Branch</th>
                <th className="text-center p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Type</th>
                <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Amount</th>
                <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Remark</th>
                <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Person</th>
                <th className="text-left p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Mode</th>
                <th className="text-right p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Balance</th>
                <th className="text-center p-3 font-semibold text-surface-600 dark:text-surface-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingExpenses ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-surface-400">
                    <div className="flex flex-col items-center gap-2">
                      <FileSpreadsheet className="w-10 h-10 text-surface-300" />
                      <p className="text-base font-medium">No expenses found</p>
                      <p className="text-sm">Try adjusting your filters or add a new expense</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense, idx) => {
                  const credit = expense.credited_amount ? parseFloat(expense.credited_amount) : 0
                  const debit = expense.debited_amount ? parseFloat(expense.debited_amount) : 0
                  const isCredit = credit > 0
                  const amount = isCredit ? credit : debit
                  const remark = isCredit ? expense.credit_remark : expense.debit_remark
                  const person = isCredit ? expense.credit_person : expense.debit_person
                  const mode = isCredit ? expense.credit_payment_mode : expense.debit_payment_mode
                  const balances = expense.running_balances || {}

                  return (
                    <tr
                      key={expense.id}
                      className="border-b border-surface-100 dark:border-surface-700/50
                        hover:bg-surface-50/50 dark:hover:bg-surface-700/30 transition-colors"
                    >
                      <td className="p-3 text-surface-500 dark:text-surface-400 font-mono text-xs">
                        {(currentPage - 1) * 50 + idx + 1}
                      </td>
                      <td className="p-3 text-surface-900 dark:text-surface-100 whitespace-nowrap">
                        {formatDate(expense.date)}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeClass(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="p-3 text-surface-700 dark:text-surface-300 whitespace-nowrap">
                        {expense.branch_location}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isCredit
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {isCredit ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <span className={`font-medium ${
                          isCredit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          {isCredit ? '+' : '−'}{formatCurrency(amount)}
                        </span>
                      </td>
                      <td className="p-3 text-surface-500 dark:text-surface-400 text-xs max-w-[120px] truncate">
                        {remark || '—'}
                      </td>
                      <td className="p-3 text-surface-500 dark:text-surface-400 text-xs whitespace-nowrap">
                        {person || '—'}
                      </td>
                      <td className="p-3 text-surface-500 dark:text-surface-400 text-xs whitespace-nowrap">
                        {mode || '—'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 items-end justify-center">
                        {Object.entries(balances).length > 0 ? Object.entries(balances)
                          .filter(([, val]) => parseFloat(val as string) !== 0)
                          .map(([mode, bal]) => {
                            const val = parseFloat(bal as string)
                            return (
                              <div key={mode} className={`text-[11px] font-semibold leading-tight ${
                                val >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                <span className="text-surface-400 font-normal mr-1">{mode}:</span>
                                {formatCurrency(val)}
                              </div>
                            )
                        }) : <span className="text-surface-400 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setViewingExpense(expense)}
                            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5 text-surface-500" />
                          </button>
                          <button
                            onClick={() => { setEditingExpense(expense); setShowForm(true) }}
                            className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(expense.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-surface-700">
          <span className="text-sm text-surface-500 dark:text-surface-400">
            Showing {expenses.length} of {totalCount} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-surface-600 dark:text-surface-400" />
            </button>
            <span className="text-sm text-surface-700 dark:text-surface-300 font-medium px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700
                disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-surface-600 dark:text-surface-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Expense Form Modal */}
      {showForm && (
        <ExpenseForm
          expense={editingExpense}
          onClose={() => { setShowForm(false); setEditingExpense(null) }}
        />
      )}

      {/* View Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingExpense(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-surface-800 rounded-2xl shadow-2xl animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100 dark:border-surface-700">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Expense Details</h2>
              <button
                onClick={() => setViewingExpense(null)}
                className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {(() => {
                const isCredit = viewingExpense.credited_amount && parseFloat(viewingExpense.credited_amount) > 0
                return [
                  ['Date', formatDate(viewingExpense.date)],
                  ['Category', viewingExpense.category],
                  ['Branch', viewingExpense.branch_location],
                  ['Type', isCredit ? 'Credit' : 'Debit'],
                  ['Amount', isCredit
                    ? formatCurrency(viewingExpense.credited_amount!)
                    : formatCurrency(viewingExpense.debited_amount!)],
                  ['Remark', (isCredit ? viewingExpense.credit_remark : viewingExpense.debit_remark) || '—'],
                  ['Person', (isCredit ? viewingExpense.credit_person : viewingExpense.debit_person) || '—'],
                  ['Payment Mode', (isCredit ? viewingExpense.credit_payment_mode : viewingExpense.debit_payment_mode) || '—'],
                  ...Object.entries(viewingExpense.running_balances || {})
                    .filter(([, val]) => parseFloat(val as string) !== 0)
                    .map(([mode, val]) => [`${mode} Balance`, formatCurrency(parseFloat(val as string))]),
                ]
              })().map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-surface-50 dark:border-surface-700/50 last:border-0">
                  <span className="text-sm text-surface-500 dark:text-surface-400">{label}</span>
                  {label === 'Type' ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      value === 'Credit'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {value}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-surface-900 dark:text-white">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-surface-800 rounded-2xl shadow-2xl animate-fade-in p-6 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-2">
              Delete Expense?
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">
              This action cannot be undone. The expense will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700
                  text-sm font-medium text-surface-700 dark:text-surface-300
                  hover:bg-surface-50 dark:hover:bg-surface-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600
                  text-sm font-medium text-white transition-all active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
