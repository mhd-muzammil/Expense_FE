import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface-50 dark:bg-surface-900">
          <div className="max-w-md w-full bg-white dark:bg-surface-800 rounded-3xl shadow-2xl p-8 text-center border border-red-100 dark:border-red-900/30">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-surface-500 dark:text-surface-400 mb-6">
              We've encountered an error while loading the dashboard. Please try refreshing the page.
            </p>
            <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 text-left mb-6 overflow-hidden">
              <p className="text-xs font-mono text-red-700 dark:text-red-400 break-words">
                {this.state.error?.toString()}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all shadow-lg shadow-primary-600/20"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
