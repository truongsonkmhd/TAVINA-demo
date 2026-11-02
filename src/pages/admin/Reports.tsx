import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { differenceInCalendarDays, parseISO, startOfMonth } from 'date-fns'
import { useStore } from '@/store'
import { Button, Card, Field, Input, PageHeader, Table, Td, Stat, cx } from '@/components/ui'
import { vnd, num, pct, fmtDate, today, addDaysISO, toISODate, eachNight } from '@/lib/format'
import { CHANNEL_LABEL } from '@/lib/labels'
import type { Booking, Channel } from '@/types'
import { BarChart, HBars, Delta } from '@/features/backoffice/components/Charts'
import { downloadCsv, printHtml } from '@/features/backoffice/actions'

type Range = 'today' | '7d' | '30d' | 'month' | 'custom'

export default function Reports() {
  const s = useStore()
  const T = today()
  const [range, setRange] = useState<Range>('30d')
  const [custom, setCustom] = useState({ from: addDaysISO(T, -30), to: T })
  const [from, to] = range === 'today' ? [T, T] : range === '7d' ? [addDaysISO(T, -6), T] : range === '30d' ? [addDaysISO(T, -29), T] : range === 'month' ? [toISODate(startOfMonth(parseISO(T))), T] : [custom.from, custom.to]
  const days = Math.max(1, differenceInCalendarDays(parseISO(to), parseISO(from)) + 1)
  const tooLong = days > 731
  const prevTo = addDaysISO(from, -1), prevFrom = addDaysISO(from, -days)

  const calc = (f: string, t: string) => {
    const inR = (d: string) => d >= f && d <= t
    const valid = new Set(s.bookings.filter((b) => b.status === 'checked-in' || b.status === 'checked-out').map((b) => b.id))
    const lines = s.folioLines.filter((l) => valid.has(l.bookingId) && inR(l.date))
    const room = lines.filter((l) => l.type === 'room').reduce((x, l) => x + l.amount, 0)
    const minibar = lines.filter((l) => l.type === 'minibar').reduce((x, l) => x + l.amount, 0)
    const service = lines.filter((l) => l.type !== 'room' && l.type !== 'minibar').reduce((x, l) => x + l.amount, 0)
    const revenue = room + minibar + service
    const expense = s.expenses.filter((e) => inR(e.date)).reduce((x, e) => x + e.amount, 0) + s.stockMoves.filter((m) => m.type === 'in' && inR(m.date)).reduce((x, m) => x + m.qty * (m.unitCost ?? 0), 0)
    const roomNights = lines.filter((l) => l.type === 'room').length
    const nDays = differenceInCalendarDays(parseISO(t), parseISO(f)) + 1
    const oooNights = eachNight(f, addDaysISO(t, 1)).reduce((x, d) => x + s.rooms.filter((r) => r.status === 'ooo' && d >= T && (!r.oooUntil || d <= r.oooUntil)).length, 0)
    const available = s.rooms.length * nDays - oooNights
    return { lines, room, minibar, service, revenue, expense, profit: revenue - expense, roomNights, available, occ: available ? roomNights / available : 0, adr: roomNights ? room / roomNights : 0, revpar: available ? room / available : 0 }
  }
  const cur = useMemo(() => calc(from, to), [s.folioLines, s.bookings, s.expenses, s.stockMoves, s.rooms, from, to]) // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useMemo(() => calc(prevFrom, prevTo), [s.folioLines, s.bookings, s.expenses, s.stockMoves, s.rooms, prevFrom, prevTo]) // eslint-disable-line react-hooks/exhaustive-deps

  const bookingOf = (id: string) => s.bookings.find((b) => b.id === id)
  const daily = eachNight(from, addDaysISO(to, 1)).map((d) => ({ label: fmtDate(d, 'dd/MM'), value: cur.lines.filter((l) => l.date === d).reduce((x, l) => x + l.amount, 0) }))
  const byChannel = (Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => {
    const rev = cur.lines.filter((l) => bookingOf(l.bookingId)?.source === c).reduce((x, l) => x + l.amount, 0)
    const rate = s.channelConfigs.find((x) => x.channel === c)?.commissionPct ?? 0
    const bks = new Set(cur.lines.filter((l) => bookingOf(l.bookingId)?.source === c).map((l) => l.bookingId)).size
    return { c, rev, rate, commission: Math.round((rev * rate) / 100), bks }
  }).filter((r) => r.rev > 0)
  const byStaff = s.staff.map((st) => {
    const rev = cur.lines.filter((l) => bookingOf(l.bookingId)?.createdBy === st.id).reduce((x, l) => x + l.amount, 0)
    return { st, rev, commission: Math.round((rev * s.settings.staffCommissionPct) / 100) }
  }).filter((r) => r.rev > 0)
  const byType = s.roomTypes.map((rt) => {
    const lines = cur.lines.filter((l) => l.type === 'room' && bookingOf(l.bookingId)?.roomTypeId === rt.id)
    const count = s.rooms.filter((r) => r.roomTypeId === rt.id).length
    const rev = lines.reduce((x, l) => x + l.amount, 0)
    return { rt, sold: lines.length, avail: count * days, occ: count ? lines.length / (count * days) : 0, adr: lines.length ? rev / lines.length : 0, rev }
  })
  const created = s.bookings.filter((b: Booking) => b.checkIn >= from && b.checkIn <= to)
  const cancelled = created.filter((b) => b.status === 'cancelled').length
  const noshow = created.filter((b) => b.status === 'no-show').length
  const expenseByCat = Object.entries(s.expenses.filter((e) => e.date >= from && e.date <= to).reduce<Record<string, number>>((m, e) => ({ ...m, [e.category]: (m[e.category] ?? 0) + e.amount }), {}))

  const print = () => printHtml('Báo cáo', `<h1>Báo cáo ${s.settings.hotelName}</h1><div class="muted">${fmtDate(from)} – ${fmtDate(to)}</div>
    <h2>Tổng quan</h2><table><tr><th>Doanh thu</th><th>Chi phí</th><th>Lợi nhuận gộp</th><th>Công suất</th><th>ADR</th><th>RevPAR</th></tr>
    <tr><td class="r">${vnd(cur.revenue)}</td><td class="r">${vnd(cur.expense)}</td><td class="r">${vnd(cur.profit)}</td><td class="r">${pct(cur.occ * 100)}</td><td class="r">${vnd(cur.adr)}</td><td class="r">${vnd(cur.revpar)}</td></tr></table>
    <h2>Theo kênh</h2><table><tr><th>Kênh</th><th>Booking</th><th>Doanh thu</th><th>Hoa hồng</th></tr>${byChannel.map((r) => `<tr><td>${CHANNEL_LABEL[r.c]}</td><td class="r">${r.bks}</td><td class="r">${vnd(r.rev)}</td><td class="r">${vnd(r.commission)}</td></tr>`).join('')}</table>
    <h2>Theo hạng phòng</h2><table><tr><th>Hạng</th><th>Phòng-đêm bán</th><th>Công suất</th><th>ADR</th><th>Doanh thu</th></tr>${byType.map((r) => `<tr><td>${r.rt.name}</td><td class="r">${r.sold}</td><td class="r">${pct(r.occ * 100)}</td><td class="r">${vnd(r.adr)}</td><td class="r">${vnd(r.rev)}</td></tr>`).join('')}</table>`)

  return (
    <div>
      <PageHeader title="Báo cáo" subtitle="Doanh thu, chi phí, lợi nhuận, hoa hồng, công suất, ADR, RevPAR — số liệu từ folio đã ghi nhận" actions={<Button tone="secondary" onClick={print}><Printer size={16} /> In báo cáo</Button>} />
      <Card>
        <div className="flex flex-wrap items-end gap-2">
          {([['today', 'Hôm nay'], ['7d', '7 ngày'], ['30d', '30 ngày'], ['month', 'Tháng này'], ['custom', 'Tuỳ chọn']] as [Range, string][]).map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} className={cx('rounded-md px-3 py-2 text-sm font-medium', range === k ? 'bg-sea text-white' : 'bg-stone-100 hover:bg-stone-200')}>{l}</button>
          ))}
          {range === 'custom' && <><Field label="Từ"><Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></Field><Field label="Đến"><Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></Field></>}
          <span className="ml-auto pb-2 text-sm text-stone-500">{fmtDate(from)} – {fmtDate(to)} · so với {fmtDate(prevFrom)} – {fmtDate(prevTo)}</span>
        </div>
      </Card>

      {tooLong ? <Card className="mt-4"><p className="text-sm text-red-700">Khoảng thời gian dài hơn 24 tháng — hãy thu hẹp để xem nhanh.</p></Card> : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Doanh thu" value={vnd(cur.revenue)} sub={<Delta cur={cur.revenue} prev={prev.revenue} />} />
            <Stat label="Chi phí" value={vnd(cur.expense)} sub={<Delta cur={cur.expense} prev={prev.expense} invert />} />
            <Stat label="Lợi nhuận gộp" value={vnd(cur.profit)} tone={cur.profit < 0 ? 'err' : 'ok'} sub={<Delta cur={cur.profit} prev={prev.profit} />} />
            <Stat label="Huỷ / No-show" value={`${cancelled} / ${noshow}`} sub={`${created.length} booking có ngày đến trong kỳ`} />
            <Stat label="Công suất phòng" value={pct(cur.occ * 100)} sub={<Delta cur={cur.occ} prev={prev.occ} />} />
            <Stat label="ADR" value={vnd(cur.adr)} sub={<Delta cur={cur.adr} prev={prev.adr} />} />
            <Stat label="RevPAR" value={vnd(cur.revpar)} sub={<Delta cur={cur.revpar} prev={prev.revpar} />} />
            <Stat label="Phòng-đêm bán" value={`${num(cur.roomNights)} / ${num(cur.available)}`} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card title="Doanh thu theo ngày" actions={<Button size="sm" tone="ghost" onClick={() => downloadCsv(`doanh-thu-${from}-${to}.csv`, [['Ngày', 'Doanh thu'], ...daily.map((d) => [d.label, d.value])])}><Download size={14} /> CSV</Button>}>
              <BarChart data={daily} format={vnd} />
              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><div className="text-stone-500">Tiền phòng</div><div className="tnum font-semibold">{vnd(cur.room)}</div></div>
                <div><div className="text-stone-500">Dịch vụ & phụ thu</div><div className="tnum font-semibold">{vnd(cur.service)}</div></div>
                <div><div className="text-stone-500">Minibar</div><div className="tnum font-semibold">{vnd(cur.minibar)}</div></div>
              </div>
            </Card>
            <Card title="Chi phí theo nhóm">
              <HBars data={[...expenseByCat.map(([label, value]) => ({ label, value })), { label: 'Nhập kho', value: s.stockMoves.filter((m) => m.type === 'in' && m.date >= from && m.date <= to).reduce((x, m) => x + m.qty * (m.unitCost ?? 0), 0) }].filter((x) => x.value > 0).sort((a, b) => b.value - a.value)} format={vnd} />
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card title="Doanh thu & hoa hồng theo kênh" actions={<Button size="sm" tone="ghost" onClick={() => downloadCsv(`kenh-${from}-${to}.csv`, [['Kênh', 'Booking', 'Doanh thu', 'Hoa hồng %', 'Hoa hồng'], ...byChannel.map((r) => [CHANNEL_LABEL[r.c], r.bks, r.rev, r.rate, r.commission])])}><Download size={14} /> CSV</Button>}>
              <Table head={['Kênh', 'Booking', 'Doanh thu', 'HH %', 'Hoa hồng']}>
                {byChannel.map((r) => <tr key={r.c}><Td>{CHANNEL_LABEL[r.c]}</Td><Td className="tnum">{r.bks}</Td><Td className="tnum text-right">{vnd(r.rev)}</Td><Td className="tnum">{r.rate}%</Td><Td className="tnum text-right">{vnd(r.commission)}</Td></tr>)}
                <tr className="font-semibold"><Td>Tổng</Td><Td className="tnum">{byChannel.reduce((x, r) => x + r.bks, 0)}</Td><Td className="tnum text-right">{vnd(byChannel.reduce((x, r) => x + r.rev, 0))}</Td><Td /><Td className="tnum text-right">{vnd(byChannel.reduce((x, r) => x + r.commission, 0))}</Td></tr>
              </Table>
            </Card>
            <Card title="Công suất & ADR theo hạng phòng" actions={<Button size="sm" tone="ghost" onClick={() => downloadCsv(`hang-phong-${from}-${to}.csv`, [['Hạng', 'Phòng-đêm bán', 'Phòng-đêm có', 'Công suất', 'ADR', 'Doanh thu'], ...byType.map((r) => [r.rt.name, r.sold, r.avail, Math.round(r.occ * 100), Math.round(r.adr), r.rev])])}><Download size={14} /> CSV</Button>}>
              <Table head={['Hạng', 'Bán / có', 'Công suất', 'ADR', 'Doanh thu']}>
                {byType.map((r) => <tr key={r.rt.id}><Td>{r.rt.name}</Td><Td className="tnum">{r.sold}/{r.avail}</Td><Td className="tnum">{pct(r.occ * 100)}</Td><Td className="tnum text-right">{vnd(r.adr)}</Td><Td className="tnum text-right">{vnd(r.rev)}</Td></tr>)}
              </Table>
            </Card>
            <Card title={`Hoa hồng nhân viên (${s.settings.staffCommissionPct}%)`} actions={<Button size="sm" tone="ghost" onClick={() => downloadCsv(`hoa-hong-nv-${from}-${to}.csv`, [['Nhân viên', 'Doanh thu', 'Hoa hồng'], ...byStaff.map((r) => [r.st.name, r.rev, r.commission])])}><Download size={14} /> CSV</Button>}>
              {byStaff.length === 0 ? <p className="text-sm text-stone-500">Không có booking do nhân viên tạo trong kỳ.</p> : (
                <Table head={['Nhân viên', 'Doanh thu booking tạo', 'Hoa hồng']}>
                  {byStaff.map((r) => <tr key={r.st.id}><Td>{r.st.name}</Td><Td className="tnum text-right">{vnd(r.rev)}</Td><Td className="tnum text-right">{vnd(r.commission)}</Td></tr>)}
                </Table>
              )}
            </Card>
            <Card title="Nguồn booking (theo doanh thu)">
              <HBars data={byChannel.map((r) => ({ label: CHANNEL_LABEL[r.c], value: r.rev, sub: `${r.bks} booking` })).sort((a, b) => b.value - a.value)} format={vnd} />
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
