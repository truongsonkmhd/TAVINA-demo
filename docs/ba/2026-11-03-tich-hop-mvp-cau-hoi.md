# Tích hợp bên ngoài, phạm vi MVP & lộ trình, câu hỏi cần làm rõ

| Phiên bản | Ngày | Ghi chú |
|---|---|---|
| 0.1 | 2026-11-03 | Bản nháp, truy vết tới [BRD](2026-11-03-tavina-brd.md) và [SRS](2026-11-03-pms-srs.md) |

## 1. Danh sách tích hợp bên ngoài

| # | Tích hợp | Mục đích | Ứng viên (cần khảo sát) | Dữ liệu gửi đi | Dữ liệu nhận về | Cơ chế | Giai đoạn | Rủi ro / lưu ý |
|---|---|---|---|---|---|---|---|---|
| INT-01 | **Channel manager** (đại diện OTA: Booking.com, Agoda, Traveloka, Expedia…) | FR-02: nhận booking, đẩy tồn & giá | SiteMinder, Cloudbeds CM, ezCloud CM, STAAH, Hotel Link | Availability (hạng phòng × ngày × tồn, đóng/mở bán, min stay), Rate (gói giá × ngày × giá) | Booking mới/sửa/huỷ: mã OTA, kênh, hạng phòng, ngày, khách, giá, hoa hồng, chính sách huỷ, ghi chú | REST/XML API + webhook; retry; mapping hạng phòng | GĐ2 | Phí thuê CM theo tháng; mapping sai hạng phòng gây lệch tồn; độ trễ đồng bộ |
| INT-02 | **Kết nối trực tiếp OTA** | Thay CM về sau | Booking.com Connectivity, Agoda YCS API | Như INT-01 | Như INT-01 | Cần chứng nhận đối tác | GĐ3+ (tuỳ chọn) | Quy trình chứng nhận dài, không ưu tiên khách sạn nhỏ |
| INT-03 | **API khách sạn đối tác / aggregator** | BR-02: hiển thị & bán khách sạn khác | Hotelbeds, TBO, Agoda Affiliate, Expedia Rapid, hoặc đối tác trong nước | Tìm kiếm (điểm đến, ngày, khách), yêu cầu đặt, huỷ | Danh sách khách sạn, ảnh, tiện nghi, hạng phòng, giá, chính sách, xác nhận đặt | REST; cache dữ liệu tĩnh; đặt phòng theo mô hình "giá cuối cùng" | GĐ3 | Hợp đồng đại lý, tiền cọc, tỷ giá, chất lượng nội dung |
| INT-04 | **Cổng thanh toán** | FR-15: thanh toán online | VNPay, MoMo, ZaloPay, OnePay, Payoo | Số tiền, mã đơn, URL trả về | Kết quả giao dịch (webhook ký số), mã giao dịch, hoàn tiền | Redirect + IPN/webhook; xác minh chữ ký; đối soát ngày | GĐ2 | Phí giao dịch; hoàn tiền thủ công ở một số cổng; đối soát lệch |
| INT-05 | **Hoá đơn điện tử** | FR-10: phát hành HĐĐT theo NĐ 123/2020, TT 78/2021 | Viettel S-Invoice, VNPT Invoice, MISA meInvoice, FPT eInvoice, EasyInvoice | Thông tin người mua, dòng hàng, thuế, hình thức thanh toán | Số hoá đơn, mã CQT, PDF/XML, link tra cứu, trạng thái | REST API của NCC; điều chỉnh/thay thế hoá đơn | GĐ2 | Ký số (USB token/HSM); hoá đơn từ máy tính tiền nếu áp dụng; sai mẫu |
| INT-06 | **Zalo OA** | FR-13 inbox; FR-12 ZNS thông báo/xác nhận; FR-15 gửi xác nhận | Zalo Official Account API, ZNS | Tin nhắn trả lời, mẫu ZNS (mã booking, ngày) | Tin nhắn khách, ID người dùng Zalo, trạng thái gửi | Webhook + REST; OAuth token làm mới | GĐ2 (ZNS xác nhận), GĐ3 (inbox) | Duyệt mẫu ZNS; token hết hạn; phí ZNS |
| INT-07 | **Facebook Messenger** | FR-13 inbox | Messenger Platform (Page) | Tin trả lời | Tin nhắn khách, PSID | Webhook + Graph API; app review | GĐ3 | App review của Meta; cửa sổ 24h trả lời |
| INT-08 | **Email** | FR-13 inbox; gửi xác nhận, hoá đơn, chiến dịch | SMTP/SES/SendGrid; IMAP hoặc Gmail/Microsoft API cho inbox | Email giao dịch, chiến dịch | Email khách gửi đến | SMTP + IMAP/API | GĐ2 (gửi), GĐ3 (inbox) | Deliverability, SPF/DKIM |
| INT-09 | **SMS** | FR-12 chiến dịch; OTP | Brandname SMS: Viettel, VNPT, eSMS, SpeedSMS | Nội dung, số nhận | Trạng thái gửi | REST | GĐ3 | Đăng ký brandname; phí |
| INT-10 | **Tổng đài / hotline** | FR-13 ghi nhận cuộc gọi | Tổng đài ảo có API (nếu KS dùng) hoặc nhập tay | — | Log cuộc gọi, ghi âm | REST/webhook | GĐ3 (tuỳ chọn) | Phụ thuộc nhà cung cấp |
| INT-11 | **Khai báo lưu trú** | FR-09 | Xuất file theo mẫu (MVP); Cổng dịch vụ công / hệ thống ASM Bộ Công an (nếu có API/định dạng nhập) | Danh sách khách: họ tên, ngày sinh, giới tính, quốc tịch, số giấy tờ, địa chỉ, ngày đến/đi, phòng | Biên nhận (nếu có cổng) | File Excel/CSV theo mẫu cấu hình; API nếu khả thi | GĐ2 (file), GĐ3 (cổng) | Chưa chắc có API công khai; mẫu khác nhau theo địa phương |
| INT-12 | **Bản đồ** | Trang chi tiết khách sạn, vị trí | Google Maps / Mapbox / OpenStreetMap | Toạ độ | Bản đồ nhúng | JS SDK | GĐ2 | Phí Google Maps theo lượt |
| INT-13 | **Lưu trữ ảnh / CDN** | Ảnh khách sạn, giấy tờ (mã hoá) | S3-compatible + CDN | Ảnh | URL | SDK | GĐ1 | Giấy tờ tuỳ thân phải mã hoá, phân quyền chặt |
| INT-14 | **Phần mềm kế toán** | Xuất dữ liệu doanh thu/chi phí | MISA, Fast… | File Excel/CSV theo mẫu | — | Xuất file | GĐ3 | Ngoài phạm vi kế toán tổng hợp |

