import { useState } from 'react'
import { COMPANY } from '@/lib/company'
import type { PaymentReceipt } from '@/lib/api'

// Pixel-styled printable PAYMENT RECEIPT matching the reference PDF. Dark-teal
// accent, "Receipt To", payment date/method, document lines (no GST).

const TEAL = '#316b73'

function fmt(n: string | number | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  if (isNaN(v as number)) return '0.00'
  return (v as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day} - ${m} - ${y}`
}

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

export default function PaymentReceiptDocument({ receipt }: { receipt: PaymentReceipt }) {
  return (
    <div className="invoice-doc" style={styles.page}>
      {/* ===== Header ===== */}
      <div style={styles.headerRow}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <LogoBlock />
        </div>
        <div style={{ textAlign: 'right', flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>PAYMENT RECEIPT</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{receipt.receipt_number}</span>
        </div>
      </div>

      {/* ===== Company + Receipt To + Amount Received ===== */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <div style={{ width: 250, flexShrink: 0, fontSize: 9.5, color: '#374151', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#111827', marginBottom: 3 }}>{COMPANY.name}</div>
          <div>{COMPANY.address}</div>
          <div>{COMPANY.phone}</div>
          <div>{COMPANY.email}</div>
          <div><strong>GSTIN:</strong> {COMPANY.gstin}</div>
        </div>
        <div style={{ width: 220, flexShrink: 0, fontSize: 9.5, color: '#374151', lineHeight: 1.5 }}>
          <div style={styles.sectionLabel}>Receipt To</div>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#111827' }}>{receipt.receipt_to_name}</div>
          {receipt.receipt_to_address && <div>{receipt.receipt_to_address}</div>}
          {receipt.receipt_to_phone && <div>{receipt.receipt_to_phone}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.amountBar}>
            <span>Amount Received:</span>
            <span>₹ {fmt(receipt.amount_received)}</span>
          </div>
          <table style={{ width: '100%', fontSize: 10, marginTop: 8, color: '#374151' }}>
            <tbody>
              <tr><td style={styles.metaLabel}>Payment Date:</td><td style={styles.metaVal}>{fmtDate(receipt.payment_date)}</td></tr>
              <tr><td style={styles.metaLabel}>Payment Method:</td><td style={styles.metaVal}>{receipt.payment_method || '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Document lines table ===== */}
      <table style={styles.itemTable}>
        <thead>
          <tr style={{ background: TEAL, color: '#fff' }}>
            <th style={{ ...styles.th, width: 40, textAlign: 'left' }}>S.No</th>
            <th style={{ ...styles.th, textAlign: 'left' }}>Document Number</th>
            <th style={{ ...styles.th, width: 120, textAlign: 'right' }}>Document Date</th>
            <th style={{ ...styles.th, width: 150, textAlign: 'right' }}>Document Amount (₹)</th>
            <th style={{ ...styles.th, width: 150, textAlign: 'right' }}>Payment Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((line, idx) => (
            <tr key={line.id ?? idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>{idx + 1}</td>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>{line.document_number || ''}</td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>{fmtDate(line.document_date)}</td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>{fmt(line.document_amount)}</td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top', fontWeight: 600 }}>{fmt(line.payment_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== Signatures ===== */}
      <div style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end', gap: 40, textAlign: 'center', fontSize: 9.5, color: '#374151' }}>
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
  headerRow: { display: 'flex', alignItems: 'center', borderBottom: '1px solid #e5e7eb', paddingBottom: 10 },
  amountBar: {
    background: TEAL, color: '#fff', padding: '8px 12px', borderRadius: 3,
    display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12,
  },
  metaLabel: { textAlign: 'left', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' },
  metaVal: { textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' },
  sectionLabel: { fontWeight: 700, color: '#374151', marginBottom: 2 },
  itemTable: { width: '100%', borderCollapse: 'collapse', marginTop: 20, fontSize: 9.5 },
  th: { padding: '9px 8px', fontSize: 9.5, fontWeight: 700, verticalAlign: 'top' },
  td: { padding: '9px 8px', color: '#374151' },
}
