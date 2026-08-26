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
export type SectionKey = 'dashboard' | 'expenses' | 'pnl' | 'region' | 'invoice' | 'challan' | 'purchase' | 'porder' | 'receipt' | 'pettycash' | 'quote' | 'bos' | 'taxinvoice' | 'idfc' | 'bob' | 'engpnl' | 'sbinvoice' | 'subscription' | 'insights' | 'collections' | 'staffreq'

export interface AuthUser {
  username: string
  is_staff: boolean
  is_admin?: boolean
  allowed_sections?: SectionKey[]
  pnl_only?: boolean
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
  // Reconciliation vs the bank statements: 'in_statement' / 'not_in_statement'
  // for IDFC/BOB-mode entries, null for other modes (Cash, UPI, …).
  statement_status?: 'in_statement' | 'not_in_statement' | null
  // The bank-statement row this entry reconciled to (null when not matched).
  matched_statement?: MatchedStatement | null
  created_at: string
}

export interface MatchedStatement {
  id: number
  bank: BankKey
  bank_display: string
  txn_date: string | null
  value_date: string | null
  narration: string
  ref_no: string
  debit: string
  credit: string
  balance: string | null
  balance_dc: string
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
    category_breakdown: Array<{
      category: string
      total_credit: string
      total_debit: string
    }>
  }>
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  page_size?: number
  results: T[]
  // Expenses list only: reconciliation totals across the full filtered set.
  statement_summary?: { in_statement: number; not_in_statement: number }
}

export interface Filters {
  branch?: string
  category?: string
  date_from?: string
  date_to?: string
  search?: string
  payment_mode?: string
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

export const deleteAllExpenses = (password: string) =>
  api.delete('/expenses/delete-all/', { data: { password } }).then(res => res.data)

// Branches & categories actually used in expense entries — for filter dropdowns.
export const fetchExpenseFilterOptions = () =>
  api.get<{ branches: string[]; categories: string[] }>('/expenses/filter-options/').then(res => res.data)

// Clear-data password management (admin-only for set; status readable by admin)
export const fetchClearDataPasswordStatus = () =>
  api.get<{ is_set: boolean }>('/admin/clear-data-password/').then(res => res.data)

export const setClearDataPassword = (password: string) =>
  api.post<{ is_set: boolean }>('/admin/clear-data-password/', { password }).then(res => res.data)

export const fetchDashboard = (filters: Filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  return api.get<DashboardData>(`/dashboard/?${params.toString()}`).then(res => res.data)
}

// ---------------------------------------------------------------------------
// Profit & Loss report
// ---------------------------------------------------------------------------
export interface PnlRow {
  category: string
  monthly: Record<string, string> // month key 'YYYY-MM' -> amount
  total: string
  group?: string // parent group (expense rows only) for collapsible grouping
}

export interface ProfitLossData {
  fy_start: number
  fy_label: string
  months: string[] // ordered 'YYYY-MM' keys, Apr -> Mar
  available_fys: number[]
  branches: string[]
  income: PnlRow[]
  expense: PnlRow[]
  expense_group_order?: string[]
  income_by_month: Record<string, string>
  expense_by_month: Record<string, string>
  net_by_month: Record<string, string>
  total_income: string
  total_expense: string
  net_profit: string
}

export const fetchProfitLoss = (params: { fy?: number | string; branch?: string; payment_mode?: string } = {}) => {
  const query = new URLSearchParams()
  if (params.fy !== undefined && params.fy !== '') query.set('fy', String(params.fy))
  if (params.branch) query.set('branch', params.branch)
  if (params.payment_mode) query.set('payment_mode', params.payment_mode)
  const qs = query.toString()
  return api.get<ProfitLossData>(`/profit-loss/${qs ? '?' + qs : ''}`).then(res => res.data)
}

// ---------------------------------------------------------------------------
// Business Insights (AI-free analytics)
// ---------------------------------------------------------------------------
export interface InsightsMonthRow {
  month: string
  income: string
  expense: string
  net: string
  is_profit: boolean
  margin_pct: number | null
  change_vs_prev: string | null
  top_expense: string | null
  top_expense_amount: string | null
  has_data: boolean
}

export interface InsightsData {
  window_months: string[]
  window_label: string
  date_from: string
  date_to: string
  branches: string[]
  summary: {
    total_income: string
    total_expense: string
    net_profit: string
    is_profit: boolean
    margin_pct: number | null
    active_months: number
    profit_months: number
    loss_months: number
    best_month: string | null
    worst_month: string | null
    latest_month: string
    latest_income: string
    latest_expense: string
    latest_net: string
  }
  monthly_breakdown: InsightsMonthRow[]
  monthly_trend: Array<{ month: string; income: string; expense: string; net: string }>
  forecast: { month: string; income: string; expense: string; net: string }
  branch_ranking: Array<{ branch: string; income: string; expense: string; net: string }>
  top_expenses: Array<{ category: string; total: string; share: number; growth_pct: number | null; group: string }>
  anomalies: Array<{ category: string; month: string; amount: string; avg: string; times: number }>
  recommendations: Array<{ kind: 'good' | 'alert' | 'tip'; title: string; text: string }>
}

export interface InsightsFilters {
  months?: number
  date_from?: string
  date_to?: string
  branch?: string
}

export const fetchInsights = (filters: InsightsFilters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const qs = params.toString()
  return api.get<InsightsData>(`/insights/${qs ? '?' + qs : ''}`).then(res => res.data)
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

export const downloadPettyCashExport = async (
  fileType: 'csv' | 'excel',
  filters: { branch?: string; date_from?: string; date_to?: string } = {},
): Promise<void> => {
  const params = new URLSearchParams()
  params.set('type', fileType)
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })

