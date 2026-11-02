import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, RefreshCw, Wallet, Percent } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Stat, Badge, PageHeader, Empty, cx } from '@/components/ui'
import { vnd, num, pct, today, addDaysISO, fmtDate, nights } from '@/lib/format'
import { CHANNEL_LABEL, CHANNEL_COLOR, ROOM_STATUS_LABEL } from '@/lib/labels'
import { can } from '@/lib/permissions'
import { approveDiscount, retrySync } from '@/features/pms/actions'
import { BarChart, HBars } from '@/features/pms/components/Charts'
import type { Booking, Channel } from '@/types'

export default function Dashboard() {
  const s = useStore()
  const navigate = useNavigate()
  const T = today()
  const roleId = s.currentUser.roleId
  const canApprove = can(s.roles, roleId, 'rates', 'approve') || can(s.roles, roleId, 'bookings', 'approve')
  const canOps = can(s.roles, roleId, 'bookings', 'edit')

  const m = useMemo(() => {
    const from30 = addDaysISO(T, -30)
    const inhouse = s.bookings.filter((b) => b.status === 'checked-in')
    const ooo = s.rooms.filter((r) => r.status === 'ooo').length
    const sellable = s.rooms.length - ooo
    const occupancy = sellable ? inhouse.length / sellable : 0
    const relevant = s.bookings.filter((b) => (b.status === 'checked-out' || b.status === 'checked-in') && b.checkIn >= from30 && b.checkIn < T)
    const ids = new Set(relevant.map((b) => b.id))
    const roomLines = s.folioLines.filter((f) => f.type === 'room' && ids.has(f.bookingId) && f.date >= from30 && f.date < T)
    const roomRev = roomLines.reduce((x, f) => x + f.amount, 0)
    const roomNights = roomLines.length
    const adr = roomNights ? roomRev / roomNights : 0
    const revpar = roomRev / (30 * sellable || 1)
    const todayRev = s.payments.filter((p) => p.date === T).reduce((x, p) => x + p.amount, 0)
    const dirty = s.rooms.filter((r) => r.status === 'dirty').length
    const arrivals = s.bookings.filter((b) => b.checkIn === T && b.status === 'confirmed')
    const departures = s.bookings.filter((b) => b.checkOut === T && b.status === 'checked-in')
    const overbooked = s.bookings.filter((b) => b.overbooked && ['confirmed', 'hold'].includes(b.status))
    const pendingDisc = s.bookings.filter((b) => b.discountStatus === 'pending' && ['confirmed', 'hold', 'checked-in'].includes(b.status))
    const holds = s.bookings.filter((b) => b.status === 'hold' && b.holdExpiresAt)
    const syncIssues = s.syncLogs.filter((l) => l.status !== 'ok')
    const overdue = s.debts.filter((d) => d.dueDate < T && d.paid < d.amount)
    const rev14 = Array.from({ length: 14 }, (_, i) => {
      const d = addDaysISO(T, i - 13)
      return { label: fmtDate(d, 'dd/MM'), value: s.payments.filter((p) => p.date === d).reduce((x, p) => x + p.amount, 0), hint: `${fmtDate(d)}: ${vnd(s.payments.filter((p) => p.date === d).reduce((x, p) => x + p.amount, 0))}` }
    })
    const sources: Record<string, number> = {}
    for (const b of s.bookings.filter((b) => b.createdAt.slice(0, 10) >= from30 && b.status !== 'expired')) sources[b.source] = (sources[b.source] ?? 0) + 1
    const srcRows = Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, label: CHANNEL_LABEL[k as Channel], value: v }))
    return { inhouse, ooo, sellable, occupancy, adr, revpar, roomRev, todayRev, dirty, arrivals, departures, overbooked, pendingDisc, holds, syncIssues, overdue, rev14, srcRows }
  }, [s.bookings, s.rooms, s.folioLines, s.payments, s.syncLogs, s.debts, T])

  const warnCount = m.overbooked.length + m.pendingDisc.length + m.holds.length + m.syncIssues.length + m.overdue.length

  const act = (fn: () => { error?: string }, ok: string) => { const r = fn(); r.error ? s.toast(r.error, 'err') : s.toast(ok, 'ok') }

  const guestName = (b: Booking) => s.guests.find((g) => g.id === b.guestId)?.name ?? '—'
  const roomNo = (b: Booking) => s.rooms.find((r) => r.id === b.roomId)?.number

  return (
    <div>
      <PageHeader title="Tổng quan" subtitle={`${fmtDate(T, 'EEEE, dd/MM/yyyy')} · ${s.settings.hotelName}`} actions={canOps && <><Button tone="secondary" onClick={() => navigate('/admin/bookings/new')}>+ Booking</Button><Button onClick={() => navigate('/admin/calendar')}>Mở lịch</Button></>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Công suất hôm nay" value={pct(m.occupancy * 100)} sub={`${m.inhouse.length}/${m.sellable} phòng đang ở · ${m.ooo} bảo trì`} />
        <Stat label="ADR 30 ngày" value={vnd(m.adr)} sub="Doanh thu phòng ÷ phòng-đêm bán" />
        <Stat label="RevPAR 30 ngày" value={vnd(m.revpar)} sub={`Doanh thu phòng ${vnd(m.roomRev)}`} />
        <Stat label="Doanh thu hôm nay" value={vnd(m.todayRev)} sub="Theo phiếu thu trong ngày" />
        <Stat label="Phòng bẩn" value={m.dirty} tone={m.dirty > 3 ? 'warn' : undefined} sub={<Link to="/admin/rooms" className="underline">Sơ đồ phòng</Link>} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={<span className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600" /> Cảnh báo <Badge tone={warnCount ? 'warn' : 'ok'}>{warnCount}</Badge></span>} className="lg:col-span-1">
          <ul className="space-y-2 text-sm">
            {m.overbooked.map((b) => (
              <li key={b.id} className="rounded-md border border-red-200 bg-red-50 p-2">
                <div className="flex items-center justify-between gap-2"><Badge tone="err">Overbooked</Badge><Link to={`/admin/bookings/${b.id}`} className="font-mono text-xs underline">{b.code}</Link></div>
                <div className="mt-1">{guestName(b)} · {s.roomTypes.find((r) => r.id === b.roomTypeId)?.name} · {fmtDate(b.checkIn, 'dd/MM')}→{fmtDate(b.checkOut, 'dd/MM')} · {CHANNEL_LABEL[b.source]}</div>
              </li>
            ))}
            {m.pendingDisc.map((b) => (
              <li key={b.id} className="rounded-md border border-amber-200 bg-amber-50 p-2">
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1"><Percent size={14} /> Chờ duyệt CK {b.discountPct}%</span><Link to={`/admin/bookings/${b.id}`} className="font-mono text-xs underline">{b.code}</Link></div>
                <div className="mt-1 text-stone-700">{guestName(b)} · {b.discountReason}</div>
                {canApprove && <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => approveDiscount(b.id, true)}>Duyệt</Button><Button size="sm" tone="secondary" onClick={() => approveDiscount(b.id, false)}>Từ chối</Button></div>}
              </li>
            ))}
            {m.holds.map((b) => {
              const mins = Math.max(0, Math.round((new Date(b.holdExpiresAt!).getTime() - Date.now()) / 60000))
              return <li key={b.id} className="rounded-md border border-stone-200 p-2"><span className="flex items-center gap-1"><Clock size={14} /> Giữ chỗ web <Link to={`/admin/bookings/${b.id}`} className="font-mono text-xs underline">{b.code}</Link> hết hạn sau {mins} phút</span></li>
            })}
            {m.syncIssues.map((l) => (
              <li key={l.id} className="rounded-md border border-stone-200 p-2">
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-1"><RefreshCw size={14} /> {CHANNEL_LABEL[l.channel]} · <Badge tone={l.status === 'failed' ? 'err' : 'warn'}>{l.status}</Badge></span>{canOps && <Button size="sm" tone="secondary" onClick={() => retrySync(l.id)}>Thử lại</Button>}</div>
                <div className="mt-1 text-xs text-stone-600">{l.detail}</div>
              </li>
            ))}
            {m.overdue.map((d) => (
              <li key={d.id} className="rounded-md border border-stone-200 p-2"><span className="flex items-center gap-1"><Wallet size={14} /> Công nợ quá hạn: {d.partyName}</span><div className="tnum mt-1 text-xs text-stone-600">Còn {vnd(d.amount - d.paid)} · hạn {fmtDate(d.dueDate)} · <Link to="/admin/invoices" className="underline">Hoá đơn & công nợ</Link></div></li>
            ))}
            {!warnCount && <li className="text-stone-500">Không có cảnh báo.</li>}
          </ul>
        </Card>

        <div className="grid gap-4 lg:col-span-2 lg:grid-cols-3">
          <ListCard title="Đến hôm nay" count={m.arrivals.length} empty="Không có khách đến">
            {m.arrivals.map((b) => (
              <Row key={b.id} b={b} name={guestName(b)} room={roomNo(b)} s={s}>
                {canOps && <Button size="sm" onClick={() => act(() => s.checkIn(b.id), `Đã check-in ${b.code}`)}>Check-in</Button>}
              </Row>
            ))}
          </ListCard>
          <ListCard title="Đi hôm nay" count={m.departures.length} empty="Không có khách đi">
            {m.departures.map((b) => (
              <Row key={b.id} b={b} name={guestName(b)} room={roomNo(b)} s={s}>
                {canOps && <Button size="sm" tone="secondary" onClick={() => act(() => s.checkOut(b.id), `Đã check-out ${b.code}`)}>Check-out</Button>}
              </Row>
            ))}
          </ListCard>
          <ListCard title="Đang ở" count={m.inhouse.length} empty="Không có khách đang ở">
            {m.inhouse.map((b) => <Row key={b.id} b={b} name={guestName(b)} room={roomNo(b)} s={s} />)}
          </ListCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Doanh thu 14 ngày (theo phiếu thu)" className="lg:col-span-2">
          <BarChart data={m.rev14} format={vnd} />
          <div className="mt-2 text-xs text-stone-500 tnum">Tổng: {vnd(m.rev14.reduce((x, d) => x + d.value, 0))}</div>
        </Card>
        <Card title="Nguồn booking 30 ngày">
          {m.srcRows.length ? <HBars rows={m.srcRows} colorOf={(k) => CHANNEL_COLOR[k as Channel]} /> : <Empty title="Chưa có booking" />}
        </Card>
      </div>

      <Card title="Tình trạng buồng" className="mt-4">
        <div className="flex flex-wrap gap-4 text-sm">
          {(['clean', 'dirty', 'cleaning', 'ooo'] as const).map((st) => <div key={st} className="flex items-center gap-2"><span className={cx('h-3 w-3 rounded-sm', st === 'clean' && 'bg-emerald-600', st === 'dirty' && 'bg-red-600', st === 'cleaning' && 'bg-amber-500', st === 'ooo' && 'bg-stone-400')} />{ROOM_STATUS_LABEL[st]}: <b className="tnum">{s.rooms.filter((r) => r.status === st).length}</b></div>)}
          <span className="text-stone-500">· {num(s.rooms.length)} phòng</span>
        </div>
      </Card>
    </div>
  )
}

function ListCard({ title, count, empty, children }: { title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <Card title={<span>{title} <Badge>{count}</Badge></span>}>
      <ul className="max-h-80 space-y-2 overflow-y-auto text-sm scrollbar-thin">{count ? children : <li className="text-stone-500">{empty}</li>}</ul>
    </Card>
  )
}

function Row({ b, name, room, s, children }: { b: Booking; name: string; room?: string; s: ReturnType<typeof useStore.getState>; children?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-stone-200 p-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 truncate"><span className={cx('h-2.5 w-2.5 shrink-0 rounded-sm', CHANNEL_COLOR[b.source])} /><Link to={`/admin/bookings/${b.id}`} className="truncate font-medium hover:underline">{name}</Link></div>
        <div className="text-xs text-stone-600">{room ? `P.${room}` : <span className="text-amber-700">Chưa xếp phòng</span>} · {s.roomTypes.find((r) => r.id === b.roomTypeId)?.name} · {nights(b.checkIn, b.checkOut)} đêm</div>
      </div>
      {children}
    </li>
  )
}
