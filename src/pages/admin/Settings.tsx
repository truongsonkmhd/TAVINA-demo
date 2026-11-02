import { useState } from 'react'
import { Plus, Pencil, RotateCcw, Download, Upload } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Textarea, Modal, PageHeader, Table, Td, Tabs, Badge } from '@/components/ui'
import { MODULE_LABEL, ROLE_LABEL } from '@/lib/labels'
import type { Action, Module, RoleId, Settings as S, Staff } from '@/types'
import { updateSettings, upsertStaff, setRolePermission, resetRoles, exportStoreJson, importStoreJson } from '@/features/backoffice/actions'
import { usePerm, useRun } from '@/features/pms/components/common'

type Tab = 'hotel' | 'staff' | 'roles' | 'data'
const ACTIONS: { id: Action; label: string }[] = [{ id: 'view', label: 'Xem' }, { id: 'create', label: 'Tạo' }, { id: 'edit', label: 'Sửa' }, { id: 'delete', label: 'Xoá' }, { id: 'approve', label: 'Duyệt' }, { id: 'export', label: 'Xuất' }]

export default function Settings() {
  const [tab, setTab] = useState<Tab>('hotel')
  return (
    <div>
      <PageHeader title="Cài đặt" subtitle="Thông tin khách sạn, nhân sự, phân quyền theo vai trò, dữ liệu demo" />
      <Card>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'hotel', label: 'Khách sạn' }, { id: 'staff', label: 'Nhân sự & tài khoản' }, { id: 'roles', label: 'Phân quyền' }, { id: 'data', label: 'Dữ liệu demo' }]} />
        <div className="mt-4">{tab === 'hotel' ? <Hotel /> : tab === 'staff' ? <StaffTab /> : tab === 'roles' ? <Roles /> : <Data />}</div>
      </Card>
    </div>
  )
}

function Hotel() {
  const settings = useStore((s) => s.settings)
  const toast = useStore((s) => s.toast)
  const isOwner = useStore((s) => s.currentUser.roleId === 'owner')
  const [f, setF] = useState<S>(settings)
  const num = (k: keyof S) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: Number(e.target.value) })
  return (
    <div className="max-w-3xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên khách sạn"><Input disabled={!isOwner} value={f.hotelName} onChange={(e) => setF({ ...f, hotelName: e.target.value })} /></Field>
        <Field label="Điện thoại"><Input disabled={!isOwner} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Địa chỉ"><Input disabled={!isOwner} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field></div>
        <Field label="Giờ nhận phòng"><Input type="time" disabled={!isOwner} value={f.checkInTime} onChange={(e) => setF({ ...f, checkInTime: e.target.value })} /></Field>
        <Field label="Giờ trả phòng"><Input type="time" disabled={!isOwner} value={f.checkOutTime} onChange={(e) => setF({ ...f, checkOutTime: e.target.value })} /></Field>
        <Field label="Giờ night audit" hint="Chốt doanh thu ngày (RULE-09)"><Input type="number" min={0} max={23} disabled={!isOwner} value={f.nightAuditHour} onChange={num('nightAuditHour')} /></Field>
        <Field label="Thời gian giữ chỗ web (phút)" hint="RULE-03"><Input type="number" min={5} max={60} disabled={!isOwner} value={f.holdMinutes} onChange={num('holdMinutes')} /></Field>
        <Field label="Thuế GTGT (%)"><Input type="number" disabled={!isOwner} value={f.vatPct} onChange={num('vatPct')} /></Field>
        <Field label="Hoa hồng nhân viên (%)"><Input type="number" step={0.5} disabled={!isOwner} value={f.staffCommissionPct} onChange={num('staffCommissionPct')} /></Field>
        <Field label="Tích điểm: số tiền / 1 điểm"><Input type="number" step={1000} disabled={!isOwner} value={f.loyalty.pointsPerVnd} onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, pointsPerVnd: Number(e.target.value) } })} /></Field>
        <Field label="Ngưỡng hạng Bạc (điểm)"><Input type="number" disabled={!isOwner} value={f.loyalty.silverPoints} onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, silverPoints: Number(e.target.value) } })} /></Field>
        <Field label="Ngưỡng hạng Vàng (điểm)"><Input type="number" disabled={!isOwner} value={f.loyalty.goldPoints} onChange={(e) => setF({ ...f, loyalty: { ...f.loyalty, goldPoints: Number(e.target.value) } })} /></Field>
      </div>
      {isOwner ? <Button className="mt-4" onClick={() => {
        if (f.loyalty.goldPoints <= f.loyalty.silverPoints) return toast('Ngưỡng Vàng phải lớn hơn ngưỡng Bạc', 'err')
        updateSettings(f); toast('Đã lưu cài đặt')
      }}>Lưu cài đặt</Button> : <p className="mt-3 text-xs text-stone-500">Chỉ chủ khách sạn sửa được cài đặt. Hạn mức chiết khấu nằm ở mục Giá & chiết khấu.</p>}
    </div>
  )
}

function StaffTab() {
  const staff = useStore((s) => s.staff)
  const perm = usePerm()
  const [edit, setEdit] = useState<Partial<Staff>>()
  return (
    <>
      {perm('settings', 'edit') && <div className="mb-3 flex justify-end"><Button onClick={() => setEdit({ roleId: 'receptionist', active: true })}><Plus size={16} /> Nhân viên</Button></div>}
      <Table head={['Họ tên', 'Vai trò', 'SĐT', 'Trạng thái', '']}>
        {staff.map((x) => (
          <tr key={x.id} className={x.active ? '' : 'opacity-50'}>
            <Td className="font-medium">{x.name}</Td><Td>{ROLE_LABEL[x.roleId]}</Td><Td className="tnum">{x.phone}</Td>
            <Td><Badge tone={x.active ? 'ok' : 'neutral'}>{x.active ? 'Đang làm' : 'Đã khoá'}</Badge></Td>
            <Td>{perm('settings', 'edit') && <Button size="sm" tone="ghost" onClick={() => setEdit(x)} aria-label="Sửa"><Pencil size={14} /></Button>}</Td>
          </tr>
        ))}
      </Table>
      {edit && <StaffModal value={edit} onClose={() => setEdit(undefined)} />}
    </>
  )
}

