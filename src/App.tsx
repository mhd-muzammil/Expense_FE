import { useEffect, useState } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import Layout from '@/components/Layout'
import Dashboard from '@/components/Dashboard'
import ExpenseTable from '@/components/ExpenseTable'
import Login from '@/components/Login'
import { LayoutDashboard, Receipt, Loader2 } from 'lucide-react'

type Tab = 'dashboard' | 'expenses'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const { user, authReady, initAuth, loadAll, logout } = useExpenseStore()

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

  return (
    <Layout onLogout={logout}>
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-xl bg-surface-100 dark:bg-surface-800 w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${activeTab === 'dashboard'
              ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
            ${activeTab === 'expenses'
              ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
        >
          <Receipt className="w-4 h-4" />
          Expenses
        </button>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' ? <Dashboard /> : <ExpenseTable />}
    </Layout>
  )
}

export default App
