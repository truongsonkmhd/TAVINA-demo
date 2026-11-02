# Tài liệu BA — TAVINA & PMS Khách sạn Thanh Long

Bản 0.1 · 2026-11-03 · Trạng thái: **Nháp, chờ khách hàng xác nhận giả định và trả lời câu hỏi mở**.

## Mục lục

| Tài liệu | Nội dung | Đầu ra trong brief |
|---|---|---|
| [BRD](2026-11-03-tavina-brd.md) | Bối cảnh, mục tiêu & KPI, stakeholder, phạm vi, giả định, **actor & use case (A, B)**, **sitemap & danh mục con**, yêu cầu nghiệp vụ BR, quy tắc cốt lõi, NFR, rủi ro | 1, 2, NFR |
| [SRS PMS](2026-11-03-pms-srs.md) | Trạng thái booking/buồng, 15 nhóm chức năng (FR-01…FR-15) với user story, acceptance criteria, luồng ngoại lệ, quy tắc, dữ liệu; ma trận quyền; mô hình dữ liệu khái niệm | 3 |
| [Luồng nghiệp vụ & wireframe](2026-11-03-luong-nghiep-vu-wireframe.md) | Sơ đồ OTA → PMS → housekeeping → check-in/out → hoá đơn → báo cáo; đặt phòng từ web; đồng bộ 2 chiều; bảng học từ 15 site tham khảo; wireframe 7 màn hình | 4, 5 |
| [Tích hợp, MVP, câu hỏi](2026-11-03-tich-hop-mvp-cau-hoi.md) | 14 tích hợp ngoài & dữ liệu trao đổi; lộ trình 3 giai đoạn; 34 câu hỏi cần làm rõ theo nhóm | 6, 7, 8 |

## Cách đọc
- Mã định danh dùng xuyên suốt: `BO` mục tiêu · `BR` yêu cầu nghiệp vụ · `FR` chức năng · `US` user story · `UC` use case · `RULE` quy tắc · `NFR` phi chức năng · `INT` tích hợp · `GĐ-*` giả định.
- Ưu tiên theo MoSCoW. Acceptance criteria dạng Given/When/Then; mỗi AC là một test case tối thiểu.
- Người đọc nhanh: đọc BRD mục 4 (phạm vi), 6 (use case), tài liệu Tích hợp mục 2 (lộ trình) và 3 (câu hỏi).

## Ma trận truy vết

| BR | FR | US | UC | Giai đoạn | Trạng thái |
|---|---|---|---|---|---|
| BR-01 Trang chủ & danh mục | — (CMS) | — | UC-A01, UC-A11 | GĐ2 | Draft |
| BR-02 Khách sạn đối tác | — | — | UC-A02, UC-A03, UC-A06 | GĐ3 | Draft |
| BR-03 Thanh Long realtime từ PMS | FR-15 | US-21 | UC-A04 | GĐ2 | Draft |
| BR-04 Booking web → PMS | FR-15 | US-21 | UC-A05, UC-A12 | GĐ2 | Draft |
| BR-05 Lead tư vấn | — | — | UC-A07, UC-A10 | GĐ2 | Draft |
| BR-06 Tài khoản khách | FR-12 | US-17 | UC-A08, UC-A09 | GĐ2 | Draft |
| BR-07 Lịch tổng hợp | FR-01 | US-01 | UC-B01 | GĐ1 | Draft |
| BR-08 Kênh phân phối | FR-02 | US-02 | UC-B02, UC-B03 | GĐ2 | Draft |
| BR-09 Booking lễ tân, check-in/out | FR-03 | US-03, US-04, US-05 | UC-B04, UC-B05, UC-B06 | GĐ1 | Draft |
| BR-10 Chính sách giá | FR-04 | US-06, US-07 | UC-B07 | GĐ1 | Draft |
| BR-11 Ưu đãi, combo | FR-05 | US-08 | UC-B08 | GĐ3 | Draft |
| BR-12 Housekeeping | FR-06 | US-09, US-10 | UC-B09 | GĐ1 | Draft |
| BR-13 Kho | FR-07 | US-11 | UC-B10 | GĐ3 | Draft |
| BR-14 Chấm công | FR-08 | US-12 | UC-B11 | GĐ3 | Draft |
| BR-15 Khai báo lưu trú | FR-09 | US-13 | UC-B12 | GĐ1 (file), GĐ3 (cổng) | Draft |
| BR-16 Hoá đơn, công nợ | FR-10 | US-14, US-15 | UC-B13, UC-B14 | GĐ1 (folio), GĐ2 (HĐĐT), GĐ3 (công nợ) | Draft |
| BR-17 Báo cáo | FR-11 | US-16 | UC-B15 | GĐ1 | Draft |
| BR-18 CRM | FR-12 | US-17, US-18 | UC-B16, UC-B17 | GĐ1 (hồ sơ), GĐ3 (chiến dịch) | Draft |
| BR-19 Inbox đa kênh | FR-13 | US-19 | UC-B18 | GĐ3 | Draft |
| BR-20 Phân quyền, nhật ký | FR-14 | US-20 | UC-B19 | GĐ1 | Draft |
| BR-21 Multi-property | FR-14 AC2, NFR-10 | — | — | Dữ liệu GĐ1, UI GĐ3 | Draft |

Các chức năng Phần A không gắn FR riêng (CMS, tìm kiếm aggregator, lead) sẽ được đặc tả ở SRS web khi GĐ2 bắt đầu.

## Giả định chung
Xem bảng giả định trong [BRD mục 4](2026-11-03-tavina-brd.md#4-phạm-vi). Mọi giả định đều có câu hỏi tương ứng trong [danh sách câu hỏi](2026-11-03-tich-hop-mvp-cau-hoi.md#3-câu-hỏi-cần-làm-rõ-với-khách-hàng).

## Lịch sử phiên bản
| Phiên bản | Ngày | Thay đổi |
|---|---|---|
| 0.1 | 2026-11-03 | Bản nháp đầu tiên, đủ 8 đầu ra theo brief |