  const response = await api.get(`/petty-cash/export/?${params.toString()}`, { responseType: 'blob' })
  const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/octet-stream' })
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = fileType === 'excel' ? 'petty-cash.xlsx' : 'petty-cash.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(blobUrl)
}

export const uploadImport = async (file: File): Promise<{ detail: string; success_count: number; errors?: string[] }> => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/import/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then(res => res.data)
}

// Payment Mode Balances
export interface PaymentModeBalance {
  id: number
  payment_mode: string
  initial_balance: string
  current_balance: string
  total_credits: string
  total_debits: string
  period_available?: string
}

export const fetchPaymentModeBalances = (params?: { fy?: string; month?: string; date_from?: string; date_to?: string }) => {
  const query = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value)
    })
  }
  const qs = query.toString()
  return api.get<PaymentModeBalance[]>(`/payment-mode-balances/${qs ? '?' + qs : ''}`).then(res => res.data)
}

export const setPaymentModeBalance = (payment_mode: string, initial_balance: number) =>
  api.post<PaymentModeBalance>('/payment-mode-balances/set/', { payment_mode, initial_balance }).then(res => res.data)

export const deletePaymentModeBalance = (payment_mode: string) =>
  api.delete('/payment-mode-balances/delete/', { data: { payment_mode } })

export const renamePaymentMode = (old_name: string, new_name: string) =>
  api.post<{ detail: string; updated_entries: number }>('/payment-mode-balances/rename/', { old_name, new_name }).then(res => res.data)

// Billing Reminders
export interface BillingReminder {
  id: number
  title: string
  amount: string
  due_day: number
  frequency: string
  category: string
  notes: string
  is_paid: boolean
  next_due_date: string | null
  branch: number | null
  branch_location: string | null
  created_at: string
  updated_at: string
}

export interface BillingReminderFormData {
  title: string
  amount: number
  due_day: number
  frequency: string
  category?: string
  notes?: string
  next_due_date?: string | null
  branch?: number | null
}

export const fetchBillingReminders = () =>
  api.get<BillingReminder[]>('/billing-reminders/').then(res => res.data)

export const createBillingReminder = (data: BillingReminderFormData) =>
  api.post<BillingReminder>('/billing-reminders/create/', data).then(res => res.data)

export const updateBillingReminder = (id: number, data: Partial<BillingReminderFormData>) =>
  api.put<BillingReminder>(`/billing-reminders/${id}/update/`, data).then(res => res.data)

export const toggleBillingReminderPaid = (id: number) =>
  api.patch<BillingReminder>(`/billing-reminders/${id}/toggle-paid/`).then(res => res.data)

export const deleteBillingReminder = (id: number) =>
  api.delete(`/billing-reminders/${id}/delete/`)


// Petty Cash
export interface PettyCashDebit {
  id: number
  date: string
  amount: string
  remark: string
  person: string
  branch: number
  branch_location: string
  created_at: string
}

export interface PettyCashDebitFormData {
  date: string
  amount: number
  remark: string
  person: string
  branch: string
}

export interface PettyCashSummary {
  balance: string
  total_credits: string
  total_debits: string
  credits: Expense[]
  debits: PettyCashDebit[]
}

export const fetchPettyCashSummary = (filters: Filters = {}) => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  return api.get<PettyCashSummary>(`/petty-cash/summary/?${params.toString()}`).then(res => res.data)
}

export const createPettyCashDebit = (data: PettyCashDebitFormData) =>
  api.post<PettyCashDebit>('/petty-cash-debits/', data).then(res => res.data)

export const updatePettyCashDebit = (id: number, data: PettyCashDebitFormData) =>
  api.put<PettyCashDebit>(`/petty-cash-debits/${id}/`, data).then(res => res.data)

