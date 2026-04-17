import { create } from 'zustand'
import { TOAST_DURATION_MS } from '@/lib/brand'
import {
  fetchBranches,
  fetchCategories,
  fetchExpenses,
  fetchDashboard,
  createExpense,
  updateExpense,
  deleteExpense,
  login as apiLogin,
  logout as apiLogout,
  fetchMe,
  getStoredToken,
  setStoredToken,
  clearStoredToken,
  type Branch,
  type Expense,
  type DashboardData,
  type ExpenseFormData,
  type Filters,
  type AuthUser,
  type PaymentModeBalance,
  fetchPaymentModeBalances,
} from '@/lib/api'

interface Toast {
  id: string
  type: 'success' | 'error'
  message: string
}

interface ExpenseStore {
  // Auth
  user: AuthUser | null
  authReady: boolean   // initial auth check completed
  authLoading: boolean // login/me request in flight

  // Data
  branches: Branch[]
  categories: string[]
  expenses: Expense[]
  dashboard: DashboardData | null
  paymentModeBalances: PaymentModeBalance[]
  totalCount: number
  pageSize: number

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

  // Auth actions
  initAuth: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>

  // Actions
  setBranches: (branches: Branch[]) => void
  setFilters: (filters: Partial<Filters>) => void
  resetFilters: () => void

  loadBranches: () => Promise<void>
  loadCategories: () => Promise<void>
  loadExpenses: () => Promise<void>
  loadDashboard: () => Promise<void>
  loadPaymentModeBalances: () => Promise<void>
  loadAll: () => Promise<void>

  addExpense: (data: ExpenseFormData) => Promise<void>
  editExpense: (id: number, data: ExpenseFormData) => Promise<void>
  removeExpense: (id: number) => Promise<void>

  addToast: (type: 'success' | 'error', message: string) => void
  removeToast: (id: string) => void

  toggleTheme: () => void
}

const useExpenseStore = create<ExpenseStore>((set, get) => ({
  // Auth
  user: null,
  authReady: false,
  authLoading: false,

  // Initial state
  branches: [],
  categories: [],
  expenses: [],
  dashboard: null,
  paymentModeBalances: [],
  totalCount: 0,
  pageSize: 50,

  loadingBranches: false,
  loadingExpenses: false,
  loadingDashboard: false,
  submitting: false,

  filters: {},

  toasts: [],
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',

  // Auth
  initAuth: async () => {
    const token = getStoredToken()
    if (!token) {
      set({ authReady: true, user: null })
      return
    }
    try {
      const user = await fetchMe()
      set({ user, authReady: true })
    } catch {
      // Token rejected — interceptor already cleared it.
      set({ user: null, authReady: true })
    }
  },

  login: async (username, password) => {
    set({ authLoading: true })
    try {
      const { token, ...user } = await apiLogin(username, password)
      setStoredToken(token)
      set({ user, authLoading: false })
      get().addToast('success', `Welcome, ${user.username}`)
    } catch (err) {
      set({ authLoading: false })
      throw err
    }
  },

  logout: async () => {
    try {
      await apiLogout()
    } catch {
      // Ignore — even if server-side delete fails, we clear locally.
    }
    clearStoredToken()
    set({
      user: null,
      branches: [],
      expenses: [],
      dashboard: null,
      totalCount: 0,
      filters: {},
    })
  },

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

  loadCategories: async () => {
    try {
      const data = await fetchCategories()
      set({ categories: data })
    } catch (err) {
      console.error('Failed to load categories:', err)
      // Non-fatal — dropdowns fall back to empty list; a toast would be noisy.
    }
  },

  loadExpenses: async () => {
    set({ loadingExpenses: true })
    try {
      const data = await fetchExpenses(get().filters)
      set({
        expenses: data.results,
        totalCount: data.count,
        pageSize: data.page_size ?? get().pageSize,
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

  loadPaymentModeBalances: async () => {
    try {
      const data = await fetchPaymentModeBalances()
      set({ paymentModeBalances: data })
    } catch (err) {
      console.error('Failed to load payment mode balances:', err)
    }
  },

  loadAll: async () => {
    const { loadBranches, loadCategories, loadExpenses, loadDashboard, loadPaymentModeBalances } = get()
    await Promise.all([
      loadBranches(),
      loadCategories(),
      loadExpenses(),
      loadDashboard(),
      loadPaymentModeBalances(),
    ])
  },

  // CRUD
  addExpense: async (data) => {
    set({ submitting: true })
    try {
      await createExpense(data)
      set({ submitting: false })
      get().addToast('success', 'Expense added successfully')
      await Promise.all([get().loadExpenses(), get().loadDashboard(), get().loadPaymentModeBalances()])
    } catch (err: any) {
      set({ submitting: false })
      let msg = 'Failed to add expense'
      if (err?.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data
        } else if (Array.isArray(err.response.data.non_field_errors)) {
          msg = err.response.data.non_field_errors[0]
        } else {
          const firstErr = Object.values(err.response.data).flat()[0]
          msg = typeof firstErr === 'string' ? firstErr : JSON.stringify(err.response.data)
        }
      }
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
      await Promise.all([get().loadExpenses(), get().loadDashboard(), get().loadPaymentModeBalances()])
    } catch (err: any) {
      set({ submitting: false })
      let msg = 'Failed to update expense'
      if (err?.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data
        } else if (Array.isArray(err.response.data.non_field_errors)) {
          msg = err.response.data.non_field_errors[0]
        } else {
          const firstErr = Object.values(err.response.data).flat()[0]
          msg = typeof firstErr === 'string' ? firstErr : JSON.stringify(err.response.data)
        }
      }
      get().addToast('error', msg)
      throw err
    }
  },

  removeExpense: async (id) => {
    try {
      await deleteExpense(id)
      get().addToast('success', 'Expense deleted successfully')
      await Promise.all([get().loadExpenses(), get().loadDashboard(), get().loadPaymentModeBalances()])
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
    setTimeout(() => get().removeToast(id), TOAST_DURATION_MS)
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
