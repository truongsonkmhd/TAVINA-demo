# Cơ sở dữ liệu

## Thiết kế schema

- Khoá chính: UUID (v7 nếu cần sắp xếp theo thời gian) hoặc bigint tự tăng — thống nhất trong dự án.
- Mọi bảng có `created_at`, `updated_at` (UTC); cân nhắc `deleted_at` cho soft delete.
- Ràng buộc ở DB: `NOT NULL`, `UNIQUE`, `FOREIGN KEY`, `CHECK` — không chỉ dựa vào validate ở app.
- Chuẩn hoá tới 3NF; chỉ phi chuẩn hoá khi đo được lợi ích.
- Tiền: `NUMERIC/DECIMAL`, không dùng float.

## Index

- Index cho cột trong `WHERE`, `JOIN`, `ORDER BY` của truy vấn thường dùng.
- Index tổ hợp: cột lọc bằng (=) trước, cột khoảng/sắp xếp sau.
- Kiểm tra bằng `EXPLAIN (ANALYZE)`; tránh index thừa làm chậm ghi.

## Truy vấn

- Chỉ select cột cần dùng.
- **N+1**: thay vòng lặp truy vấn bằng `JOIN`, `WHERE id IN (...)`, hoặc eager loading của ORM.
- Truy vấn danh sách luôn có `LIMIT`.
- Thao tác hàng loạt dùng batch insert/update.

## Transaction & đồng thời

- Gói các bước phải cùng thành công/thất bại trong một transaction; giữ transaction ngắn, không gọi API ngoài bên trong.
- Chống ghi đè đồng thời: optimistic locking (cột `version`) hoặc `SELECT ... FOR UPDATE` cho tồn kho/chỗ ngồi.
- Thao tác xuyên service: dùng outbox pattern hoặc saga thay vì transaction phân tán.

## Migration

- Mọi thay đổi schema qua công cụ migration của dự án, commit cùng code.
- Thay đổi không phá vỡ khi deploy dần (expand → migrate → contract):
  1. Thêm cột mới (nullable) → 2. ghi cả hai/backfill → 3. chuyển đọc sang cột mới → 4. xoá cột cũ ở release sau.
- Tạo index trên bảng lớn bằng cách không khoá bảng (ví dụ `CREATE INDEX CONCURRENTLY` trên PostgreSQL).

## Kết nối

- Dùng connection pool, đặt kích thước theo số instance × giới hạn DB.
- Đặt timeout cho truy vấn và cho việc lấy kết nối.
