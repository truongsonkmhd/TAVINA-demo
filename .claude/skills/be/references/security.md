# Bảo mật backend (theo OWASP Top 10)

## Xác thực

- Mật khẩu: Argon2id (hoặc bcrypt cost ≥ 12); không tự viết thuật toán băm.
- OAuth 2.1 / OIDC với PKCE cho đăng nhập bên thứ ba.
- Access token JWT ngắn hạn (5–15 phút), refresh token dài hạn lưu phía server, xoay vòng mỗi lần dùng và thu hồi được.
- Kiểm tra chữ ký, `exp`, `iss`, `aud` của JWT; cố định thuật toán, không chấp nhận `none`.
- Trên web: cookie `HttpOnly`, `Secure`, `SameSite`; có bảo vệ CSRF khi dùng cookie.
- Giới hạn số lần đăng nhập sai; hỗ trợ MFA cho tài khoản quản trị.

## Phân quyền

- RBAC (vai trò → quyền) hoặc ABAC khi quy tắc phụ thuộc thuộc tính.
- Kiểm tra quyền sở hữu resource ở service (chống IDOR): `booking.userId === currentUser.id` hoặc có quyền admin.
- Mặc định từ chối (deny by default).

## Đầu vào & injection

- Validate kiểu, độ dài, định dạng mọi input; whitelist field cho phép cập nhật (chống mass assignment).
- Truy vấn tham số hoá / ORM; không nối chuỗi vào SQL, shell, đường dẫn file.
- Upload file: kiểm tra kích thước, MIME thật, đổi tên file, lưu ngoài web root/object storage.
- Gọi URL do người dùng cung cấp: chặn địa chỉ nội bộ (chống SSRF).

## Dữ liệu & secret

- Secret qua biến môi trường/secret manager; không commit `.env`.
- TLS cho mọi kết nối; mã hoá dữ liệu nhạy cảm khi lưu nếu cần.
- Không log mật khẩu, token, số thẻ, thông tin cá nhân; che (mask) khi cần.
- Response lỗi không chứa stack trace hay chi tiết hạ tầng.

## Bảo vệ hệ thống

- Rate limiting theo IP/user/API key bằng Redis hoặc API gateway; trả `429` kèm `Retry-After`.
- Security headers: `Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy` (nếu trả HTML).
- CORS chỉ cho origin cụ thể, không dùng `*` kèm credentials.
- Giới hạn kích thước body request.

## Phụ thuộc

- Quét lỗ hổng thư viện trong CI (`npm audit`, `pip-audit`, Dependabot...); khoá phiên bản bằng lockfile.