export const deletePettyCashDebit = (id: number) =>
  api.delete(`/petty-cash-debits/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Admin: user management
// ---------------------------------------------------------------------------
export interface SectionInfo {
  key: SectionKey
  label: string
}

export interface ManagedUser {
  id: number
  username: string
  is_admin: boolean
  is_active: boolean
  allowed_sections: SectionKey[]
  date_joined: string | null
}

export const fetchSections = () =>
  api.get<SectionInfo[]>('/admin/sections/').then(res => res.data)

export const fetchUsers = () =>
  api.get<ManagedUser[]>('/admin/users/').then(res => res.data)

export const createUser = (data: { username: string; password: string; allowed_sections: SectionKey[] }) =>
  api.post<ManagedUser>('/admin/users/', data).then(res => res.data)

export const updateUser = (
  id: number,
  data: Partial<{ allowed_sections: SectionKey[]; password: string; is_active: boolean }>,
) => api.patch<ManagedUser>(`/admin/users/${id}/`, data).then(res => res.data)

export const deleteUser = (id: number) =>
  api.delete(`/admin/users/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export type InvoiceDocType = 'auto' | 'tax_invoice' | 'bill_of_supply'

export interface InvoiceItem {
  id?: number
  description: string
  sub_description?: string
  hsn_sac?: string
  quantity: string | number
  uom?: string
  unit_price: string | number
  gst_rate: string | number
  position?: number
  // read-only computed
  taxable_value?: string
  cgst_amount?: string
  sgst_amount?: string
  half_gst_rate?: string
  line_total?: string
}

export interface Invoice {
  id: number
  invoice_number: string
  doc_type: InvoiceDocType
  resolved_doc_type: 'tax_invoice' | 'bill_of_supply'
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_gstin: string
  ship_to_name: string
  ship_to_address: string
  issue_date: string
  due_date: string | null
  place_of_supply: string
  contact_name: string
  terms: string
  notes: string
  items: InvoiceItem[]
  taxable_total: string
  cgst_total: string
  sgst_total: string
  grand_total: string
  grand_total_raw: string
  rounded_off: string
  amount_in_words: string
  created_at: string
}

export interface InvoiceFormData {
  doc_type: InvoiceDocType
  customer_name: string
  customer_phone?: string
  customer_address?: string
  customer_gstin?: string
  ship_to_name?: string
  ship_to_address?: string
  issue_date: string
  due_date?: string | null
  place_of_supply?: string
  contact_name?: string
  terms?: string
  notes?: string
  items: Array<{
    description: string
    sub_description?: string
    hsn_sac?: string
    quantity: number
    uom?: string
    unit_price: number
    gst_rate: number
  }>
}

export const fetchInvoices = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<Invoice[]>(`/invoices/${qs}`).then(res => res.data)
}

export const fetchInvoice = (id: number) =>
  api.get<Invoice>(`/invoices/${id}/`).then(res => res.data)

export const createInvoice = (data: InvoiceFormData) =>
  api.post<Invoice>('/invoices/', data).then(res => res.data)

export const deleteInvoice = (id: number) =>
  api.delete(`/invoices/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Delivery Challans
// ---------------------------------------------------------------------------
export interface ChallanItem {
  id?: number
  description: string
  sub_description?: string
  hsn_sac?: string
  quantity: string | number
  uom?: string
  position?: number
}

export interface DeliveryChallan {
  id: number
  challan_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_gstin: string
  ship_to_name: string
  ship_to_address: string
  challan_date: string
  shipping_date: string | null
  place_of_supply: string
  notes: string
  terms: string
  items: ChallanItem[]
  created_at: string
}

export interface ChallanFormData {
  challan_number?: string
  customer_name: string
  customer_phone?: string
  customer_address?: string
  customer_gstin?: string
  ship_to_name?: string
  ship_to_address?: string
  challan_date: string
  shipping_date?: string | null
  place_of_supply?: string
  notes?: string
  terms?: string
  items: Array<{
    description: string
    sub_description?: string
    hsn_sac?: string
    quantity: number
    uom?: string
  }>
}

export const fetchChallans = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<DeliveryChallan[]>(`/delivery-challans/${qs}`).then(res => res.data)
}

export const fetchChallan = (id: number) =>
  api.get<DeliveryChallan>(`/delivery-challans/${id}/`).then(res => res.data)

export const createChallan = (data: ChallanFormData) =>
  api.post<DeliveryChallan>('/delivery-challans/', data).then(res => res.data)

export const deleteChallan = (id: number) =>
  api.delete(`/delivery-challans/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Purchase Bills
// ---------------------------------------------------------------------------
export interface PurchaseItem {
  id?: number
  description: string
  sub_description?: string
  hsn_sac?: string
  quantity: string | number
  uom?: string
  unit_price: string | number
  gst_rate: string | number
  position?: number
  taxable_value?: string
  cgst_amount?: string
  sgst_amount?: string
  half_gst_rate?: string
  line_total?: string
}

export interface PurchaseBill {
  id: number
  bill_number: string
  vendor_name: string
  vendor_phone: string
  vendor_address: string
  vendor_gstin: string
  vendor_pan: string
  vendor_invoice_number: string
  ship_to_name: string
  ship_to_address: string
  issue_date: string
  due_date: string | null
  place_of_supply: string
  notes: string
  terms: string
  items: PurchaseItem[]
  taxable_total: string
  cgst_total: string
  sgst_total: string
  grand_total: string
  grand_total_raw: string
  rounded_off: string
  amount_in_words: string
  created_at: string
}

export interface PurchaseFormData {
  bill_number?: string
  vendor_name: string
  vendor_phone?: string
  vendor_address?: string
  vendor_gstin?: string
  vendor_pan?: string
  vendor_invoice_number?: string
  ship_to_name?: string
  ship_to_address?: string
  issue_date: string
  due_date?: string | null
  place_of_supply?: string
  notes?: string
  terms?: string
  items: Array<{
    description: string
    sub_description?: string
    hsn_sac?: string
    quantity: number
    uom?: string
    unit_price: number
    gst_rate: number
  }>
}

export const fetchPurchaseBills = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<PurchaseBill[]>(`/purchase-bills/${qs}`).then(res => res.data)
}