### Dữ liệu chủ cần chuẩn hoá trước khi tích hợp
- Bảng **mapping hạng phòng** PMS ↔ từng OTA ↔ aggregator.
- Bảng **mapping gói giá** PMS ↔ rate plan trên OTA.
- Mã **kênh** thống nhất (`web`, `front-desk`, `ota:booking`, `ota:agoda`, `partner:<tên>`) dùng cho báo cáo hoa hồng.
- Danh mục **thuế suất** và **hình thức thanh toán** dùng chung giữa folio và HĐĐT.

## 2. Phạm vi MVP & lộ trình

### Nguyên tắc chọn MVP
1. Giải quyết nỗi đau lớn nhất của đối tác chiến lược trước: **overbooking và vận hành rời rạc** → PMS lõi đi trước web public.
2. Mỗi giai đoạn giao được giá trị dùng ngay, không chờ toàn bộ.
3. Việc phụ thuộc bên thứ ba (CM, HĐĐT, cổng thanh toán) bắt đầu khảo sát/ký hợp đồng từ GĐ1 để không chặn GĐ2.

### Lộ trình đề xuất

| Giai đoạn | Mục tiêu | Phạm vi chức năng | Tích hợp | Kết quả nghiệm thu |
|---|---|---|---|---|
| **GĐ1 — PMS lõi** (≈ 8–10 tuần) | Thanh Long vận hành toàn bộ booking trên PMS, không overbooking nội bộ | FR-01 lịch; FR-03 booking lẻ/đoàn, check-in/out; FR-04 gói giá cơ bản + hạn mức chiết khấu; FR-06 sơ đồ phòng & app buồng phòng; FR-09 xuất file lưu trú; FR-10 folio + thu tiền (chưa HĐĐT); FR-11 dashboard + báo cáo công suất/doanh thu/ADR/RevPAR; FR-12 hồ sơ khách tối thiểu; FR-14 phân quyền + nhật ký | INT-13 lưu trữ; khảo sát & ký INT-01, INT-04, INT-05 | Lễ tân nhập toàn bộ booking OTA tay trong 2 tuần chạy song song; 0 overbooking nội bộ; tạo booking ≤ 2 phút |
| **GĐ2 — Web public + kết nối** (≈ 10–12 tuần) | Bán phòng Thanh Long trực tuyến, OTA tự động, hoá đơn hợp lệ | Phần A: trang chủ, 7 danh mục + danh mục con, form tư vấn + quản lý lead (UC-A07, UC-A10), chi tiết & đặt phòng Thanh Long (FR-15), tài khoản khách cơ bản, CMS nội dung; PMS: FR-02 channel manager, FR-10 HĐĐT + tách/gộp, FR-09 nhắc nhở & mẫu người nước ngoài | INT-01, INT-04, INT-05, INT-06 (ZNS), INT-08 (gửi), INT-12 | Booking OTA tự vào lịch < 2 phút; đặt web → PMS thành công end-to-end; HĐĐT có mã CQT |
| **GĐ3 — Mở rộng** (theo từng gói, ≈ 12+ tuần) | Tăng doanh thu & tự động hoá hậu cần | FR-05 ưu đãi/combo/mã; FR-07 kho; FR-08 chấm công; FR-10 công nợ & đối soát OTA; FR-12 tích điểm/phân hạng/chiến dịch; FR-13 inbox đa kênh; UC-A06 khách sạn đối tác qua aggregator; multi-property UI; khai báo lưu trú qua cổng nếu khả thi | INT-03, INT-06 (inbox), INT-07, INT-09, INT-10, INT-11 (cổng), INT-14 | Theo từng gói nhỏ, ưu tiên do khách hàng chọn sau GĐ2 |

