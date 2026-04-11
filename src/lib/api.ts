import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface Branch {
  id: number
  name: string
  location: string
  current_balance: string
  created_at: string
}

export interface Expense {
  id: number
  date: string
  category: string
  branch: number
  branch_name: string
  credited_amount: string | null
  credit_remark: string
  debited_amount: string | null
  debit_remark: string
  running_balance: string
  created_at: string
}

export interface ExpenseFormData {
  date: string
  category: string
  branch: number
  credited_amount: number | null
  credit_remark: string
  debited_amount: number | null
  debit_remark: string
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

export const getExportUrl = (format: 'csv' | 'excel', filters: Filters = {}) => {
  const params = new URLSearchParams()
  params.set('format', format)
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  return `/api/export/?${params.toString()}`
}

export default api
