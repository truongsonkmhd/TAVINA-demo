import { useMemo, useState } from 'react'
import { Download, Send, Settings2, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Modal, PageHeader, Table, Td, Tabs, Badge, Empty } from '@/components/ui'
import { fmtDate, fmtDateTime, today } from '@/lib/format'
import type { Booking, Guest } from '@/types'
import { createDeclaration, submitDeclarationPortal, updateGuest, downloadCsv } from '@/features/backoffice/actions'
import { usePerm } from '@/features/pms/components/common'

interface Row { b: Booking; g: Guest; room: string }
interface Col { key: string; label: string; on: boolean }
const DEFAULT_COLS: Col[] = [
  { key: 'name', label: 'Họ và tên', on: true }, { key: 'dob', label: 'Ngày sinh', on: true }, { key: 'gender', label: 'Giới tính', on: true },
  { key: 'nationality', label: 'Quốc tịch', on: true }, { key: 'idType', label: 'Loại giấy tờ', on: true }, { key: 'idNumber', label: 'Số giấy tờ', on: true },
  { key: 'address', label: 'Địa chỉ thường trú', on: true }, { key: 'room', label: 'Số phòng', on: true }, { key: 'checkIn', label: 'Ngày đến', on: true }, { key: 'checkOut', label: 'Ngày đi dự kiến', on: true },
]
const LS_KEY = 'tavina-declaration-cols'
const loadCols = (): Col[] => { try { const v = JSON.parse(localStorage.getItem(LS_KEY) ?? ''); return Array.isArray(v) ? v : DEFAULT_COLS } catch { return DEFAULT_COLS } }
const REQUIRED: (keyof Guest)[] = ['name', 'dob', 'gender', 'nationality', 'idNumber']
const missing = (g: Guest) => REQUIRED.filter((k) => !g[k])
const GENDER: Record<string, string> = { M: 'Nam', F: 'Nữ', O: 'Khác' }
const isForeign = (g: Guest) => g.nationality.trim().toLowerCase() !== 'việt nam'