### Ngoài MVP (xác nhận lại sau GĐ2)
Bán vé máy bay/xe/vui chơi/SIM/visa online qua API nhà cung cấp; app native; kế toán tổng hợp; tính lương; điều hành tour.

## 3. Câu hỏi cần làm rõ với khách hàng

Người trả lời: **anh Sơn (KS Thanh Long)** cho nhóm B, E, F; **Ban giám đốc TAVINA** cho nhóm A, C, D, G.

### A. Phần A — Website & dịch vụ
| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| A1 | Các dịch vụ ngoài khách sạn (vé máy bay, xe, vui chơi, SIM, visa, tour) ở giai đoạn đầu chỉ nhận yêu cầu tư vấn hay cần bán online ngay? Nếu bán, TAVINA đã có hợp đồng/API với nhà cung cấp nào? | GĐ-A1, phạm vi GĐ2/3 |
| A2 | Khách sạn đối tác khác lấy từ nguồn nào: aggregator (Hotelbeds, TBO…), affiliate OTA, hay hợp đồng trực tiếp từng khách sạn? Có bao nhiêu khách sạn dự kiến năm đầu? | INT-03, GĐ-A2 |
| A3 | TAVINA đã có bộ nhận diện (logo, màu, font), ảnh chụp Phú Yên và KS Thanh Long chất lượng cao chưa? | Thiết kế, `--keep palette,type` |
| A4 | Web cần tiếng Anh từ đầu hay chỉ tiếng Việt? Có khách quốc tế đặt Thanh Long không? | NFR-11 |
| A5 | Chính sách huỷ/hoàn tiền cho booking web: huỷ miễn phí trước bao lâu, phí huỷ, hoàn tiền qua cổng hay chuyển khoản tay? | FR-15 AC6, FR-04 |
| A6 | Quy trình xử lý lead tư vấn hiện nay: ai nhận, SLA phản hồi, có cần tích hợp CRM sẵn có không? | UC-A10 |

### B. Vận hành khách sạn
| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| B1 | Danh sách 24 phòng: số phòng, tầng, hạng phòng, sức chứa, giường? Có phòng thông nhau / phòng gia đình không? | Dữ liệu chủ FR-01 |
| B2 | Hiện bán trên OTA nào? Đã dùng channel manager hay quản lý extranet tay? Tỷ lệ booking theo kênh hiện tại? | INT-01, FR-02 |
| B3 | Có chấp nhận mô hình "Overbooked chờ xử lý" khi OTA đổ booking lúc hết phòng, hay muốn **buffer tồn** mặc định (giữ lại 1 phòng/hạng)? | FR-02 AC3, AC6 |
| B4 | Giờ check-in/check-out chuẩn, phụ thu nhận sớm/trả muộn, chính sách no-show, giờ night audit? | RULE-09, FR-03 |
| B5 | Khách đoàn chiếm bao nhiêu %? Hợp đồng đoàn có mẫu sẵn không? Cọc bao nhiêu %, thanh toán sau bao nhiêu ngày? | FR-03 US-04, FR-10 US-15 |
| B6 | Bảng giá hiện tại: bao nhiêu mùa, gói giá; giá OTA so với giá quầy; có giá đại lý/công ty lữ hành riêng không? | FR-04 |
| B7 | Hạn mức chiết khấu mong muốn cho lễ tân / quản lý? Ai được duyệt vượt hạn mức? | FR-04 US-07 |
| B8 | Số nhân viên từng bộ phận, số ca/ngày, nhân viên buồng phòng có điện thoại thông minh và wifi phủ tầng không? | FR-06, FR-08, GĐ-B6 |
| B9 | Minibar có tính tiền không? Đồ dùng phòng có định mức/ngày không? Kho hiện quản lý bằng gì? | FR-06 AC4, FR-07 |
| B10 | Có cần chế độ **offline** cho app buồng phòng và lễ tân khi mất mạng không? | NFR, FR-06 AC3 |

