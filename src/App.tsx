import { useEffect } from 'react'
import useExpenseStore from '@/store/useExpenseStore'
import Layout, { type NavItem } from '@/components/Layout'
import Dashboard from '@/components/Dashboard'
import ExpenseTable from '@/components/ExpenseTable'
import ProfitLoss from '@/components/ProfitLoss'
import RegionExpense from '@/components/RegionExpense'
import Invoices from '@/components/Invoices'
import DeliveryChallans from '@/components/DeliveryChallans'
import PurchaseBills from '@/components/PurchaseBills'
import PurchaseOrders from '@/components/PurchaseOrders'
import PaymentReceipts from '@/components/PaymentReceipts'
import PettyCash from '@/components/PettyCash'
import Quotes from '@/components/Quotes'
import BillOfSupplies from '@/components/BillOfSupplies'
import TaxInvoices from '@/components/TaxInvoices'
import BankStatement from '@/components/BankStatement'
import EngineerPnl from '@/components/EngineerPnl'
import InvoiceRegister from '@/components/InvoiceRegister'
import Subscriptions from '@/components/Subscriptions'
import UserManagement from '@/components/UserManagement'
import Settings from '@/components/Settings'
import Login from '@/components/Login'
import { LayoutDashboard, Receipt, BarChart3, MapPin, FileText, Truck, ShoppingCart, ClipboardList, ReceiptText, Wallet, FileSignature, ScrollText, BadgeIndianRupee, Landmark, Cpu, Users, Settings as SettingsIcon, Loader2, Files, CalendarClock } from 'lucide-react'
import type { SectionKey } from '@/lib/api'

