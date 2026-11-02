import { format } from 'date-fns'

let counter = 0
export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`

export const bookingCode = (seq: number) => `TL-${format(new Date(), 'yyMMdd')}-${String(seq).padStart(4, '0')}`

export const invoiceNumber = (seq: number) => `1C26TTL-${String(seq).padStart(6, '0')}`

export const nowISO = () => new Date().toISOString()
