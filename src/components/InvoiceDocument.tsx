import { COMPANY } from '@/lib/company'
import type { Invoice } from '@/lib/api'

// Pixel-styled printable invoice matching the reference TAX INVOICE / BILL OF
// SUPPLY layout. All styling is inline / scoped so it prints identically
// regardless of the app theme. A4 width, orange accent (#e8712a).

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

export default function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const isTax = invoice.resolved_doc_type === 'tax_invoice'
  const title = isTax ? 'TAX INVOICE' : 'BILL OF SUPPLY'
  const shipName = invoice.ship_to_name || invoice.customer_name
  const shipAddr = invoice.ship_to_address || invoice.customer_address

  return (
    <div className="invoice-doc" style={styles.page}>
      {/* ===== Header ===== */}
      <div style={styles.headerRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={styles.logoBox}>RT</div>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#1f2937', lineHeight: 1.15 }}>
            RENDERWAYS<br />TECHNOLOGY<br /><span style={{ fontSize: 9, letterSpacing: 2 }}>PVT LTD</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#374151', letterSpacing: 0.5 }}>{title}</div>
        </div>
        <div style={{ textAlign: 'right', flex: 1 }}>
          <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Original Copy</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: ORANGE }}>{invoice.invoice_number}</div>
        </div>
      </div>

      {/* ===== Company + Amount Due ===== */}
      <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
        <div style={{ flex: 1.4, fontSize: 9.5, color: '#374151', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 800, fontSize: 12, color: '#111827', marginBottom: 3 }}>{COMPANY.name}</div>
          <div>{COMPANY.address}</div>
          <div>{COMPANY.phone}</div>
          <div>{COMPANY.email}</div>
          <div><strong>GSTIN:</strong> {COMPANY.gstin} &nbsp; <strong>Website:</strong> {COMPANY.website}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.amountBar}>
            <span>Amount Due:</span>
            <span>₹{fmt(invoice.grand_total)}</span>
          </div>
          <table style={{ width: '100%', fontSize: 10, marginTop: 8, color: '#374151' }}>
            <tbody>
              <tr><td style={styles.metaLabel}>Issue Date:</td><td style={styles.metaVal}>{fmtDate(invoice.issue_date)}</td></tr>
              <tr><td style={styles.metaLabel}>Due Date:</td><td style={styles.metaVal}>{fmtDate(invoice.due_date)}</td></tr>
              <tr><td style={styles.metaLabel}>Place of Supply:</td><td style={styles.metaVal}>{invoice.place_of_supply || '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Bill To / Ship To ===== */}
      <div style={{ display: 'flex', gap: 24, marginTop: 16, fontSize: 9.5, color: '#374151', lineHeight: 1.5 }}>
        <div style={{ flex: 1 }}>
          <div style={styles.sectionLabel}>Bill To</div>
          <div style={{ fontWeight: 800, fontSize: 11, color: '#111827' }}>{invoice.customer_name}</div>
          {invoice.customer_phone && <div>{invoice.customer_phone}</div>}
          {invoice.customer_address && <div>{invoice.customer_address}</div>}
          {invoice.customer_gstin && <div><strong>GSTIN:</strong> {invoice.customer_gstin}</div>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={styles.sectionLabel}>Ship To</div>
          <div style={{ fontWeight: 700 }}>{shipName}</div>
          {invoice.customer_phone && <div>{invoice.customer_phone}</div>}
          {shipAddr && <div>{shipAddr}</div>}
        </div>
      </div>

      {/* ===== Items table ===== */}
      <table style={styles.itemTable}>
        <thead>
          <tr style={{ background: ORANGE, color: '#fff' }}>
            <th style={{ ...styles.th, width: 32, textAlign: 'left' }}>S.No</th>
            <th style={{ ...styles.th, textAlign: 'left' }}>Item<br />Description</th>
            <th style={{ ...styles.th, width: 60 }}>HSN/SAC</th>
            <th style={{ ...styles.th, width: 46, textAlign: 'right' }}>Qty<br />UoM</th>
            <th style={{ ...styles.th, width: 64, textAlign: 'right' }}>Price<br />(₹)</th>
            {isTax && <th style={{ ...styles.th, width: 74, textAlign: 'right' }}>Taxable Value<br />(₹)</th>}
            {isTax && <th style={{ ...styles.th, width: 58, textAlign: 'right' }}>CGST<br />(₹)</th>}
            {isTax && <th style={{ ...styles.th, width: 58, textAlign: 'right' }}>SGST<br />(₹)</th>}
            <th style={{ ...styles.th, width: 70, textAlign: 'right' }}>Amount<br />(₹)</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, idx) => (
            <tr key={item.id ?? idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>{idx + 1}</td>
              <td style={{ ...styles.td, textAlign: 'left', verticalAlign: 'top' }}>
                <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{item.description}</div>
                {item.sub_description && (
                  <div style={{ fontSize: 8.5, color: '#6b7280', whiteSpace: 'pre-line', marginTop: 1 }}>{item.sub_description}</div>
                )}
              </td>
              <td style={{ ...styles.td, textAlign: 'center', verticalAlign: 'top' }}>{item.hsn_sac || ''}</td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>
                {fmtQty(item.quantity)}{item.uom ? <div style={{ fontSize: 8, color: '#6b7280' }}>{item.uom}</div> : null}
              </td>
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>{fmt(item.unit_price)}</td>
              {isTax && <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>{fmt(item.taxable_value)}</td>}
              {isTax && (
                <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>
                  {fmt(item.cgst_amount)}<div style={{ fontSize: 8, color: '#6b7280' }}>{fmtQty(item.half_gst_rate)}%</div>
                </td>
              )}
              {isTax && (
                <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top' }}>
                  {fmt(item.sgst_amount)}<div style={{ fontSize: 8, color: '#6b7280' }}>{fmtQty(item.half_gst_rate)}%</div>
                </td>
              )}
              <td style={{ ...styles.td, textAlign: 'right', verticalAlign: 'top', fontWeight: 600 }}>{fmt(item.line_total)}</td>
            </tr>
          ))}
        </tbody>
        {isTax && (
          <tfoot>
            <tr style={{ borderTop: '2px solid #d1d5db', fontWeight: 700 }}>
              <td style={styles.td} colSpan={4}></td>
              <td style={{ ...styles.td, textAlign: 'right' }}>Total @18%</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(invoice.taxable_total)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(invoice.cgst_total)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(invoice.sgst_total)}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>{fmt(invoice.grand_total_raw)}</td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* ===== Totals ===== */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
        <table style={{ fontSize: 10, color: '#374151' }}>
          <tbody>
            <tr>
              <td style={styles.totLabel}>Total Taxable Value</td>
              <td style={styles.totVal}>₹{fmt(invoice.taxable_total)}</td>
            </tr>
            {parseFloat(invoice.rounded_off) !== 0 && (
              <tr>
                <td style={styles.totLabel}>Rounded Off</td>
                <td style={styles.totVal}>
                  {parseFloat(invoice.rounded_off) < 0 ? '(-) ' : '(+) '}₹{fmt(Math.abs(parseFloat(invoice.rounded_off)))}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ ...styles.totLabel, fontWeight: 800, color: '#111827' }}>Total Value (in figure)</td>
              <td style={{ ...styles.totVal, fontWeight: 800, color: '#111827' }}>₹{fmt(invoice.grand_total).replace(/\.00$/, '')}</td>
            </tr>
            <tr>
              <td style={styles.totLabel}>Total Value (in words)</td>
              <td style={{ ...styles.totVal, fontWeight: 700 }}>₹ {invoice.amount_in_words} Only</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== Terms + Signatures ===== */}
      <div style={{ marginTop: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 9, color: '#6b7280', maxWidth: '55%' }}>
          {invoice.terms && (
            <>
              <div style={{ fontWeight: 700, color: '#374151', marginBottom: 2 }}>Terms &amp; Conditions</div>
              <div style={{ whiteSpace: 'pre-line' }}>{invoice.terms}</div>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 40, textAlign: 'center', fontSize: 9.5, color: '#374151' }}>
          <div>
            <div style={{ borderTop: '1px solid #9ca3af', width: 130, marginBottom: 4, paddingTop: 24 }} />
            Provider Signature
          </div>
          <div>
            <div style={{ borderTop: '1px solid #9ca3af', width: 130, marginBottom: 4, paddingTop: 24 }} />
            Receiver Signature
          </div>
        </div>
      </div>
    </div>
  )
}

