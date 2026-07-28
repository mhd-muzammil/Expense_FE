import { useState } from 'react'
import { COMPANY } from '@/lib/company'
import type { DeliveryChallan } from '@/lib/api'

// Pixel-styled printable Delivery Challan matching the reference PDF. A delivery
// challan carries NO amounts — only items and quantities. Navy table header.

const NAVY = '#3f5c78'

function fmtDate(d: string | null): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day} - ${m} - ${y}`
}

function fmtQty(q: string | number | undefined): string {
  const v = typeof q === 'string' ? parseFloat(q) : (q ?? 0)
  if (isNaN(v)) return '0'
  return Number.isInteger(v) ? String(v) : v.toString()
}

// Company logo image with a text fallback if the asset isn't present.
function LogoBlock() {
  const [imgOk, setImgOk] = useState(true)
  if (imgOk) {
    return (
      <img
        src={COMPANY.logo}
        alt="Renderways Technology"
        onError={() => setImgOk(false)}
        style={{ height: 60, width: 'auto', maxWidth: 240, objectFit: 'contain', mixBlendMode: 'multiply' }}
      />
    )
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: '#e11d74', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>R</div>
      <div style={{ fontWeight: 700, fontSize: 12, color: '#1f2937', lineHeight: 1.15 }}>
        RENDERWAYS<br />TECHNOLOGY<br /><span style={{ fontSize: 8, letterSpacing: 2 }}>PVT LTD</span>
      </div>
    </div>
  )
}

function StampBlock() {
  const [imgOk, setImgOk] = useState(true)
  if (!imgOk) return <div style={{ height: 60 }} />
  return (
    <img
      src={COMPANY.stamp}
      alt="Authorised Signatory"
      onError={() => setImgOk(false)}
      style={{ height: 62, width: 'auto', maxWidth: 200, objectFit: 'contain', mixBlendMode: 'multiply' }}
    />
  )
}

export default function DeliveryChallanDocument({ challan }: { challan: DeliveryChallan }) {
  const shipName = challan.ship_to_name || challan.customer_name
  const shipAddr = challan.ship_to_address || challan.customer_address

  return (
    <div className="invoice-doc" style={styles.page}>
      {/* ===== Header ===== */}
      <div style={styles.headerRow}>
        <div style={{ flex: 1.2, display: 'flex', alignItems: 'center' }}>
          <LogoBlock />
        </div>
        <div style={{ textAlign: 'center', flex: 1.4 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>DELIVERY CHALLAN</div>
        </div>
        <div style={{ textAlign: 'right', flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{challan.challan_number}</div>
        </div>
      </div>

      {/* ===== Company + meta ===== */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <div style={{ width: 340, flexShrink: 0, fontSize: 9.5, color: '#374151', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#111827', marginBottom: 3 }}>{COMPANY.name}</div>
          <div>{COMPANY.address}</div>
          <div>{COMPANY.phone}</div>
          <div>{COMPANY.email}</div>
          <div><strong>GSTIN:</strong> {COMPANY.gstin}</div>
          <div><strong>Website:</strong> {COMPANY.website}</div>
        </div>
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', fontSize: 10, color: '#374151' }}>
            <tbody>
              <tr><td style={styles.metaLabel}>Date:</td><td style={styles.metaVal}>{fmtDate(challan.challan_date)}</td></tr>
              <tr><td style={styles.metaLabel}>Shipping Date:</td><td style={styles.metaVal}>{fmtDate(challan.shipping_date)}</td></tr>
              <tr><td style={styles.metaLabel}>Place of Supply:</td><td style={styles.metaVal}>{challan.place_of_supply || '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Bill To / Ship To ===== */}
      <div style={{ display: 'flex', gap: 24, marginTop: 18, fontSize: 9.5, color: '#374151', lineHeight: 1.5 }}>
        <div style={{ flex: 1 }}>
          <div style={styles.sectionLabel}>Bill To</div>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#111827' }}>{challan.customer_name}</div>
          {challan.customer_phone && <div>{challan.customer_phone}</div>}
          {challan.customer_address && <div>{challan.customer_address}</div>}
          {challan.customer_gstin && <div><strong>GSTIN:</strong> {challan.customer_gstin}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.sectionLabel}>Ship To</div>
          <div style={{ fontWeight: 700 }}>{shipName}</div>
          {shipAddr && <div>{shipAddr}</div>}
        </div>
      </div>

      {/* ===== Items table (no amounts) ===== */}
      <table style={styles.itemTable}>
        <thead>
          <tr style={{ background: NAVY, color: '#fff' }}>
            <th style={{ ...styles.th, width: 44, textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.25)' }}>S.No</th>
            <th style={{ ...styles.th, textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.25)' }}>Item<br />Description</th>
            <th style={{ ...styles.th, width: 150, textAlign: 'left', borderRight: '1px solid rgba(255,255,255,0.25)' }}>HSN</th>
            <th style={{ ...styles.th, width: 74, textAlign: 'right' }}>Qty<br />UoM</th>
          </tr>
        </thead>
        <tbody>
          {challan.items.map((item, idx) => (
            <tr key={item.id ?? idx}>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>{idx + 1}</td>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{item.description}</div>
                {item.sub_description && (
                  <div style={{ fontSize: 8.5, color: '#4b5563', whiteSpace: 'pre-line', marginTop: 2 }}>{item.sub_description}</div>
                )}
              </td>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>{item.hsn_sac || ''}</td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>
                {fmtQty(item.quantity)}{item.uom ? <div style={{ fontSize: 8, color: '#6b7280' }}>{item.uom}</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== Footer: thanks + signatures ===== */}
      <div style={{ marginTop: 18, fontSize: 11, fontWeight: 700, color: '#111827' }}>Thanks For Support Us</div>
      {challan.terms && (
        <div style={{ marginTop: 10, fontSize: 9, color: '#6b7280', whiteSpace: 'pre-line', fontStyle: 'italic' }}>{challan.terms}</div>
      )}

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 40, textAlign: 'center', fontSize: 9.5, color: '#374151' }}>
        <div style={{ width: 170 }}>
          <div style={{ height: 64, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <StampBlock />
          </div>
          <div style={{ borderTop: '1px solid #9ca3af', marginTop: 4, paddingTop: 4 }}>Provider Signature</div>
        </div>
        <div style={{ width: 170 }}>
          <div style={{ height: 64 }} />
          <div style={{ borderTop: '1px solid #9ca3af', marginTop: 4, paddingTop: 4 }}>Receiver Signature</div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: '210mm',
    minHeight: '297mm',
    padding: '14mm 12mm',
    background: '#fff',
    color: '#1f2937',
    fontFamily: "'Roboto', Arial, Helvetica, sans-serif",
    boxSizing: 'border-box',
    margin: '0 auto',
  },
  headerRow: { display: 'flex', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: 12 },
  metaLabel: { textAlign: 'right', paddingRight: 10, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' },
  metaVal: { textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' },
  sectionLabel: { fontWeight: 700, color: '#374151', marginBottom: 2 },
  itemTable: { width: '100%', borderCollapse: 'collapse', marginTop: 18, fontSize: 9.5, border: '1px solid #cfd6de' },
  th: { padding: '9px 8px', fontSize: 9.5, fontWeight: 700, verticalAlign: 'top' },
  td: { padding: '9px 8px', color: '#374151', border: '1px solid #d5dae1' },
}
