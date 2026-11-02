import { useMemo, useState } from 'react'
import { Plus, Pencil, PackagePlus, PackageMinus, ClipboardCheck, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Modal, PageHeader, Table, Td, Tabs, Badge, Stat, cx } from '@/components/ui'
import { vnd, num, fmtDate, today, addDaysISO } from '@/lib/format'
import type { Item, ItemGroup, StockMove } from '@/types'
import { upsertItem, downloadCsv } from '@/features/backoffice/actions'
import { usePerm } from '@/features/pms/components/common'

type Tab = 'stock' | 'moves' | 'count' | 'usage'
const GROUP: Record<ItemGroup, string> = { minibar: 'Minibar', amenity: 'Đồ dùng phòng', linen: 'Vải vóc', chemical: 'Hoá chất', other: 'Khác' }
const MOVE: Record<StockMove['type'], string> = { in: 'Nhập', out: 'Xuất', count: 'Kiểm kê' }

export default function Inventory() {
  const s = useStore()
  const perm = usePerm()
  const canEdit = perm('inventory', 'create')
  const [tab, setTab] = useState<Tab>('stock')
  const [item, setItem] = useState<Partial<Item>>()
  const [slip, setSlip] = useState<'in' | 'out'>()
  const low = s.items.filter((i) => i.stock < i.minStock)
  const value = s.items.reduce((x, i) => x + i.stock * i.cost, 0)

  return (
    <div>
      <PageHeader title="Kho" subtitle="Vật tư, minibar, đồ dùng phòng: nhập – xuất – tồn, định mức, kiểm kê"
        actions={canEdit && <>
          <Button tone="secondary" onClick={() => setItem({})}><Plus size={16} /> Vật tư</Button>
          <Button tone="secondary" onClick={() => setSlip('out')}><PackageMinus size={16} /> Phiếu xuất</Button>
          <Button onClick={() => setSlip('in')}><PackagePlus size={16} /> Phiếu nhập</Button>
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Số mặt hàng" value={s.items.length} />
        <Stat label="Giá trị tồn" value={vnd(value)} />
        <Stat label="Dưới tồn tối thiểu" value={low.length} tone={low.length ? 'err' : 'ok'} sub={low.map((i) => i.name).join(', ') || 'Không có'} />
        <Stat label="Phiếu 30 ngày" value={s.stockMoves.filter((m) => m.date >= addDaysISO(today(), -30)).length} />
      </div>
      <Card>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'stock', label: 'Tồn kho' }, { id: 'moves', label: 'Phiếu nhập – xuất' }, { id: 'count', label: 'Kiểm kê' }, { id: 'usage', label: 'Tiêu hao & định mức' }]} />
        <div className="mt-4">
          {tab === 'stock' && <StockTab onEdit={setItem} canEdit={perm('inventory', 'edit')} />}
          {tab === 'moves' && <MovesTab />}
          {tab === 'count' && <CountTab canEdit={canEdit} />}
          {tab === 'usage' && <UsageTab />}
        </div>
      </Card>
      {item && <ItemModal value={item} onClose={() => setItem(undefined)} />}
      {slip && <SlipModal type={slip} onClose={() => setSlip(undefined)} />}
    </div>
  )
}