export const fetchPurchaseBill = (id: number) =>
  api.get<PurchaseBill>(`/purchase-bills/${id}/`).then(res => res.data)

export const createPurchaseBill = (data: PurchaseFormData) =>
  api.post<PurchaseBill>('/purchase-bills/', data).then(res => res.data)

export const deletePurchaseBill = (id: number) =>
  api.delete(`/purchase-bills/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------
export interface POItem {
  id?: number
  description: string
  sub_description?: string
  hsn_sac?: string
  quantity: string | number
  uom?: string
  unit_price: string | number
  gst_rate: string | number
  position?: number
  taxable_value?: string
  cgst_amount?: string
  sgst_amount?: string
  half_gst_rate?: string
  line_total?: string
}

export interface PurchaseOrder {
  id: number
  order_number: string
  vendor_name: string
  vendor_phone: string
  vendor_address: string
  vendor_gstin: string
  vendor_pan: string
  ship_to_name: string
  ship_to_address: string
  issue_date: string
  valid_until: string | null
  place_of_supply: string
  notes: string
  terms: string
  items: POItem[]
  taxable_total: string
  cgst_total: string
  sgst_total: string
  grand_total: string
  grand_total_raw: string
  rounded_off: string
  amount_in_words: string
  created_at: string
}

export interface POFormData {
  order_number?: string
  vendor_name: string
  vendor_phone?: string
  vendor_address?: string
  vendor_gstin?: string
  vendor_pan?: string
  ship_to_name?: string
  ship_to_address?: string
  issue_date: string
  valid_until?: string | null
  place_of_supply?: string
  notes?: string
  terms?: string
  items: Array<{
    description: string
    sub_description?: string
    hsn_sac?: string
    quantity: number
    uom?: string
    unit_price: number
    gst_rate: number
  }>
}

export const fetchPurchaseOrders = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<PurchaseOrder[]>(`/purchase-orders/${qs}`).then(res => res.data)
}

export const fetchPurchaseOrder = (id: number) =>
  api.get<PurchaseOrder>(`/purchase-orders/${id}/`).then(res => res.data)

export const createPurchaseOrder = (data: POFormData) =>
  api.post<PurchaseOrder>('/purchase-orders/', data).then(res => res.data)

export const deletePurchaseOrder = (id: number) =>
  api.delete(`/purchase-orders/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Payment Receipts
// ---------------------------------------------------------------------------
export interface ReceiptLine {
  id?: number
  document_number?: string
  document_date?: string | null
  document_amount: string | number
  payment_amount: string | number
  position?: number
}

export interface PaymentReceipt {
  id: number
  receipt_number: string
  receipt_to_name: string
  receipt_to_phone: string
  receipt_to_address: string
  payment_date: string
  payment_method: string
  notes: string
  terms: string
  lines: ReceiptLine[]
  amount_received: string
  amount_in_words: string
  created_at: string
}

export interface ReceiptFormData {
  receipt_number?: string
  receipt_to_name: string
  receipt_to_phone?: string
  receipt_to_address?: string
  payment_date: string
  payment_method?: string
  notes?: string
  terms?: string
  lines: Array<{
    document_number?: string
    document_date?: string | null
    document_amount: number
    payment_amount: number
  }>
}

export const fetchReceipts = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<PaymentReceipt[]>(`/payment-receipts/${qs}`).then(res => res.data)
}

export const fetchReceipt = (id: number) =>
  api.get<PaymentReceipt>(`/payment-receipts/${id}/`).then(res => res.data)

export const createReceipt = (data: ReceiptFormData) =>
  api.post<PaymentReceipt>('/payment-receipts/', data).then(res => res.data)

