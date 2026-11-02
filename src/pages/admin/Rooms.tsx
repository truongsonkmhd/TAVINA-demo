import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Play, CheckCircle2, Wrench, Wand2, WifiOff, Smartphone, LayoutGrid, LogIn, LogOut, User, Wine } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Textarea, Modal, PageHeader, Badge, cx } from '@/components/ui'
import { fmtDate, fmtDateTime, today, addDaysISO } from '@/lib/format'
import { ROOM_STATUS_COLOR, ROOM_STATUS_LABEL } from '@/lib/labels'
import type { Room, RoomStatus } from '@/types'
import { assignHousekeeping, autoAssignHousekeeping, recordMinibar, offlineQueue } from '@/features/pms/actions'
import { usePerm, useRun } from '@/features/pms/components/common'

/** Thông tin khách theo phòng hôm nay */
function useRoomInfo() {
  const bookings = useStore((s) => s.bookings)
  const guests = useStore((s) => s.guests)
  const T = today()
  return (roomId: string) => {
    const inhouse = bookings.find((b) => b.roomId === roomId && b.status === 'checked-in')
    const arriving = bookings.find((b) => b.roomId === roomId && b.status === 'confirmed' && b.checkIn === T)
    const next = bookings.filter((b) => b.roomId === roomId && b.status === 'confirmed' && b.checkIn >= T).sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0]
    const name = (id?: string) => guests.find((g) => g.id === id)?.name
    return { inhouse, arriving, next, departing: inhouse && inhouse.checkOut === T, guestName: name(inhouse?.guestId ?? arriving?.guestId), name }
  }
}

export default function Rooms() {
  const roleId = useStore((s) => s.currentUser.roleId)
  const [mode, setMode] = useState<'map' | 'app'>(roleId === 'housekeeping' ? 'app' : 'map')
  useEffect(() => setMode(roleId === 'housekeeping' ? 'app' : 'map'), [roleId])
  return (
    <div>
      <PageHeader title="Sơ đồ phòng & buồng phòng" subtitle="Trạng thái phòng cập nhật tức thì giữa lễ tân và nhân viên buồng phòng"
        actions={<div className="flex rounded-md bg-stone-200 p-0.5 text-sm">
          <button onClick={() => setMode('map')} className={cx('flex items-center gap-1 rounded px-3 py-1.5 font-medium', mode === 'map' && 'bg-white shadow-sm')}><LayoutGrid size={14} /> Sơ đồ</button>
          <button onClick={() => setMode('app')} className={cx('flex items-center gap-1 rounded px-3 py-1.5 font-medium', mode === 'app' && 'bg-white shadow-sm')}><Smartphone size={14} /> App buồng phòng</button>
        </div>} />
      {mode === 'map' ? <RoomMap /> : <HousekeepingApp />}
    </div>
  )
}

