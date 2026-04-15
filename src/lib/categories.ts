/**
 * Category color palette — used by badges (Tailwind classes) and charts (hex).
 * Unknown categories fall back to the "default" entry, so adding a new
 * category on the backend never breaks the UI.
 */

interface CategoryStyle {
  /** Tailwind classes for badge background + text in both light & dark mode. */
  badge: string
  /** Hex color for charts (pie slices, bars). */
  hex: string
}

const PALETTE: Record<string, CategoryStyle> = {
  Petrol: {
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    hex: '#3b82f6',
  },
  Food: {
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    hex: '#f59e0b',
  },
  Travel: {
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    hex: '#8b5cf6',
  },
  Snacks: {
    badge: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    hex: '#eab308',
  },
  Misc: {
    badge: 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    hex: '#6b7280',
  },
}

/** Deterministic fallback palette for unknown categories. */
const FALLBACK_HEXES = ['#0d9488', '#ef4444', '#ec4899', '#14b8a6']

const DEFAULT_BADGE = 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'

export function getCategoryBadgeClass(category: string): string {
  return PALETTE[category]?.badge ?? DEFAULT_BADGE
}

export function getCategoryHex(category: string, index = 0): string {
  return PALETTE[category]?.hex ?? FALLBACK_HEXES[index % FALLBACK_HEXES.length]
}
