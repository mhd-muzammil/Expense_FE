import axios from 'axios'

// In dev: leave VITE_API_BASE_URL unset and Vite proxies '/api' → backend.
// In prod (Vercel): set VITE_API_BASE_URL to e.g. 'https://apiexpense.bazhilgroups.in/api'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const TOKEN_STORAGE_KEY = 'auth_token'

export const getStoredToken = (): string | null =>
  localStorage.getItem(TOKEN_STORAGE_KEY)

export const setStoredToken = (token: string) =>
  localStorage.setItem(TOKEN_STORAGE_KEY, token)

export const clearStoredToken = () =>
  localStorage.removeItem(TOKEN_STORAGE_KEY)

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Attach Authorization header to every request when a token is present.
api.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

// On 401 → token expired/invalid. Clear it and dispatch a global event so
// the App can re-render the login screen without a hard reload.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredToken()
      window.dispatchEvent(new Event('auth:logout'))
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[api]', error?.config?.method?.toUpperCase(), error?.config?.url, '→', error?.response?.status, error?.response?.data)
    }
    return Promise.reject(error)
  },
)

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
export interface AuthUser {
  username: string
  is_staff: boolean
}

export interface LoginResponse extends AuthUser {
  token: string
}

export const login = (username: string, password: string) =>
  api.post<LoginResponse>('/auth/login/', { username, password }).then(res => res.data)

export const logout = () =>
  api.post('/auth/logout/').then(() => undefined)

export const fetchMe = () =>
  api.get<AuthUser>('/auth/me/').then(res => res.data)

// Types
export interface Branch {
  id: number
  location: string
  current_balance: string
  created_at: string
}

export interface Expense {
  id: number
  date: string
  category: string
  branch: number
  branch_location: string
  credited_amount: string | null
  credit_remark: string
  credit_person: string
  credit_payment_mode: string
  debited_amount: string | null
  debit_remark: string
  debit_person: string
  debit_payment_mode: string
  running_balances?: Record<string, string | number>
  created_at: string
}

export interface ExpenseFormData {
  date: string
  category: string
  branch: string
  credited_amount: number | null
  credit_remark: string
  credit_person: string
  credit_payment_mode: string
  debited_amount: number | null
  debit_remark: string
  debit_person: string
  debit_payment_mode: string
}

export interface DashboardData {
  total_balance: string
  total_credits: string
  total_debits: string
  category_breakdown: Array<{
    category: string
    total_credit: string
    total_debit: string
  }>
  monthly_trend: Array<{
    month: string
    credits: string
    debits: string
  }>
  branch_breakdown: Array<{
    branch: string
    total_credit: string
    total_debit: string
  }>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page_size?: number
  results: T[]
}

export interface Filters {
  branch?: string
  category?: string
  date_from?: string
  date_to?: string
  search?: string
  page?: number
}

// API Functions
export const fetchCategories = () =>
  api.get<string[]>('/categories/').then(res => res.data)

export const fetchBranches = () =>
  api.get<Branch[]>('/branches/').then(res => res.data)

export const fetchExpenses = (filters: Filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  return api.get<PaginatedResponse<Expense>>(`/expenses/?${params.toString()}`).then(res => res.data)
}

export const createExpense = (data: ExpenseFormData) =>
  api.post<Expense>('/expenses/', data).then(res => res.data)

export const updateExpense = (id: number, data: ExpenseFormData) =>
  api.put<Expense>(`/expenses/${id}/`, data).then(res => res.data)

export const deleteExpense = (id: number) =>
  api.delete(`/expenses/${id}/`).then(res => res.data)

export const fetchDashboard = (filters: Filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  return api.get<DashboardData>(`/dashboard/?${params.toString()}`).then(res => res.data)
}

/**
 * Fetches the export file via axios (so the auth token is attached) and
 * triggers a browser download. Using `window.open` wouldn't work because
 * direct navigation can't send the Authorization header.
 */
export const downloadExport = async (
  fileType: 'csv' | 'excel',
  filters: Filters = {},
): Promise<void> => {
  const params = new URLSearchParams()
  // `type` — DRF reserves the `format` query param for content negotiation.
  params.set('type', fileType)
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })

  const response = await api.get(`/export/?${params.toString()}`, {
    responseType: 'blob',
  })

  const blob = new Blob([response.data], {
    type: response.headers['content-type'] || 'application/octet-stream',
  })
  const blobUrl = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileType === 'excel' ? 'expenses.xlsx' : 'expenses.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

// Payment Mode Balances
export interface PaymentModeBalance {
  id: number
  payment_mode: string
  initial_balance: string
  current_balance: string
}

export const fetchPaymentModeBalances = () =>
  api.get<PaymentModeBalance[]>('/payment-mode-balances/').then(res => res.data)

export const setPaymentModeBalance = (payment_mode: string, initial_balance: number) =>
  api.post<PaymentModeBalance>('/payment-mode-balances/set/', { payment_mode, initial_balance }).then(res => res.data)

export default api
