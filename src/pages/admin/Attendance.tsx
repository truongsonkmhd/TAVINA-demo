import { useMemo, useState } from 'react'
import { LogIn, LogOut, ChevronLeft, ChevronRight, Check, Pencil, Download } from 'lucide-react'
import { startOfWeek, format, parseISO } from 'date-fns'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Select, Modal, PageHeader, Table, Td, Badge, Stat, cx } from '@/components/ui'
import { fmtDate, today, addDaysISO, toISODate } from '@/lib/format'
import { ROLE_LABEL } from '@/lib/labels'
import type { Attendance as Att, ShiftCode } from '@/types'
import { setShift, clockIn, clockOut, editAttendance, approveAttendance, downloadCsv } from '@/features/backoffice/actions'
import { usePerm, useRun } from '@/features/pms/components/common'

const SHIFT: Record<ShiftCode, { label: string; time: string; cls: string }> = {
  morning: { label: 'Sáng', time: '06:00–14:00', cls: 'bg-sky-100 text-sky-800' },
  afternoon: { label: 'Chiều', time: '14:00–22:00', cls: 'bg-amber-100 text-amber-800' },
  night: { label: 'Đêm', time: '22:00–06:00', cls: 'bg-indigo-100 text-indigo-800' },
}
const START: Record<ShiftCode, string> = { morning: '06:00', afternoon: '14:00', night: '22:00' }
const mins = (t?: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : 0)
const hours = (a: Att) => (a.checkIn && a.checkOut ? ((mins(a.checkOut) - mins(a.checkIn) + 1440) % 1440) / 60 : 0)

