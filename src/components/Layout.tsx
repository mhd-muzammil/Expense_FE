import { useEffect, useState } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import useExpenseStore from '@/store/useExpenseStore'
import { APP_NAME, APP_SUBTITLE, CURRENCY_SYMBOL } from '@/lib/brand'
import { Moon, Sun, X, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ChevronDown } from 'lucide-react'

export interface NavItem {
  key: string
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  children?: NavItem[]
}

interface LayoutProps {
  children: React.ReactNode
  navItems?: NavItem[]
  onLogout?: () => void
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shrink-0">
        <span className="text-white font-bold text-lg">{CURRENCY_SYMBOL}</span>
      </div>
      {!compact && (
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-surface-900 dark:text-white leading-tight truncate">{APP_NAME}</h1>
          <p className="text-xs text-surface-500 dark:text-surface-400 leading-tight truncate">{APP_SUBTITLE}</p>
        </div>
      )}
    </div>
  )
}

const COLLAPSE_KEY = 'sidebar_collapsed'

function NavItemRow({ item, showLabels }: { item: NavItem; showLabels: boolean }) {
  const hasChildren = item.children && item.children.length > 0
  const isChildActive = hasChildren && item.children!.some((c) => c.active)
  const [expanded, setExpanded] = useState(item.active || isChildActive)

  useEffect(() => {
    if (item.active || isChildActive) {
      setExpanded(true)
    }
  }, [item.active, isChildActive])

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            item.onClick()
            if (hasChildren) setExpanded(true)
          }}
          title={item.label}
          className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 w-full
            ${showLabels ? 'px-4 py-2.5' : 'justify-center px-0 py-3'}
            ${item.active
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-semibold'
              : isChildActive
              ? 'text-primary-600 dark:text-primary-400 font-semibold bg-surface-50 dark:bg-surface-800/40'
              : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-200'
            }`}
        >
          <span className="shrink-0">{item.icon}</span>
          {showLabels && <span className="truncate flex-1 text-left">{item.label}</span>}
          {showLabels && hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
              className="p-0.5 rounded hover:bg-surface-200/50 dark:hover:bg-surface-700/50 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </span>
          )}
        </button>
      </div>

      {hasChildren && expanded && (
        <div className={`flex flex-col gap-1 ${showLabels ? 'pl-5 border-l border-surface-200 dark:border-surface-700/60 ml-5 my-1' : 'items-center mt-1'}`}>
          {item.children!.map((child) => (
            <button
              key={child.key}
              onClick={child.onClick}
              title={child.label}
              className={`flex items-center gap-2.5 rounded-lg text-xs font-medium transition-all duration-200 w-full
                ${showLabels ? 'px-3 py-2' : 'justify-center px-0 py-2'}
                ${child.active
                  ? 'bg-primary-100/70 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-semibold shadow-xs'
                  : 'text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-700 dark:hover:text-surface-200'
                }`}
            >
              <span className="shrink-0">{child.icon}</span>
              {showLabels && <span className="truncate">{child.label}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Layout({ children, navItems = [], onLogout }: LayoutProps) {
  const { theme, toggleTheme, toasts, removeToast, user } = useExpenseStore()
  const [mobileNav, setMobileNav] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')

  useEffect(() => {
    const isDark = theme === 'dark'
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    // Match the native status bar to the app theme so its background blends
    // with the header instead of showing a mismatched grey band (native app
    // only; on web/desktop and on an APK without the plugin these no-op).
    const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    if (cap?.isNativePlatform?.()) {
      // Draw content behind the transparent status bar and set ONLY the icon
      // contrast. Android 15 ignores a status-bar background colour, so the
      // header's own background (with safe-area top padding) provides the
      // colour that shows behind the clock/icons.
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {})
    }
  }, [theme])

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1')
      return !c
    })
  }

  const ThemeButton = () => (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700
        flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon className="w-5 h-5 text-surface-600" /> : <Sun className="w-5 h-5 text-yellow-400" />}
    </button>
  )

  const LogoutButton = () =>
    onLogout ? (
      <button
        onClick={onLogout}
        className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-red-50 dark:hover:bg-red-900/20
          flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95
          text-surface-600 dark:text-surface-300 hover:text-red-600 dark:hover:text-red-400 shrink-0"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="w-5 h-5" />
      </button>
    ) : null

  // Shared nav renderer. `showLabels` false = icon-only (collapsed) mode.
  const Nav = ({ showLabels }: { showLabels: boolean }) => (
    <div className="flex flex-col gap-1">
      {navItems.map((item) => (
        <NavItemRow key={item.key} item={item} showLabels={showLabels} />
      ))}
    </div>
  )

  return (
    <div className="min-h-screen flex bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col md:shrink-0 h-screen sticky top-0 transition-[width] duration-200
          border-r border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900
          ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        <div className={`flex items-center h-16 border-b border-surface-200 dark:border-surface-700 ${collapsed ? 'justify-center px-0' : 'px-5'}`}>
          <Logo compact={collapsed} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          <Nav showLabels={!collapsed} />
        </div>
        {/* Collapse toggle */}
        <div className="px-3 pt-1">
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center gap-3 w-full rounded-xl px-3 py-2 text-sm font-medium text-surface-400 dark:text-surface-500
              hover:bg-surface-100 dark:hover:bg-surface-800 hover:text-surface-600 dark:hover:text-surface-300 transition-all
              ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
        <div className={`border-t border-surface-200 dark:border-surface-700 px-3 py-3 flex gap-2 ${collapsed ? 'flex-col items-center' : 'items-center'}`}>
          {user && !collapsed && (
            <span className="flex-1 min-w-0 truncate text-sm font-medium text-surface-600 dark:text-surface-300 px-1">
              {user.username}
            </span>
          )}
          <ThemeButton />
          <LogoutButton />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar — extends into the status-bar area (safe-area top
            padding) so the bar's colour fills behind the clock and content
            still sits below it. */}
        <header
          className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4
          border-b border-surface-200 dark:border-surface-700 bg-white/90 dark:bg-surface-900/90 backdrop-blur-xl"
          style={{ height: 'calc(3.5rem + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}
        >
          <button
            onClick={() => setMobileNav(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-800"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-surface-600 dark:text-surface-300" />
          </button>
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeButton />
            <LogoutButton />
          </div>
        </header>

        <main
          className="flex-1 px-4 sm:px-6 lg:px-8 pt-6"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {mobileNav && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-surface-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
            onClick={() => setMobileNav(false)}
          >
            <div className="flex items-center justify-between h-16 px-5 border-b border-surface-200 dark:border-surface-700">
              <Logo />
              <button
                onClick={() => setMobileNav(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-100 dark:hover:bg-surface-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-surface-500" />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              <Nav showLabels />
            </div>
          </aside>
        </div>
      )}

      {/* Toast Container — full-width on phones, right-anchored card on sm+ */}
      <div className="fixed z-[60] flex flex-col gap-3 left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl animate-fade-in text-sm font-medium text-white
              ${toast.type === 'success'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="p-0.5 rounded-full hover:bg-white/20 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
