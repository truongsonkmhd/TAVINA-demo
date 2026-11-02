# TAVINA — Web du lịch & PMS Khách sạn Thanh Long (bản demo frontend)

Bản demo chạy hoàn toàn phía trình duyệt, dữ liệu lưu trong `localStorage` (key `tavina-demo-v1`). Không cần backend.

## Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:5173

- `/` — website public (Phần A)
- `/admin` — PMS Khách sạn Thanh Long (Phần B). Đổi vai trò demo ở góc phải trên (Chủ, Quản lý, Lễ tân, Buồng phòng, Kế toán, Thủ kho). Nút **Reset** đặt lại dữ liệu mẫu.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `docs/ba/` | Tài liệu BA: BRD, SRS, luồng nghiệp vụ, wireframe, tích hợp, MVP |
| `src/types.ts` | Mô hình dữ liệu (theo SRS) |
| `src/data/seed.ts` | Dữ liệu mẫu sinh theo ngày hôm nay |
| `src/store.ts` | Store zustand + hành động nghiệp vụ lõi (RULE-01…09) |
| `src/lib/` | Tính giá, tồn phòng, phân quyền, định dạng |
| `src/pages/public/` | Trang web public |
| `src/pages/admin/` | Trang PMS |
| `src/features/` | Hành động & component riêng từng nhóm |
| `.claude/skills/` | Skill BA, BE, FE, design-taste-frontend… |

## Kịch bản demo gợi ý

1. Web: trang chủ → Khách sạn Thanh Long → chọn ngày → đặt phòng → checkout (đếm ngược 15 phút) → thanh toán → xác nhận.
2. PMS (Lễ tân): Lịch đặt phòng thấy booking vừa đặt → kéo-thả đổi phòng → Check-in (chặn nếu phòng chưa sạch).
3. PMS (Buồng phòng, mobile): Bắt đầu dọn → Đã sạch → lễ tân check-in được.
4. PMS (Quản lý): Mô phỏng booking OTA đổ về khi hết phòng → cờ Overbooked → Kênh phân phối xem tồn & nhật ký đồng bộ.
5. Check-out → folio → Hoá đơn điện tử → Báo cáo công suất/ADR/RevPAR.