export const deleteReceipt = (id: number) =>
  api.delete(`/payment-receipts/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------
export interface QuoteItem {
  id?: number
  description: string
  sub_description?: string
  hsn_sac?: string
  quantity: string | number
  uom?: string
  unit_price: string | number
  gst_rate: string | number
  position?: number
  taxable_value?: string
  cgst_amount?: string
  sgst_amount?: string
  half_gst_rate?: string
  line_total?: string
}

export interface Quote {
  id: number
  quote_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_gstin: string
  ship_to_name: string
  ship_to_address: string
  issue_date: string
  valid_until: string | null
  place_of_supply: string
  notes: string
  terms: string
  items: QuoteItem[]
  taxable_total: string
  cgst_total: string
  sgst_total: string
  grand_total: string
  grand_total_raw: string
  rounded_off: string
  amount_in_words: string
  created_at: string
}

export interface QuoteFormData {
  quote_number?: string
  customer_name: string
  customer_phone?: string
  customer_address?: string
  customer_gstin?: string
  ship_to_name?: string
  ship_to_address?: string
  issue_date: string
  valid_until?: string | null
  place_of_supply?: string
  notes?: string
  terms?: string
  items: Array<{
    description: string
    sub_description?: string
    hsn_sac?: string
    quantity: number
    uom?: string
    unit_price: number
    gst_rate: number
  }>
}

export const fetchQuotes = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<Quote[]>(`/quotes/${qs}`).then(res => res.data)
}

export const fetchQuote = (id: number) =>
  api.get<Quote>(`/quotes/${id}/`).then(res => res.data)

export const createQuote = (data: QuoteFormData) =>
  api.post<Quote>('/quotes/', data).then(res => res.data)

export const deleteQuote = (id: number) =>
  api.delete(`/quotes/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Bill of Supply (no GST)
// ---------------------------------------------------------------------------
export interface BosItem {
  id?: number
  description: string
  sub_description?: string
  hsn_sac?: string
  quantity: string | number
  uom?: string
  unit_price: string | number
  position?: number
  amount?: string
}

export interface BillOfSupply {
  id: number
  bos_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_gstin: string
  ship_to_name: string
  ship_to_address: string
  issue_date: string
  due_date: string | null
  place_of_supply: string
  notes: string
  terms: string
  items: BosItem[]
  taxable_total: string
  grand_total: string
  grand_total_raw: string
  rounded_off: string
  amount_in_words: string
  created_at: string
}

export interface BosFormData {
  bos_number?: string
  customer_name: string
  customer_phone?: string
  customer_address?: string
  customer_gstin?: string
  ship_to_name?: string
  ship_to_address?: string
  issue_date: string
  due_date?: string | null
  place_of_supply?: string
  notes?: string
  terms?: string
  items: Array<{ description: string; sub_description?: string; hsn_sac?: string; quantity: number; uom?: string; unit_price: number }>
}

export const fetchBillsOfSupply = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<BillOfSupply[]>(`/bills-of-supply/${qs}`).then(res => res.data)
}
export const fetchBillOfSupply = (id: number) =>
  api.get<BillOfSupply>(`/bills-of-supply/${id}/`).then(res => res.data)
export const createBillOfSupply = (data: BosFormData) =>
  api.post<BillOfSupply>('/bills-of-supply/', data).then(res => res.data)
