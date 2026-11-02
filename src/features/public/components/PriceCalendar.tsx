import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addMonths, format, startOfMonth, endOfMonth, parseISO, getDay } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useStore } from '@/store'
import { cx } from '@/components/ui'
import { today, toISODate, addDaysISO } from '@/lib/format'
import { calendarMap } from '../actions'

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const short = (n: number) => (n >= 1000000 ? `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 2).replace(/0+$/, '').replace(/\.$/, '')}tr` : `${Math.round(n / 1000)}k`)

/**
 * Lịch 2 tháng: mỗi ngày hiện giá/đêm (gói giá web) và mờ khi hết phòng.
 * Chọn ngày đến rồi ngày đi (click 2 lần).
 */
export function PriceCalendar({ roomTypeId, from, to, onChange }: { roomTypeId: string; from: string; to: string; onChange: (from: string, to: string) => void }) {
  const [base, setBase] = useState(() => startOfMonth(parseISO(from < today() ? today() : from)))
  const [picking, setPicking] = useState<string | undefined>()
  const [hover, setHover] = useState<string | undefined>()
  const rooms = useStore((s) => s.rooms)
  const bookings = useStore((s) => s.bookings)
  const ratePlans = useStore((s) => s.ratePlans)

  const months = [base, addMonths(base, 1)]
  const rangeStart = toISODate(months[0])
  const rangeEnd = addDaysISO(toISODate(endOfMonth(months[1])), 1)
  const map = useMemo(() => calendarMap({ rooms, bookings, ratePlans }, roomTypeId, rangeStart, rangeEnd), [rooms, bookings, ratePlans, roomTypeId, rangeStart, rangeEnd])

  const click = (d: string) => {
    if (!picking) { setPicking(d); return }
    if (d <= picking) { setPicking(d); return }
    // mọi đêm trong khoảng phải còn phòng
    let cur = picking
    while (cur < d) { if ((map.get(cur)?.available ?? 0) <= 0) { setPicking(d); return } cur = addDaysISO(cur, 1) }
    onChange(picking, d)
    setPicking(undefined)
  }
  const selFrom = picking ?? from
  const selTo = picking ? (hover && hover > picking ? hover : picking) : to
  const inRange = (d: string) => d >= selFrom && d < selTo

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setBase(addMonths(base, -1))} disabled={toISODate(base) <= today().slice(0, 7) + '-01'} className="rounded p-1 hover:bg-stone-100 disabled:opacity-30" aria-label="Tháng trước"><ChevronLeft size={18} /></button>
        <span className="text-sm text-stone-600">{picking ? `Chọn ngày đi (đến ${format(parseISO(picking), 'dd/MM')})` : 'Bấm ngày đến, rồi ngày đi'}</span>
        <button type="button" onClick={() => setBase(addMonths(base, 1))} className="rounded p-1 hover:bg-stone-100" aria-label="Tháng sau"><ChevronRight size={18} /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {months.map((m) => {
          const first = startOfMonth(m)
          const pad = (getDay(first) + 6) % 7
          const days: string[] = []
          for (let d = first; d <= endOfMonth(m); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days.push(toISODate(d))
          return (
            <div key={toISODate(m)}>
              <div className="mb-1 text-center text-sm font-semibold capitalize">{format(m, 'MMMM yyyy', { locale: vi })}</div>
              <div className="grid grid-cols-7 text-center text-[11px] text-stone-500">{WD.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
              <div className="grid grid-cols-7 gap-px">
                {Array.from({ length: pad }).map((_, i) => <div key={'p' + i} />)}
                {days.map((d) => {
                  const info = map.get(d)
                  const past = d < today()
                  const soldOut = !past && (info?.available ?? 0) <= 0
                  const disabled = past || (soldOut && !(picking && d > picking))
                  const sel = inRange(d)
                  return (
                    <button
                      key={d} type="button" disabled={disabled} onClick={() => click(d)} onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(undefined)}
                      aria-label={`${format(parseISO(d), 'dd/MM')}${soldOut ? ', hết phòng' : info ? `, ${info.price.toLocaleString('vi-VN')}đ` : ''}`}
                      className={cx('flex h-11 flex-col items-center justify-center rounded text-xs leading-tight', disabled ? 'cursor-not-allowed text-stone-300' : 'hover:bg-sand', sel && 'bg-sea text-white hover:bg-sea-dark', d === selFrom && 'rounded-l', soldOut && !past && 'line-through')}
                    >
                      <span className="font-medium">{d.slice(8)}</span>
                      {!past && info && <span className={cx('tnum text-[10px]', sel ? 'text-white/80' : soldOut ? 'text-stone-300' : 'text-stone-500')}>{soldOut ? 'hết' : short(info.price)}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-stone-500"><span><span className="mr-1 inline-block h-3 w-3 rounded bg-sea align-middle" />Ngày đã chọn</span><span><span className="mr-1 inline-block h-3 w-3 rounded bg-stone-200 align-middle" />Mờ: hết phòng / quá khứ</span></div>
    </div>
  )
}
