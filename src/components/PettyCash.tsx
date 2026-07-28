import { PettyCashDrawerSection } from '@/components/Dashboard'

// Petty Cash lives in its own tab now; the section component is shared from
// Dashboard (where it used to be embedded).
export default function PettyCash() {
  return (
    <div className="animate-fade-in">
      <PettyCashDrawerSection />
    </div>
  )
}
