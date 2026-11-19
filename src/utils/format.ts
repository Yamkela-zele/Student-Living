export const fmtMoney = (value: unknown) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(Number(value || 0)).replace('ZAR', 'R')
export const fmtDate = (value: unknown) => value ? new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(new Date(String(value))) : '—'
export const label = (value: unknown) => String(value || '').toLowerCase().replace(/_/g, ' ').replace(/^\w/, (letter: string) => letter.toUpperCase())
