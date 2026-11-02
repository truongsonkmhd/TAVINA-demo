import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Menu, X, RotateCcw, ExternalLink, CalendarDays, LayoutGrid, BedDouble, BookOpen, Tag, Percent, Package, Clock, FileText, Receipt, BarChart3,
  Users, Inbox, Share2, Settings, ScrollText, MessageSquareText, Newspaper, ChevronLeft, ChevronRight, Bell, Check, type LucideIcon,
} from 'lucide-react'
import { useStore } from '@/store'
import { can, homeFor } from '@/lib/permissions'
import { MODULE_LABEL, ROLE_LABEL } from '@/lib/labels'
import type { Module, RoleId } from '@/types'
import { Toasts, cx } from '@/components/ui'

const NAV: { module: Module; to: string; icon: LucideIcon }[] = [
  { module: 'dashboard', to: '/admin', icon: LayoutGrid },
  { module: 'calendar', to: '/admin/calendar', icon: CalendarDays },
  { module: 'rooms', to: '/admin/rooms', icon: BedDouble },
  { module: 'bookings', to: '/admin/bookings', icon: BookOpen },
  { module: 'rates', to: '/admin/rates', icon: Tag },
  { module: 'promotions', to: '/admin/promotions', icon: Percent },
  { module: 'channels', to: '/admin/channels', icon: Share2 },
  { module: 'invoices', to: '/admin/invoices', icon: Receipt },
  { module: 'declaration', to: '/admin/declaration', icon: FileText },
  { module: 'inventory', to: '/admin/inventory', icon: Package },
  { module: 'attendance', to: '/admin/attendance', icon: Clock },
  { module: 'reports', to: '/admin/reports', icon: BarChart3 },
  { module: 'crm', to: '/admin/crm', icon: Users },
  { module: 'inbox', to: '/admin/inbox', icon: Inbox },
  { module: 'leads', to: '/admin/leads', icon: MessageSquareText },
  { module: 'cms', to: '/admin/cms', icon: Newspaper },
  { module: 'settings', to: '/admin/settings', icon: Settings },
  { module: 'audit', to: '/admin/audit', icon: ScrollText },
]

const ROLE_LEVEL: Record<RoleId, number> = { owner: 5, manager: 4, accountant: 3, receptionist: 3, storekeeper: 2, housekeeping: 1 }
const initials = (name: string) => name.split(' ').filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase()
const LS_COLLAPSE = 'tavina-sidebar-collapsed'

/** Ảnh đại diện chữ cái + huy hiệu cấp */
function Avatar({ name, level, size = 'md' }: { name: string; level: number; size?: 'sm' | 'md' }) {
  return (
    <span className="relative inline-block shrink-0">
      <span className={cx('grid place-items-center rounded-full bg-pink-500 font-bold text-white ring-2 ring-pink-200', size === 'md' ? 'h-11 w-11 text-sm' : 'h-8 w-8 text-xs')}>{initials(name)}</span>
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded border border-stone-300 bg-white px-1 text-[9px] font-semibold leading-tight text-ink">Lv.{level}</span>
    </span>
  )
}

/** Thông báo: các việc cần xử lý lấy từ dữ liệu PMS */
function useAlerts() {
  const s = useStore()
  const T = new Date().toISOString().slice(0, 10)
  const list: { text: string; to: string }[] = []
  const overbooked = s.bookings.filter((b) => b.overbooked && ['confirmed', 'hold'].includes(b.status)).length
  const pending = s.bookings.filter((b) => b.discountStatus === 'pending').length
  const newConv = s.conversations.filter((c) => c.status === 'new').length
  const newLeads = s.leads.filter((l) => l.status === 'new').length
  const sync = s.syncLogs.filter((l) => l.status !== 'ok').length
  const dirtyArriving = s.bookings.filter((b) => b.checkIn === T && b.status === 'confirmed' && s.rooms.find((r) => r.id === b.roomId)?.status !== 'clean').length
  if (overbooked) list.push({ text: `${overbooked} booking bị overbooked`, to: '/admin/bookings' })
  if (pending) list.push({ text: `${pending} chiết khấu chờ duyệt`, to: '/admin/rates' })
  if (dirtyArriving) list.push({ text: `${dirtyArriving} phòng khách sắp đến chưa sạch`, to: '/admin/rooms' })
  if (newConv) list.push({ text: `${newConv} tin nhắn CSKH chưa trả lời`, to: '/admin/inbox' })
  if (newLeads) list.push({ text: `${newLeads} yêu cầu tư vấn mới`, to: '/admin/leads' })
  if (sync) list.push({ text: `${sync} lỗi đồng bộ kênh OTA`, to: '/admin/channels' })
  return list
}