type TabKey = SectionKey | 'admin' | 'settings'

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
    ? ['dashboard', 'expenses', 'pnl', 'region', 'invoice', 'challan', 'purchase', 'porder', 'receipt', 'pettycash', 'quote', 'bos', 'taxinvoice', 'idfc', 'bob', 'engpnl', 'sbinvoice', 'subscription']
    : (user.allowed_sections ?? ['dashboard', 'expenses', 'pnl', 'region', 'invoice', 'challan', 'purchase', 'porder', 'receipt', 'pettycash', 'quote', 'bos', 'taxinvoice', 'idfc', 'bob', 'engpnl', 'sbinvoice', 'subscription'])

  // Build the visible tab list from the user's access.
  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    ...(allowed.includes('dashboard') ? [{ key: 'dashboard' as TabKey, label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> }] : []),
    ...(allowed.includes('expenses') ? [{ key: 'expenses' as TabKey, label: 'Expenses', icon: <Receipt className="w-5 h-5" /> }] : []),
    ...(allowed.includes('pnl') ? [{ key: 'pnl' as TabKey, label: 'P&L', icon: <BarChart3 className="w-5 h-5" /> }] : []),
    ...(allowed.includes('idfc') ? [{ key: 'idfc' as TabKey, label: 'IDFC Statement', icon: <Landmark className="w-5 h-5" /> }] : []),
    ...(allowed.includes('bob') ? [{ key: 'bob' as TabKey, label: 'BOB Statement', icon: <Landmark className="w-5 h-5" /> }] : []),
    ...(allowed.includes('engpnl') ? [{ key: 'engpnl' as TabKey, label: 'Engineer P&L', icon: <Cpu className="w-5 h-5" /> }] : []),
    ...(allowed.includes('region') ? [{ key: 'region' as TabKey, label: 'Region Expense', icon: <MapPin className="w-5 h-5" /> }] : []),
    ...(allowed.includes('invoice') ? [{ key: 'invoice' as TabKey, label: 'Invoice', icon: <FileText className="w-5 h-5" /> }] : []),
    ...(allowed.includes('challan') ? [{ key: 'challan' as TabKey, label: 'Delivery Challan', icon: <Truck className="w-5 h-5" /> }] : []),
    ...(allowed.includes('purchase') ? [{ key: 'purchase' as TabKey, label: 'Purchase Bill', icon: <ShoppingCart className="w-5 h-5" /> }] : []),
    ...(allowed.includes('porder') ? [{ key: 'porder' as TabKey, label: 'Purchase Order', icon: <ClipboardList className="w-5 h-5" /> }] : []),
    ...(allowed.includes('receipt') ? [{ key: 'receipt' as TabKey, label: 'Payment Receipt', icon: <ReceiptText className="w-5 h-5" /> }] : []),
    ...(allowed.includes('pettycash') ? [{ key: 'pettycash' as TabKey, label: 'Petty Cash', icon: <Wallet className="w-5 h-5" /> }] : []),
    ...(allowed.includes('quote') ? [{ key: 'quote' as TabKey, label: 'Quote', icon: <FileSignature className="w-5 h-5" /> }] : []),
    ...(allowed.includes('bos') ? [{ key: 'bos' as TabKey, label: 'Bill of Supply', icon: <ScrollText className="w-5 h-5" /> }] : []),
    ...(allowed.includes('taxinvoice') ? [{ key: 'taxinvoice' as TabKey, label: 'Tax Invoice', icon: <BadgeIndianRupee className="w-5 h-5" /> }] : []),
    ...(allowed.includes('sbinvoice') ? [{ key: 'sbinvoice' as TabKey, label: 'Invoice Register', icon: <Files className="w-5 h-5" /> }] : []),
    ...(allowed.includes('subscription') ? [{ key: 'subscription' as TabKey, label: 'Subscriptions', icon: <CalendarClock className="w-5 h-5" /> }] : []),
    ...(isAdmin ? [{ key: 'admin' as TabKey, label: 'Users', icon: <Users className="w-5 h-5" /> }] : []),
    ...(isAdmin ? [{ key: 'settings' as TabKey, label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> }] : []),
  ]

  // Guard the active tab: if the current selection isn't available to this
  // user, fall back to the first tab they can see.
  const availableKeys = tabs.map((t) => t.key)
  const currentTab: TabKey = availableKeys.includes(activeTab) ? activeTab : (tabs[0]?.key ?? 'dashboard')

  const navItems: NavItem[] = tabs.map((tab) => ({
    key: tab.key,
    label: tab.label,
    icon: tab.icon,
    active: currentTab === tab.key,
    onClick: () => setActiveTab(tab.key),
  }))

  return (
    <Layout navItems={navItems} onLogout={logout}>
      {currentTab === 'dashboard' && allowed.includes('dashboard') && <Dashboard />}
      {currentTab === 'expenses' && allowed.includes('expenses') && <ExpenseTable />}
      {currentTab === 'pnl' && allowed.includes('pnl') && <ProfitLoss />}
      {currentTab === 'region' && allowed.includes('region') && <RegionExpense />}
      {currentTab === 'invoice' && allowed.includes('invoice') && <Invoices />}
      {currentTab === 'challan' && allowed.includes('challan') && <DeliveryChallans />}
      {currentTab === 'purchase' && allowed.includes('purchase') && <PurchaseBills />}
      {currentTab === 'porder' && allowed.includes('porder') && <PurchaseOrders />}
      {currentTab === 'receipt' && allowed.includes('receipt') && <PaymentReceipts />}
      {currentTab === 'pettycash' && allowed.includes('pettycash') && <PettyCash />}
      {currentTab === 'quote' && allowed.includes('quote') && <Quotes />}
      {currentTab === 'bos' && allowed.includes('bos') && <BillOfSupplies />}
      {currentTab === 'taxinvoice' && allowed.includes('taxinvoice') && <TaxInvoices />}
      {currentTab === 'idfc' && allowed.includes('idfc') && <BankStatement bank="idfc" title="IDFC Statement" subtitle="Upload the IDFC Bank Excel export — rows become entries" />}
      {currentTab === 'bob' && allowed.includes('bob') && <BankStatement bank="bob" title="BOB Statement" subtitle="Upload the Bank of Baroda Excel export — rows become entries" />}
      {currentTab === 'engpnl' && allowed.includes('engpnl') && <EngineerPnl />}
      {currentTab === 'sbinvoice' && allowed.includes('sbinvoice') && <InvoiceRegister />}
      {currentTab === 'subscription' && allowed.includes('subscription') && <Subscriptions />}
      {currentTab === 'admin' && isAdmin && <UserManagement />}
      {currentTab === 'settings' && isAdmin && <Settings />}
    </Layout>
  )
}

export default App
