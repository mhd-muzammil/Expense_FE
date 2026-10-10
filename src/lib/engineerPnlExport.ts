import type { EngineerPnlRow } from '@/lib/api'

/**
 * Builds the Engineer P&L board as an .xlsx and downloads it.
 *
 * Exports exactly the rows passed in — the page hands over what is on screen, so a
 * filtered board exports filtered and an unfiltered one exports in full. Kept in its
 * own module and loaded with import() so exceljs only downloads when Export is clicked.
 */
export async function exportEngineerPnl(opts: {
  rows: EngineerPnlRow[]
  facets: (r: EngineerPnlRow) => { locations: string[]; segments: string[] } | undefined
  from: string
  to: string
  days: number
  /** Human-readable filters in force, e.g. ["Work Location: SALEM"]; empty = full report. */
  filters: string[]
}) {
  const { rows, facets, from, to, days, filters } = opts
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Engineer P&L', { views: [{ state: 'frozen', ySplit: 5 }] })

  const num = (v: string | number | null | undefined) => {
    const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0)
    return isNaN(n) ? 0 : n
  }
  const daysLabel = days === 1 ? '1 day' : `${days} days`
  const cols = [
    { header: 'Engineer', width: 22 },
    { header: 'Work Location', width: 22 },
    { header: 'Segment', width: 24 },
    { header: 'Per Day Target', width: 10 },
    { header: 'Closed P/D', width: 10 },
    { header: 'Total Closed P/M', width: 12 },
    { header: 'Per Call Rate', width: 12, money: true },
    { header: 'Raw Data Rate', width: 12, money: true },
    { header: 'Engg Salary', width: 14, money: true },
    { header: 'Salary Source', width: 11 },
    { header: `Salary earned (${daysLabel})`, width: 14, money: true },
    { header: 'Total WD', width: 9 },
    { header: 'Actual WD', width: 9 },
    { header: 'WD Source', width: 10 },
    { header: 'Engg Earning', width: 14, money: true },
    { header: `Profit / Loss (${daysLabel})`, width: 16, money: true },
    { header: 'Raw Earning', width: 14, money: true },
    { header: `Raw P/L (${daysLabel})`, width: 16, money: true },
  ]
  const lastCol = cols.length

  ws.mergeCells(1, 1, 1, lastCol)
  ws.getCell(1, 1).value = 'Engineer P&L'
  ws.getCell(1, 1).font = { bold: true, size: 14 }
  ws.mergeCells(2, 1, 2, lastCol)
  ws.getCell(2, 1).value = `Period: ${from} to ${to} (${daysLabel})`
  ws.mergeCells(3, 1, 3, lastCol)
  ws.getCell(3, 1).value = filters.length ? `Filtered — ${filters.join(' · ')}` : 'Full report (no filters)'
  ws.getCell(3, 1).font = { italic: true, color: { argb: 'FF6B7280' } }

  const header = ws.getRow(5)
  cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width
    const cell = header.getCell(i + 1)
    cell.value = c.header
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
    cell.alignment = { vertical: 'middle', horizontal: i < 3 ? 'left' : 'center', wrapText: true }
  })
  header.height = 30

  const moneyFmt = '"₹"#,##,##0.00;[Red]-"₹"#,##,##0.00'
  rows.forEach((r, i) => {
    const f = facets(r)
    const row = ws.getRow(6 + i)
    row.values = [
      r.engineer_name,
      f?.locations.join(', ') || '',
      f?.segments.join(', ') || '',
      r.per_day_target,
      num(r.actual_closed_pd),
      r.total_calls_closed_pm,
      num(r.per_call_rate),
      num(r.raw_rate),
      num(r.engg_salary),
      r.salary_source === 'payroll' ? 'Payroll' : 'Manual',
      num(r.window_salary ?? r.per_day),
      r.total_working_days,
      r.actual_working_days,
      r.working_days_source === 'payroll' ? 'Payroll' : 'Manual',
      num(r.revenue),
      num(r.nett),
      num(r.raw_earning),
      num(r.raw_profit_loss),
    ]
    cols.forEach((c, j) => { if (c.money) row.getCell(j + 1).numFmt = moneyFmt })
  })

  // Totals are SUM formulas over the rows above, so an edit in Excel re-adds itself.
  const first = 6
  const last = 5 + rows.length
  const total = ws.getRow(last + 1)
  total.getCell(1).value = `Total (${rows.length})`
  if (rows.length) {
    for (const c of [6, 11, 15, 16, 17, 18]) {
      const L = ws.getColumn(c).letter
      total.getCell(c).value = { formula: `SUM(${L}${first}:${L}${last})` }
      if (cols[c - 1].money) total.getCell(c).numFmt = moneyFmt
    }
  }
  total.font = { bold: true }
  total.eachCell({ includeEmpty: true }, (cell) => {
    cell.border = { top: { style: 'thin' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }
  })

  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: Math.max(5, last), column: lastCol } }

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }))
  const a = document.createElement('a')
  a.href = url
  a.download = `engineer-pnl_${from}_to_${to}${filters.length ? '_filtered' : ''}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