function StockTab({ onEdit, canEdit }: { onEdit: (i: Item) => void; canEdit: boolean }) {
  const items = useStore((s) => s.items)
  const [group, setGroup] = useState<ItemGroup | ''>('')
  const shown = items.filter((i) => !group || i.group === group)
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Select className="h-9 w-48" value={group} onChange={(e) => setGroup(e.target.value as ItemGroup | '')}><option value="">Mọi nhóm</option>{Object.entries(GROUP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Button size="sm" tone="ghost" onClick={() => downloadCsv(`ton-kho-${today()}.csv`, [['Mã', 'Tên', 'Nhóm', 'ĐVT', 'Tồn', 'Tối thiểu', 'Giá vốn', 'Giá trị'], ...shown.map((i) => [i.sku, i.name, GROUP[i.group], i.unit, i.stock, i.minStock, i.cost, i.stock * i.cost])])}>Xuất CSV</Button>
      </div>
      <Table head={['Mã', 'Tên', 'Nhóm', 'Tồn', 'Tối thiểu', 'Định mức/phòng', 'Giá vốn', 'Giá bán', '']}>
        {shown.map((i) => (
          <tr key={i.id} className={i.stock < i.minStock ? 'bg-red-50' : ''}>
            <Td className="font-mono text-xs">{i.sku}</Td><Td className="font-medium">{i.name}</Td><Td>{GROUP[i.group]}</Td>
            <Td className={cx('tnum font-semibold', i.stock < i.minStock && 'text-red-700')}>{num(i.stock)} {i.unit}</Td>
            <Td className="tnum">{num(i.minStock)}</Td><Td className="tnum">{i.perRoomNorm ?? '—'}</Td>
            <Td className="tnum">{vnd(i.cost)}</Td><Td className="tnum">{i.sellPrice ? vnd(i.sellPrice) : '—'}</Td>
            <Td>{canEdit && <Button size="sm" tone="ghost" onClick={() => onEdit(i)} aria-label="Sửa"><Pencil size={14} /></Button>}</Td>
          </tr>
        ))}
      </Table>
    </>
  )
}

function MovesTab() {
  const s = useStore()
  const [type, setType] = useState<StockMove['type'] | ''>('')
  const [itemId, setItemId] = useState('')
  const moves = s.stockMoves.filter((m) => (!type || m.type === type) && (!itemId || m.itemId === itemId))
  const refLabel = (m: StockMove) => s.rooms.find((r) => r.id === m.ref) ? `Phòng ${s.rooms.find((r) => r.id === m.ref)!.number}` : m.ref ?? ''
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <Select className="h-9 w-36" value={type} onChange={(e) => setType(e.target.value as StockMove['type'] | '')}><option value="">Mọi loại</option>{Object.entries(MOVE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select className="h-9 w-56" value={itemId} onChange={(e) => setItemId(e.target.value)}><option value="">Mọi vật tư</option>{s.items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
      </div>
      <Table head={['Ngày', 'Loại', 'Vật tư', 'SL', 'Đơn giá', 'Đối tượng', 'Người lập', 'Ghi chú']}>
        {moves.slice(0, 80).map((m) => {
          const it = s.items.find((i) => i.id === m.itemId)
          return (
            <tr key={m.id}>
              <Td className="whitespace-nowrap">{fmtDate(m.date)}</Td>
              <Td><Badge tone={m.type === 'in' ? 'ok' : m.type === 'out' ? 'warn' : 'info'}>{MOVE[m.type]}</Badge></Td>
              <Td>{it?.name}</Td><Td className="tnum">{m.type === 'out' ? '−' : m.type === 'in' ? '+' : '='}{num(m.qty)}</Td>
              <Td className="tnum">{m.unitCost ? vnd(m.unitCost) : ''}</Td><Td>{refLabel(m)}</Td>
              <Td>{s.users.find((u) => u.id === m.by)?.name ?? m.by}</Td><Td className="text-xs">{m.note}</Td>
            </tr>
          )
        })}
      </Table>
    </>
  )
}

function CountTab({ canEdit }: { canEdit: boolean }) {
  const s = useStore()
  const [counted, setCounted] = useState<Record<string, string>>({})
  const diffs = s.items.map((i) => ({ i, c: counted[i.id] === undefined || counted[i.id] === '' ? undefined : Number(counted[i.id]) })).filter((x) => x.c !== undefined)
  const save = () => {
    for (const { i, c } of diffs) s.addStockMove({ itemId: i.id, type: 'count', qty: c!, date: today(), by: s.currentUser.id, note: c === i.stock ? 'Kiểm kê: khớp' : `Kiểm kê: lệch ${c! - i.stock > 0 ? '+' : ''}${c! - i.stock}` })
    s.toast(`Đã ghi kiểm kê ${diffs.length} mặt hàng`); setCounted({})
  }
  return (
    <>
      <p className="mb-3 text-sm text-stone-600">Nhập số đếm thực tế; để trống những mặt hàng không kiểm. Tồn hệ thống được cập nhật theo số đếm.</p>
      <Table head={['Vật tư', 'Tồn hệ thống', 'Số đếm thực', 'Chênh lệch', 'Giá trị lệch']}>
        {s.items.map((i) => {
          const c = counted[i.id] === undefined || counted[i.id] === '' ? undefined : Number(counted[i.id])
          const d = c === undefined ? undefined : c - i.stock
          return (
            <tr key={i.id}>
              <Td>{i.name}</Td><Td className="tnum">{num(i.stock)} {i.unit}</Td>
              <Td><Input type="number" min={0} className="h-8 w-28" disabled={!canEdit} value={counted[i.id] ?? ''} onChange={(e) => setCounted({ ...counted, [i.id]: e.target.value })} /></Td>
              <Td className={cx('tnum font-semibold', d && d < 0 && 'text-red-700', d && d > 0 && 'text-emerald-700')}>{d === undefined ? '' : d > 0 ? `+${d}` : d}</Td>
              <Td className="tnum">{d ? vnd(d * i.cost) : ''}</Td>
            </tr>
          )
        })}
      </Table>
      {canEdit && <div className="mt-3 flex justify-end"><Button disabled={!diffs.length} onClick={save}><ClipboardCheck size={16} /> Ghi kiểm kê ({diffs.length})</Button></div>}
    </>
  )
}

function UsageTab() {
  const s = useStore()
  const from = addDaysISO(today(), -30)
  const roomNights = s.folioLines.filter((f) => f.type === 'room' && f.date >= from).length
  const rows = useMemo(() => s.items.map((i) => {
    const out = s.stockMoves.filter((m) => m.itemId === i.id && m.type === 'out' && m.date >= from).reduce((x, m) => x + m.qty, 0)
    return { i, out, perNight: roomNights ? out / roomNights : 0, cost: out * i.cost }
  }), [s.items, s.stockMoves, from, roomNights])
  const minibarByRoom = s.rooms.map((r) => ({ r, used: s.stockMoves.filter((m) => m.ref === r.id && m.type === 'out').reduce((x, m) => x + m.qty, 0) })).filter((x) => x.used > 0)
  return (
    <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
      <div>
        <p className="mb-2 text-sm text-stone-600">30 ngày qua · {num(roomNights)} phòng-đêm bán</p>
        <Table head={['Vật tư', 'Đã xuất', 'Trên mỗi phòng-đêm', 'Định mức', 'Chi phí']}>
          {rows.map(({ i, out, perNight, cost }) => (
            <tr key={i.id}>
              <Td>{i.name}</Td><Td className="tnum">{num(out)} {i.unit}</Td>
              <Td className={cx('tnum', i.perRoomNorm && perNight > i.perRoomNorm && 'font-semibold text-red-700')}>{perNight.toFixed(2)}</Td>
              <Td className="tnum">{i.perRoomNorm ?? '—'}</Td><Td className="tnum">{vnd(cost)}</Td>
            </tr>
          ))}
        </Table>
        <p className="mt-2 text-xs text-stone-500">Đỏ: tiêu hao vượt định mức/phòng-đêm — cần kiểm tra thất thoát.</p>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold">Minibar đã dùng theo phòng</div>
        {minibarByRoom.length === 0 ? <p className="text-sm text-stone-500">Chưa ghi nhận minibar theo phòng.</p> : (
          <ul className="divide-y divide-stone-100 text-sm">{minibarByRoom.map(({ r, used }) => <li key={r.id} className="flex justify-between py-1.5"><span>Phòng {r.number}</span><span className="tnum">{used} món</span></li>)}</ul>
        )}
        <div className="mt-4 text-sm font-semibold">Định mức minibar mỗi phòng</div>
        <ul className="mt-1 text-sm text-stone-600">{s.items.filter((i) => i.group === 'minibar').map((i) => <li key={i.id}>{i.name}: {i.perRoomNorm ?? 2} {i.unit} × {s.rooms.length} phòng = <b className="tnum">{(i.perRoomNorm ?? 2) * s.rooms.length}</b> cần có</li>)}</ul>
      </div>
    </div>
  )
}

function ItemModal({ value, onClose }: { value: Partial<Item>; onClose: () => void }) {
  const [i, setI] = useState<Partial<Item>>({ name: '', group: 'amenity', unit: 'cái', cost: 0, minStock: 0, ...value })
  const [err, setErr] = useState<string>()
  const save = () => {
    if (!i.name?.trim() || !i.unit?.trim()) return setErr('Nhập tên và đơn vị tính')
    upsertItem(i as Item); onClose()
  }
  return (
    <Modal open onClose={onClose} title={value.id ? 'Sửa vật tư' : 'Thêm vật tư'} footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên"><Input value={i.name} onChange={(e) => setI({ ...i, name: e.target.value })} /></Field>
        <Field label="Mã (SKU)"><Input value={i.sku ?? ''} onChange={(e) => setI({ ...i, sku: e.target.value })} placeholder="Tự sinh nếu để trống" /></Field>
        <Field label="Nhóm"><Select value={i.group} onChange={(e) => setI({ ...i, group: e.target.value as ItemGroup })}>{Object.entries(GROUP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <Field label="Đơn vị tính"><Input value={i.unit} onChange={(e) => setI({ ...i, unit: e.target.value })} /></Field>
        <Field label="Giá vốn"><Input type="number" value={i.cost} onChange={(e) => setI({ ...i, cost: Number(e.target.value) })} /></Field>
        <Field label="Giá bán (minibar)"><Input type="number" value={i.sellPrice ?? ''} onChange={(e) => setI({ ...i, sellPrice: e.target.value ? Number(e.target.value) : undefined })} /></Field>
        <Field label="Tồn tối thiểu"><Input type="number" value={i.minStock} onChange={(e) => setI({ ...i, minStock: Number(e.target.value) })} /></Field>
        <Field label="Định mức/phòng"><Input type="number" value={i.perRoomNorm ?? ''} onChange={(e) => setI({ ...i, perRoomNorm: e.target.value ? Number(e.target.value) : undefined })} /></Field>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Modal>
  )
}

function SlipModal({ type, onClose }: { type: 'in' | 'out'; onClose: () => void }) {
  const s = useStore()
  const perm = usePerm()
  const canNegative = perm('inventory', 'approve')
  const [ref, setRef] = useState('')
  const [note, setNote] = useState('')
  const [lines, setLines] = useState([{ itemId: s.items[0]?.id ?? '', qty: 1, cost: s.items[0]?.cost ?? 0 }])
  const [negative, setNegative] = useState(false)
  const [errs, setErrs] = useState<string[]>([])
  const save = () => {
    if (!ref.trim()) return setErrs([type === 'in' ? 'Nhập nhà cung cấp' : 'Nhập bộ phận / phòng nhận'])
    const e: string[] = []
    for (const l of lines.filter((x) => x.qty > 0)) {
      const r = s.addStockMove({ itemId: l.itemId, type, qty: l.qty, unitCost: type === 'in' ? l.cost : undefined, date: today(), by: s.currentUser.id, ref: ref.trim(), note: [note, negative ? '[cho âm kho]' : ''].filter(Boolean).join(' ') || undefined })
      if (r.error) e.push(r.error)
    }
    if (e.length) return setErrs(e)
    s.toast(`Đã lưu phiếu ${type === 'in' ? 'nhập' : 'xuất'}`); onClose()
  }
  const total = lines.reduce((x, l) => x + l.qty * l.cost, 0)
  return (
    <Modal open onClose={onClose} title={type === 'in' ? 'Phiếu nhập kho' : 'Phiếu xuất kho'} wide footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu phiếu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={type === 'in' ? 'Nhà cung cấp' : 'Bộ phận / phòng nhận'}><Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={type === 'in' ? 'VD: Đại lý nước Phú Yên' : 'VD: Buồng phòng tầng 2'} /></Field>
        <Field label={type === 'in' ? 'Số chứng từ / ghi chú' : 'Lý do'}><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
      <div className="mt-4 space-y-2">
        {lines.map((l, idx) => {
          const it = s.items.find((x) => x.id === l.itemId)
          return (
            <div key={idx} className="grid grid-cols-[1fr_90px_120px_36px] items-center gap-2">
              <Select value={l.itemId} onChange={(e) => setLines(lines.map((x, j) => (j === idx ? { ...x, itemId: e.target.value, cost: s.items.find((y) => y.id === e.target.value)?.cost ?? 0 } : x)))}>{s.items.map((x) => <option key={x.id} value={x.id}>{x.name} (tồn {x.stock})</option>)}</Select>
              <Input type="number" min={1} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === idx ? { ...x, qty: Number(e.target.value) } : x)))} aria-label="Số lượng" />
              {type === 'in' ? <Input type="number" value={l.cost} onChange={(e) => setLines(lines.map((x, j) => (j === idx ? { ...x, cost: Number(e.target.value) } : x)))} aria-label="Đơn giá" /> : <span className={cx('text-xs', it && l.qty > it.stock ? 'text-red-600' : 'text-stone-500')}>{it && l.qty > it.stock ? `Vượt tồn ${l.qty - it.stock}` : `Còn ${it?.stock ?? 0}`}</span>}
              <Button tone="ghost" size="sm" onClick={() => setLines(lines.filter((_, j) => j !== idx))} aria-label="Xoá dòng"><Trash2 size={14} /></Button>
            </div>
          )
        })}
        <Button size="sm" tone="secondary" onClick={() => setLines([...lines, { itemId: s.items[0]?.id ?? '', qty: 1, cost: s.items[0]?.cost ?? 0 }])}>+ Dòng</Button>
      </div>
      {type === 'in' && <p className="mt-3 text-sm">Tổng tiền: <b className="tnum">{vnd(total)}</b></p>}
      {type === 'out' && canNegative && <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-sea" checked={negative} onChange={(e) => setNegative(e.target.checked)} />Cho phép âm kho (quản lý xác nhận)</label>}
      {errs.length > 0 && <ul className="mt-3 space-y-1 rounded bg-red-50 p-2 text-sm text-red-700">{errs.map((e) => <li key={e}>{e}</li>)}</ul>}
    </Modal>
  )
}
