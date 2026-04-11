import { useEffect, useState } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import Layout from '@/components/Layout'
import Dashboard from '@/components/Dashboard'
import ExpenseTable from '@/components/ExpenseTable'
import { LayoutDashboard, Receipt } from 'lucide-react'

type Tab = 'dashboard' | 'expenses'

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const { loadAll } = useExpenseStore()

  useEffect(() => {
    loadAll()
  }, [])

  return (
    <Layout>
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
