import { MapPin, Phone, Mail, MessageCircle, Clock, Building2, Users, Award } from 'lucide-react'
import { useStore } from '@/store'
import { Container, Breadcrumb } from '@/features/public/components/Shared'
import { LeadForm } from '@/features/public/components/LeadForm'

const FAQ = [
  ['Tôi có thể huỷ phòng Khách sạn Thanh Long không?', 'Có. Phòng đặt trên web được huỷ miễn phí trước 48 giờ so với ngày nhận phòng tại mục "Đặt chỗ của tôi". Sau thời hạn này khách sạn tính phí 1 đêm.'],
  ['Thanh toán xong bao lâu thì có xác nhận?', 'Thanh toán online được xác nhận ngay. Chuyển khoản được xác nhận sau khi kế toán đối soát, thường trong 30 phút giờ hành chính.'],
  ['Tôi cần xuất hoá đơn công ty?', 'Chọn "Xuất hoá đơn công ty" ở bước thanh toán và nhập mã số thuế. Hoá đơn điện tử được gửi qua email sau khi trả phòng.'],
  ['Các dịch vụ vé máy bay, visa đặt thế nào?', 'Gửi yêu cầu tư vấn ở trang dịch vụ tương ứng. Tư vấn viên gọi lại trong 30 phút với báo giá cụ thể.'],
]

export default function Contact() {
  const settings = useStore((s) => s.settings)
  return (
    <div className="bg-ground pb-6">
      <section className="bg-sea text-white">
        <Container className="py-8 md:py-10">
          <div className="[&_a]:text-white/80 [&_span]:text-white/90"><Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Liên hệ & hỗ trợ' }]} /></div>
          <h1 className="mt-4 text-3xl font-extrabold md:text-4xl">Liên hệ & hỗ trợ</h1>
          <p className="mt-2 max-w-2xl text-white/90">Đội ngũ TAVINA ở Tuy Hoà hỗ trợ bạn từ 7:00 đến 22:00 mỗi ngày; hotline khẩn cấp 24/7 cho khách đang lưu trú.</p>
        </Container>
      </section>

      <Container className="-mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Phone, t: 'Hotline', v: '0257 3 888 999', href: 'tel:02573888999' },
            { icon: MessageCircle, t: 'Zalo', v: '0905 000 001', href: 'https://zalo.me/0905000001' },
            { icon: Mail, t: 'Email', v: 'hello@tavina.vn', href: 'mailto:hello@tavina.vn' },
            { icon: Clock, t: 'Giờ làm việc', v: '7:00 – 22:00 hằng ngày' },
          ].map((c) => {
            const inner = (
              <>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-sand text-sea"><c.icon size={20} /></span>
                <span><span className="block text-xs text-ink/60">{c.t}</span><span className="block font-bold">{c.v}</span></span>
              </>
            )
            return c.href
              ? <a key={c.t} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70 hover:ring-sea">{inner}</a>
              : <div key={c.t} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70">{inner}</div>
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
              <h2 className="text-lg font-bold">Về TAVINA</h2>
              <p className="mt-2 text-ink/80">Công ty du lịch TAVINA có trụ sở tại Tuy Hoà, Phú Yên, cung cấp vé máy bay, khách sạn, vé xe, vé vui chơi, SIM du lịch, visa và tour. Khách sạn Thanh Long là đối tác chiến lược — giá và phòng trống trên web đồng bộ trực tiếp từ hệ thống của khách sạn.</p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[[Building2, '2019', 'Thành lập'], [Users, '12.000+', 'Khách mỗi năm'], [Award, '56-001', 'Giấy phép lữ hành']].map(([I, v, l]) => {
                  const C = I as typeof Building2
                  return <div key={l as string} className="rounded-lg bg-ground p-3"><C size={18} className="mx-auto text-sea" /><div className="tnum mt-1 font-extrabold">{v as string}</div><div className="text-xs text-ink/60">{l as string}</div></div>
                })}
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
              <iframe title="Bản đồ văn phòng TAVINA" className="h-64 w-full border-0" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=109.28%2C13.07%2C109.33%2C13.11&layer=mapnik&marker=13.0955%2C109.3005" />
              <div className="flex items-start gap-2 p-4 text-sm"><MapPin size={16} className="mt-0.5 shrink-0 text-sea" /><span><b>Văn phòng TAVINA & {settings.hotelName}</b><br />{settings.address}</span></div>
            </div>
          </div>
          <LeadForm service="tour" subcategories={['Liên hệ chung', 'Hỗ trợ đơn đặt phòng', 'Hợp tác / đại lý', 'Góp ý']} defaultSubcategory="Liên hệ chung" title="Gửi tin nhắn cho chúng tôi" needPlaceholder="Nội dung bạn cần hỗ trợ" />
        </div>

        <section className="pt-8">
          <h2 className="text-xl font-bold">Câu hỏi thường gặp</h2>
          <div className="mt-3 divide-y divide-stone-100 rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">{q}<span className="text-sea transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm text-ink/70">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </Container>
    </div>
  )
}
