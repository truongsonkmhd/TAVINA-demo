// Danh mục con theo BRD mục 7 (bảng "Cấu trúc danh mục con") — hard-code chấp nhận được cho demo.
import type { ServiceKey } from '@/types'
import { SERVICE_SLUG } from '@/layouts/PublicLayout'

export interface ServiceInfo {
  key: ServiceKey
  tagline: string
  intro: string
  image: string
  subcategories: { name: string; desc: string }[]
  onlineSale: boolean
}

const img = (s: string) => `https://picsum.photos/seed/${s}/900/600`

export const SERVICES: ServiceInfo[] = [
  { key: 'flight', tagline: 'Săn vé rẻ, đổi ngày linh hoạt, xuất vé trong 15 phút.', intro: 'TAVINA là đại lý vé của Vietnam Airlines, Vietjet, Bamboo. Đặt vé lẻ hay vé đoàn đều có người phụ trách riêng, hỗ trợ 24/7 khi hoãn/huỷ chuyến.', image: img('svc-flight'), onlineSale: false,
    subcategories: [{ name: 'Nội địa', desc: 'Tuy Hoà – Hà Nội / TP.HCM và mọi đường bay trong nước' }, { name: 'Quốc tế', desc: 'Đông Nam Á, Đông Bắc Á, châu Âu, Mỹ' }, { name: 'Vé đoàn / doanh nghiệp', desc: 'Từ 10 khách, giữ chỗ không mất phí, xuất hoá đơn' }, { name: 'Tư vấn hành trình', desc: 'Gợi ý lịch bay tối ưu chi phí và thời gian' }] },
  { key: 'hotel', tagline: 'Khách sạn Thanh Long đặt trực tiếp, đối tác khắp Việt Nam.', intro: 'Giá và phòng trống Khách sạn Thanh Long đồng bộ trực tiếp từ hệ thống quản lý. Các khách sạn đối tác đặt qua TAVINA có tư vấn viên hỗ trợ.', image: img('svc-hotel'), onlineSale: true,
    subcategories: [{ name: 'Thanh Long (ưu tiên)', desc: 'Đối tác chiến lược, đặt – thanh toán ngay' }, { name: 'Trong nước theo điểm đến', desc: 'Phú Yên, Quy Nhơn, Nha Trang, Đà Lạt…' }, { name: 'Nước ngoài', desc: 'Thái Lan, Singapore, Hàn Quốc, Nhật Bản' }, { name: 'Resort / Villa', desc: 'Nghỉ dưỡng biển, villa riêng cho gia đình' }, { name: 'Homestay', desc: 'Gần Gành Đá Đĩa, Bãi Xép, Vũng Rô' }] },
  { key: 'bus', tagline: 'Xe giường nằm, limousine, đưa đón sân bay Tuy Hoà.', intro: 'Đặt vé xe liên tỉnh và xe riêng có tài xế. Xe đón tại sân bay Tuy Hoà về khách sạn trong 25 phút.', image: img('svc-bus'), onlineSale: false,
    subcategories: [{ name: 'Xe khách liên tỉnh', desc: 'Tuy Hoà – Quy Nhơn, Nha Trang, Đà Lạt, TP.HCM' }, { name: 'Xe limousine', desc: '9–11 chỗ, ghế massage, wifi' }, { name: 'Đưa đón sân bay', desc: 'Xe 4–16 chỗ, đón tại cửa đến' }, { name: 'Thuê xe có tài xế', desc: 'Theo ngày, đi Gành Đá Đĩa, Mũi Điện, Vũng Rô' }] },
  { key: 'activity', tagline: 'Vé tham quan, show diễn, cano, lặn ngắm san hô.', intro: 'Mua vé trước để không xếp hàng. Có hướng dẫn viên địa phương cho các hoạt động ngoài trời.', image: img('svc-activity'), onlineSale: false,
    subcategories: [{ name: 'Công viên / khu du lịch', desc: 'Gành Đá Đĩa, Mũi Điện, Hòn Yến, Đập Đồng Cam' }, { name: 'Bảo tàng / di tích', desc: 'Tháp Nhạn, Nhà thờ Mằng Lăng, Thành An Thổ' }, { name: 'Show diễn', desc: 'Nghệ thuật bài chòi, tuồng Phú Yên' }, { name: 'Hoạt động ngoài trời', desc: 'Lặn ngắm san hô Hòn Chùa, cano Vũng Rô, SUP đầm Ô Loan' }] },
  { key: 'sim', tagline: 'SIM và eSIM du lịch, nhận mã trong 5 phút.', intro: 'eSIM quốc tế kích hoạt bằng mã QR, không cần đổi SIM. SIM Việt Nam giao tại khách sạn cho khách nước ngoài.', image: img('svc-sim'), onlineSale: false,
    subcategories: [{ name: 'SIM Việt Nam cho khách nước ngoài', desc: 'Viettel, Vinaphone 4G/5G, 7–30 ngày' }, { name: 'SIM / eSIM quốc tế theo nước', desc: 'Nhật, Hàn, Thái, Singapore, Đài Loan…' }, { name: 'Theo khu vực', desc: 'Châu Á, châu Âu, Bắc Mỹ, toàn cầu' }] },
  { key: 'visa', tagline: 'Hồ sơ visa đúng chuẩn, tỉ lệ đậu cao, hoàn phí nếu rớt.', intro: 'Đội ngũ xử lý hơn 2.000 hồ sơ mỗi năm. Kiểm tra hồ sơ miễn phí trước khi nộp.', image: img('svc-visa'), onlineSale: false,
    subcategories: [{ name: 'Visa đi nước ngoài theo nước', desc: 'Hàn Quốc, Nhật Bản, Đài Loan, Schengen, Mỹ, Úc' }, { name: 'Visa Việt Nam cho người nước ngoài', desc: 'E-visa, visa nhập cảnh, thẻ tạm trú' }, { name: 'Gia hạn', desc: 'Gia hạn visa du lịch / công tác tại Việt Nam' }, { name: 'Dịch thuật / công chứng', desc: 'Dịch công chứng hồ sơ 24h' }] },
  { key: 'tour', tagline: 'Tour Phú Yên 1–3 ngày, tour ghép, tour riêng cho đoàn.', intro: 'Hướng dẫn viên người Phú Yên, lịch trình linh hoạt theo thuỷ triều và thời tiết. Combo phòng Thanh Long + tour đặt online.', image: img('svc-tour'), onlineSale: false,
    subcategories: [{ name: 'Tour trong nước theo vùng', desc: 'Phú Yên, Tây Nguyên, miền Trung, miền Bắc' }, { name: 'Tour nước ngoài', desc: 'Thái Lan, Hàn Quốc, Nhật Bản, châu Âu' }, { name: 'Tour ghép', desc: 'Khởi hành hằng ngày từ Tuy Hoà, từ 2 khách' }, { name: 'Tour riêng / đoàn', desc: 'Team building, đoàn công ty, gia đình nhiều thế hệ' }, { name: 'Combo phòng + tour Phú Yên', desc: 'Phòng Thanh Long + tour, đặt online có giá ngay' }] },
]

export const serviceByKey = (k: ServiceKey) => SERVICES.find((s) => s.key === k)!
export const serviceLink = (k: ServiceKey) => (k === 'hotel' ? '/khach-san' : `/dich-vu/${SERVICE_SLUG[k]}`)