### C. Thanh toán, hoá đơn, kế toán
| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| C1 | Cổng thanh toán ưu tiên (VNPay/MoMo/ZaloPay/OnePay)? Đã có tài khoản merchant chưa? Ai chịu phí giao dịch? | INT-04 |
| C2 | Nhà cung cấp hoá đơn điện tử đang dùng? Có chữ ký số (USB token/HSM)? Có thuộc diện hoá đơn từ máy tính tiền không? | INT-05, FR-10 |
| C3 | Thuế suất áp dụng cho phòng, dịch vụ, minibar; có phí phục vụ không? | Folio, HĐĐT |
| C4 | Hoa hồng theo kênh (tỷ lệ từng OTA, đối tác) và hoa hồng nhân viên bán tính thế nào? | FR-11 |
| C5 | Phần mềm kế toán đang dùng? Cần xuất dữ liệu định dạng nào? | INT-14 |
| C6 | Chi phí vận hành (điện, nước, lương…) có nhập vào hệ thống để tính lợi nhuận không, hay chỉ chi phí kho? | FR-11 AC2 |

### D. Pháp lý & dữ liệu
| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| D1 | Mẫu khai báo lưu trú công an địa phương đang yêu cầu (file mẫu)? Hiện khai báo qua kênh nào (giấy, cổng dịch vụ công, app ASM)? Tần suất? | FR-09, INT-11 |
| D2 | Có lưu ảnh giấy tờ tuỳ thân không, lưu bao lâu? Có nhân viên phụ trách bảo vệ dữ liệu cá nhân (NĐ 13/2023) chưa? | NFR-06, NFR-07 |
| D3 | Dữ liệu booking/khách lịch sử cần nhập vào hệ thống mới không? Định dạng hiện tại (Excel, phần mềm cũ)? | Kế hoạch migration GĐ1 |

### E. CRM & CSKH
| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| E1 | Đã có Zalo OA (loại tài khoản, đã xác thực?) và Fanpage? Ai quản trị? | INT-06, INT-07 |
| E2 | Quy tắc tích điểm và phân hạng mong muốn? Điểm dùng để làm gì (giảm giá, nâng hạng phòng)? | FR-12 |
| E3 | Hotline dùng tổng đài gì? Có cần ghi nhận cuộc gọi tự động không? | INT-10 |
| E4 | Chương trình tái sales dự kiến: tần suất, kênh ưu tiên (ZNS/SMS/email), ngân sách? | FR-12 US-18 |

### F. Multi-property & tương lai
| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| F1 | Dự kiến thêm khách sạn đối tác dùng chung PMS khi nào, bao nhiêu? Mô hình: TAVINA cho thuê PMS hay chỉ bán phòng hộ? | BR-21, NFR-10, mô hình quyền |
| F2 | Chủ khách sạn khác có được thấy dữ liệu của nhau không (chắc chắn không) — xác nhận yêu cầu cô lập dữ liệu | FR-14 AC2 |

### G. Dự án
| # | Câu hỏi | Ảnh hưởng tới |
|---|---|---|
| G1 | Mốc thời gian mong muốn cho GĐ1 (mùa cao điểm Phú Yên tháng mấy?) | Lộ trình |
| G2 | Ai là người quyết định cuối ở từng phần (A: TAVINA, B: anh Sơn)? Lịch họp review hàng tuần? | Quản trị dự án |
| G3 | Ngân sách cho dịch vụ bên thứ ba hàng tháng (CM, HĐĐT, ZNS, cổng thanh toán, hosting)? | Lựa chọn nhà cung cấp |

## 4. Bước tiếp theo
1. Gửi bộ tài liệu này cho anh Sơn và Ban giám đốc TAVINA; thu câu trả lời mục 3 trong 1 tuần.
2. Cập nhật giả định → bản 0.2; chốt phạm vi GĐ1.
3. Khảo sát 2–3 nhà cung cấp cho INT-01, INT-04, INT-05 song song với thiết kế GĐ1.
4. Thiết kế UI theo wireframe (skill `design-taste-frontend`), rồi chuyển SRS GĐ1 thành backlog sprint.
