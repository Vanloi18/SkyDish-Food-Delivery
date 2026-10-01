# Expanded restaurant seed data

The local seed now includes eleven additional Vietnam-based restaurant records with real-world restaurant names, locations, signature dishes, and demo partner accounts.

All seeded partner accounts use the local-only password `password123`:

| Restaurant | Demo partner email | Location |
| --- | --- | --- |
| Bánh Mì Huỳnh Hoa | `partner.banhmi.huynhhoa@skydish.local` | 26 Lê Thị Riêng, Quận 1, TP.HCM |
| Cơm Tấm Ba Ghiền | `partner.comtam.baghien@skydish.local` | 84 Đặng Văn Ngữ, Phú Nhuận, TP.HCM |
| Bún Bò Huế Đông Ba | `partner.bunbo.dongba@skydish.local` | 110A Nguyễn Du, Quận 1, TP.HCM |
| Bún Chả Đắc Kim | `partner.bunchadackim@skydish.local` | 1 Hàng Mành, Hoàn Kiếm, Hà Nội |
| Chả Cá Thăng Long Đường Thành | `partner.chacathanglong@skydish.local` | 21 Đường Thành, Hoàn Kiếm, Hà Nội |
| Ngon Garden Nguyễn Du | `partner.ngongarden.nguyendu@skydish.local` | 70 Nguyễn Du, Hai Bà Trưng, Hà Nội |
| Bánh Cuốn Bà Hoành | `partner.banhcuon.bahoanh@skydish.local` | 29 Thụy Khuê, Tây Hồ, Hà Nội |
| Hủ Tiếu Thanh Xuân | `partner.hutieu.thanhxuan@skydish.local` | 62 Tôn Thất Thiệp, Quận 1, TP.HCM |
| The Pizza Company Cầu Giấy | `partner.pizzacompany.caugiay@skydish.local` | 26 Nguyễn Khang, Cầu Giấy, Hà Nội |
| Kichi-Kichi Lẩu Băng Chuyền Cầu Giấy | `partner.kichikichi.caugiay@skydish.local` | 222 Trần Duy Hưng, Cầu Giấy, Hà Nội |
| Lotteria Cầu Giấy | `partner.lotteria.caugiay@skydish.local` | 241 Xuân Thủy, Cầu Giấy, Hà Nội |

The image URLs are public representative food/restaurant photography used for local demo presentation. They are not official brand assets and should be replaced with licensed or official image URLs before a public/commercial deployment. Restaurant names, locations, and dish descriptions should also be re-verified against each restaurant's current official menu before publication.

## Demo reviews

The seed also creates five local-only customer accounts with password `password123`, one `Paid` + `Delivered` order per account, and one active review per order. The ratings intentionally cover 1, 2, 3, 4, and 5 stars so the review distribution can be tested:

| Demo reviewer | Rating |
| --- | ---: |
| `reviewer.minhanh@skydish.local` | 1 |
| `reviewer.thulinh@skydish.local` | 2 |
| `reviewer.quanghuy@skydish.local` | 3 |
| `reviewer.ngocmai@skydish.local` | 4 |
| `reviewer.giabao@skydish.local` | 5 |

These are clearly marked as demo data and are not real customer testimonials.

The seed is idempotent and can be applied with:

```powershell
docker compose up -d --build restaurant-service
docker compose exec restaurant-service node seed-all.mjs
```