function fmtQty(q: string | number | undefined): string {
  const v = typeof q === 'string' ? parseFloat(q) : (q ?? 0)
  if (isNaN(v)) return '0'
  return Number.isInteger(v) ? String(v) : v.toString()
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: '210mm',
    minHeight: '297mm',
    padding: '14mm 12mm',
    background: '#fff',
    color: '#111827',
    fontFamily: 'Arial, Helvetica, sans-serif',
    boxSizing: 'border-box',
    margin: '0 auto',
  },
  headerRow: { display: 'flex', alignItems: 'flex-start', borderBottom: '1px solid #e5e7eb', paddingBottom: 10 },
  logoBox: {
    width: 38, height: 38, borderRadius: 8, background: ORANGE, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15,
  },
  amountBar: {
    background: ORANGE, color: '#fff', padding: '8px 12px', borderRadius: 3,
    display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12,
  },
  metaLabel: { textAlign: 'right', paddingRight: 10, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' },
  metaVal: { textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' },
  sectionLabel: { fontWeight: 700, color: '#374151', marginBottom: 2 },
  itemTable: { width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 9.5 },
  th: { padding: '6px 6px', fontSize: 9, fontWeight: 700, verticalAlign: 'top' },
  td: { padding: '6px 6px', color: '#374151' },
  totLabel: { textAlign: 'right', paddingRight: 20, paddingTop: 3, paddingBottom: 3, fontWeight: 600 },
  totVal: { textAlign: 'right', paddingTop: 3, paddingBottom: 3, minWidth: 130 },
}
