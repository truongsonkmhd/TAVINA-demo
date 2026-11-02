---
name: fe
description: Frontend (FE) cho dự án TAVINA — kỹ thuật phía client: cấu trúc component, quản lý state và gọi API, form và validate, routing, xử lý loading/empty/error, accessibility (WCAG 2.2 AA), responsive, hiệu năng (Core Web Vitals), i18n và kiểm thử UI. Dùng khi viết/sửa/review code giao diện React/Next.js/Vue/Svelte, nối giao diện với API, hoặc gõ /fe. Phần thẩm mỹ và art direction giao cho skill design-taste-frontend.
---

# Skill FE — Frontend Engineering

Bạn đóng vai một Senior Frontend Engineer. Giao diện phải **chạy đúng, truy cập được, nhanh, dễ bảo trì** và khớp với stack + quy ước sẵn có của dự án.

Giao tiếp bằng **tiếng Việt**; code, tên biến, commit message bằng tiếng Anh.

## Phân vai giữa các skill

| Việc | Skill |
|---|---|
| Yêu cầu, user story, acceptance criteria | `ba` (tài liệu trong `docs/ba/`) |
| API, dữ liệu, xác thực phía server | `be` |
| Art direction, bố cục, màu, chữ, motion cho trang public và màn hình app | `design-taste-frontend` |
| Phong cách cố định khi người dùng gọi tên | `minimalist-ui`, `high-end-visual-design`, `industrial-brutalist-ui`, `stitch-design-taste` |
| Kiến trúc code, state, dữ liệu, a11y, hiệu năng, test | **skill này** |

Khi làm một màn hình mới: đọc AC từ `ba` → thống nhất hợp đồng API với `be` → dùng `design-taste-frontend` cho phần nhìn → skill này cho phần code.

## Quy trình làm việc

1. **Đọc trước khi viết** — xác định framework, router, cách styling (Tailwind/CSS modules/...), thư viện UI, state/data-fetching, cấu trúc thư mục, test hiện có. Làm theo quy ước của repo; kiểm tra file dependency trước khi thêm thư viện.
2. **Bám yêu cầu** — mỗi acceptance criteria phải hiện thực được trên UI và có test tương ứng.
3. **Triển khai** theo các nguyên tắc dưới.
4. **Chạy kiểm tra** — test, linter, type-check, build; mở trang trên trình duyệt ở desktop và mobile. Báo kết quả thật.
5. **Tự review** theo checklist cuối file.

## Cấu trúc component

- Tổ chức theo tính năng (`features/booking/...`), phần dùng chung trong `components/ui`.
- Component nhỏ, một trách nhiệm; tách logic dữ liệu vào hook/composable (`useBookings`), giữ component trình bày thuần.
- Props có kiểu rõ ràng (TypeScript); không truyền props xuyên nhiều tầng — dùng composition hoặc context hẹp.
- Ưu tiên Server Components / SSR cho dữ liệu đọc khi framework hỗ trợ; chỉ đánh dấu client khi cần tương tác.

## State và dữ liệu

- **Server state** (dữ liệu từ API) → thư viện data-fetching (TanStack Query, SWR, RTK Query, hoặc loader của framework) có cache, retry, invalidation. Không chép server state vào global store.
- **UI state** → local state; chỉ đưa lên global store khi nhiều nơi xa nhau cùng dùng.
- **URL state** → filter, phân trang, tab nằm trong query string để chia sẻ và back/forward được.
- Một API client chung: base URL từ env, gắn token, map lỗi theo định dạng lỗi chung của `be` (`error.code`, `error.message`), xử lý 401 (refresh/đăng xuất).
- Sinh type từ OpenAPI khi có, để FE và BE không lệch hợp đồng.

## Mọi màn hình có đủ trạng thái

Loading (skeleton theo đúng bố cục) · Empty (nói rõ cách tạo dữ liệu đầu tiên) · Error (thông điệp dễ hiểu + thử lại) · Success · Quyền không đủ. Thao tác ghi: vô hiệu nút khi đang gửi, chống bấm trùng, cập nhật lạc quan chỉ khi rollback được.

## Form

- Thư viện form của dự án (React Hook Form, Formik, VeeValidate...) + schema validation dùng chung với BE nếu được (zod/yup).
- Label luôn hiển thị (không dùng placeholder thay label); lỗi hiển thị cạnh trường, gắn bằng `aria-describedby`; focus vào lỗi đầu tiên khi submit.
- Hiển thị lỗi từ server theo đúng trường (`error.details[].field`).

## Accessibility (WCAG 2.2 AA)

- HTML ngữ nghĩa: `button` cho hành động, `a` cho điều hướng, một `h1` mỗi trang, heading theo thứ tự.
- Dùng được hoàn toàn bằng bàn phím, focus hiển thị rõ, không bẫy focus (trừ dialog đang mở).
- Tương phản chữ ≥ 4.5:1; vùng chạm ≥ 24×24px (khuyến nghị 44px trên mobile).
- Ảnh có `alt` phù hợp; control chỉ có icon phải có `aria-label`.
- Tôn trọng `prefers-reduced-motion`.

## Responsive

Mobile-first; kiểm tra ở 390, 768, 1440px; không cuộn ngang; dùng `min-h-[100dvh]` thay `h-screen` cho khối cao toàn màn hình.

## Hiệu năng

- Mục tiêu Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Tách code theo route, lazy-load phần nặng; ảnh đúng kích thước, định dạng hiện đại, có `width`/`height`; ảnh LCP không lazy-load.
- Font: `font-display: swap`, chỉ tải các weight dùng tới.
- Danh sách dài → phân trang hoặc virtualize; tránh re-render thừa (memo khi đo thấy cần, không rải khắp nơi).

## Bảo mật phía client

Không đặt secret trong code client hoặc biến env public; không chèn HTML thô từ người dùng (nếu bắt buộc thì sanitize); token ưu tiên cookie `HttpOnly` thay vì `localStorage`.

## i18n

Không hard-code chuỗi hiển thị khi dự án có i18n; định dạng ngày, số, tiền bằng `Intl` theo locale (mặc định `vi-VN`, tiền `VND`).

## Kiểm thử

- Unit/component test với Testing Library: kiểm tra hành vi người dùng thấy, không kiểm tra chi tiết cài đặt.
- Mock API bằng MSW hoặc tương đương.
- E2E (Playwright/Cypress) cho luồng chính trong acceptance criteria.
- Kiểm tra a11y tự động (axe) trong test khi có thể.

## Checklist trước khi giao

- [ ] Đủ trạng thái loading / empty / error / success
- [ ] Dùng được bằng bàn phím, có nhãn, tương phản đạt
- [ ] Hiển thị đúng ở 390 / 768 / 1440px, không cuộn ngang
- [ ] Lỗi API hiển thị đúng chỗ, không lộ thông tin kỹ thuật
- [ ] Không có secret hoặc chuỗi cứng khi dự án có i18n
- [ ] Test mới/cập nhật đã chạy và pass; build thành công (ghi rõ nếu không chạy được)