function StaffModal({ value, onClose }: { value: Partial<Staff>; onClose: () => void }) {
  const me = useStore((s) => s.currentUser)
  const [f, setF] = useState<Partial<Staff>>({ name: '', phone: '', ...value })
  const [err, setErr] = useState<string>()
  const isOwnerTarget = value.roleId === 'owner'
  const save = () => {
    if (!f.name?.trim() || !f.phone?.trim()) return setErr('Nhập họ tên và SĐT')
    if (me.roleId !== 'owner' && (f.roleId === 'owner' || isOwnerTarget)) return setErr('Chỉ chủ khách sạn được gán hoặc sửa vai trò Chủ')
    if (value.id === me.id && f.active === false) return setErr('Không thể tự khoá tài khoản đang dùng')
    upsertStaff(f as Staff); onClose()
  }
  return (
    <Modal open onClose={onClose} title={value.id ? 'Sửa nhân viên' : 'Thêm nhân viên'} footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button onClick={save}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Họ tên"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="SĐT"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Vai trò"><Select value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value as RoleId })}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" className="accent-sea" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Đang làm việc</label>
      </div>
      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
    </Modal>
  )
}

function Roles() {
  const roles = useStore((s) => s.roles)
  const isOwner = useStore((s) => s.currentUser.roleId === 'owner')
  const [roleId, setRoleId] = useState<RoleId>('receptionist')
  const role = roles.find((r) => r.id === roleId)!
  const modules = Object.keys(MODULE_LABEL) as Module[]
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">{roles.map((r) => <button key={r.id} onClick={() => setRoleId(r.id)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${roleId === r.id ? 'bg-sea text-white' : 'bg-stone-100 hover:bg-stone-200'}`}>{ROLE_LABEL[r.id]}</button>)}</div>
        {isOwner && <Button size="sm" tone="secondary" onClick={() => confirm('Khôi phục toàn bộ phân quyền về mặc định?') && resetRoles()}><RotateCcw size={14} /> Khôi phục mặc định</Button>}
      </div>
      {!isOwner && <p className="mb-3 text-xs text-stone-500">Chỉ chủ khách sạn sửa được phân quyền. Mọi thay đổi được ghi nhật ký.</p>}
      <Table head={['Chức năng', ...ACTIONS.map((a) => a.label)]}>
        {modules.map((m) => (
          <tr key={m}>
            <Td className="font-medium">{MODULE_LABEL[m]}</Td>
            {ACTIONS.map((a) => (
              <Td key={a.id} className="text-center">
                <input type="checkbox" className="h-4 w-4 accent-sea" aria-label={`${ROLE_LABEL[roleId]} — ${MODULE_LABEL[m]} — ${a.label}`}
                  disabled={!isOwner || roleId === 'owner'} checked={!!role.permissions[m]?.includes(a.id)} onChange={(e) => setRolePermission(roleId, m, a.id, e.target.checked)} />
              </Td>
            ))}
          </tr>
        ))}
      </Table>
      {roleId === 'owner' && <p className="mt-2 text-xs text-stone-500">Vai trò Chủ khách sạn luôn có toàn quyền.</p>}
    </>
  )
}

function Data() {
  const resetDemo = useStore((s) => s.resetDemo)
  const toast = useStore((s) => s.toast)
  const run = useRun()
  const [json, setJson] = useState('')
  const onFile = (f?: File) => f && f.text().then(setJson)
  return (
    <div className="grid max-w-4xl gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-stone-200 p-4">
        <div className="font-semibold">Đặt lại dữ liệu mẫu</div>
        <p className="mt-1 text-sm text-stone-600">Xoá mọi thay đổi trong trình duyệt này và nạp lại dữ liệu demo ban đầu (theo ngày hôm nay).</p>
        <Button tone="danger" className="mt-3" onClick={() => { if (confirm('Đặt lại toàn bộ dữ liệu demo?')) { resetDemo(); toast('Đã đặt lại dữ liệu demo') } }}><RotateCcw size={16} /> Đặt lại</Button>
      </div>
      <div className="rounded-lg border border-stone-200 p-4">
        <div className="font-semibold">Sao lưu</div>
        <p className="mt-1 text-sm text-stone-600">Tải toàn bộ dữ liệu demo ra file JSON để chuyển sang máy khác hoặc lưu lại kịch bản demo.</p>
        <Button tone="secondary" className="mt-3" onClick={exportStoreJson}><Download size={16} /> Xuất JSON</Button>
      </div>
      <div className="rounded-lg border border-stone-200 p-4 md:col-span-2">
        <div className="font-semibold">Khôi phục từ JSON</div>
        <input type="file" accept="application/json,.json" className="mt-2 text-sm" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Chọn file JSON" />
        <Textarea rows={4} className="mt-2 font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} placeholder="Hoặc dán nội dung JSON vào đây" />
        <Button className="mt-2" disabled={!json.trim()} onClick={() => { if (run(importStoreJson(json), 'Đã nhập dữ liệu')) setJson('') }}><Upload size={16} /> Nhập dữ liệu</Button>
      </div>
    </div>
  )
}
