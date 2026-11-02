import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Menu, X, Hotel, Plane, Bus, Ticket, Smartphone, Stamp, Map as MapIcon, BadgePercent, Headphones, ClipboardList, type LucideIcon } from 'lucide-react'
import { useStore } from '@/store'
import { SERVICE_LABEL } from '@/lib/labels'
import type { ServiceKey } from '@/types'
import { Toasts, cx } from '@/components/ui'

export const SERVICE_SLUG: Record<ServiceKey, string> = { flight: 've-may-bay', hotel: 'khach-san', bus: 've-xe', activity: 've-vui-choi', sim: 'sim-du-lich', visa: 'visa', tour: 'tour-du-lich' }
export const SLUG_SERVICE = Object.fromEntries(Object.entries(SERVICE_SLUG).map(([k, v]) => [v, k])) as Record<string, ServiceKey>
export const SERVICE_ICON: Record<ServiceKey, LucideIcon> = { hotel: Hotel, flight: Plane, bus: Bus, activity: Ticket, sim: Smartphone, visa: Stamp, tour: MapIcon }
export const SERVICE_ORDER: ServiceKey[] = ['hotel', 'flight', 'bus', 'activity', 'tour', 'sim', 'visa']
export const serviceHref = (k: ServiceKey) => (k === 'hotel' ? '/khach-san' : `/dich-vu/${SERVICE_SLUG[k]}`)