export default function Declaration() {
  const s = useStore()
  const perm = usePerm()
  const [date, setDate] = useState(today())
  const [tab, setTab] = useState<'vn' | 'foreign'>('vn')
  const [cols, setCols] = useState<Col[]>(loadCols)
  const [colOpen, setColOpen] = useState(false)
  const [fix, setFix] = useState<Guest>()

  const rows = useMemo<Row[]>(() => s.bookings
    // khách lưu trú trong ngày đã chọn (đã/đang nhận phòng)
    .filter((b) => (b.status === 'checked-in' || b.status === 'checked-out') && b.checkIn <= date && date < b.checkOut)
    .flatMap((b) => b.occupantIds.map((id) => ({ b, g: s.guests.find((x) => x.id === id)!, room: s.rooms.find((r) => r.id === b.roomId)?.number ?? '' })).filter((r) => r.g)),
  [s.bookings, s.guests, s.rooms, date])
  const vn = rows.filter((r) => !isForeign(r.g)), foreign = rows.filter((r) => isForeign(r.g))
  const list = tab === 'vn' ? vn : foreign
  const ok = list.filter((r) => !missing(r.g).length)
  const bad = list.length - ok.length

  const value = (r: Row, key: string) => {
    const g = r.g
    switch (key) {
      case 'room': return r.room
      case 'checkIn': return fmtDate(r.b.checkIn)
      case 'checkOut': return fmtDate(r.b.checkOut)
      case 'dob': return g.dob ? fmtDate(g.dob) : ''
      case 'gender': return g.gender ? GENDER[g.gender] : ''
      case 'idType': return g.idType === 'passport' ? 'Hộ chiếu' : 'CCCD'
      default: return String((g as unknown as Record<string, unknown>)[key] ?? '')
    }
  }
  const exportFile = () => {
    if (!ok.length) return s.toast('Không có dòng nào đủ dữ liệu để xuất', 'warn')
    const on = cols.filter((c) => c.on)
    downloadCsv(`khai-bao-luu-tru-${tab === 'vn' ? 'nguoi-viet' : 'nguoi-nuoc-ngoai'}-${date}.csv`, [['STT', ...on.map((c) => c.label)], ...ok.map((r, i) => [i + 1, ...on.map((c) => value(r, c.key))])])
    createDeclaration({ date, bookingIds: [...new Set(ok.map((r) => r.b.id))], guestIds: ok.map((r) => r.g.id), foreign: tab === 'foreign' })
    s.toast(`Đã xuất ${ok.length} khách${bad ? ` — còn ${bad} khách thiếu dữ liệu chưa xuất` : ''}`, bad ? 'warn' : 'ok')
  }
  const saveCols = (c: Col[]) => { setCols(c); try { localStorage.setItem(LS_KEY, JSON.stringify(c)) } catch { /* bỏ qua */ } }
  const move = (i: number, d: -1 | 1) => { const c = [...cols]; const j = i + d; if (j < 0 || j >= c.length) return; [c[i], c[j]] = [c[j], c[i]]; saveCols(c) }

  return (
    <div>
      <PageHeader title="Khai báo lưu trú" subtitle="Xuất danh sách khách theo mẫu cơ quan công an; người nước ngoài khai báo trong 12 giờ"
        actions={<>
          <Button tone="secondary" onClick={() => setColOpen(true)}><Settings2 size={16} /> Cấu hình cột</Button>
          {perm('declaration', 'export') && <Button onClick={exportFile}><Download size={16} /> Xuất file mẫu công an</Button>}
        </>} />
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Ngày lưu trú"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <p className="pb-2 text-sm text-stone-600">{rows.length} khách · {vn.length} người Việt · {foreign.length} người nước ngoài</p>
        </div>
        <div className="mt-4"><Tabs value={tab} onChange={setTab} tabs={[{ id: 'vn', label: 'Người Việt Nam', count: vn.length }, { id: 'foreign', label: 'Người nước ngoài', count: foreign.length }]} /></div>
        {tab === 'foreign' && foreign.length > 0 && <p className="mt-3 flex items-center gap-2 rounded bg-amber-50 p-2 text-sm text-amber-900"><AlertTriangle size={16} />Khách nước ngoài phải khai báo tạm trú trong 12 giờ kể từ khi nhận phòng.</p>}
        {bad > 0 && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{bad} khách thiếu thông tin bắt buộc (dòng đỏ) — bổ sung trước khi xuất, các dòng này không được đưa vào file.</p>}
        <div className="mt-3">
          {list.length === 0 ? <Empty title="Không có khách cần khai báo" hint="Chọn ngày khác hoặc check-in khách trước" /> : (
            <Table head={['Phòng', 'Họ tên', 'Ngày sinh', 'Giới tính', 'Quốc tịch', 'Giấy tờ', 'Địa chỉ', 'Đến → đi', 'Đã khai báo', '']}>
              {list.map((r) => {
                const m = missing(r.g)
                return (
                  <tr key={r.b.id + r.g.id} className={m.length ? 'bg-red-50' : ''}>
                    <Td className="font-semibold">{r.room}</Td><Td>{r.g.name}</Td>
                    <Td>{r.g.dob ? fmtDate(r.g.dob) : <span className="text-red-600">thiếu</span>}</Td>
                    <Td>{r.g.gender ? GENDER[r.g.gender] : <span className="text-red-600">thiếu</span>}</Td>
                    <Td>{r.g.nationality}</Td>
                    <Td className="whitespace-nowrap">{r.g.idNumber ? `${r.g.idType === 'passport' ? 'HC' : 'CCCD'} ${r.g.idNumber}` : <span className="text-red-600">thiếu</span>}</Td>
                    <Td>{r.g.address ?? ''}</Td>
                    <Td className="whitespace-nowrap">{fmtDate(r.b.checkIn, 'dd/MM')} → {fmtDate(r.b.checkOut, 'dd/MM')}</Td>
                    <Td>{r.b.declaredAt ? <Badge tone="ok">{fmtDateTime(r.b.declaredAt)}</Badge> : <Badge tone="warn">Chưa</Badge>}</Td>
                    <Td>{m.length > 0 && <Button size="sm" tone="secondary" onClick={() => setFix(r.g)}>Bổ sung</Button>}</Td>
                  </tr>
                )
              })}
            </Table>
          )}
        </div>
      </Card>

      <Card className="mt-4" title="Lịch sử khai báo">
        {s.declarations.length === 0 ? <p className="text-sm text-stone-500">Chưa có lần xuất nào.</p> : (
          <Table head={['Ngày lưu trú', 'Loại', 'Số khách', 'Xuất lúc', 'Người xuất', 'Cổng dịch vụ công', '']}>
            {s.declarations.map((d) => (
              <tr key={d.id}>
                <Td>{fmtDate(d.date)}</Td><Td>{d.foreign ? 'Người nước ngoài' : 'Người Việt'}</Td><Td className="tnum">{d.guestIds.length}</Td>
                <Td className="tnum">{fmtDateTime(d.exportedAt)}</Td><Td>{s.users.find((u) => u.id === d.by)?.name}</Td>
                <Td>{d.receiptCode ? <span className="font-mono text-xs">{d.receiptCode}</span> : <span className="text-stone-400">Chưa gửi</span>}</Td>
                <Td>{!d.receiptCode && perm('declaration', 'create') && <Button size="sm" tone="secondary" onClick={() => { const c = submitDeclarationPortal(d.id); s.toast(`Đã gửi (mô phỏng), biên nhận ${c}`) }}><Send size={14} /> Gửi cổng</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
        <p className="mt-2 text-xs text-stone-500">Gửi cổng là mô phỏng — tích hợp thật với hệ thống của Bộ Công an cần xác minh khả năng API (giai đoạn sau).</p>
      </Card>

      <Modal open={colOpen} onClose={() => setColOpen(false)} title="Cấu hình cột file xuất" footer={<><Button tone="secondary" onClick={() => saveCols(DEFAULT_COLS)}>Khôi phục mặc định</Button><Button onClick={() => setColOpen(false)}>Xong</Button></>}>
        <ul className="space-y-2">
          {cols.map((c, i) => (
            <li key={c.key} className="flex items-center gap-2">
              <input type="checkbox" className="accent-sea" checked={c.on} onChange={(e) => saveCols(cols.map((x) => (x.key === c.key ? { ...x, on: e.target.checked } : x)))} aria-label={`Xuất cột ${c.label}`} />
              <Input className="h-8" value={c.label} onChange={(e) => saveCols(cols.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))} />
              <Button size="sm" tone="ghost" onClick={() => move(i, -1)} aria-label="Lên"><ArrowUp size={14} /></Button>
              <Button size="sm" tone="ghost" onClick={() => move(i, 1)} aria-label="Xuống"><ArrowDown size={14} /></Button>
            </li>
          ))}
        </ul>
      </Modal>

      {fix && <FixModal guest={fix} onClose={() => setFix(undefined)} />}
    </div>
  )
}

function FixModal({ guest, onClose }: { guest: Guest; onClose: () => void }) {
  const [g, setG] = useState({ dob: guest.dob ?? '', gender: guest.gender ?? '', nationality: guest.nationality, idType: guest.idType ?? 'cccd', idNumber: guest.idNumber ?? '', address: guest.address ?? '' })
  return (
    <Modal open onClose={onClose} title={`Bổ sung thông tin — ${guest.name}`} footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={() => { updateGuest(guest.id, { ...g, gender: (g.gender || undefined) as Guest['gender'], idType: g.idType as Guest['idType'], dob: g.dob || undefined, idNumber: g.idNumber || undefined }, 'Bổ sung thông tin khai báo lưu trú'); onClose() }}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ngày sinh"><Input type="date" value={g.dob} onChange={(e) => setG({ ...g, dob: e.target.value })} /></Field>
        <Field label="Giới tính"><Select value={g.gender} onChange={(e) => setG({ ...g, gender: e.target.value })}><option value="">—</option><option value="M">Nam</option><option value="F">Nữ</option><option value="O">Khác</option></Select></Field>
        <Field label="Quốc tịch"><Input value={g.nationality} onChange={(e) => setG({ ...g, nationality: e.target.value })} /></Field>
        <Field label="Loại giấy tờ"><Select value={g.idType} onChange={(e) => setG({ ...g, idType: e.target.value as 'cccd' | 'passport' })}><option value="cccd">CCCD</option><option value="passport">Hộ chiếu</option></Select></Field>
        <Field label="Số giấy tờ"><Input value={g.idNumber} onChange={(e) => setG({ ...g, idNumber: e.target.value })} /></Field>
        <Field label="Địa chỉ"><Input value={g.address} onChange={(e) => setG({ ...g, address: e.target.value })} /></Field>
      </div>
    </Modal>
  )
}