export default function Attendance() {
  const s = useStore()
  const perm = usePerm()
  const run = useRun()
  const canManage = perm('attendance', 'edit')
  const me = s.currentUser
  const T = today()
  const [week, setWeek] = useState(toISODate(startOfWeek(new Date(), { weekStartsOn: 1 })))
  const [day, setDay] = useState(T)
  const [month, setMonth] = useState(T.slice(0, 7))
  const [outside, setOutside] = useState(false)
  const [edit, setEdit] = useState<Att>()
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(week, i))
  const staff = s.staff.filter((x) => x.active)
  const myToday = s.attendance.find((a) => a.staffId === me.id && a.date === T)
  const myShift = s.shifts.find((x) => x.staffId === me.id && x.date === T)

  const dayRows = s.attendance.filter((a) => a.date === day)
  const flagged = s.attendance.filter((a) => a.flagged)
  const monthly = useMemo(() => staff.map((st) => {
    const rows = s.attendance.filter((a) => a.staffId === st.id && a.date.startsWith(month))
    const late = rows.filter((a) => { const sh = s.shifts.find((x) => x.staffId === st.id && x.date === a.date); return sh && a.checkIn && mins(a.checkIn) > mins(START[sh.shift]) + 10 }).length
    const nights = s.shifts.filter((x) => x.staffId === st.id && x.date.startsWith(month) && x.shift === 'night').length
    return { st, days: rows.filter((a) => a.checkIn).length, hours: rows.reduce((x, a) => x + hours(a), 0), late, nights, flagged: rows.filter((a) => a.flagged).length }
  }), [staff, s.attendance, s.shifts, month])

  return (
    <div>
      <PageHeader title="Chấm công" subtitle="Phân ca, chấm công trên điện thoại (kiểm tra bán kính GPS), bảng công tháng — không tính lương" />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card title="Chấm công hôm nay">
          <p className="text-sm"><b>{me.name}</b> · {ROLE_LABEL[me.roleId]}</p>
          <p className="text-sm text-stone-600">Ca: {myShift ? `${SHIFT[myShift.shift].label} (${SHIFT[myShift.shift].time})` : 'không có ca'}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-stone-50 p-3"><div className="text-xs text-stone-500">Vào</div><div className="tnum text-2xl font-bold">{myToday?.checkIn ?? '--:--'}</div></div>
            <div className="rounded-lg bg-stone-50 p-3"><div className="text-xs text-stone-500">Ra</div><div className="tnum text-2xl font-bold">{myToday?.checkOut ?? '--:--'}</div></div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-sea" checked={outside} onChange={(e) => setOutside(e.target.checked)} />Giả lập ở ngoài bán kính 100 m</label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="lg" disabled={!!myToday?.checkIn} onClick={() => run(clockIn(me.id, outside), outside ? 'Đã chấm vào — ngoài bán kính, chờ duyệt' : 'Đã chấm vào')}><LogIn size={18} /> Chấm vào</Button>
            <Button size="lg" tone="secondary" disabled={!myToday?.checkIn || !!myToday.checkOut} onClick={() => run(clockOut(me.id, outside), 'Đã chấm ra')}><LogOut size={18} /> Chấm ra</Button>
          </div>
          {myToday?.flagged && <p className="mt-2 text-xs text-amber-700">Lượt chấm công gắn cờ — chờ quản lý duyệt.</p>}
        </Card>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Có mặt hôm nay" value={s.attendance.filter((a) => a.date === T && a.checkIn).length} sub={`/ ${s.shifts.filter((x) => x.date === T).length} người có ca`} />
          <Stat label="Chờ duyệt (ngoài GPS)" value={flagged.length} tone={flagged.length ? 'warn' : 'ok'} />
          <Stat label="Đi muộn tháng này" value={monthly.reduce((x, m) => x + m.late, 0)} />
          <Stat label="Tổng giờ tháng" value={Math.round(monthly.reduce((x, m) => x + m.hours, 0))} />
        </div>
      </div>

      <Card className="mt-4" title="Lịch ca tuần" actions={<div className="flex items-center gap-1">
        <Button size="sm" tone="ghost" onClick={() => setWeek(addDaysISO(week, -7))} aria-label="Tuần trước"><ChevronLeft size={16} /></Button>
        <span className="text-sm">{fmtDate(days[0], 'dd/MM')} – {fmtDate(days[6], 'dd/MM')}</span>
        <Button size="sm" tone="ghost" onClick={() => setWeek(addDaysISO(week, 7))} aria-label="Tuần sau"><ChevronRight size={16} /></Button>
      </div>}>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="text-xs text-stone-500"><th className="px-2 py-2 text-left">Nhân viên</th>{days.map((d) => <th key={d} className={cx('px-1 py-2', d === T && 'text-sea')}>{format(parseISO(d), 'EEE dd/MM')}</th>)}</tr></thead>
            <tbody>
              {staff.map((st) => (
                <tr key={st.id} className={cx('border-t border-stone-100', st.id === me.id && 'bg-sand/50')}>
                  <td className="px-2 py-1.5"><div className="font-medium">{st.name}</div><div className="text-xs text-stone-500">{ROLE_LABEL[st.roleId]}</div></td>
                  {days.map((d) => {
                    const sh = s.shifts.find((x) => x.staffId === st.id && x.date === d)
                    return (
                      <td key={d} className="px-1 py-1.5 text-center">
                        {canManage ? (
                          <select className={cx('w-full rounded border-0 px-1 py-1 text-xs font-medium', sh ? SHIFT[sh.shift].cls : 'bg-stone-50 text-stone-400')} value={sh?.shift ?? ''} onChange={(e) => setShift(st.id, d, e.target.value as ShiftCode | '')} aria-label={`Ca ${st.name} ${d}`}>
                            <option value="">—</option>{Object.entries(SHIFT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        ) : sh ? <span className={cx('rounded px-2 py-1 text-xs font-medium', SHIFT[sh.shift].cls)}>{SHIFT[sh.shift].label}</span> : <span className="text-stone-300">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!canManage && <p className="mt-2 text-xs text-stone-500">Chỉ quản lý sửa được lịch ca.</p>}
      </Card>

      <Card className="mt-4" title="Chấm công theo ngày" actions={<Input type="date" className="h-9 w-40" value={day} onChange={(e) => setDay(e.target.value)} />}>
        <Table head={['Nhân viên', 'Ca', 'Vào', 'Ra', 'Giờ làm', 'Ghi chú', '']}>
          {staff.map((st) => {
            const a = dayRows.find((x) => x.staffId === st.id)
            const sh = s.shifts.find((x) => x.staffId === st.id && x.date === day)
            const late = sh && a?.checkIn && mins(a.checkIn) > mins(START[sh.shift]) + 10
            return (
              <tr key={st.id} className={a?.flagged ? 'bg-amber-50' : ''}>
                <Td className="font-medium">{st.name}</Td>
                <Td>{sh ? SHIFT[sh.shift].label : '—'}</Td>
                <Td className={cx('tnum', late && 'font-semibold text-red-700')}>{a?.checkIn ?? '—'}{late && ' (muộn)'}</Td>
                <Td className="tnum">{a?.checkOut ?? '—'}</Td>
                <Td className="tnum">{a ? hours(a).toFixed(1) : ''}</Td>
                <Td className="text-xs">{a?.flagged && <Badge tone="warn">Ngoài GPS</Badge>} {a?.note}</Td>
                <Td>{a && canManage && <div className="flex gap-1">{a.flagged && <Button size="sm" onClick={() => approveAttendance(a.id)}><Check size={14} /> Duyệt</Button>}<Button size="sm" tone="ghost" onClick={() => setEdit(a)} aria-label="Sửa công"><Pencil size={14} /></Button></div>}</Td>
              </tr>
            )
          })}
        </Table>
      </Card>

      <Card className="mt-4" title="Bảng công tháng" actions={<div className="flex gap-2"><Input type="month" className="h-9 w-40" value={month} onChange={(e) => setMonth(e.target.value)} />
        <Button size="sm" tone="secondary" onClick={() => downloadCsv(`bang-cong-${month}.csv`, [['Nhân viên', 'Vai trò', 'Ngày công', 'Giờ làm', 'Ca đêm', 'Đi muộn', 'Chờ duyệt'], ...monthly.map((m) => [m.st.name, ROLE_LABEL[m.st.roleId], m.days, m.hours.toFixed(1), m.nights, m.late, m.flagged])])}><Download size={14} /> Xuất CSV</Button></div>}>
        <Table head={['Nhân viên', 'Vai trò', 'Ngày công', 'Giờ làm', 'Ca đêm', 'Đi muộn', 'Chờ duyệt']}>
          {monthly.map((m) => (
            <tr key={m.st.id}><Td className="font-medium">{m.st.name}</Td><Td>{ROLE_LABEL[m.st.roleId]}</Td><Td className="tnum">{m.days}</Td><Td className="tnum">{m.hours.toFixed(1)}</Td><Td className="tnum">{m.nights}</Td><Td className={cx('tnum', m.late && 'text-red-700')}>{m.late}</Td><Td className="tnum">{m.flagged}</Td></tr>
          ))}
        </Table>
      </Card>

      {edit && <EditModal a={edit} onClose={() => setEdit(undefined)} />}
    </div>
  )
}

function EditModal({ a, onClose }: { a: Att; onClose: () => void }) {
  const [v, setV] = useState({ checkIn: a.checkIn ?? '', checkOut: a.checkOut ?? '', reason: '' })
  return (
    <Modal open onClose={onClose} title="Sửa công" footer={<><Button tone="secondary" onClick={onClose}>Huỷ</Button><Button disabled={!v.reason.trim()} onClick={() => { editAttendance(a.id, { checkIn: v.checkIn || undefined, checkOut: v.checkOut || undefined }, v.reason.trim()); onClose() }}>Lưu</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Giờ vào"><Input type="time" value={v.checkIn} onChange={(e) => setV({ ...v, checkIn: e.target.value })} /></Field>
        <Field label="Giờ ra"><Input type="time" value={v.checkOut} onChange={(e) => setV({ ...v, checkOut: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Lý do sửa" required><Input value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} placeholder="VD: quên chấm ra" /></Field></div>
      </div>
    </Modal>
  )
}
