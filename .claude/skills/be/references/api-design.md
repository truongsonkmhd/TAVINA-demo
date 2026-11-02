# Thiết kế API

## REST

| Hành động | Method | URL | Status thành công |
|---|---|---|---|
| Danh sách | GET | `/api/v1/tours?status=active&page=1&limit=20` | 200 |
| Chi tiết | GET | `/api/v1/tours/{id}` | 200 / 404 |
| Tạo | POST | `/api/v1/tours` | 201 + header `Location` |
| Thay toàn bộ | PUT | `/api/v1/tours/{id}` | 200 |
| Sửa một phần | PATCH | `/api/v1/tours/{id}` | 200 |
| Xoá | DELETE | `/api/v1/tours/{id}` | 204 |
| Hành động nghiệp vụ | POST | `/api/v1/bookings/{id}/cancel` | 200 |

- URL dùng danh từ số nhiều, kebab-case; quan hệ lồng tối đa 1 cấp (`/tours/{id}/reviews`).
- JSON field thống nhất một kiểu (camelCase hoặc snake_case) trong toàn dự án.
- Thời gian dùng ISO 8601 UTC; tiền tệ dùng số nguyên đơn vị nhỏ nhất hoặc decimal string kèm mã tiền tệ.

## Status code thường dùng

`400` input sai · `401` chưa xác thực · `403` không có quyền · `404` không tồn tại · `409` xung đột (trùng, sai phiên bản) · `422` vi phạm quy tắc nghiệp vụ · `429` vượt rate limit · `500` lỗi không mong đợi · `503` phụ thuộc ngoài không sẵn sàng.

## Định dạng lỗi chung

```json
{
  "error": {
    "code": "BOOKING_SOLD_OUT",
    "message": "Tour đã hết chỗ",
    "details": [{ "field": "quantity", "issue": "exceeds_available" }],
    "requestId": "req_abc123"
  }
}
```
`code` ổn định để client xử lý; `message` cho người đọc; `requestId` để tra log. Có thể theo chuẩn RFC 9457 (Problem Details).

## Phân trang

- Offset (`page`, `limit`) — đơn giản, hợp cho admin/dữ liệu nhỏ.
- Cursor (`cursor`, `limit`) — ổn định khi dữ liệu thay đổi, hợp cho feed/dữ liệu lớn.
- Luôn giới hạn `limit` tối đa; trả kèm metadata (`total` hoặc `nextCursor`).

## Versioning & tương thích

- Version trong URL (`/v1`) hoặc header; chỉ tăng khi thay đổi phá vỡ.
- Thêm field mới là tương thích; đổi tên/xoá field hoặc đổi kiểu là phá vỡ.
- Đánh dấu deprecated (header `Deprecation`, `Sunset`) trước khi gỡ.

## Idempotency

POST tạo tài nguyên quan trọng (thanh toán, đặt chỗ) nhận header `Idempotency-Key`; lưu kết quả theo key trong một khoảng thời gian và trả lại kết quả cũ nếu nhận trùng.

## Khi nào dùng GraphQL / gRPC

- **GraphQL**: nhiều client cần hình dạng dữ liệu khác nhau; nhớ giới hạn độ sâu/độ phức tạp truy vấn và dùng DataLoader chống N+1.
- **gRPC**: giao tiếp nội bộ giữa service, cần hiệu năng và hợp đồng chặt (protobuf).

## Tài liệu

Duy trì OpenAPI spec (sinh từ code hoặc viết tay) và cập nhật cùng PR thay đổi API.