export const deleteBillOfSupply = (id: number) =>
  api.delete(`/bills-of-supply/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Tax Invoice (CGST+SGST intra / IGST inter-state)
// ---------------------------------------------------------------------------
export interface TaxInvoiceItem {
  id?: number
  description: string
  sub_description?: string
  hsn_sac?: string
  quantity: string | number
  uom?: string
  unit_price: string | number
  gst_rate: string | number
  position?: number
  taxable_value?: string
  cgst_amount?: string
  sgst_amount?: string
  igst_amount?: string
  half_gst_rate?: string
  line_total?: string
}

export interface TaxInvoice {
  id: number
  ti_number: string
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_gstin: string
  ship_to_name: string
  ship_to_address: string
  issue_date: string
  due_date: string | null
  place_of_supply: string
  notes: string
  terms: string
  items: TaxInvoiceItem[]
  is_inter_state: boolean
  taxable_total: string
  cgst_total: string
  sgst_total: string
  igst_total: string
  grand_total: string
  grand_total_raw: string
  rounded_off: string
  amount_in_words: string
  created_at: string
}

export interface TaxInvoiceFormData {
  ti_number?: string
  customer_name: string
  customer_phone?: string
  customer_address?: string
  customer_gstin?: string
  ship_to_name?: string
  ship_to_address?: string
  issue_date: string
  due_date?: string | null
  place_of_supply?: string
  notes?: string
  terms?: string
  items: Array<{ description: string; sub_description?: string; hsn_sac?: string; quantity: number; uom?: string; unit_price: number; gst_rate: number }>
}

export const fetchTaxInvoices = (search?: string) => {
  const qs = search ? `?search=${encodeURIComponent(search)}` : ''
  return api.get<TaxInvoice[]>(`/tax-invoices/${qs}`).then(res => res.data)
}
export const fetchTaxInvoice = (id: number) =>
  api.get<TaxInvoice>(`/tax-invoices/${id}/`).then(res => res.data)
export const createTaxInvoice = (data: TaxInvoiceFormData) =>
  api.post<TaxInvoice>('/tax-invoices/', data).then(res => res.data)
export const deleteTaxInvoice = (id: number) =>
  api.delete(`/tax-invoices/${id}/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Bank statements (IDFC FIRST Bank / BOB) — upload the bank's Excel export, rows become entries
// ---------------------------------------------------------------------------
export type BankKey = 'idfc' | 'bob'

export interface BankStatementEntry {
  id: number
  bank: BankKey
  bank_display: string
  txn_date: string | null
  value_date: string | null
  narration: string
  ref_no: string
  debit: string
  credit: string
  balance: string | null
  balance_dc: string
  source_file: string
  uploaded_at: string
  // Reconciliation against the Expenses ledger (present on the list endpoint):
  // 'matched' = a same date/amount/side entry exists under this bank's mode.
  expense_status?: 'matched' | 'missing'
  // The Expenses entry this row was matched to (null when missing).
  matched_expense?: MatchedExpense | null
}

export interface MatchedExpense {
  id: number
  date: string | null
  category: string
  branch: string
  side: 'debit' | 'credit'
  amount: string
  mode: string
  remark: string
  person: string
}

export interface BankStatementResponse {
  results: BankStatementEntry[]
  summary: { total: number; matched: number; missing: number; suggested_mode: string }
}

export interface BankImportResult {
  detail: string
  inserted: number
  skipped: number
  errors: string[]
}

// Each bank is its own endpoint: /idfc-statements/ and /bob-statements/
const bankBase = (bank: BankKey) => (bank === 'idfc' ? '/idfc-statements' : '/bob-statements')

export const fetchBankStatements = (bank: BankKey, opts?: { search?: string; from?: string; to?: string }) => {
  const p = new URLSearchParams()
  if (opts?.search) p.set('search', opts.search)
  if (opts?.from) p.set('from', opts.from)
  if (opts?.to) p.set('to', opts.to)
  const qs = p.toString() ? `?${p.toString()}` : ''
  return api.get<BankStatementResponse>(`${bankBase(bank)}/${qs}`).then(res => res.data)
}

export const importBankStatement = (bank: BankKey, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<BankImportResult>(`${bankBase(bank)}/import/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data)
}

export const deleteBankStatementEntry = (bank: BankKey, id: number) =>
  api.delete(`${bankBase(bank)}/${id}/`).then(res => res.data)

export const updateBankStatementEntry = (
  bank: BankKey,
  id: number,
  data: Partial<Pick<BankStatementEntry, 'txn_date' | 'value_date' | 'narration' | 'ref_no' | 'debit' | 'credit' | 'balance' | 'balance_dc'>>,
) => api.patch<BankStatementEntry>(`${bankBase(bank)}/${id}/`, data).then(res => res.data)

export const clearBankStatements = (bank: BankKey) =>
  api.delete<{ detail: string; deleted: number }>(`${bankBase(bank)}/clear/`).then(res => res.data)


// ---------------------------------------------------------------------------
// Engineer P&L — live profit/loss; closed calls pulled from the OpenCall system
// ---------------------------------------------------------------------------
export interface EngineerPnl {
  id: number
  engineer_name: string
  email: string
  engg_count: number
  per_day_target: number
  per_call_rate: string
  engg_salary: string
  total_working_days: number
  actual_working_days: number
  active: boolean
  position: number
  per_day: string
  created_at: string
}

export interface EngineerPnlFormData {
  engineer_name: string
  email?: string
  engg_count?: number
  per_day_target?: number
  per_call_rate: number
  engg_salary: number
  total_working_days: number
  actual_working_days: number
  active?: boolean
}

export interface EngineerPnlRow {
  id: number
  engineer_name: string
  email: string
  engg_count: number
  per_day_target: number
  per_call_rate: string
  engg_salary: string
  total_working_days: number
  actual_working_days: number
  salary_source: 'payroll' | 'manual'
  /** Days in the window being viewed — what the salary below is charged for. */
  period_days: number
  /** Length of the salary cycle (25th→24th) the window sits in: 28–31 days. */
  cycle_days: number
  /** What one day of this window costs: the salary spread over its own cycle. */
  daily_rate: string
  /** Salary owed for THIS window: the one-day rate times period_days. */
  window_salary: string
  closed_calls: number
  actual_closed_pd: string
  total_calls_closed_pm: number
  per_day: string
  revenue: string
  total_engg_salary: string
  nett: string
}

export interface EngineerPnlBoard {
  period: { month: string; from: string; to: string }
  live_ok: boolean
  message: string
  synced: number
  /** Days the window covers, inclusive of both ends. */
  period_days: number
  /** Length of the salary cycle the window sits in. */
  cycle_days: number
  /** Engineers whose blank email was filled in from OpenCall's roster this load. */
  email_synced: number
  payroll_ok: boolean | null
  payroll_message: string
  /** Engineers whose blank email Payroll filled in via a unique name match. */
  payroll_auto_linked: Array<{ engineer_name: string; email: string }>
  /**
   * Engineers whose salary did NOT come from Payroll even though Payroll was
   * reachable — the figure shown for them is a manual/default value.
   */
  payroll_unmatched: string[]
  show_all: boolean
  total_configured: number
  meta: Record<string, unknown>
  rows: EngineerPnlRow[]
  totals: { engg_count: number; closed_calls: number; revenue: string; total_engg_salary: string; nett: string; window_salary: string }
  unmatched_engineers: Array<{ engineer_name: string; closed_calls: number }>
}

export const fetchEngineerPnls = () =>
  api.get<EngineerPnl[]>('/engineer-pnl/').then(res => res.data)
export const createEngineerPnl = (data: EngineerPnlFormData) =>
  api.post<EngineerPnl>('/engineer-pnl/', data).then(res => res.data)
export const updateEngineerPnl = (id: number, data: Partial<EngineerPnlFormData>) =>
  api.patch<EngineerPnl>(`/engineer-pnl/${id}/`, data).then(res => res.data)
export const deleteEngineerPnl = (id: number) =>
  api.delete(`/engineer-pnl/${id}/`).then(res => res.data)
export const fetchEngineerPnlBoard = (params?: { month?: string; from?: string; to?: string; all?: boolean }) => {
  const p = new URLSearchParams()
  if (params?.from && params?.to) { p.set('from', params.from); p.set('to', params.to) }
  else if (params?.month) p.set('month', params.month)
  if (params?.all) p.set('all', '1')
  const qs = p.toString() ? `?${p.toString()}` : ''
  return api.get<EngineerPnlBoard>(`/engineer-pnl/board/${qs}`).then(res => res.data)
}

/** One closed call behind a board close count, with its OpenCall detail columns. */
export interface EngineerClosedCall {
  date: string
  engineer: string
  ticket_id: string
  case_id: string
  segment: string
  product_name: string
  /** Raw ASP code, e.g. "ASPS01463". */
  work_location: string
  /** That code resolved to its region name, e.g. "VELLORE". */
  work_location_name: string
  wo_otc_code: string
  region_code: string
  /**
   * The engineer's canonical name — what the board calls them. `engineer` is the raw
   * report text, which differs for an aliased name, so group on this one.
   */
  engineer_name: string
}

export interface EngineerClosedCalls {
  period: { from: string; to: string }
  engineer: string
  live_ok: boolean
  message: string
  count: number
  calls: EngineerClosedCall[]
  meta: { fromDate?: string; toDate?: string; reportDays?: number; totalClosed?: number }
}

/** The individual closed calls behind a board count — same window rules as the board. */
export const fetchEngineerClosedCalls = (params: { from: string; to: string; engineer?: string }) => {
  const p = new URLSearchParams()
  p.set('from', params.from)
  p.set('to', params.to)
  if (params.engineer) p.set('engineer', params.engineer)
  return api.get<EngineerClosedCalls>(`/engineer-pnl/closed-calls/?${p.toString()}`).then(res => res.data)
}

export interface PayrollEmployee {
  name: string
  email: string
  salary: number | null
}

export interface PayrollEmployees {
  ok: boolean
  message: string
  count: number
  employees: PayrollEmployee[]
}

/**
 * The people Payroll knows about, name and email together.
 *
 * Salary only reaches an engineer when the email on their P&L record is the exact
 * email Payroll holds, so the edit form offers this list to pick from instead of
 * asking for the address to be typed. Degrades to ok:false with an empty list when
 * Payroll is unreachable — the form still accepts a typed email.
 */
export const fetchPayrollEmployees = () =>
  api.get<PayrollEmployees>('/engineer-pnl/payroll-employees/').then(res => res.data)


// Sleek Bill Invoice Register — imported invoices mirroring the Sleek Bill list
export interface SleekBillInvoice {
  id: number
  invoice_number: string
  invoice_type: string
  client_name: string
  client_gstin: string
  client_phone: string
  client_email: string
  client_city: string
  client_state: string
  creator_name: string
  issue_date: string | null
  due_date: string | null
  date_of_payment: string | null
  currency: string
  amount: string
  tax: string
  total: string
  amount_paid: string
  balance: string
  status: string
  dr_cr: string
  cgst: string
  sgst: string
  igst: string
  payment_mode: string
  payment_info: string
  financial_year: string
  source_file: string
  imported_at: string
  has_pdf: boolean
}

export interface SleekBillSummary {
  count: number
  tax_invoice: number
  bill_of_supply: number
  amount: string
  tax: string
  total: string
  paid: string
  balance: string
}

export interface SleekBillResponse {
  count: number
  next: string | null
  previous: string | null
  page_size?: number
  results: SleekBillInvoice[]
  summary: SleekBillSummary
}

export const fetchSleekBillInvoices = (opts?: { type?: string; status?: string; search?: string; from?: string; to?: string; page?: number }) => {
  const p = new URLSearchParams()
  if (opts?.type) p.set('type', opts.type)
  if (opts?.status) p.set('status', opts.status)
  if (opts?.search) p.set('search', opts.search)
  if (opts?.from) p.set('from', opts.from)
  if (opts?.to) p.set('to', opts.to)
  if (opts?.page) p.set('page', String(opts.page))
  const qs = p.toString() ? `?${p.toString()}` : ''
  return api.get<SleekBillResponse>(`/sleekbill-invoices/${qs}`).then(res => res.data)
}

export const importSleekBillInvoices = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ detail: string; created: number; updated: number; skipped: number; errors: string[] }>(
    '/sleekbill-invoices/import/', form, { headers: { 'Content-Type': 'multipart/form-data' } },
  ).then(res => res.data)
}

export const clearSleekBillInvoices = () =>
  api.delete<{ detail: string; deleted: number }>('/sleekbill-invoices/clear/').then(res => res.data)

// Open an attached invoice PDF in a new tab (fetched with auth → blob URL).
export const openInvoicePdf = async (id: number) => {
  const res = await api.get(`/sleekbill-invoices/${id}/pdf/`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}

export const attachInvoicePdf = (id: number, file: File) => {
  const form = new FormData()
  form.append('file', file)
  return api.post<{ detail: string }>(`/sleekbill-invoices/${id}/upload-pdf/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(res => res.data)
}

export const bulkAttachInvoicePdfs = (files: File[]) => {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  return api.post<{ detail: string; matched: number; unmatched: string[] }>(
    '/sleekbill-invoices/upload-pdfs/', form, { headers: { 'Content-Type': 'multipart/form-data' } },
  ).then(res => res.data)
}


// Subscriptions — tracked service subscriptions with renewal dates + reminders
export interface Subscription {
  id: number
  name: string
  vendor: string
  amount: string
  cycle: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'one_time'
  renewal_date: string
  reminder_days_before: number
  auto_renew: boolean
  notes: string
  active: boolean
  days_left: number | null
  status: 'active' | 'expiring_soon' | 'expired'
  created_at: string
}

export interface SubscriptionFormData {
  name: string
  vendor: string
  amount: number
  cycle: string
  renewal_date: string
  reminder_days_before: number
  auto_renew: boolean
  notes: string
  active: boolean
}

export const fetchSubscriptions = () =>
  api.get<Subscription[]>('/subscriptions/').then(res => res.data)
export const createSubscription = (data: SubscriptionFormData) =>
  api.post<Subscription>('/subscriptions/', data).then(res => res.data)
export const updateSubscription = (id: number, data: Partial<SubscriptionFormData>) =>
  api.patch<Subscription>(`/subscriptions/${id}/`, data).then(res => res.data)
export const deleteSubscription = (id: number) =>
  api.delete(`/subscriptions/${id}/`).then(res => res.data)


export default api



// ---------------------------------------------------------------------------
// Collections — outstanding receivables per client
// ---------------------------------------------------------------------------

export type AgingBucket = '0-30' | '31-60' | '61-90' | '90+'

export interface CollectionsClient {
  client_name: string
  /** Every spelling of this name that was merged into one row. */
  name_variants: string[]
  balance: string
  bill_count: number
  oldest_days: number
  oldest_invoice: string
  phone: string
  /** 91XXXXXXXXXX, or '' when no usable Indian mobile is on file. */
  whatsapp: string
  email: string
  city: string
  gstin: string
  buckets: Record<AgingBucket, string>
}

export interface CollectionsData {
  as_of: string
  summary: {
    billed: string
    collected: string
    outstanding: string
    credit_notes: string
    unpaid_invoices: number
    overdue_invoices: number
    overdue_amount: string
    clients_owing: number
  }
  aging: Array<{ bucket: AgingBucket; count: number; amount: string }>
  clients: CollectionsClient[]
  filters: { search: string; bucket: string; min: string }
}

export const fetchCollections = (params?: { search?: string; bucket?: string; min?: string }) => {
  const p = new URLSearchParams()
  if (params?.search) p.set('search', params.search)
  if (params?.bucket) p.set('bucket', params.bucket)
  if (params?.min) p.set('min', params.min)
  const qs = p.toString()
  return api.get<CollectionsData>(`/collections/${qs ? `?${qs}` : ''}`).then((r) => r.data)
}

export interface CollectionsInvoice {
  id: number
  invoice_number: string
  issue_date: string
  due_date: string
  days_overdue: number
  bucket: AgingBucket
  total: string
  amount_paid: string
  balance: string
  status: string
}

export interface CollectionsInvoices {
  client_name: string
  count: number
  balance: string
  whatsapp: string
  invoices: CollectionsInvoice[]
}

/** The unpaid invoices behind one client's balance, oldest debt first. */
export const fetchCollectionsInvoices = (client: string) =>
  api
    .get<CollectionsInvoices>(`/collections/invoices/?client=${encodeURIComponent(client)}`)
    .then((r) => r.data)

// ---------------------------------------------------------------------------
// Staff Requests — what employees have asked the office for (from Payroll)
// ---------------------------------------------------------------------------

export type StaffRequestStatus = 'Pending' | 'Approved' | 'Rejected'

export interface StaffRequest {
  id: number
  employee_name: string
  branch: string
  request_type: string
  request_type_label: string
  /** null for a report — it is raised to be read, not paid. */
  amount: number | null
  reason: string
  status: StaffRequestStatus
  reviewed_by: string
  reviewed_at: string
  created_at: string
  message_count: number
}

export interface StaffRequestsData {
  ok: boolean
  message: string
  count: number
  summary: {
    total_amount: string
    pending_count: number
    pending_amount: string
    by_status: Record<StaffRequestStatus, { count: number; amount: string }>
    employees: number
  }
  by_type: Array<{ request_type: string; label: string; count: number; amount: string }>
  requests: StaffRequest[]
  filters: { status: string; request_type: string; search: string }
}

export const fetchStaffRequests = (params?: { status?: string; request_type?: string; search?: string }) => {
  const p = new URLSearchParams()
  if (params?.status) p.set('status', params.status)
  if (params?.request_type) p.set('request_type', params.request_type)
  if (params?.search) p.set('search', params.search)
  const qs = p.toString()
  return api.get<StaffRequestsData>(`/staff-requests/${qs ? `?${qs}` : ''}`).then((r) => r.data)
}

/**
 * Approve or reject one request — by asking Payroll to do it.
 *
 * Nothing is decided on this side: Payroll sets the status, stamps the reviewer
 * and posts the outcome into the request's own conversation, so the two systems
 * can never disagree about who allowed what. A request that is no longer Pending
 * is refused by Payroll, and its own sentence comes back in `detail`.
 */
export const decideStaffRequest = (id: number, action: 'approve' | 'reject', note?: string) =>
  api
    .post<{ ok: boolean; detail: string }>(`/staff-requests/${id}/decide/`, { action, note: note ?? '' })
    .then((r) => r.data)