export default function PublicLayout() {
  const [open, setOpen] = useState(false)
  const guest = useStore((s) => s.guests.find((g) => g.id === s.webGuestId))
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => setOpen(false), [pathname])
  // Trang chủ: header trong suốt đè lên ảnh, chuyển nền trắng khi cuộn hoặc mở menu
  const overlay = isHome && !scrolled && !open
  const link = (active: boolean) => cx('flex h-full items-center border-b-2 px-3', overlay ? (active ? 'border-white text-white' : 'border-transparent text-white/90 hover:text-white') : active ? 'border-sea text-sea' : 'border-transparent text-ink/80 hover:text-sea')
  return (
    <div className="flex min-h-screen flex-col">
      <header className={cx('z-40 transition-colors duration-200', isHome ? 'fixed inset-x-0 top-0' : 'sticky top-0', overlay ? 'bg-gradient-to-b from-ink/50 to-transparent' : 'bg-white shadow-[0_1px_0_rgba(3,18,26,0.08)]')}>
        {/* Hàng trên: logo + tiện ích */}
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-6">
          <Link to="/" className={cx('flex items-center gap-2 text-2xl font-extrabold tracking-tight', overlay ? 'text-white' : 'text-sea')} aria-label="TAVINA trang chủ">
            <span className={cx('grid h-8 w-8 place-items-center rounded-full text-base', overlay ? 'bg-white text-sea' : 'bg-sea text-white')}>T</span>
            TAVINA
          </Link>
          <div className="flex items-center gap-1">
            <nav className={cx('hidden items-center gap-1 text-[15px] font-semibold md:flex', overlay ? 'text-white' : 'text-ink/80')} aria-label="Tiện ích">
              <Link to="/khuyen-mai" className={cx('flex items-center gap-1.5 rounded-md px-3 py-2', overlay ? 'hover:bg-white/15' : 'hover:bg-sand')}><BadgePercent size={17} className={overlay ? '' : 'text-coral'} /> Khuyến mãi</Link>
              <Link to="/lien-he" className={cx('flex items-center gap-1.5 rounded-md px-3 py-2', overlay ? 'hover:bg-white/15' : 'hover:bg-sand')}><Headphones size={17} /> Hỗ trợ</Link>
              <Link to="/tai-khoan" className={cx('flex items-center gap-1.5 rounded-md px-3 py-2', overlay ? 'hover:bg-white/15' : 'hover:bg-sand')}><ClipboardList size={17} /> Đặt chỗ của tôi</Link>
            </nav>
            {guest ? (
              <Link to="/tai-khoan" className={cx('ml-2 rounded-full px-4 py-2 text-sm font-semibold', overlay ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-sand text-sea hover:bg-sea/15')}>Xin chào, {guest.name.split(' ').slice(-1)[0]}</Link>
            ) : (
              <>
                <Link to="/tai-khoan" className="ml-2 hidden rounded-full bg-sand px-5 py-2 text-sm font-semibold text-sea hover:bg-white sm:inline-flex">Đăng nhập</Link>
                <Link to="/tai-khoan" className="ml-2 rounded-full bg-sea px-5 py-2 text-sm font-semibold text-white hover:bg-sea-dark">Đăng ký</Link>
              </>
            )}
            <button className={cx('ml-1 rounded-md p-2 lg:hidden', overlay ? 'text-white hover:bg-white/15' : 'hover:bg-sand')} onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
          </div>
        </div>
        {/* Hàng dưới: dịch vụ — ẩn ở đầu trang chủ vì khối tìm kiếm đã có tab dịch vụ */}
        <nav className={cx('mx-auto h-11 max-w-[1440px] items-center gap-1 px-4 md:px-6 text-[15px] font-semibold', overlay ? 'hidden' : 'hidden lg:flex')} aria-label="Dịch vụ">
          {SERVICE_ORDER.map((k) => (
            <NavLink key={k} to={serviceHref(k)} className={({ isActive }) => link(isActive)}>{SERVICE_LABEL[k]}</NavLink>
          ))}
          <NavLink to="/cam-nang" className={({ isActive }) => link(isActive)}>Cẩm nang</NavLink>
        </nav>
        {open && (
          <nav className="border-t border-stone-200 bg-white px-4 py-3 lg:hidden" aria-label="Dịch vụ">
            <div className="grid grid-cols-4 gap-2">
              {SERVICE_ORDER.map((k) => {
                const Icon = SERVICE_ICON[k]
                return (
                  <NavLink key={k} to={serviceHref(k)} className="flex flex-col items-center gap-1 rounded-lg p-2 text-center text-xs font-semibold hover:bg-sand">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-sand text-sea"><Icon size={20} /></span>
                    {SERVICE_LABEL[k]}
                  </NavLink>
                )
              })}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3 text-sm font-semibold">
              <NavLink to="/khuyen-mai" className="py-2">Khuyến mãi</NavLink>
              <NavLink to="/cam-nang" className="py-2">Cẩm nang</NavLink>
              <NavLink to="/tai-khoan" className="py-2">Đặt chỗ của tôi</NavLink>
              <NavLink to="/lien-he" className="py-2">Hỗ trợ</NavLink>
            </div>
          </nav>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="mt-16 bg-navy text-stone-300">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 md:px-6 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-2xl font-extrabold text-white"><span className="grid h-8 w-8 place-items-center rounded-full bg-sea text-base">T</span>TAVINA</div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">Công ty du lịch TAVINA — Tuy Hoà, Phú Yên. Giấy phép lữ hành nội địa số 56-001/2026/SDL. Đối tác chiến lược: Khách sạn Thanh Long.</p>
            <div className="mt-5 text-sm font-semibold text-white">Đối tác thanh toán</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {['VNPay', 'MoMo', 'ZaloPay', 'Visa', 'Mastercard', 'Chuyển khoản'].map((p) => <span key={p} className="rounded bg-white px-2 py-1 text-xs font-bold text-navy">{p}</span>)}
            </div>
          </div>
          <div className="text-sm">
            <div className="font-semibold text-white">Về TAVINA</div>
            <Link to="/lien-he" className="mt-3 block hover:text-white">Giới thiệu</Link>
            <Link to="/lien-he" className="mt-2 block hover:text-white">Liên hệ & hỗ trợ</Link>
            <Link to="/cam-nang" className="mt-2 block hover:text-white">Cẩm nang du lịch</Link>
            <Link to="/khuyen-mai" className="mt-2 block hover:text-white">Khuyến mãi</Link>
          </div>
          <div className="text-sm">
            <div className="font-semibold text-white">Sản phẩm</div>
            {SERVICE_ORDER.map((k) => <Link key={k} to={serviceHref(k)} className="mt-2 block first-of-type:mt-3 hover:text-white">{SERVICE_LABEL[k]}</Link>)}
          </div>
          <div className="text-sm">
            <div className="font-semibold text-white">Liên hệ</div>
            <p className="mt-3">12 Độc Lập, P. 7, Tuy Hoà, Phú Yên</p>
            <p className="mt-2">Hotline 0257 3 888 999</p>
            <p className="mt-2">Zalo 0905 000 001</p>
            <p className="mt-2">hello@tavina.vn</p>
            <Link to="/admin" className="mt-4 block text-stone-500 hover:text-white">Đăng nhập quản trị / PMS</Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-stone-400">© 2026 TAVINA. Bản demo — dữ liệu lưu trên trình duyệt.</div>
      </footer>
      <Toasts />
    </div>
  )
}
