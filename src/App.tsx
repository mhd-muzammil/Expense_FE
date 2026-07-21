import { useEffect } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import Layout from '@/components/Layout'
import Dashboard from '@/components/Dashboard'
import ExpenseTable from '@/components/ExpenseTable'
import ProfitLoss from '@/components/ProfitLoss'
import RegionExpense from '@/components/RegionExpense'
import Invoices from '@/components/Invoices'
import UserManagement from '@/components/UserManagement'
import Login from '@/components/Login'
import { LayoutDashboard, Receipt, BarChart3, MapPin, FileText, Users, Loader2 } from 'lucide-react'
import type { SectionKey } from '@/lib/api'

type TabKey = SectionKey | 'admin'

function App() {
  const { user, authReady, initAuth, loadAll, logout, activeTab, setActiveTab } = useExpenseStore()

  // Initial auth check (validates any stored token against the API).
  useEffect(() => {
    initAuth()
  }, [])

  // 401 from any API call → server says token is dead → kick to login.
  useEffect(() => {
    const handler = () => {
      if (useExpenseStore.getState().user) {
        useExpenseStore.setState({ user: null })
      }
    }
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  // Once we have a logged-in user, load all data.
  useEffect(() => {
    if (user) {
      loadAll()
    }
  }, [user])

  // Splash while we check the stored token on first paint.
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  const isAdmin = !!user.is_admin
  // Sections this user may access. Admins implicitly get everything; if the
  // field is missing (older token), fall back to all three sections.
  const allowed: SectionKey[] = isAdmin
    ? ['dashboard', 'expenses', 'pnl', 'region', 'invoice']
    : (user.allowed_sections ?? ['dashboard', 'expenses', 'pnl', 'region', 'invoice'])

  // Build the visible tab list from the user's access.
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    ...(allowed.includes('dashboard') ? [{ key: 'dashboard' as TabKey, label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }] : []),
    ...(allowed.includes('expenses') ? [{ key: 'expenses' as TabKey, label: 'Expenses', icon: <Receipt className="w-4 h-4" /> }] : []),
    ...(allowed.includes('pnl') ? [{ key: 'pnl' as TabKey, label: 'P&L', icon: <BarChart3 className="w-4 h-4" /> }] : []),
    ...(allowed.includes('region') ? [{ key: 'region' as TabKey, label: 'Region Expense', icon: <MapPin className="w-4 h-4" /> }] : []),
    ...(allowed.includes('invoice') ? [{ key: 'invoice' as TabKey, label: 'Invoice', icon: <FileText className="w-4 h-4" /> }] : []),
    ...(isAdmin ? [{ key: 'admin' as TabKey, label: 'Users', icon: <Users className="w-4 h-4" /> }] : []),
  ]

  // Guard the active tab: if the current selection isn't available to this
  // user, fall back to the first tab they can see.
  const availableKeys = tabs.map((t) => t.key)
  const currentTab: TabKey = availableKeys.includes(activeTab) ? activeTab : (tabs[0]?.key ?? 'dashboard')

  return (
    <Layout onLogout={logout}>
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-surface-100 dark:bg-surface-800 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${currentTab === tab.key
                ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content — each guarded by the user's access. */}
      {currentTab === 'dashboard' && allowed.includes('dashboard') && <Dashboard />}
      {currentTab === 'expenses' && allowed.includes('expenses') && <ExpenseTable />}
      {currentTab === 'pnl' && allowed.includes('pnl') && <ProfitLoss />}
      {currentTab === 'region' && allowed.includes('region') && <RegionExpense />}
      {currentTab === 'invoice' && allowed.includes('invoice') && <Invoices />}
      {currentTab === 'admin' && isAdmin && <UserManagement />}
    </Layout>
  )
}

export default App
