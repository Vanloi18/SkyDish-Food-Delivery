import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaStore, 
  FaShieldAlt, 
  FaMotorcycle, 
  FaCheckCircle
} from "react-icons/fa";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Button from "../../../components/common/Button";

function IndexPage() {
  const navigate = useNavigate();

  const portals = [
    {
      title: "Đối tác Nhà hàng",
      description: "Quản lý thực đơn nhà bếp, thêm món ăn mới, bật/tắt tình trạng phục vụ và theo dõi đơn hàng.",
      icon: FaStore,
      color: "#3b82f6",
      bg: "#eff6ff",
      loginPath: "/restaurant/login",
      registerPath: "/restaurant/register",
      loginLabel: "Đăng nhập Nhà hàng",
      registerLabel: "Đăng ký Nhà hàng mới",
      features: ["Quản lý thực đơn trực tiếp", "Bật/tắt trạng thái món ăn", "Theo dõi đơn hàng & doanh thu"],
    },
    {
      title: "Đối tác Shipper",
      description: "Nhận các đơn hàng lân cận, điều hướng đến địa chỉ khách hàng và cập nhật trạng thái giao hàng thời gian thực.",
      icon: FaMotorcycle,
      color: "#10b981",
      bg: "#ecfdf5",
      loginPath: "/delivery/login",
      registerPath: "/delivery/register",
      loginLabel: "Đăng nhập Shipper",
      registerLabel: "Đăng ký Shipper mới",
      features: ["Nhận đơn chỉ với 1 chạm", "Theo dõi lộ trình trực tiếp", "Cập nhật tiến trình giao hàng"],
    },
    {
      title: "Quản trị viên",
      description: "Giám sát toàn bộ hoạt động của nền tảng, danh sách nhà hàng, shipper đang hoạt động và số liệu thống kê hệ thống.",
      icon: FaShieldAlt,
      color: "#8b5cf6",
      bg: "#f5f3ff",
      loginPath: "/superadmin/login",
      registerPath: "/superadmin/register",
      loginLabel: "Đăng nhập Quản trị viên",
      registerLabel: "Đăng ký Quản trị viên mới",
      features: ["Quản lý toàn bộ nhà hàng", "Tổng quan hệ thống & thống kê", "Xác minh tài khoản đối tác"],
    },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "4rem 0 6rem 0" }}>
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
              <FaStore /> Mạng lưới Đối tác & Thương nhân SkyDish
            </span>
            <h1 className="sd-heading-1" style={{ marginBottom: "0.75rem" }}>
              Trung tâm Đối tác & Quản trị
            </h1>
            <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-base)" }}>
              Truy cập bảng điều khiển chuyên biệt để quản lý thực đơn món ăn, điều phối giao hàng hoặc giám sát hệ thống.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "2rem",
            }}
          >
            {portals.map((portal, idx) => {
              const Icon = portal.icon;
              return (
                <motion.div
                  key={portal.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.1 }}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "var(--sd-radius-xl)",
                    border: "1px solid var(--sd-border)",
                    padding: "2.5rem 2rem",
                    boxShadow: "var(--sd-shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "var(--sd-radius-lg)",
                        backgroundColor: portal.bg,
                        color: portal.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <Icon size={26} />
                    </div>

                    <h3 style={{ fontSize: "var(--sd-font-size-xl)", fontWeight: "800", marginBottom: "0.5rem" }}>
                      {portal.title}
                    </h3>
                    <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                      {portal.description}
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "2rem" }}>
                      {portal.features.map((feat, fIdx) => (
                        <div key={fIdx} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-secondary)" }}>
                          <FaCheckCircle style={{ color: portal.color, flexShrink: 0 }} />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={() => navigate(portal.loginPath)}
                    >
                      {portal.loginLabel}
                    </Button>
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={() => navigate(portal.registerPath)}
                    >
                      {portal.registerLabel}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default IndexPage;