import { format, parseISO, differenceInCalendarDays, addDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { ISODate } from '@/types'

export const vnd = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)

export const num = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n))

export const pct = (n: number) => `${Math.round(n)}%`

export const today = (): ISODate => format(new Date(), 'yyyy-MM-dd')

export const toISODate = (d: Date): ISODate => format(d, 'yyyy-MM-dd')

export const fmtDate = (d: ISODate | string | undefined, f = 'dd/MM/yyyy') =>
  d ? format(d.length > 10 ? new Date(d) : parseISO(d), f, { locale: vi }) : ''

export const fmtDateTime = (d: string | undefined) => (d ? format(new Date(d), 'dd/MM HH:mm', { locale: vi }) : '')

export const fmtWeekday = (d: ISODate) => format(parseISO(d), 'EEEEEE', { locale: vi })

export const nights = (checkIn: ISODate, checkOut: ISODate) =>
  Math.max(1, differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn)))

export const addDaysISO = (d: ISODate, n: number): ISODate => toISODate(addDays(parseISO(d), n))

export const eachNight = (checkIn: ISODate, checkOut: ISODate): ISODate[] => {
  const out: ISODate[] = []
  for (let i = 0; i < nights(checkIn, checkOut); i++) out.push(addDaysISO(checkIn, i))
  return out
}

/** true nếu hai khoảng [a1,a2) và [b1,b2) chồng nhau */
export const overlaps = (a1: ISODate, a2: ISODate, b1: ISODate, b2: ISODate) => a1 < b2 && b1 < a2

export const isWeekend = (d: ISODate) => {
  const day = parseISO(d).getDay()
  return day === 5 || day === 6
}
