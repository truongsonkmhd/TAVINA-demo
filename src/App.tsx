import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PublicLayout from '@/layouts/PublicLayout'
import AdminLayout from '@/layouts/AdminLayout'
import { useStore } from '@/store'
import { can } from '@/lib/permissions'
import type { Module } from '@/types'

const L = (f: () => Promise<{ default: React.ComponentType }>) => lazy(f)
// Public
const Home = L(() => import('@/pages/public/Home'))
const Category = L(() => import('@/pages/public/Category'))
const HotelSearch = L(() => import('@/pages/public/HotelSearch'))
const HotelDetail = L(() => import('@/pages/public/HotelDetail'))
const Checkout = L(() => import('@/pages/public/Checkout'))
const Confirmation = L(() => import('@/pages/public/Confirmation'))
const Promotions = L(() => import('@/pages/public/Promotions'))
const Guide = L(() => import('@/pages/public/Guide'))
const Contact = L(() => import('@/pages/public/Contact'))
const Account = L(() => import('@/pages/public/Account'))
// Admin
const Dashboard = L(() => import('@/pages/admin/Dashboard'))
const Calendar = L(() => import('@/pages/admin/Calendar'))
const Rooms = L(() => import('@/pages/admin/Rooms'))
const Bookings = L(() => import('@/pages/admin/Bookings'))
const BookingDetail = L(() => import('@/pages/admin/BookingDetail'))
const BookingNew = L(() => import('@/pages/admin/BookingNew'))
const Rates = L(() => import('@/pages/admin/Rates'))
const PromotionsAdmin = L(() => import('@/pages/admin/Promotions'))
const Channels = L(() => import('@/pages/admin/Channels'))
const Invoices = L(() => import('@/pages/admin/Invoices'))
const Declaration = L(() => import('@/pages/admin/Declaration'))
const Inventory = L(() => import('@/pages/admin/Inventory'))
const Attendance = L(() => import('@/pages/admin/Attendance'))
const Reports = L(() => import('@/pages/admin/Reports'))
const Crm = L(() => import('@/pages/admin/Crm'))
const InboxPage = L(() => import('@/pages/admin/Inbox'))
const Leads = L(() => import('@/pages/admin/Leads'))
const Cms = L(() => import('@/pages/admin/Cms'))
const SettingsPage = L(() => import('@/pages/admin/Settings'))
const Audit = L(() => import('@/pages/admin/Audit'))

function Guard({ module, children }: { module: Module; children: React.ReactNode }) {
  const roles = useStore((s) => s.roles)
  const user = useStore((s) => s.currentUser)
  if (!can(roles, user.roleId, module)) return <div className="rounded-lg bg-white p-8 text-center ring-1 ring-stone-200"><p className="font-semibold">Không có quyền truy cập</p><p className="mt-1 text-sm text-stone-500">Vai trò {user.roleId} không được xem mục này (403). Đổi vai trò ở góc phải để demo.</p></div>
  return <>{children}</>
}

const Fallback = <div className="p-8 text-center text-sm text-stone-500">Đang tải…</div>

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={Fallback}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/dich-vu/:slug" element={<Category />} />
            <Route path="/khach-san" element={<HotelSearch />} />
            <Route path="/khach-san/:id" element={<HotelDetail />} />
            <Route path="/dat-phong/:bookingId" element={<Checkout />} />
            <Route path="/xac-nhan/:bookingId" element={<Confirmation />} />
            <Route path="/khuyen-mai" element={<Promotions />} />
            <Route path="/cam-nang" element={<Guide />} />
            <Route path="/lien-he" element={<Contact />} />
            <Route path="/tai-khoan" element={<Account />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Guard module="dashboard"><Dashboard /></Guard>} />
            <Route path="calendar" element={<Guard module="calendar"><Calendar /></Guard>} />
            <Route path="rooms" element={<Guard module="rooms"><Rooms /></Guard>} />
            <Route path="bookings" element={<Guard module="bookings"><Bookings /></Guard>} />
            <Route path="bookings/new" element={<Guard module="bookings"><BookingNew /></Guard>} />
            <Route path="bookings/:id" element={<Guard module="bookings"><BookingDetail /></Guard>} />
            <Route path="rates" element={<Guard module="rates"><Rates /></Guard>} />
            <Route path="promotions" element={<Guard module="promotions"><PromotionsAdmin /></Guard>} />
            <Route path="channels" element={<Guard module="channels"><Channels /></Guard>} />
            <Route path="invoices" element={<Guard module="invoices"><Invoices /></Guard>} />
            <Route path="declaration" element={<Guard module="declaration"><Declaration /></Guard>} />
            <Route path="inventory" element={<Guard module="inventory"><Inventory /></Guard>} />
            <Route path="attendance" element={<Guard module="attendance"><Attendance /></Guard>} />
            <Route path="reports" element={<Guard module="reports"><Reports /></Guard>} />
            <Route path="crm" element={<Guard module="crm"><Crm /></Guard>} />
            <Route path="inbox" element={<Guard module="inbox"><InboxPage /></Guard>} />
            <Route path="leads" element={<Guard module="leads"><Leads /></Guard>} />
            <Route path="cms" element={<Guard module="cms"><Cms /></Guard>} />
            <Route path="settings" element={<Guard module="settings"><SettingsPage /></Guard>} />
            <Route path="audit" element={<Guard module="audit"><Audit /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
