import { create } from 'zustand'
import {
  fetchBranches,
  fetchExpenses,
  fetchDashboard,
  createExpense,
  updateExpense,
  deleteExpense,
  type Branch,
  type Expense,
  type DashboardData,
  type ExpenseFormData,
  type Filters,
} from '@/lib/api'

interface Toast {
  id: string
  type: 'success' | 'error'
  message: string
}

interface ExpenseStore {
  // Data
  branches: Branch[]
  expenses: Expense[]
  dashboard: DashboardData | null
  totalCount: number

  // Loading states
  loadingBranches: boolean
  loadingExpenses: boolean
  loadingDashboard: boolean
  submitting: boolean

  // Filters
  filters: Filters

  // UI
  toasts: Toast[]
  theme: 'light' | 'dark'

  // Actions
  setBranches: (branches: Branch[]) => void
  setFilters: (filters: Partial<Filters>) => void
  resetFilters: () => void

  loadBranches: () => Promise<void>
  loadExpenses: () => Promise<void>
  loadDashboard: () => Promise<void>
  loadAll: () => Promise<void>

  addExpense: (data: ExpenseFormData) => Promise<void>
  editExpense: (id: number, data: ExpenseFormData) => Promise<void>
  removeExpense: (id: number) => Promise<void>

  addToast: (type: 'success' | 'error', message: string) => void
  removeToast: (id: string) => void

  toggleTheme: () => void
}

const useExpenseStore = create<ExpenseStore>((set, get) => ({
  // Initial state
  branches: [],
  expenses: [],
  dashboard: null,
  totalCount: 0,

  loadingBranches: false,
  loadingExpenses: false,
  loadingDashboard: false,
  submitting: false,

  filters: {},

  toasts: [],
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',

  // Setters
  setBranches: (branches) => set({ branches }),
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }))
  },
  resetFilters: () => set({ filters: {} }),

  // Data loaders
  loadBranches: async () => {
    set({ loadingBranches: true })
    try {
      const data = await fetchBranches()
      set({ branches: data, loadingBranches: false })
    } catch (err) {
      console.error('Failed to load branches:', err)
      set({ loadingBranches: false })
      get().addToast('error', 'Failed to load branches')
    }
  },

  loadExpenses: async () => {
    set({ loadingExpenses: true })
    try {
      const data = await fetchExpenses(get().filters)
      set({
        expenses: data.results,
        totalCount: data.count,
        loadingExpenses: false,
      })
    } catch (err) {
      console.error('Failed to load expenses:', err)
      set({ loadingExpenses: false })
      get().addToast('error', 'Failed to load expenses')
    }
  },

  loadDashboard: async () => {
    set({ loadingDashboard: true })
    try {
      const data = await fetchDashboard(get().filters)
      set({ dashboard: data, loadingDashboard: false })
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      set({ loadingDashboard: false })
      get().addToast('error', 'Failed to load dashboard data')
    }
  },

  loadAll: async () => {
    const { loadBranches, loadExpenses, loadDashboard } = get()
    await Promise.all([loadBranches(), loadExpenses(), loadDashboard()])
  },

  // CRUD
  addExpense: async (data) => {
    set({ submitting: true })
    try {
      await createExpense(data)
      set({ submitting: false })
      get().addToast('success', 'Expense added successfully')
      await Promise.all([get().loadExpenses(), get().loadDashboard()])
    } catch (err: any) {
      set({ submitting: false })
      const msg = err?.response?.data
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : 'Failed to add expense'
      get().addToast('error', msg)
      throw err
    }
  },

  editExpense: async (id, data) => {
    set({ submitting: true })
    try {
      await updateExpense(id, data)
      set({ submitting: false })
      get().addToast('success', 'Expense updated successfully')
      await Promise.all([get().loadExpenses(), get().loadDashboard()])
    } catch (err: any) {
      set({ submitting: false })
      const msg = err?.response?.data
        ? typeof err.response.data === 'string'
          ? err.response.data
          : JSON.stringify(err.response.data)
        : 'Failed to update expense'
      get().addToast('error', msg)
      throw err
    }
  },

  removeExpense: async (id) => {
    try {
      await deleteExpense(id)
      get().addToast('success', 'Expense deleted successfully')
      await Promise.all([get().loadExpenses(), get().loadDashboard()])
    } catch (err) {
      get().addToast('error', 'Failed to delete expense')
    }
  },

  // Toasts
  addToast: (type, message) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }))
    setTimeout(() => get().removeToast(id), 4000)
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  // Theme
  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', newTheme)
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { theme: newTheme }
    })
  },
}))

export default useExpenseStore
