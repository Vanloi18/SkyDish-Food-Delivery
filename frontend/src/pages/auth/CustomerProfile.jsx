import { API_URLS } from "../../config/api";
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
  FaHeart,
  FaEdit,
  FaSave,
  FaTimes,
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

  // Trạng thái form cập nhật
  const [editingDeliveryInfo, setEditingDeliveryInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const [form, setForm] = useState({
    phone: "",
    location: "",
  });

  const navigate = useNavigate();

  // ============================================================
  // LOAD PROFILE
  // ============================================================

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/auth/login");
          return;
        }

        const res = await axios.get(
          `${API_URLS.AUTH}/api/auth/customer/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const customer =
          res.data?.data?.customer ||
          res.data?.customer ||
          res.data;

        setProfile(customer);

        // Đồng bộ form
        setForm({
          phone: customer?.phone || "",
          location: customer?.location || "",
        });

        // Lưu thông tin cơ bản vào localStorage
        if (customer?.firstName) {
          localStorage.setItem(
            "customerName",
            `${customer.firstName} ${customer.lastName || ""}`.trim()
          );
        }

        if (customer?.email) {
          localStorage.setItem("customerEmail", customer.email);
        }

        if (customer?.phone) {
          localStorage.setItem("customerPhone", customer.phone);
        } else {
          localStorage.removeItem("customerPhone");
        }

        if (customer?.location) {
          localStorage.setItem("customerLocation", customer.location);
        } else {
          localStorage.removeItem("customerLocation");
        }
      } catch (err) {
        console.error("Profile fetch error:", err);

        setError(
          "Không thể tải thông tin hồ sơ. Vui lòng xác minh lại phiên đăng nhập."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("customerName");
    localStorage.removeItem("customerEmail");
    localStorage.removeItem("customerPhone");
    localStorage.removeItem("customerLocation");

    navigate("/auth/login");
  };

  // ============================================================
  // OPEN EDIT FORM
  // ============================================================

  const handleOpenEdit = () => {
    setForm({
      phone: profile?.phone || "",
      location: profile?.location || "",
    });

    setSaveError("");
    setSaveSuccess("");
    setEditingDeliveryInfo(true);
  };

  // ============================================================
  // CLOSE EDIT FORM
  // ============================================================

  const handleCancelEdit = () => {
    setForm({
      phone: profile?.phone || "",
      location: profile?.location || "",
    });

    setSaveError("");
    setSaveSuccess("");
    setEditingDeliveryInfo(false);
  };

  // ============================================================
  // HANDLE INPUT
  // ============================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ============================================================
  // UPDATE DELIVERY INFORMATION
  // ============================================================

  const handleSaveDeliveryInfo = async (e) => {
    e.preventDefault();

    setSaveError("");
    setSaveSuccess("");

    const phone = form.phone.trim();
    const location = form.location.trim();

    // Validate SĐT
    if (!phone) {
      setSaveError("Vui lòng nhập số điện thoại.");
      return;
    }

    // Validate số điện thoại Việt Nam cơ bản
    const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

    if (!phoneRegex.test(phone)) {
      setSaveError(
        "Số điện thoại không hợp lệ. Ví dụ: 0901234567."
      );
      return;
    }

    // Validate địa chỉ
    if (!location) {
      setSaveError("Vui lòng nhập địa chỉ giao hàng.");
      return;
    }

    if (location.length < 5) {
      setSaveError("Địa chỉ giao hàng quá ngắn.");
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/auth/login");
        return;
      }

      const res = await axios.patch(
        `${API_URLS.AUTH}/api/auth/customer/profile`,
        {
          phone,
          location,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const updatedCustomer =
        res.data?.data?.customer ||
        res.data?.customer ||
        res.data;

      // Cập nhật profile trên giao diện
      setProfile((prev) => ({
        ...prev,
        ...updatedCustomer,
        phone,
        location,
      }));

      // Đồng bộ form
      setForm({
        phone,
        location,
      });

      // Đồng bộ localStorage
      localStorage.setItem("customerPhone", phone);
      localStorage.setItem("customerLocation", location);

      setSaveSuccess(
        "Cập nhật thông tin giao hàng thành công."
      );

      // Đóng form sau một khoảng ngắn
      setTimeout(() => {
        setEditingDeliveryInfo(false);
        setSaveSuccess("");
      }, 1200);
    } catch (err) {
      console.error("Update delivery information error:", err);

      const message =
        err.response?.data?.message ||
        "Không thể cập nhật thông tin giao hàng. Vui lòng thử lại.";

      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CHECK MISSING DELIVERY INFORMATION
  // ============================================================

  const missingDeliveryInfo =
    !profile?.phone?.trim() ||
    !profile?.location?.trim();

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      className="customer-experience customer-profile-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />

      <main
        className="profile-page-main"
        style={{
          flex: 1,
          padding: "3rem 1.25rem",
          backgroundColor: "var(--sd-bg-main)",
        }}
      >
        <div className="sd-container">
          {/* ================================================== */}
          {/* LOADING */}
          {/* ================================================== */}

          {loading ? (
            <div
              className="profile-page-shell"
              style={{
                maxWidth: "800px",
                margin: "0 auto",
              }}
            >
              <LoadingSkeleton
                type="text"
                count={3}
                height="30px"
                style={{
                  marginBottom: "2rem",
                }}
              />

              <LoadingSkeleton
                type="card"
                count={2}
              />
            </div>
          ) : error ? (
            /* ================================================== */
            /* ERROR */
            /* ================================================== */

            <div
              style={{
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              <EmptyState
                icon={FaShieldAlt}
                title="Phiên đăng nhập hết hạn hoặc không khả dụng"
                description={error}
                actionLabel="Đăng nhập lại"
                onAction={() => navigate("/auth/login")}
              />
            </div>
          ) : (
            /* ================================================== */
            /* PROFILE */
            /* ================================================== */

            <div
              className="profile-page-shell"
              style={{
                maxWidth: "900px",
                margin: "0 auto",
              }}
            >
              {/* ================================================== */}
              {/* PROFILE TOP BANNER */}
              {/* ================================================== */}

              <motion.div
                className="profile-hero-motion"
                initial={{
                  opacity: 0,
                  y: 15,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.3,
                }}
              >
                <Card
                  className="profile-hero-card"
                  padding="2rem"
                  style={{
                    marginBottom: "2rem",
                    background:
                      "linear-gradient(135deg, #ffffff 0%, #fff8f5 100%)",
                    border:
                      "1px solid var(--sd-border)",
                  }}
                >
                  <div
                    className="profile-hero-content"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "1.5rem",
                    }}
                  >
                    <div
                      className="profile-hero-identity"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1.25rem",
                      }}
                    >
                      <div
                        className="profile-avatar"
                        style={{
                          width: "72px",
                          height: "72px",
                          borderRadius: "50%",
                          backgroundColor:
                            "var(--sd-primary-light)",
                          color: "var(--sd-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow:
                            "0 4px 12px rgba(255, 87, 34, 0.2)",
                        }}
                      >
                        <FaUserCircle size={48} />
                      </div>

                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <h2
                            style={{
                              margin: 0,
                              fontSize:
                                "var(--sd-font-size-2xl)",
                              fontWeight: "800",
                              color:
                                "var(--sd-text-primary)",
                            }}
                          >
                            {profile.firstName}{" "}
                            {profile.lastName}
                          </h2>

                          <Badge
                            variant="success"
                            size="sm"
                          >
                            Thành viên tích cực
                          </Badge>
                        </div>

                        <p
                          style={{
                            margin: 0,
                            color:
                              "var(--sd-text-secondary)",
                            fontSize:
                              "var(--sd-font-size-sm)",
                          }}
                        >
                          Chào mừng bạn trở lại với SkyDish
                          Food Delivery
                        </p>
                      </div>
                    </div>

                    <div
                      className="profile-hero-actions"
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                      }}
                    >
                      <Link to="/customer/home">
                        <Button
                          variant="primary"
                          icon={FaUtensils}
                        >
                          Khám phá nhà hàng
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        icon={FaSignOutAlt}
                        onClick={handleLogout}
                      >
                        Đăng xuất
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* ================================================== */}
              {/* DELIVERY INFORMATION WARNING */}
              {/* ================================================== */}

              {missingDeliveryInfo && (
                <motion.div
                  className="profile-delivery-alert"
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  style={{
                    marginBottom: "2rem",
                    padding: "1.25rem 1.5rem",
                    borderRadius: "var(--sd-radius-lg)",
                    background:
                      "linear-gradient(135deg, #fff7ed 0%, #fff 100%)",
                    border: "1px solid #fed7aa",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: "700",
                        color: "#c2410c",
                        marginBottom: "0.35rem",
                      }}
                    >
                      Chưa hoàn tất thông tin giao hàng
                    </div>

                    <div
                      style={{
                        color: "#9a3412",
                        fontSize:
                          "var(--sd-font-size-sm)",
                      }}
                    >
                      Vui lòng cập nhật số điện thoại và
                      địa chỉ để thuận tiện nhận đơn hàng.
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    icon={FaEdit}
                    onClick={handleOpenEdit}
                  >
                    Cập nhật thông tin giao hàng
                  </Button>
                </motion.div>
              )}

              {/* ================================================== */}
              {/* STATS GRID */}
              {/* ================================================== */}

              <div
                className="profile-stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(240px, 1fr))",
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
                  value={
                    profile.location ||
                    "Chưa cập nhật"
                  }
                  subtitle="Địa chỉ giao hàng chính"
                  icon={FaMapMarkerAlt}
                  iconBg="var(--sd-success-light)"
                  iconColor="var(--sd-success)"
                />
              </div>

              {/* ================================================== */}
              {/* PROFILE DETAILS */}
              {/* ================================================== */}

              <Card className="profile-details-card" padding="2rem">
                <h3
                  style={{
                    margin: "0 0 1.5rem 0",
                    fontSize:
                      "var(--sd-font-size-lg)",
                    fontWeight: "700",
                    borderBottom:
                      "1px solid var(--sd-border)",
                    paddingBottom: "0.75rem",
                  }}
                >
                  Thông tin cá nhân & Giao hàng
                </h3>

                <div
                  className="profile-contact-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "1.5rem",
                  }}
                >
                  {/* EMAIL */}

                  <div
                    className="profile-contact-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius:
                          "var(--sd-radius-md)",
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
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            "var(--sd-font-size-xs)",
                          color:
                            "var(--sd-text-muted)",
                        }}
                      >
                        Địa chỉ Email
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            "var(--sd-font-size-base)",
                          fontWeight: "600",
                        }}
                      >
                        {profile.email}
                      </p>
                    </div>
                  </div>

                  {/* PHONE */}

                  <div
                    className="profile-contact-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius:
                          "var(--sd-radius-md)",
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
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            "var(--sd-font-size-xs)",
                          color:
                            "var(--sd-text-muted)",
                        }}
                      >
                        Số điện thoại
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            "var(--sd-font-size-base)",
                          fontWeight: "600",
                        }}
                      >
                        {profile.phone ||
                          "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>

                  {/* LOCATION */}

                  <div
                    className="profile-contact-item"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius:
                          "var(--sd-radius-md)",
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
                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            "var(--sd-font-size-xs)",
                          color:
                            "var(--sd-text-muted)",
                        }}
                      >
                        Địa chỉ giao hàng
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize:
                            "var(--sd-font-size-base)",
                          fontWeight: "600",
                        }}
                      >
                        {profile.location ||
                          "Chưa cập nhật"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ================================================== */}
                {/* EDIT FORM */}
                {/* ================================================== */}

                {editingDeliveryInfo && (
                  <motion.form
                    className="profile-delivery-form"
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                    }}
                    onSubmit={handleSaveDeliveryInfo}
                    style={{
                      marginTop: "2rem",
                      paddingTop: "1.5rem",
                      borderTop:
                        "1px solid var(--sd-border)",
                    }}
                  >
                    <h4
                      style={{
                        margin:
                          "0 0 1.25rem 0",
                        fontSize:
                          "var(--sd-font-size-base)",
                        fontWeight: "700",
                      }}
                    >
                      Cập nhật thông tin giao hàng
                    </h4>

                    {/* ERROR */}

                    {saveError && (
                      <div
                        style={{
                          marginBottom: "1rem",
                          padding: "0.85rem 1rem",
                          borderRadius:
                            "var(--sd-radius-md)",
                          backgroundColor: "#fef2f2",
                          border:
                            "1px solid #fecaca",
                          color: "#b91c1c",
                          fontSize:
                            "var(--sd-font-size-sm)",
                        }}
                      >
                        {saveError}
                      </div>
                    )}

                    {/* SUCCESS */}

                    {saveSuccess && (
                      <div
                        style={{
                          marginBottom: "1rem",
                          padding: "0.85rem 1rem",
                          borderRadius:
                            "var(--sd-radius-md)",
                          backgroundColor: "#f0fdf4",
                          border:
                            "1px solid #bbf7d0",
                          color: "#15803d",
                          fontSize:
                            "var(--sd-font-size-sm)",
                        }}
                      >
                        {saveSuccess}
                      </div>
                    )}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: "1.25rem",
                      }}
                    >
                      {/* PHONE INPUT */}

                      <div>
                        <label
                          htmlFor="customer-phone"
                          style={{
                            display: "block",
                            marginBottom:
                              "0.5rem",
                            fontWeight: "600",
                            fontSize:
                              "var(--sd-font-size-sm)",
                          }}
                        >
                          Số điện thoại
                        </label>

                        <div
                          style={{
                            position: "relative",
                          }}
                        >
                          <FaPhone
                            style={{
                              position: "absolute",
                              left: "1rem",
                              top: "50%",
                              transform:
                                "translateY(-50%)",
                              color:
                                "var(--sd-text-muted)",
                            }}
                          />

                          <input
                            id="customer-phone"
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="0901234567"
                            maxLength={15}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding:
                                "0.85rem 1rem 0.85rem 2.75rem",
                              border:
                                "1px solid var(--sd-border)",
                              borderRadius:
                                "var(--sd-radius-md)",
                              outline: "none",
                              fontSize:
                                "var(--sd-font-size-sm)",
                            }}
                          />
                        </div>
                      </div>

                      {/* LOCATION INPUT */}

                      <div>
                        <label
                          htmlFor="customer-location"
                          style={{
                            display: "block",
                            marginBottom:
                              "0.5rem",
                            fontWeight: "600",
                            fontSize:
                              "var(--sd-font-size-sm)",
                          }}
                        >
                          Địa chỉ giao hàng
                        </label>

                        <div
                          style={{
                            position: "relative",
                          }}
                        >
                          <FaMapMarkerAlt
                            style={{
                              position: "absolute",
                              left: "1rem",
                              top: "1rem",
                              color:
                                "var(--sd-text-muted)",
                            }}
                          />

                          <textarea
                            id="customer-location"
                            name="location"
                            value={form.location}
                            onChange={handleChange}
                            placeholder="Ví dụ: 123 Nguyễn Trãi, Quận 1, TP. Hồ Chí Minh"
                            rows={3}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              padding:
                                "0.85rem 1rem 0.85rem 2.75rem",
                              border:
                                "1px solid var(--sd-border)",
                              borderRadius:
                                "var(--sd-radius-md)",
                              outline: "none",
                              resize: "vertical",
                              fontSize:
                                "var(--sd-font-size-sm)",
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* BUTTONS */}

                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "flex-end",
                        gap: "0.75rem",
                        marginTop: "1.25rem",
                      }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        icon={FaTimes}
                        onClick={handleCancelEdit}
                        disabled={saving}
                      >
                        Hủy
                      </Button>

                      <Button
                        type="submit"
                        variant="primary"
                        icon={FaSave}
                        disabled={saving}
                      >
                        {saving
                          ? "Đang lưu..."
                          : "Lưu thông tin"}
                      </Button>
                    </div>
                  </motion.form>
                )}

                {/* ================================================== */}
                {/* BOTTOM ACTIONS */}
                {/* ================================================== */}

                <div
                  style={{
                    marginTop: "2rem",
                    paddingTop: "1.5rem",
                    borderTop:
                      "1px solid var(--sd-border)",
                    display: "flex",
                    justifyContent:
                      "flex-end",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  {!editingDeliveryInfo && (
                    <Button
                      variant={
                        missingDeliveryInfo
                          ? "primary"
                          : "secondary"
                      }
                      icon={FaEdit}
                      onClick={handleOpenEdit}
                    >
                      {missingDeliveryInfo
                        ? "Cập nhật thông tin giao hàng"
                        : "Chỉnh sửa thông tin giao hàng"}
                    </Button>
                  )}

                  <Link to="/orders">
                    <Button
                      variant="secondary"
                      icon={FaReceipt}
                    >
                      Xem đơn hàng của tôi
                    </Button>
                  </Link>

                  <Link to="/customer/home">
                    <Button
                      variant="primary"
                      icon={FaUtensils}
                    >
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
