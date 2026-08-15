import { useEffect, useState } from 'react'

/**
 * Animated launch splash shown ONLY inside the native (Capacitor) app while the
 * web app boots: the Renderways logo pops in, then "Renderways Technology" and
 * "Expense Tracking" fade up. Auto-dismisses. On a normal desktop/browser it
 * renders nothing, so the website is untouched.
 *
 * Because this lives in the web app, changing the animation later auto-updates
 * in the app on the next open — no APK reinstall needed.
 */
export default function AppSplash() {
  const isApp =
    typeof window !== 'undefined' &&
    !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

  const [show, setShow] = useState(isApp)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!isApp) return
    const t1 = setTimeout(() => setLeaving(true), 2100) // begin fade-out
    const t2 = setTimeout(() => setShow(false), 2550) // unmount
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [isApp])

  if (!show) return null

  return (
    <div className={`app-splash${leaving ? ' app-splash--leaving' : ''}`} aria-hidden="true">
      <img src="/renderways-logo.png" alt="" className="app-splash__logo" />
      <div className="app-splash__title">Renderways Technology</div>
      <div className="app-splash__sub">Expense Tracking</div>
    </div>
  )
}
