import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock } from 'lucide-react'
import { useStore } from '@/store'
import { Empty } from '@/components/ui'
import { fmtDate } from '@/lib/format'
import { Container, Img, Breadcrumb } from '@/features/public/components/Shared'

// Nội dung mẫu cho từng bài (theo id trong cms.posts); bài mới tạo trong CMS dùng đoạn mặc định
const BODY: Record<string, string[]> = {
  po_1: [
    'Gành Đá Đĩa cách Tuy Hoà khoảng 40 km về phía bắc. Đi sớm lúc 6 giờ để kịp ánh nắng đầu ngày chiếu nghiêng lên những cột đá bazan xếp như chồng đĩa, lúc này bãi còn vắng và nước rút thấp.',
    'Khoảng 9 giờ, men theo đường ven biển về Bãi Xép — nơi quay "Tôi thấy hoa vàng trên cỏ xanh". Bãi nhỏ, nước trong, có thể tắm nếu sóng êm. Ăn trưa bằng cá ngừ và gỏi sứa ở các quán dọc đầm Ô Loan.',
    'Buổi chiều ghé đầm Ô Loan ngắm hoàng hôn, nếu còn sức thì lên Tháp Nhạn khi về lại thành phố. Tổng quãng đường khoảng 100 km, thuê xe máy hoặc xe có tài xế đều thuận tiện.',
  ],
  po_2: [
    'Mắt cá ngừ đại dương hầm thuốc bắc là món phải thử, phổ biến ở các quán trên đường Lê Lợi và Trần Hưng Đạo. Giá khoảng 50.000–80.000đ một chén.',
    'Bánh canh hẹ ăn sáng, bánh xèo mực buổi chiều, sò huyết đầm Ô Loan nướng mỡ hành buổi tối. Người địa phương hay ăn ở các quán vỉa hè quanh chợ Tuy Hoà.',
    'Mang về: bánh tráng nhúng, cá ngừ một nắng, rượu Quán Đế. Nhiều cửa hàng gần chợ nhận gói hút chân không để mang lên máy bay.',
  ],
  po_3: [
    'Từ tháng 1 đến tháng 8 là mùa khô: trời trong, biển êm, thích hợp tắm biển và đi Gành Đá Đĩa, Mũi Điện. Tháng 4–6 là cao điểm, nên đặt phòng sớm.',
    'Tháng 9 đến tháng 12 là mùa mưa, có thể có bão. Bù lại giá phòng thấp, ít khách, đồng lúa Tuy An xanh mướt. Theo dõi dự báo thời tiết trước khi đi biển.',
    'Tết Nguyên đán ở Phú Yên có lễ hội đua thuyền, bài chòi; giá phòng tăng mạnh nên cần đặt trước ít nhất một tháng.',
  ],
}
const DEFAULT_BODY = ['Bài viết đang được biên tập. Liên hệ TAVINA để được tư vấn lịch trình chi tiết theo nhu cầu của bạn.']
const readMin = (paras: string[]) => Math.max(2, Math.round(paras.join(' ').split(/\s+/).length / 200))

export default function Guide() {
  const [sp] = useSearchParams()
  const posts = useStore((s) => s.cms.posts)
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date))
  const id = sp.get('post')
  const post = id ? posts.find((p) => p.id === id) : undefined

  if (id && post) {
    const body = BODY[post.id] ?? DEFAULT_BODY
    const others = sorted.filter((p) => p.id !== post.id).slice(0, 3)
    return (
      <div className="bg-ground pb-6">
        <Container className="max-w-3xl pt-6">
          <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Cẩm nang', to: '/cam-nang' }, { label: post.title }]} />
          <article className="mt-4 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
            <Img src={post.image} alt={post.title} ratio="aspect-[2/1]" />
            <div className="p-5 md:p-8">
              <div className="flex flex-wrap gap-4 text-sm text-ink/60">
                <span className="flex items-center gap-1"><CalendarDays size={14} />{fmtDate(post.date)}</span>
                <span className="flex items-center gap-1"><Clock size={14} />{readMin(body)} phút đọc</span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold md:text-3xl">{post.title}</h1>
              <p className="mt-3 text-lg text-ink/80">{post.excerpt}</p>
              <div className="mt-5 space-y-4 leading-relaxed text-ink/90">{body.map((p, i) => <p key={i}>{p}</p>)}</div>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-sand p-4">
                <span className="font-semibold">Ở lại Tuy Hoà? Khách sạn Thanh Long cách biển 300 m.</span>
                <Link to="/khach-san/thanh-long" className="inline-flex h-10 items-center rounded-md bg-coral px-4 text-sm font-semibold text-white hover:bg-coral-dark">Xem phòng trống</Link>
              </div>
            </div>
          </article>
          <Link to="/cam-nang" className="mt-4 inline-flex items-center gap-1 font-semibold text-sea hover:underline"><ArrowLeft size={16} /> Tất cả bài viết</Link>
          {others.length > 0 && (
            <section className="pt-8">
              <h2 className="text-xl font-bold">Bài viết khác</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                {others.map((p) => (
                  <Link key={p.id} to={`/cam-nang?post=${p.id}`} className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
                    <Img src={p.image} alt={p.title} ratio="aspect-[16/10]" />
                    <h3 className="p-3 text-sm font-bold leading-snug group-hover:text-sea">{p.title}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </Container>
      </div>
    )
  }

  const [first, ...rest] = sorted
  return (
    <div className="bg-ground pb-6">
      <Container className="pt-6">
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Cẩm nang' }]} />
        <h1 className="mt-4 text-3xl font-extrabold">Cẩm nang du lịch Phú Yên</h1>
        <p className="mt-1 text-ink/60">Lịch trình, món ngon, mùa đẹp — viết bởi người Phú Yên.</p>
        {id && !post && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Không tìm thấy bài viết bạn yêu cầu.</p>}
        {!first ? <div className="mt-6"><Empty title="Chưa có bài viết" /></div> : (
          <>
            <Link to={`/cam-nang?post=${first.id}`} className="group mt-6 grid overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70 md:grid-cols-2">
              <Img src={first.image} alt={first.title} ratio="aspect-[16/10] md:aspect-auto md:h-full" />
              <div className="p-6">
                <span className="rounded bg-sand px-2 py-0.5 text-xs font-semibold text-sea">Mới nhất</span>
                <h2 className="mt-3 text-2xl font-extrabold leading-snug group-hover:text-sea">{first.title}</h2>
                <p className="mt-2 text-ink/70">{first.excerpt}</p>
                <div className="mt-4 text-sm text-ink/60">{fmtDate(first.date)} · {readMin(BODY[first.id] ?? DEFAULT_BODY)} phút đọc</div>
              </div>
            </Link>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p) => (
                <Link key={p.id} to={`/cam-nang?post=${p.id}`} className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200/70">
                  <Img src={p.image} alt={p.title} ratio="aspect-[16/10]" />
                  <div className="p-4">
                    <div className="text-xs text-ink/60">{fmtDate(p.date)}</div>
                    <h3 className="mt-1 font-bold leading-snug group-hover:text-sea">{p.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-ink/70">{p.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Container>
    </div>
  )
}
