import React from "react";
import { motion } from "framer-motion";
import { FaUtensils, FaRocket, FaUsers, FaLeaf, FaAward } from "react-icons/fa";
import Header from "../components/Header";
import Footer from "../components/Footer";

function About() {
  const values = [
    {
      title: "Tốc độ & Đáng tin cậy",
      desc: "Giao món nóng hổi, tươi ngon với độ chính xác cao và theo dõi vị trí shipper trực tiếp qua GPS thời gian thực.",
      icon: FaRocket,
      color: "var(--sd-primary)",
      bg: "var(--sd-primary-light)",
    },
    {
      title: "Chất lượng Ẩm thực",
      desc: "Hợp tác độc quyền với các nhà hàng uy tín, đạt chứng nhận vệ sinh an toàn thực phẩm và đầu bếp tâm huyết.",
      icon: FaAward,
      color: "#f59e0b",
      bg: "#fff8e1",
    },
    {
      title: "Đồng hành cùng Cộng đồng",
      desc: "Trao quyền cho các đối tác nhà hàng và shipper gia tăng thu nhập ổn định, bền vững mỗi ngày.",
      icon: FaUsers,
      color: "#3b82f6",
      bg: "#eff6ff",
    },
    {
      title: "Thân thiện với Môi trường",
      desc: "Tối ưu hóa các tuyến đường giao hàng thông minh và khuyến khích phương tiện xanh nhằm giảm phát thải.",
      icon: FaLeaf,
      color: "#10b981",
      bg: "#ecfdf5",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "3.5rem 0 6rem 0" }}>
        <div className="sd-container">
          {/* Hero Section */}
          <div style={{ textAlign: "center", maxWidth: "750px", margin: "0 auto 4rem auto" }}>
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
                marginBottom: "1rem",
              }}
            >
              <FaUtensils /> Câu chuyện & Sứ mệnh
            </span>
            <h1 className="sd-heading-1" style={{ marginBottom: "1rem" }}>
              Đổi mới trải nghiệm giao đồ ăn trực tuyến
            </h1>
            <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-base)", lineHeight: "1.7" }}>
              SkyDish được xây dựng trên nền tảng kiến trúc microservices đám mây hiện đại, kết nối thực khách với những gian bếp ẩm thực tâm huyết trên toàn thành phố.
            </p>
          </div>

          {/* Core Values Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "2rem",
              marginBottom: "4rem",
            }}
          >
            {values.map((val, idx) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={val.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "var(--sd-radius-xl)",
                    border: "1px solid var(--sd-border)",
                    padding: "2rem 1.75rem",
                    boxShadow: "var(--sd-shadow-sm)",
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "var(--sd-radius-lg)",
                      backgroundColor: val.bg,
                      color: val.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1.25rem",
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <h3 style={{ fontSize: "var(--sd-font-size-lg)", fontWeight: "700", marginBottom: "0.5rem" }}>
                    {val.title}
                  </h3>
                  <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", lineHeight: "1.6", margin: 0 }}>
                    {val.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Architecture Highlights Banner */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "var(--sd-radius-xl)",
              border: "1px solid var(--sd-border)",
              padding: "3rem 2.5rem",
              boxShadow: "var(--sd-shadow-md)",
            }}
          >
            <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
              <h2 style={{ fontSize: "var(--sd-font-size-2xl)", fontWeight: "800", marginBottom: "1rem" }}>
                Kiến trúc Microservices Hiện đại & Đa Cổng Thanh toán
              </h2>
              <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", lineHeight: "1.7", marginBottom: "2rem" }}>
                Nền tảng SkyDish hoạt động dựa trên 5 microservices độc lập: <strong>Auth Service</strong>, <strong>Restaurant Service</strong>, <strong>Order Service</strong>, <strong>Delivery Service</strong>, và <strong>Payment Service</strong> hỗ trợ Stripe, VNPay, MoMo, COD cùng Socket.IO truyền dữ liệu trực tiếp.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                {[
                  "Xác thực chuẩn JWT",
                  "Cổng thanh toán Stripe",
                  "Cổng thanh toán VNPay",
                  "Ví điện tử MoMo",
                  "Thanh toán khi nhận hàng (COD)",
                  "Socket.IO Định vị Trực tiếp",
                  "Cơ sở dữ liệu MongoDB",
                ].map((tech) => (
                  <span
                    key={tech}
                    style={{
                      padding: "0.4rem 0.85rem",
                      borderRadius: "var(--sd-radius-full)",
                      backgroundColor: "var(--sd-bg-muted)",
                      color: "var(--sd-text-primary)",
                      fontSize: "var(--sd-font-size-xs)",
                      fontWeight: "600",
                    }}
                  >
                    ✓ {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default About;