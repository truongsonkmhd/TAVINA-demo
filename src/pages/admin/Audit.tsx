import { useState } from 'react'
import { Download, Search } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Input, Select, PageHeader, Table, Td, Empty } from '@/components/ui'
import { fmtDateTime } from '@/lib/format'
import { downloadCsv } from '@/features/backoffice/actions'

const ENTITY: Record<string, string> = {
  booking: 'Booking', room: 'Phòng', ratePlan: 'Gói giá', guest: 'Khách', invoice: 'Hoá đơn', role: 'Phân quyền', settings: 'Cài đặt', channel: 'Kênh', sync: 'Đồng bộ',
  item: 'Kho', attendance: 'Chấm công', shift: 'Ca', declaration: 'Khai báo', debt: 'Công nợ', campaign: 'Chiến dịch', conversation: 'Hội thoại', lead: 'Lead', cms: 'Nội dung web',
  staff: 'Nhân sự', group: 'Đoàn', promotions: 'Ưu đãi', combos: 'Combo', coupons: 'Mã giảm giá',
}
const PAGE = 30
const short = (v: unknown) => (v === undefined ? '' : JSON.stringify(v))

export default function Audit() {
  const logs = useStore((s) => s.auditLogs)
  const users = useStore((s) => s.users)
  const [q, setQ] = useState('')
  const [user, setUser] = useState('')
  const [entity, setEntity] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string>()

  const term = q.trim().toLowerCase()
  const rows = logs.filter((l) => (!user || l.userId === user) && (!entity || l.entity === entity) && (!from || l.at.slice(0, 10) >= from) && (!to || l.at.slice(0, 10) <= to)
    && (!term || l.action.toLowerCase().includes(term) || l.userName.toLowerCase().includes(term) || (l.entityId ?? '').toLowerCase().includes(term)))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const shown = rows.slice((page - 1) * PAGE, page * PAGE)
  const entities = [...new Set(logs.map((l) => l.entity))]
  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1) }

  return (
    <div>
      <PageHeader title="Nhật ký thao tác" subtitle="Ai làm gì, lúc nào, giá trị trước/sau — lưu tối thiểu 12 tháng"
        actions={<Button tone="secondary" onClick={() => downloadCsv('nhat-ky.csv', [['Thời gian', 'Người', 'Hành động', 'Đối tượng', 'ID', 'Trước', 'Sau'], ...rows.map((l) => [fmtDateTime(l.at), l.userName, l.action, ENTITY[l.entity] ?? l.entity, l.entityId, short(l.before), short(l.after)])])}><Download size={16} /> Xuất CSV</Button>} />
      <Card>
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <label className="relative"><Search size={16} className="absolute left-3 top-3 text-stone-400" /><Input className="pl-9" placeholder="Hành động, người, ID" value={q} onChange={(e) => reset(setQ)(e.target.value)} aria-label="Tìm" /></label>
          <Select value={user} onChange={(e) => reset(setUser)(e.target.value)} aria-label="Người"><option value="">Mọi người</option><option value="system">Hệ thống</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Select value={entity} onChange={(e) => reset(setEntity)(e.target.value)} aria-label="Đối tượng"><option value="">Mọi đối tượng</option>{entities.map((e) => <option key={e} value={e}>{ENTITY[e] ?? e}</option>)}</Select>
          <Input type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} aria-label="Từ ngày" />
          <Input type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} aria-label="Đến ngày" />
        </div>
        <div className="mt-4">
          {shown.length === 0 ? <Empty title="Không có bản ghi" /> : (
            <Table head={['Thời gian', 'Người', 'Hành động', 'Đối tượng', 'ID', 'Trước → sau']}>
              {shown.map((l) => (
                <tr key={l.id} className="align-top">
                  <Td className="tnum whitespace-nowrap text-xs">{fmtDateTime(l.at)}</Td>
                  <Td className="whitespace-nowrap">{l.userName}</Td>
                  <Td>{l.action}</Td>
                  <Td>{ENTITY[l.entity] ?? l.entity}</Td>
                  <Td className="font-mono text-xs">{l.entityId}</Td>
                  <Td className="max-w-md">
                    {(l.before !== undefined || l.after !== undefined) && (
                      <button onClick={() => setOpen(open === l.id ? undefined : l.id)} className="text-left font-mono text-xs text-stone-600 hover:text-ink">
                        {open === l.id ? (
                          <span className="block space-y-1"><span className="block rounded bg-red-50 p-1">− {JSON.stringify(l.before, null, 1)}</span><span className="block rounded bg-emerald-50 p-1">+ {JSON.stringify(l.after, null, 1)}</span></span>
                        ) : <span className="line-clamp-1">{short(l.before)} → {short(l.after)}</span>}
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
          <span>{rows.length} bản ghi</span>
          {pages > 1 && <div className="flex items-center gap-2"><Button size="sm" tone="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button><span className="tnum">{page}/{pages}</span><Button size="sm" tone="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</Button></div>}
        </div>
      </Card>
    </div>
  )
}