export default function AdminLayout() {
  const [open, setOpen] = useState(false) // menu trên mobile
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(LS_COLLAPSE) === '1' } catch { return false } })
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const user = useStore((s) => s.currentUser)
  const users = useStore((s) => s.users)
  const roles = useStore((s) => s.roles)
  const setUser = useStore((s) => s.setUser)
  const resetDemo = useStore((s) => s.resetDemo)
  const expireHolds = useStore((s) => s.expireHolds)
  const hotel = useStore((s) => s.settings.hotelName)
  const navigate = useNavigate()
  const alerts = useAlerts()
  const bellRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => { expireHolds(); const t = setInterval(expireHolds, 30000); return () => clearInterval(t) }, [expireHolds])
  useEffect(() => { try { localStorage.setItem(LS_COLLAPSE, collapsed ? '1' : '0') } catch { /* bỏ qua */ } }, [collapsed])
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const items = NAV.filter((n) => can(roles, user.roleId, n.module))
  const switchUser = (id: string) => { const u = users.find((x) => x.id === id)!; setUser(u); setProfileOpen(false); navigate(homeFor(roles, u.roleId)) }
  const mini = collapsed && !open // chỉ thu gọn trên desktop

  const logo = (
    <Link to="/admin" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink" title={hotel}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sea text-sm text-white">TL</span>
      {!mini && <span className="truncate">THANH LONG</span>}
    </Link>
  )

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8fc]">
      {/* Thanh trên cùng */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4">
        <div className="flex items-center gap-3">
          <button className="rounded-md p-1.5 hover:bg-stone-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Mở menu"><Menu /></button>
          <div className={cx('hidden lg:block', collapsed ? 'w-14' : 'w-56')}>{logo}</div>
          <div className="lg:hidden">{logo}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" target="_blank" className="hidden items-center gap-1.5 rounded-full border border-sea/40 bg-sand px-3 py-1.5 text-sm font-semibold text-sea hover:bg-sea/10 md:flex">
            <ExternalLink size={15} /> Xem web khách
          </Link>
          <button onClick={() => { if (confirm('Đặt lại toàn bộ dữ liệu demo về ban đầu?')) resetDemo() }} className="grid h-9 w-9 place-items-center rounded-full text-stone-600 hover:bg-stone-100" title="Đặt lại dữ liệu demo" aria-label="Đặt lại dữ liệu demo"><RotateCcw size={17} /></button>
          <span className="hidden items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-sm font-medium sm:flex">
            <span className="relative h-3 w-4 overflow-hidden rounded-[2px] bg-red-600"><span className="absolute inset-0 grid place-items-center text-[8px] leading-none text-yellow-300">★</span></span>Tiếng Việt
          </span>
          <div className="relative" ref={bellRef}>
            <button onClick={() => setBellOpen(!bellOpen)} className="relative grid h-9 w-9 place-items-center rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100" aria-label={`Thông báo (${alerts.length})`} aria-expanded={bellOpen}>
              <Bell size={17} />
              {alerts.length > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">{alerts.length}</span>}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-stone-200">
                <div className="border-b border-stone-100 px-4 py-3 text-sm font-semibold">Việc cần xử lý</div>
                {alerts.length === 0 ? <p className="px-4 py-6 text-center text-sm text-stone-500">Không có việc tồn đọng</p> : (
                  <ul className="max-h-80 overflow-y-auto">
                    {alerts.map((a) => <li key={a.text}><Link to={a.to} onClick={() => setBellOpen(false)} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-stone-50">{a.text}<ChevronRight size={14} className="text-stone-400" /></Link></li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Thanh điều hướng bên trái */}
        <aside className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-200 bg-white transition-[width,transform] lg:sticky lg:top-16 lg:z-10 lg:h-[calc(100vh-4rem)] lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full', collapsed ? 'lg:w-[76px]' : 'lg:w-64',
        )}>
          <div className="flex h-16 items-center justify-between border-b border-stone-100 px-4 lg:hidden">
            {logo}
            <button onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-stone-100" aria-label="Đóng menu"><X size={18} /></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="PMS">
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/admin'} onClick={() => setOpen(false)} title={mini ? MODULE_LABEL[n.module] : undefined}
                className={({ isActive }) => cx(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[15px] font-semibold transition-colors',
                  mini && 'justify-center px-0',
                  isActive ? 'border-sea/30 bg-sand text-sea shadow-[0_2px_6px_rgba(1,148,243,0.18)]' : 'border-transparent text-ink/80 hover:bg-stone-50 hover:text-ink',
                )}>
                <n.icon size={18} className="shrink-0" />
                {!mini && <span className="truncate">{MODULE_LABEL[n.module]}</span>}
              </NavLink>
            ))}
          </nav>

          {/* Hồ sơ người dùng + đổi vai trò demo */}
          <div className="relative border-t border-stone-200 p-3" ref={profileRef}>
            <button onClick={() => setProfileOpen(!profileOpen)} className={cx('flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-stone-50', mini && 'justify-center')} aria-expanded={profileOpen} aria-label="Hồ sơ và đổi vai trò">
              <Avatar name={user.name} level={ROLE_LEVEL[user.roleId]} />
              {!mini && <span className="min-w-0"><span className="block truncate font-semibold">{user.name}</span><span className="block text-sm text-stone-500">{ROLE_LABEL[user.roleId]}</span></span>}
            </button>
            {profileOpen && (
              <div className={cx('absolute bottom-full z-50 mb-2 w-72 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-stone-200', mini ? 'left-2' : 'left-3')}>
                <div className="border-b border-stone-100 px-4 py-2.5 text-xs font-semibold uppercase text-stone-500">Đổi vai trò (demo)</div>
                <ul className="max-h-80 overflow-y-auto py-1">
                  {users.map((u) => (
                    <li key={u.id}>
                      <button onClick={() => switchUser(u.id)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-stone-50">
                        <Avatar name={u.name} level={ROLE_LEVEL[u.roleId]} size="sm" />
                        <span className="min-w-0 flex-1"><span className="block truncate font-medium">{u.name}</span><span className="block text-xs text-stone-500">{ROLE_LABEL[u.roleId]}</span></span>
                        {u.id === user.id && <Check size={16} className="text-sea" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={() => setCollapsed(!collapsed)} className="mt-2 hidden w-full items-center justify-center gap-1 rounded-md py-1.5 text-sm text-stone-500 hover:bg-stone-50 hover:text-ink lg:flex" aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}>
              {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> Thu gọn</>}
            </button>
          </div>
        </aside>
        {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

        <main className="min-w-0 flex-1 p-4 lg:p-6"><Outlet /></main>
      </div>
      <Toasts />
    </div>
  )
}
