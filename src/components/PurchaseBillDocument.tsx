import { useState } from 'react'
import { COMPANY } from '@/lib/company'
import type { PurchaseBill } from '@/lib/api'

// Pixel-styled printable PURCHASE BILL matching the reference PDF. Orange accent,
// GST table (CGST/SGST), vendor + ship-to, totals with amount in words.

const ORANGE = '#e8712a'

function fmt(n: string | number | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : (n ?? 0)
  if (isNaN(v as number)) return '0.00'
  return (v as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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

export default function PurchaseBillDocument({ bill }: { bill: PurchaseBill }) {
  // Ship To defaults to our own company (we receive the goods).
  const shipName = bill.ship_to_name || COMPANY.name
  const shipAddr = bill.ship_to_address || COMPANY.address

  return (
    <div className="invoice-doc" style={styles.page}>
      {/* ===== Header ===== */}
      <div style={styles.headerRow}>
        <div style={{ flex: 1.1, display: 'flex', alignItems: 'center' }}>
          <LogoBlock />
        </div>
        <div style={{ textAlign: 'center', flex: 1.2 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}>PURCHASE BILL</div>
        </div>
        <div style={{ textAlign: 'right', flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{bill.bill_number}</div>
        </div>
      </div>

      {/* ===== Company + Amount Due ===== */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
        <div style={{ width: 340, flexShrink: 0, fontSize: 9.5, color: '#374151', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, fontSize: 12, color: '#111827', marginBottom: 3 }}>{COMPANY.name}</div>
          <div>{COMPANY.address}</div>
          <div>{COMPANY.phone}</div>
          <div>{COMPANY.email}</div>
          <div><strong>GSTIN:</strong> {COMPANY.gstin}</div>
          <div><strong>Website:</strong> {COMPANY.website}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.amountBar}>
            <span>Amount Due:</span>
            <span>INR {fmt(bill.grand_total)}</span>
          </div>
          <table style={{ width: '100%', fontSize: 10, marginTop: 8, color: '#374151' }}>
            <tbody>
              <tr><td style={styles.metaLabel}>Issue Date:</td><td style={styles.metaVal}>{fmtDate(bill.issue_date)}</td></tr>
              <tr><td style={styles.metaLabel}>Due Date:</td><td style={styles.metaVal}>{fmtDate(bill.due_date)}</td></tr>
              {bill.vendor_invoice_number && (
                <tr><td style={styles.metaLabel}>Invoice Number:</td><td style={styles.metaVal}>{bill.vendor_invoice_number}</td></tr>
              )}
              <tr><td style={styles.metaLabel}>Place of Supply:</td><td style={styles.metaVal}>{bill.place_of_supply || '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Vendor / Ship To ===== */}
      <div style={{ display: 'flex', gap: 24, marginTop: 18, fontSize: 9.5, color: '#374151', lineHeight: 1.5 }}>
        <div style={{ flex: 1 }}>
          <div style={styles.sectionLabel}>Vendor</div>
          <div style={{ fontWeight: 700, fontSize: 11, color: '#111827' }}>{bill.vendor_name}</div>
          {bill.vendor_phone && <div>{bill.vendor_phone}</div>}
          {bill.vendor_address && <div>{bill.vendor_address}</div>}
          {bill.vendor_gstin && <div><strong>GSTIN:</strong> {bill.vendor_gstin}{bill.vendor_pan ? <>&nbsp;&nbsp;<strong>PAN:</strong> {bill.vendor_pan}</> : null}</div>}
          {!bill.vendor_gstin && bill.vendor_pan && <div><strong>PAN:</strong> {bill.vendor_pan}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.sectionLabel}>Ship To</div>
          <div style={{ fontWeight: 700, color: '#111827' }}>{shipName}</div>
          {shipAddr && <div>{shipAddr}</div>}
        </div>
      </div>

      {/* ===== Items table ===== */}
      <table style={styles.itemTable}>
        <thead>
          <tr style={{ background: ORANGE, color: '#fff' }}>
            <th style={{ ...styles.th, width: 34, textAlign: 'left' }}>S.No</th>
            <th style={{ ...styles.th, textAlign: 'left' }}>Item<br />Description</th>
            <th style={{ ...styles.th, width: 62, textAlign: 'left' }}>HSN/SAC</th>
            <th style={{ ...styles.th, width: 44, textAlign: 'right' }}>Qty<br />UoM</th>
            <th style={{ ...styles.th, width: 62, textAlign: 'right' }}>Price<br />(INR)</th>
            <th style={{ ...styles.th, width: 72, textAlign: 'right' }}>Taxable Value<br />(INR)</th>
            <th style={{ ...styles.th, width: 56, textAlign: 'right' }}>CGST<br />(INR)</th>
            <th style={{ ...styles.th, width: 56, textAlign: 'right' }}>SGST<br />(INR)</th>
            <th style={{ ...styles.th, width: 66, textAlign: 'right' }}>Amount<br />(INR)</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item, idx) => (
            <tr key={item.id ?? idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>{idx + 1}</td>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{item.description}</div>
                {item.sub_description && (
                  <div style={{ fontSize: 8.5, color: '#4b5563', whiteSpace: 'pre-line', marginTop: 1 }}>{item.sub_description}</div>
                )}
              </td>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>{item.hsn_sac || ''}</td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>
                {fmtQty(item.quantity)}{item.uom ? <div style={{ fontSize: 8, color: '#6b7280' }}>{item.uom}</div> : null}
              </td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>{fmt(item.unit_price)}</td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>{fmt(item.taxable_value)}</td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>
                {fmt(item.cgst_amount)}<div style={{ fontSize: 8, color: '#6b7280' }}>{fmtQty(item.half_gst_rate)}%</div>
              </td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>
                {fmt(item.sgst_amount)}<div style={{ fontSize: 8, color: '#6b7280' }}>{fmtQty(item.half_gst_rate)}%</div>
              </td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top', fontWeight: 600 }}>{fmt(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #d1d5db', fontWeight: 700 }}>
            <td style={styles.td} colSpan={4}></td>
            <td style={{ ...styles.td, textAlign: 'right' }}>Total</td>
            <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(bill.taxable_total)}</td>
            <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(bill.cgst_total)}</td>
            <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(bill.sgst_total)}</td>
            <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(bill.grand_total_raw)}</td>
          </tr>
        </tfoot>
      </table>

      {/* ===== Totals ===== */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <table style={{ fontSize: 10, color: '#374151' }}>
          <tbody>
            <tr>
              <td style={styles.totLabel}>Total Taxable Value</td>
              <td style={styles.totVal}>INR {fmt(bill.taxable_total)}</td>
            </tr>
            {parseFloat(bill.rounded_off) !== 0 && (
              <tr>
                <td style={styles.totLabel}>Rounded Off</td>
                <td style={styles.totVal}>
                  {parseFloat(bill.rounded_off) < 0 ? '(-) ' : '(+) '}INR {fmt(Math.abs(parseFloat(bill.rounded_off)))}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ ...styles.totLabel, fontWeight: 700, color: '#111827' }}>Total Value (in figure)</td>
              <td style={{ ...styles.totVal, fontWeight: 700, color: '#111827' }}>INR {fmt(bill.grand_total).replace(/\.00$/, '')}</td>
            </tr>
            <tr>
              <td style={styles.totLabel}>Total Value (in words)</td>
              <td style={{ ...styles.totVal, fontWeight: 700 }}>INR {bill.amount_in_words} Only</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== Terms + signature ===== */}
      <div style={{ marginTop: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 9, color: '#6b7280', maxWidth: '55%' }}>
          {bill.terms && (
            <>
              <div style={{ fontWeight: 700, color: '#374151', marginBottom: 2 }}>Terms &amp; Conditions</div>
              <div style={{ whiteSpace: 'pre-line' }}>{bill.terms}</div>
            </>
          )}
        </div>
        <div style={{ textAlign: 'center', fontSize: 9.5, color: '#374151' }}>
          <div style={{ height: 64, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <StampBlock />
          </div>
          <div style={{ borderTop: '1px solid #9ca3af', width: 170, marginTop: 4, paddingTop: 4 }}>Provider Signature</div>
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
    background: ORANGE, color: '#fff', padding: '8px 12px', borderRadius: 3,
    display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12,
  },
  metaLabel: { textAlign: 'right', paddingRight: 10, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' },
  metaVal: { textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' },
  sectionLabel: { fontWeight: 700, color: '#374151', marginBottom: 2 },
  itemTable: { width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 9 },
  th: { padding: '6px 5px', fontSize: 8.5, fontWeight: 700, verticalAlign: 'top' },
  td: { padding: '6px 5px', color: '#374151' },
  totLabel: { textAlign: 'right', paddingRight: 20, paddingTop: 3, paddingBottom: 3, fontWeight: 600 },
  totVal: { textAlign: 'right', paddingTop: 3, paddingBottom: 3, minWidth: 150 },
}
