import React from "react";
import { FaShieldAlt, FaLock, FaUserCheck, FaDatabase } from "react-icons/fa";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Card from "../components/common/Card";

function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Thông tin chúng tôi thu thập",
      content: "Khi sử dụng SkyDish, chúng tôi thu thập các thông tin khách hàng cần thiết như họ tên, địa chỉ email, số điện thoại và địa chỉ giao nhận. Chúng tôi không lưu trữ thông tin thẻ ngân hàng nhạy cảm trên máy chủ; mọi giao dịch trực tuyến đều được mã hóa và xử lý trực tiếp qua các cổng thanh toán Stripe, VNPay và MoMo.",
      icon: FaDatabase,
    },
    {
      title: "2. Cách chúng tôi sử dụng dữ liệu",
      content: "Dữ liệu của bạn được sử dụng duy nhất nhằm phục vụ quá trình đặt món, tính toán khoảng cách và thời gian giao hàng dự kiến, cập nhật vị trí shipper thời gian thực và giúp đối tác nhà hàng chuẩn bị món ăn chuẩn xác.",
      icon: FaUserCheck,
    },
    {
      title: "3. Bảo mật Microservices & Chuẩn JWT",
      content: "Toàn bộ giao tiếp giữa các vi dịch vụ (Auth, Restaurant, Order, Delivery, Payment) đều diễn ra trên các kênh xác thực JSON Web Token (JWT) bảo mật cao và giao thức kết nối HTTPS mã hóa an toàn.",
      icon: FaLock,
    },
    {
      title: "4. Quyền lợi & Quyền kiểm soát của bạn",
      content: "Bạn có toàn quyền sở hữu và quản lý dữ liệu cá nhân của mình, có thể cập nhật hoặc yêu cầu xóa thông tin bất kỳ lúc nào qua trang Hồ sơ cá nhân hoặc gửi yêu cầu cho đội ngũ hỗ trợ.",
      icon: FaShieldAlt,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "3.5rem 0 6rem 0" }}>
        <div className="sd-container">
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 3.5rem auto" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--sd-radius-full)",
                backgroundColor: "var(--sd-primary-light)",
                color: "var(--sd-primary)",
                fontSize: "var(--sd-font-size-xs)",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.75rem",
              }}
            >
              <FaShieldAlt /> Bảo mật Dữ liệu & Sự tin cậy
            </span>
            <h1 className="sd-heading-1" style={{ marginBottom: "0.75rem" }}>
              Chính sách Bảo mật SkyDish
            </h1>
            <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-base)" }}>
              Chúng tôi cam kết bảo vệ dữ liệu cá nhân của bạn và đảm bảo quy trình bảo mật minh bạch tuyệt đối.
            </p>
          </div>

          <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {sections.map((sec, idx) => {
              const Icon = sec.icon;
              return (
                <Card key={idx} padding="2rem">
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "var(--sd-radius-md)",
                        backgroundColor: "var(--sd-primary-light)",
                        color: "var(--sd-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "var(--sd-font-size-lg)", fontWeight: "700", marginBottom: "0.5rem" }}>
                        {sec.title}
                      </h3>
                      <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", lineHeight: "1.7", margin: 0 }}>
                        {sec.content}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default PrivacyPolicy;