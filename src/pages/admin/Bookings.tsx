import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Users, Zap, Search } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Input, Select, PageHeader, Table, Td, Tabs, Empty } from '@/components/ui'
import { vnd, fmtDate, nights, today } from '@/lib/format'
import { BOOKING_STATUS_LABEL, CHANNEL_LABEL } from '@/lib/labels'
import type { Booking, BookingStatus, Channel } from '@/types'
import { simulateOtaBooking } from '@/features/pms/actions'
import { StatusBadge, ChannelTag, usePerm, bookingTotal } from '@/features/pms/components/common'

type Tab = 'all' | 'arrivals' | 'inhouse' | 'hold' | 'overbooked' | 'discount' | 'group'
const PAGE = 20

export default function Bookings() {
  const s = useStore()
  const navigate = useNavigate()
  const perm = usePerm()
  const T = today()
  const [tab, setTab] = useState<Tab>('all')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<BookingStatus | ''>('')
  const [source, setSource] = useState<Channel | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const folioByBooking = useMemo(() => {
    const m = new Map<string, number>()
    for (const f of s.folioLines) m.set(f.bookingId, (m.get(f.bookingId) ?? 0) + f.amount)
    return m
  }, [s.folioLines])
  const paidByBooking = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of s.payments) m.set(p.bookingId, (m.get(p.bookingId) ?? 0) + p.amount)
    return m
  }, [s.payments])

  const tabFilter: Record<Tab, (b: Booking) => boolean> = {
    all: (b) => b.status !== 'expired',
    arrivals: (b) => b.checkIn === T && b.status === 'confirmed',
    inhouse: (b) => b.status === 'checked-in',
    hold: (b) => b.status === 'hold',
    overbooked: (b) => !!b.overbooked && ['confirmed', 'hold'].includes(b.status),
    discount: (b) => b.discountStatus === 'pending',
    group: (b) => !!b.groupId,
  }
  const guestOf = (b: Booking) => s.guests.find((g) => g.id === b.guestId)
  const term = q.trim().toLowerCase()
  const rows = s.bookings
    .filter(tabFilter[tab])
    .filter((b) => !status || b.status === status)
    .filter((b) => !source || b.source === source)
    .filter((b) => (!from || b.checkOut > from) && (!to || b.checkIn <= to))
    .filter((b) => {
      if (!term) return true
      const g = guestOf(b)
      return b.code.toLowerCase().includes(term) || g?.name.toLowerCase().includes(term) || g?.phone.replace(/\s/g, '').includes(term.replace(/\s/g, '')) || b.otaRef?.includes(term)
    })
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn) || b.createdAt.localeCompare(a.createdAt))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const shown = rows.slice((page - 1) * PAGE, page * PAGE)
  const count = (t: Tab) => s.bookings.filter(tabFilter[t]).length

  return (
    <div>
      <PageHeader title="Booking" subtitle="Mọi đặt phòng từ web, OTA, đối tác và lễ tân"
        actions={<>
          {perm('channels', 'edit') && <Button tone="secondary" onClick={() => simulateOtaBooking()}><Zap size={16} /> Mô phỏng OTA đổ về</Button>}
          {perm('bookings', 'create') && <Button tone="secondary" onClick={() => navigate('/admin/bookings/new?type=group')}><Users size={16} /> Booking đoàn</Button>}
          {perm('bookings', 'create') && <Button onClick={() => navigate('/admin/bookings/new')}><Plus size={16} /> Booking lẻ</Button>}
        </>} />

      <Card>
        <Tabs value={tab} onChange={(v) => { setTab(v); setPage(1) }} tabs={[
          { id: 'all', label: 'Tất cả', count: count('all') }, { id: 'arrivals', label: 'Đến hôm nay', count: count('arrivals') },
          { id: 'inhouse', label: 'Đang ở', count: count('inhouse') }, { id: 'hold', label: 'Giữ chỗ', count: count('hold') },
          { id: 'overbooked', label: 'Overbooked', count: count('overbooked') }, { id: 'discount', label: 'Chờ duyệt CK', count: count('discount') },
          { id: 'group', label: 'Đoàn', count: count('group') },
        ]} />
        <div className="mt-4 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <label className="relative"><Search size={16} className="absolute left-3 top-3 text-stone-400" /><Input className="pl-9" placeholder="Mã, tên khách, SĐT, mã OTA" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} aria-label="Tìm booking" /></label>
          <Select value={status} onChange={(e) => { setStatus(e.target.value as BookingStatus | ''); setPage(1) }} aria-label="Trạng thái"><option value="">Mọi trạng thái</option>{Object.entries(BOOKING_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Select value={source} onChange={(e) => { setSource(e.target.value as Channel | ''); setPage(1) }} aria-label="Nguồn"><option value="">Mọi nguồn</option>{Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} aria-label="Từ ngày" />
          <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} aria-label="Đến ngày" />
        </div>

        <div className="mt-4">
          {shown.length === 0 ? <Empty title="Không có booking phù hợp" hint="Thử đổi bộ lọc hoặc từ khoá" /> : (
            <Table head={['Mã', 'Khách', 'Phòng / hạng', 'Ngày', 'Đêm', 'Nguồn', 'Trạng thái', 'Tổng', 'Đã trả']}>
              {shown.map((b) => {
                const g = guestOf(b)
                const room = s.rooms.find((r) => r.id === b.roomId)
                const rt = s.roomTypes.find((r) => r.id === b.roomTypeId)
                const total = bookingTotal(b, folioByBooking.get(b.id) ?? 0)
                const paid = paidByBooking.get(b.id) ?? 0
                return (
                  <tr key={b.id} className="hover:bg-stone-50">
                    <Td><Link to={`/admin/bookings/${b.id}`} className="font-mono text-xs font-semibold text-sea hover:underline">{b.code}</Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {b.overbooked && <span className="rounded bg-red-100 px-1 text-[10px] font-semibold text-red-700">OVERBOOKED</span>}
                        {b.discountStatus === 'pending' && <span className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800">CK {b.discountPct}%</span>}
                        {b.groupId && <span className="rounded bg-stone-100 px-1 text-[10px] font-semibold">Đoàn</span>}
                      </div>
                    </Td>
                    <Td><div className="font-medium">{g?.name}</div><div className="text-xs text-stone-500">{g?.phone}</div></Td>
                    <Td>{room ? <span className="font-semibold">{room.number}</span> : <span className="text-red-600">Chưa xếp</span>} <span className="text-stone-500">· {rt?.name}</span></Td>
                    <Td className="whitespace-nowrap">{fmtDate(b.checkIn, 'dd/MM')} → {fmtDate(b.checkOut, 'dd/MM/yy')}</Td>
                    <Td className="tnum">{nights(b.checkIn, b.checkOut)}</Td>
                    <Td><ChannelTag channel={b.source} /></Td>
                    <Td><StatusBadge status={b.status} /></Td>
                    <Td className="tnum whitespace-nowrap text-right">{vnd(total)}</Td>
                    <Td className={`tnum whitespace-nowrap text-right ${paid >= total ? 'text-emerald-700' : paid > 0 ? 'text-amber-700' : 'text-stone-400'}`}>{vnd(paid)}</Td>
                  </tr>
                )
              })}
            </Table>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
          <span>{rows.length} booking</span>
          {pages > 1 && <div className="flex items-center gap-2"><Button size="sm" tone="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button><span className="tnum">{page}/{pages}</span><Button size="sm" tone="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</Button></div>}
        </div>
      </Card>
    </div>
  )
}
