import type { Customer } from './types'

export const csvHeaders = [
  'S.No',
  'Customer Name',
  'Sector',
  'POC',
  'Contact Number',
  'Beat No',
  'Area',
  'City',
  'Location',
  'Room Count',
  'Strength',
  'Branches',
  'Required Litres per month',
  'Current Purchase',
  'Remarks',
]

function safeCsvCell(value: string | number | null): string {
  const text = value == null ? '' : String(value)
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
  return `"${safeText.replaceAll('"', '""')}"`
}

export function createCustomersCsv(customers: Customer[]): string {
  const rows = customers.map((customer) => [
    customer.serial_number,
    customer.customer_name,
    customer.sector === 'Others' && customer.other_sector
      ? customer.other_sector
      : customer.sector,
    customer.poc_name,
    customer.contact_number,
    customer.beat_no,
    customer.area,
    customer.city,
    customer.location,
    customer.room_count,
    customer.strength,
    customer.branches,
    customer.required_litres_per_month,
    customer.current_purchase,
    customer.remarks,
  ])

  return `\uFEFF${[
    csvHeaders.join(','),
    ...rows.map((row) => row.map(safeCsvCell).join(',')),
  ]
    .join('\r\n')}\r\n`
}

export function downloadCustomersCsv(customers: Customer[]): void {
  const blob = new Blob([createCustomersCsv(customers)], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `VEDHAS_Tracker_Customers_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
