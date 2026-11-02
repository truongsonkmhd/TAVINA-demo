import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { useStore } from '@/store'
import { Button, Card, Field, Input, Textarea, PageHeader } from '@/components/ui'
import { today } from '@/lib/format'
import { uid } from '@/lib/ids'
import type { CmsContent } from '@/types'
import { updateCms } from '@/features/backoffice/actions'
import { usePerm } from '@/features/pms/components/common'

export default function Cms() {
  const cms = useStore((s) => s.cms)
  const toast = useStore((s) => s.toast)
  const perm = usePerm()
  const canEdit = perm('cms', 'edit')
  const [c, setC] = useState<CmsContent>(cms)
  const dirty = JSON.stringify(c) !== JSON.stringify(cms)
  const save = () => {
    if (!c.heroTitle.trim()) return toast('Tiêu đề trang chủ không được trống', 'err')
    updateCms(c); toast('Đã lưu nội dung web')
  }
  const setBanner = (i: number, k: keyof CmsContent['banners'][number], v: string) => setC({ ...c, banners: c.banners.map((b, j) => (j === i ? { ...b, [k]: v } : b)) })
  const setPost = (i: number, k: keyof CmsContent['posts'][number], v: string) => setC({ ...c, posts: c.posts.map((p, j) => (j === i ? { ...p, [k]: v } : p)) })

  return (
    <div>
      <PageHeader title="Nội dung web" subtitle="Tiêu đề trang chủ, banner khuyến mãi, bài cẩm nang"
        actions={<>
          <Link to="/" target="_blank" className="inline-flex h-10 items-center gap-1 rounded-md bg-stone-200 px-4 text-sm font-medium hover:bg-stone-300"><ExternalLink size={16} /> Xem web</Link>
          {canEdit && <Button disabled={!dirty} onClick={save}>Lưu thay đổi</Button>}
        </>} />
      {dirty && <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">Có thay đổi chưa lưu.</p>}
      <div className="space-y-4">
        <Card title="Trang chủ">
          <div className="grid gap-3">
            <Field label="Tiêu đề lớn" hint="Ngắn gọn, 2 dòng trở xuống"><Input disabled={!canEdit} value={c.heroTitle} onChange={(e) => setC({ ...c, heroTitle: e.target.value })} /></Field>
            <Field label="Mô tả dưới tiêu đề"><Textarea rows={2} disabled={!canEdit} value={c.heroSubtitle} onChange={(e) => setC({ ...c, heroSubtitle: e.target.value })} /></Field>
          </div>
        </Card>

        <Card title={`Banner khuyến mãi (${c.banners.length})`} actions={canEdit && <Button size="sm" tone="secondary" onClick={() => setC({ ...c, banners: [...c.banners, { id: uid('bn'), title: 'Banner mới', subtitle: '', image: 'https://picsum.photos/seed/banner-new/1200/600', link: '/khuyen-mai' }] })}><Plus size={14} /> Banner</Button>}>
          <div className="grid gap-4 lg:grid-cols-2">
            {c.banners.map((b, i) => (
              <div key={b.id} className="overflow-hidden rounded-lg border border-stone-200">
                <img src={b.image} alt="" className="aspect-[2/1] w-full object-cover" />
                <div className="grid gap-2 p-3">
                  <Field label="Tiêu đề"><Input disabled={!canEdit} value={b.title} onChange={(e) => setBanner(i, 'title', e.target.value)} /></Field>
                  <Field label="Mô tả"><Input disabled={!canEdit} value={b.subtitle} onChange={(e) => setBanner(i, 'subtitle', e.target.value)} /></Field>
                  <Field label="Ảnh (URL)"><Input disabled={!canEdit} value={b.image} onChange={(e) => setBanner(i, 'image', e.target.value)} /></Field>
                  <Field label="Liên kết"><Input disabled={!canEdit} value={b.link} onChange={(e) => setBanner(i, 'link', e.target.value)} /></Field>
                  {canEdit && <Button size="sm" tone="ghost" className="justify-self-end text-red-600" onClick={() => setC({ ...c, banners: c.banners.filter((_, j) => j !== i) })}><Trash2 size={14} /> Xoá</Button>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={`Bài cẩm nang (${c.posts.length})`} actions={canEdit && <Button size="sm" tone="secondary" onClick={() => setC({ ...c, posts: [{ id: uid('po'), title: 'Bài viết mới', excerpt: '', image: 'https://picsum.photos/seed/post-new/800/500', date: today() }, ...c.posts] })}><Plus size={14} /> Bài viết</Button>}>
          <div className="space-y-3">
            {c.posts.map((p, i) => (
              <div key={p.id} className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-[160px_1fr]">
                <img src={p.image} alt="" className="aspect-[16/10] w-full rounded object-cover" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Field label="Tiêu đề"><Input disabled={!canEdit} value={p.title} onChange={(e) => setPost(i, 'title', e.target.value)} /></Field></div>
                  <div className="sm:col-span-2"><Field label="Tóm tắt"><Textarea rows={2} disabled={!canEdit} value={p.excerpt} onChange={(e) => setPost(i, 'excerpt', e.target.value)} /></Field></div>
                  <Field label="Ảnh (URL)"><Input disabled={!canEdit} value={p.image} onChange={(e) => setPost(i, 'image', e.target.value)} /></Field>
                  <Field label="Ngày đăng"><Input type="date" disabled={!canEdit} value={p.date} onChange={(e) => setPost(i, 'date', e.target.value)} /></Field>
                  {canEdit && <Button size="sm" tone="ghost" className="justify-self-start text-red-600" onClick={() => setC({ ...c, posts: c.posts.filter((_, j) => j !== i) })}><Trash2 size={14} /> Xoá bài</Button>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
