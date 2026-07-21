import { useEffect, useState } from 'react'
import {
  Users, UserPlus, Shield, Trash2, KeyRound, Loader2, X, Check, Save,
} from 'lucide-react'
import useExpenseStore from '@/store/useExpenseStore'
import {
  fetchSections, fetchUsers, createUser, updateUser, deleteUser,
  type ManagedUser, type SectionInfo, type SectionKey,
} from '@/lib/api'

export default function UserManagement() {
  const addToast = useExpenseStore((s) => s.addToast)
  const currentUsername = useExpenseStore((s) => s.user?.username)

  const [sections, setSections] = useState<SectionInfo[]>([])
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newSections, setNewSections] = useState<SectionKey[]>(['dashboard', 'pnl'])
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [secs, us] = await Promise.all([fetchSections(), fetchUsers()])
      setSections(secs)
      setUsers(us)
    } catch {
      addToast('error', 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleNewSection = (key: SectionKey) => {
    setNewSections((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    )
  }

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword) {
      addToast('error', 'Username and password are required')
      return
    }
    if (newPassword.length < 6) {
      addToast('error', 'Password must be at least 6 characters')
      return
    }
    if (newSections.length === 0) {
      addToast('error', 'Select at least one section')
      return
    }
    setCreating(true)
    try {
      const created = await createUser({
        username: newUsername.trim(),
        password: newPassword,
        allowed_sections: newSections,
      })
      setUsers((prev) => [...prev, created])
      addToast('success', `User "${created.username}" created`)
      setNewUsername('')
      setNewPassword('')
      setNewSections(['dashboard', 'pnl'])
      setShowCreate(false)
    } catch (err: unknown) {
      const detail = getErrorDetail(err)
      addToast('error', detail || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/30">
            <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">User Management</h2>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              Create login accounts and control which sections each user can access
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors w-fit"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 p-5 mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white">New user</h3>
            <button onClick={() => setShowCreate(false)} className="text-surface-400 hover:text-surface-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Username</label>
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. accountant"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="min 6 characters"
                className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Section access</label>
            <div className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <SectionChip
                  key={s.key}
                  label={s.label}
                  active={newSections.includes(s.key)}
                  onClick={() => toggleNewSection(s.key)}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-60"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Create user
            </button>
          </div>
        </div>
      )}

      {/* User list */}
      <div className="rounded-2xl bg-white dark:bg-surface-800 shadow-sm border border-surface-100 dark:border-surface-700 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-lg" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">No users yet</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {users.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                sections={sections}
                isSelf={u.username === currentUsername}
                onChanged={(updated) =>
                  setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                }
                onDeleted={(id) => setUsers((prev) => prev.filter((x) => x.id !== id))}
                onToast={addToast}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// User row — inline edit of sections, password reset, delete
// ---------------------------------------------------------------------------
function UserRow({
  user,
  sections,
  isSelf,
  onChanged,
  onDeleted,
  onToast,
}: {
  user: ManagedUser
  sections: SectionInfo[]
  isSelf: boolean
  onChanged: (u: ManagedUser) => void
  onDeleted: (id: number) => void
  onToast: (type: 'success' | 'error', msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<SectionKey[]>(user.allowed_sections)
  const [saving, setSaving] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const toggle = (key: SectionKey) =>
    setDraft((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]))

  const saveSections = async () => {
    if (draft.length === 0) {
      onToast('error', 'Select at least one section')
      return
    }
    setSaving(true)
    try {
      const updated = await updateUser(user.id, { allowed_sections: draft })
      onChanged(updated)
      onToast('success', 'Access updated')
      setEditing(false)
    } catch (err: unknown) {
      onToast('error', getErrorDetail(err) || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async () => {
    if (pw.length < 6) {
      onToast('error', 'Password must be at least 6 characters')
      return
    }
    setSaving(true)
    try {
      await updateUser(user.id, { password: pw })
      onToast('success', 'Password reset')
      setPw('')
      setPwOpen(false)
    } catch (err: unknown) {
      onToast('error', getErrorDetail(err) || 'Failed to reset password')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      await deleteUser(user.id)
      onToast('success', `User "${user.username}" deleted`)
      onDeleted(user.id)
    } catch (err: unknown) {
      onToast('error', getErrorDetail(err) || 'Failed to delete')
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Identity */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold shrink-0 ${
            user.is_admin
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
          }`}>
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-surface-900 dark:text-white truncate">{user.username}</span>
              {user.is_admin && (
                <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
              {isSelf && <span className="text-[11px] text-surface-400">(you)</span>}
            </div>
            <div className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
              {user.is_admin ? 'Full access to all sections' : sectionSummary(user.allowed_sections, sections)}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!user.is_admin && (
          <div className="flex items-center gap-2 shrink-0">
            {!editing ? (
              <button
                onClick={() => { setDraft(user.allowed_sections); setEditing(true) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-300 border border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                Edit access
              </button>
            ) : null}
            <button
              onClick={() => { setPwOpen((v) => !v); setConfirmDelete(false) }}
              title="Reset password"
              className="p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
            </button>
            {!isSelf && (
              <button
                onClick={() => { setConfirmDelete((v) => !v); setPwOpen(false) }}
                title="Delete user"
                className="p-2 rounded-lg text-surface-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Edit sections panel */}
      {editing && !user.is_admin && (
        <div className="mt-4 p-4 rounded-lg bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700">
          <div className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Section access</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {sections.map((s) => (
              <SectionChip key={s.key} label={s.label} active={draft.includes(s.key)} onClick={() => toggle(s.key)} />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700">
              Cancel
            </button>
            <button onClick={saveSections} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Reset password panel */}
      {pwOpen && !user.is_admin && (
        <div className="mt-4 p-4 rounded-lg bg-surface-50 dark:bg-surface-900/50 border border-surface-100 dark:border-surface-700">
          <div className="text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">New password for "{user.username}"</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="min 6 characters"
              className="flex-1 px-3 py-2 rounded-lg text-sm bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button onClick={resetPassword} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset'}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && !user.is_admin && !isSelf && (
        <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-red-700 dark:text-red-300">
              Delete "{user.username}"? This can't be undone.
            </span>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700">
                Cancel
              </button>
              <button onClick={remove} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
        active
          ? 'bg-primary-600 border-primary-600 text-white'
          : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-300 hover:border-primary-400'
      }`}
    >
      {active && <Check className="w-3.5 h-3.5" />}
      {label}
    </button>
  )
}

function sectionSummary(keys: SectionKey[], sections: SectionInfo[]): string {
  if (!keys || keys.length === 0) return 'No access'
  const labels = keys.map((k) => sections.find((s) => s.key === k)?.label ?? k)
  return labels.join(' · ')
}

function getErrorDetail(err: unknown): string | null {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { detail?: string } } }).response
    return resp?.data?.detail ?? null
  }
  return null
}
