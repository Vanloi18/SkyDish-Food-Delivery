import { API_URLS } from '../../config/api';
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  FaUserCircle, 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaReceipt, 
  FaUtensils, 
  FaSignOutAlt, 
  FaShieldAlt,
  FaHeart
} from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import StatCard from "../../components/common/StatCard";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";

export default function CustomerProfile() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/auth/login");
          return;
        }

        const res = await axios.get(`${API_URLS.AUTH}/api/auth/customer/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const customer = res.data?.data?.customer || res.data?.customer || res.data;
        setProfile(customer);

        if (customer?.firstName) {
          localStorage.setItem("customerName", `${customer.firstName} ${customer.lastName || ""}`.trim());
        }
        if (customer?.email) {
          localStorage.setItem("customerEmail", customer.email);
        }
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError("Không thể tải thông tin hồ sơ. Vui lòng xác minh lại phiên đăng nhập.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("customerName");
    localStorage.removeItem("customerEmail");
    navigate("/auth/login");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <main style={{ flex: 1, padding: "3rem 1.25rem", backgroundColor: "var(--sd-bg-main)" }}>
        <div className="sd-container">
          {loading ? (
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              <LoadingSkeleton type="text" count={3} height="30px" style={{ marginBottom: "2rem" }} />
              <LoadingSkeleton type="card" count={2} />
            </div>
          ) : error ? (
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <EmptyState
                icon={FaShieldAlt}
                title="Phiên đăng nhập hết hạn hoặc không khả dụng"
                description={error}
                actionLabel="Đăng nhập lại"
                onAction={() => navigate("/auth/login")}
              />
            </div>
          ) : (
            <div style={{ maxWidth: "900px", margin: "0 auto" }}>
              {/* Profile Top Banner */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  padding="2rem"
                  style={{
                    marginBottom: "2rem",
                    background: "linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)",
                    border: "1px solid var(--sd-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "1.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                      <div
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "50%",
                          backgroundColor: "var(--sd-primary-light)",
                          color: "var(--sd-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 12px rgba(255, 87, 34, 0.2)",
                        }}
                      >
                        <FaUserCircle size={48} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <h2
                            style={{
                              margin: 0,
                              fontSize: "var(--sd-font-size-2xl)",
                              fontWeight: "800",
                              color: "var(--sd-text-primary)",
                            }}
                          >
                            {profile.firstName} {profile.lastName}
                          </h2>
                          <Badge variant="success" size="sm">Thành viên tích cực</Badge>
                        </div>
                        <p style={{ margin: 0, color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)" }}>
                          Chào mừng bạn trở lại với SkyDish Food Delivery
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      <Link to="/customer/home">
                        <Button variant="primary" icon={FaUtensils}>
                          Khám phá nhà hàng
                        </Button>
                      </Link>
                      <Button variant="outline" icon={FaSignOutAlt} onClick={handleLogout}>
                        Đăng xuất
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Stats Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "1.25rem",
                  marginBottom: "2rem",
                }}
              >
                <StatCard
                  title="Hạng thành viên"
                  value="Gold Foodie"
                  subtitle="Miễn phí giao hàng đơn > 250.000 ₫"
                  icon={FaHeart}
                  iconBg="var(--sd-primary-light)"
                  iconColor="var(--sd-primary)"
                />
                <StatCard
                  title="Quản lý đơn hàng"
                  value="Theo dõi trực tiếp"
                  subtitle="Cập nhật shipper thời gian thực"
                  icon={FaReceipt}
                  iconBg="var(--sd-info-light)"
                  iconColor="var(--sd-info)"
                />
                <StatCard
                  title="Địa chỉ mặc định"
                  value={profile.location || "TP. Hồ Chí Minh"}
                  subtitle="Địa chỉ giao hàng chính"
                  icon={FaMapMarkerAlt}
                  iconBg="var(--sd-success-light)"
                  iconColor="var(--sd-success)"
                />
              </div>

              {/* Profile Details Card */}
              <Card padding="2rem">
                <h3
                  style={{
                    margin: "0 0 1.5rem 0",
                    fontSize: "var(--sd-font-size-lg)",
                    fontWeight: "700",
                    borderBottom: "1px solid var(--sd-border)",
                    paddingBottom: "0.75rem",
                  }}
                >
                  Thông tin cá nhân & Giao hàng
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "var(--sd-radius-md)",
                        backgroundColor: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--sd-primary)",
                      }}
                    >
                      <FaEnvelope size={18} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                        Địa chỉ Email
                      </p>
                      <p style={{ margin: 0, fontSize: "var(--sd-font-size-base)", fontWeight: "600" }}>
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "var(--sd-radius-md)",
                        backgroundColor: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--sd-success)",
                      }}
                    >
                      <FaPhone size={18} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                        Số điện thoại
                      </p>
                      <p style={{ margin: 0, fontSize: "var(--sd-font-size-base)", fontWeight: "600" }}>
                        {profile.phone || "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "var(--sd-radius-md)",
                        backgroundColor: "#f1f5f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ff9800",
                      }}
                    >
                      <FaMapMarkerAlt size={18} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                        Địa chỉ giao hàng
                      </p>
                      <p style={{ margin: 0, fontSize: "var(--sd-font-size-base)", fontWeight: "600" }}>
                        {profile.location || "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "2rem",
                    paddingTop: "1.5rem",
                    borderTop: "1px solid var(--sd-border)",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "1rem",
                  }}
                >
                  <Link to="/orders">
                    <Button variant="secondary" icon={FaReceipt}>
                      Xem đơn hàng của tôi
                    </Button>
                  </Link>
                  <Link to="/customer/home">
                    <Button variant="primary" icon={FaUtensils}>
                      Đặt món ngay
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