function RoomMap() {
  const s = useStore()
  const perm = usePerm()
  const info = useRoomInfo()
  const [floor, setFloor] = useState<number | 'all'>('all')
  const [selected, setSelected] = useState<string>()
  const floors = [...new Set(s.rooms.map((r) => r.floor))].sort()
  const hk = s.staff.filter((x) => x.roleId === 'housekeeping' && x.active)
  const count = (st: RoomStatus) => s.rooms.filter((r) => r.status === st).length

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1" role="tablist" aria-label="Tầng">
            {(['all', ...floors] as const).map((f) => <button key={f} onClick={() => setFloor(f)} className={cx('rounded-md px-3 py-1.5 text-sm font-medium', floor === f ? 'bg-sea text-white' : 'bg-stone-100 hover:bg-stone-200')}>{f === 'all' ? 'Tất cả' : `Tầng ${f}`}</button>)}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {(['clean', 'dirty', 'cleaning', 'ooo'] as RoomStatus[]).map((st) => <span key={st} className="flex items-center gap-1"><span className={cx('h-3 w-3 rounded-sm', ROOM_STATUS_COLOR[st].split(' ')[0])} />{ROOM_STATUS_LABEL[st]} ({count(st)})</span>)}
            <span className="flex items-center gap-1"><User size={12} /> Đang ở</span><span className="flex items-center gap-1"><LogIn size={12} /> Đến hôm nay</span><span className="flex items-center gap-1"><LogOut size={12} /> Đi hôm nay</span>
          </div>
        </div>
        {floors.filter((f) => floor === 'all' || f === floor).map((f) => (
          <div key={f} className="mt-5">
            <div className="mb-2 text-sm font-semibold text-stone-600">Tầng {f}</div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {s.rooms.filter((r) => r.floor === f).map((r) => {
                const i = info(r.id)
                const rt = s.roomTypes.find((x) => x.id === r.roomTypeId)
                return (
                  <button key={r.id} onClick={() => setSelected(r.id)} className={cx('flex min-h-24 flex-col justify-between rounded-lg p-2 text-left transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-sea', ROOM_STATUS_COLOR[r.status])} aria-label={`Phòng ${r.number}, ${ROOM_STATUS_LABEL[r.status]}`}>
                    <div className="flex items-start justify-between">
                      <span className="text-lg font-bold">{r.number}</span>
                      <span className="flex gap-0.5">{i.inhouse && <User size={14} />}{i.arriving && <LogIn size={14} />}{i.departing && <LogOut size={14} />}</span>
                    </div>
                    <div className="text-[11px] leading-tight opacity-90">
                      <div>{rt?.name} · {ROOM_STATUS_LABEL[r.status]}</div>
                      {i.guestName && <div className="truncate font-semibold">{i.guestName}</div>}
                      {r.assignedTo && <div className="truncate">HK: {s.staff.find((x) => x.id === r.assignedTo)?.name.split(' ').slice(-1)}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </Card>

      <Card title="Phân công ca" actions={perm('rooms', 'edit') && <Button size="sm" tone="secondary" onClick={() => autoAssignHousekeeping()}><Wand2 size={14} /> Tự động</Button>}>
        <ul className="space-y-3 text-sm">
          {hk.map((h) => {
            const mine = s.rooms.filter((r) => r.assignedTo === h.id)
            return (
              <li key={h.id}>
                <div className="flex justify-between font-semibold"><span>{h.name}</span><span className="tnum">{mine.length} phòng</span></div>
                <div className="mt-1 flex flex-wrap gap-1">{mine.map((r) => <button key={r.id} onClick={() => setSelected(r.id)} className={cx('rounded px-1.5 py-0.5 text-xs font-semibold', ROOM_STATUS_COLOR[r.status])}>{r.number}</button>)}</div>
              </li>
            )
          })}
          <li className="border-t border-stone-100 pt-3 text-stone-600">Chưa phân công: {s.rooms.filter((r) => (r.status === 'dirty' || r.status === 'cleaning') && !r.assignedTo).map((r) => r.number).join(', ') || 'không có'}</li>
        </ul>
        <div className="mt-4 border-t border-stone-100 pt-3">
          <div className="text-sm font-semibold">Hoạt động gần đây</div>
          <ul className="mt-2 space-y-1 text-xs text-stone-600">
            {s.housekeepingLogs.slice(0, 8).map((l) => <li key={l.id}><span className="tnum">{fmtDateTime(l.at)}</span> · P.{s.rooms.find((r) => r.id === l.roomId)?.number}: {ROOM_STATUS_LABEL[l.from]} → <b>{ROOM_STATUS_LABEL[l.to]}</b></li>)}
          </ul>
        </div>
      </Card>

      {selected && <RoomModal roomId={selected} onClose={() => setSelected(undefined)} />}
    </div>
  )
}

function RoomModal({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const s = useStore()
  const perm = usePerm()
  const run = useRun()
  const info = useRoomInfo()
  const room = s.rooms.find((r) => r.id === roomId)!
  const i = info(roomId)
  const hk = s.staff.filter((x) => x.roleId === 'housekeeping' && x.active)
  const minibar = s.items.filter((x) => x.group === 'minibar')
  const [ooo, setOoo] = useState({ open: false, note: '', until: addDaysISO(today(), 1) })
  const [mb, setMb] = useState({ itemId: minibar[0]?.id ?? '', qty: 1 })
  const canEdit = perm('rooms', 'edit')
  const set = (st: RoomStatus, note?: string, until?: string) => run(s.setRoomStatus(roomId, st, note, until), `Phòng ${room.number}: ${ROOM_STATUS_LABEL[st]}`)

  return (
    <Modal open onClose={onClose} title={`Phòng ${room.number} — ${s.roomTypes.find((x) => x.id === room.roomTypeId)?.name}`}>
      <div className="flex items-center gap-2"><span className={cx('rounded px-2 py-1 text-sm font-semibold', ROOM_STATUS_COLOR[room.status])}>{ROOM_STATUS_LABEL[room.status]}</span>{room.oooNote && <span className="text-sm text-stone-600">{room.oooNote}{room.oooUntil ? ` (đến ${fmtDate(room.oooUntil)})` : ''}</span>}</div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-stone-500">Khách đang ở</dt><dd>{i.inhouse ? <Link to={`/admin/bookings/${i.inhouse.id}`} className="font-semibold text-sea hover:underline">{i.name(i.inhouse.guestId)} · đi {fmtDate(i.inhouse.checkOut, 'dd/MM')}</Link> : '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-stone-500">Booking kế tiếp</dt><dd>{i.next ? <Link to={`/admin/bookings/${i.next.id}`} className="text-sea hover:underline">{i.name(i.next.guestId)} · {fmtDate(i.next.checkIn, 'dd/MM')}</Link> : '—'}</dd></div>
        <div className="flex items-center justify-between gap-3"><dt className="text-stone-500">Phân công</dt><dd>
          <Select className="h-8 w-44" disabled={!canEdit} value={room.assignedTo ?? ''} onChange={(e) => assignHousekeeping(roomId, e.target.value || undefined)}><option value="">Chưa phân công</option>{hk.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</Select>
        </dd></div>
      </dl>
      {canEdit && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button tone="secondary" disabled={room.status === 'cleaning'} onClick={() => set('cleaning')}><Play size={14} /> Bắt đầu dọn</Button>
            <Button disabled={room.status === 'clean'} onClick={() => set('clean')}><CheckCircle2 size={14} /> Đã sạch</Button>
            <Button tone="secondary" disabled={room.status === 'dirty'} onClick={() => set('dirty')}>Đặt bẩn</Button>
            <Button tone="secondary" onClick={() => setOoo({ ...ooo, open: !ooo.open })}><Wrench size={14} /> Bảo trì</Button>
          </div>
          {ooo.open && (
            <div className="mt-3 grid gap-2 rounded-lg bg-stone-50 p-3 sm:grid-cols-2">
              <Field label="Lý do"><Input value={ooo.note} onChange={(e) => setOoo({ ...ooo, note: e.target.value })} placeholder="VD: hỏng điều hoà" /></Field>
              <Field label="Đến ngày"><Input type="date" min={today()} value={ooo.until} onChange={(e) => setOoo({ ...ooo, until: e.target.value })} /></Field>
              <Button className="sm:col-span-2" tone="danger" onClick={() => { if (set('ooo', ooo.note || 'Bảo trì', ooo.until)) setOoo({ ...ooo, open: false }) }}>Đặt bảo trì (giảm tồn trên các kênh)</Button>
            </div>
          )}
        </>
      )}
      {i.inhouse && perm('inventory', 'create') && (
        <div className="mt-5 border-t border-stone-100 pt-4">
          <div className="mb-2 flex items-center gap-1 text-sm font-semibold"><Wine size={14} /> Ghi minibar</div>
          <div className="flex gap-2">
            <Select value={mb.itemId} onChange={(e) => setMb({ ...mb, itemId: e.target.value })}>{minibar.map((x) => <option key={x.id} value={x.id}>{x.name} (còn {x.stock})</option>)}</Select>
            <Input type="number" min={1} className="w-20" value={mb.qty} onChange={(e) => setMb({ ...mb, qty: Number(e.target.value) })} />
            <Button onClick={() => run(recordMinibar(roomId, mb.itemId, mb.qty), 'Đã ghi minibar vào folio và trừ kho')}>Ghi</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Giao diện mobile cho nhân viên buồng phòng — thao tác một tay, hỗ trợ hàng đợi khi mất mạng */
function HousekeepingApp() {
  const s = useStore()
  const run = useRun()
  const info = useRoomInfo()
  const me = s.currentUser
  const queue = useSyncExternalStore(offlineQueue.subscribe, offlineQueue.list)
  const [offline, setOffline] = useState(false)
  const [report, setReport] = useState<Room>()
  const [note, setNote] = useState('')
  const [mbRoom, setMbRoom] = useState<Room>()
  const minibar = s.items.filter((x) => x.group === 'minibar')
  const [mbQty, setMbQty] = useState<Record<string, number>>({})

  const mine = s.rooms.filter((r) => r.assignedTo === me.id)
  const list = (mine.length ? mine : s.rooms.filter((r) => r.status === 'dirty' || r.status === 'cleaning'))
    .map((r) => ({ r, i: info(r.id) }))
    .sort((a, b) => Number(!!b.i.arriving) - Number(!!a.i.arriving) || (a.r.status === 'clean' ? 1 : 0) - (b.r.status === 'clean' ? 1 : 0) || a.r.number.localeCompare(b.r.number))

  const act = (room: Room, st: RoomStatus, n?: string) => {
    if (offline) { offlineQueue.push(`P.${room.number} → ${ROOM_STATUS_LABEL[st]}`, () => s.setRoomStatus(room.id, st, n)); return }
    run(s.setRoomStatus(room.id, st, n), `Phòng ${room.number}: ${ROOM_STATUS_LABEL[st]}`)
  }
  const goOnline = () => { setOffline(false); offlineQueue.flush() }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-3 flex items-center justify-between rounded-lg bg-white p-3 text-sm ring-1 ring-stone-200">
        <span><b>{me.name}</b> · {mine.length ? `${mine.length} phòng được giao` : 'chưa được phân công — hiển thị phòng cần dọn'}</span>
        <button onClick={() => (offline ? goOnline() : setOffline(true))} className={cx('flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold', offline ? 'bg-red-100 text-red-700' : 'bg-stone-100')}><WifiOff size={12} />{offline ? 'Đang offline' : 'Giả lập mất mạng'}</button>
      </div>
      {queue.length > 0 && <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{queue.length} thao tác chưa đồng bộ: {queue.map((q) => q.label).join(', ')}. Sẽ gửi khi có mạng.</div>}
      <ul className="space-y-3">
        {list.map(({ r, i }) => (
          <li key={r.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold">{r.number}</div>
                <div className="text-sm text-stone-600">{s.roomTypes.find((x) => x.id === r.roomTypeId)?.name} · tầng {r.floor}</div>
              </div>
              <span className={cx('rounded px-2 py-1 text-sm font-semibold', ROOM_STATUS_COLOR[r.status])}>{ROOM_STATUS_LABEL[r.status]}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {i.arriving && <Badge tone="warn">Khách đến hôm nay — ưu tiên</Badge>}
              {i.departing && <Badge tone="info">Khách đi hôm nay</Badge>}
              {i.inhouse && !i.departing && <Badge>Đang có khách</Badge>}
              {r.status === 'cleaning' && r.cleaningStartedAt && <Badge>Bắt đầu {fmtDateTime(r.cleaningStartedAt).slice(-5)}</Badge>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {r.status !== 'cleaning' && r.status !== 'ooo' && <Button size="lg" tone="secondary" className="col-span-2" disabled={r.status === 'clean'} onClick={() => act(r, 'cleaning')}><Play size={18} /> Bắt đầu dọn</Button>}
              {r.status === 'cleaning' && <Button size="lg" className="col-span-2" onClick={() => act(r, 'clean')}><CheckCircle2 size={18} /> Đã sạch</Button>}
              <Button tone="ghost" onClick={() => { setReport(r); setNote('') }}><Wrench size={16} /> Báo hỏng</Button>
              <Button tone="ghost" disabled={!i.inhouse} onClick={() => { setMbRoom(r); setMbQty({}) }}><Wine size={16} /> Minibar</Button>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="rounded-xl bg-white p-8 text-center text-sm text-stone-500 ring-1 ring-stone-200">Không có phòng cần dọn.</li>}
      </ul>

      <Modal open={!!report} onClose={() => setReport(undefined)} title={`Báo hỏng phòng ${report?.number ?? ''}`} footer={<><Button tone="secondary" onClick={() => setReport(undefined)}>Huỷ</Button><Button tone="danger" disabled={!note.trim()} onClick={() => { if (report) act(report, 'ooo', note.trim()); setReport(undefined) }}>Gửi báo hỏng</Button></>}>
        <Field label="Mô tả sự cố" hint="Phòng chuyển sang Bảo trì và không bán trên các kênh"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: vòi sen rò nước" /></Field>
      </Modal>
      <Modal open={!!mbRoom} onClose={() => setMbRoom(undefined)} title={`Minibar phòng ${mbRoom?.number ?? ''}`} footer={<><Button tone="secondary" onClick={() => setMbRoom(undefined)}>Huỷ</Button><Button onClick={() => { if (mbRoom) for (const [id, q] of Object.entries(mbQty)) if (q > 0) run(recordMinibar(mbRoom.id, id, q)); s.toast('Đã ghi minibar'); setMbRoom(undefined) }}>Lưu</Button></>}>
        <ul className="divide-y divide-stone-100">
          {minibar.map((x) => (
            <li key={x.id} className="flex items-center justify-between py-2 text-sm">
              <span>{x.name}</span>
              <span className="flex items-center gap-2">
                <Button size="sm" tone="secondary" onClick={() => setMbQty({ ...mbQty, [x.id]: Math.max(0, (mbQty[x.id] ?? 0) - 1) })}>−</Button>
                <span className="tnum w-6 text-center font-semibold">{mbQty[x.id] ?? 0}</span>
                <Button size="sm" tone="secondary" onClick={() => setMbQty({ ...mbQty, [x.id]: (mbQty[x.id] ?? 0) + 1 })}>+</Button>
              </span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
