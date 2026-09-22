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
  FaFlag,
  FaStar,
  FaChevronRight,
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
import { formatCurrency } from "../../utils/currency";

export default function CustomerProfile() {
  const [profile, setProfile] = useState(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [reviewedOrders, setReviewedOrders] = useState({});

  const navigate = useNavigate();
  const editingDeliveryInfo = false;
  const saving = false;
  const saveError = "";
  const saveSuccess = "";
  const form = { phone: profile?.phone || "", location: profile?.location || "" };
  const missingDeliveryInfo = false;
  const handleOpenEdit = () => {};
  const handleCancelEdit = () => {};
  const handleChange = () => {};
  const handleSaveDeliveryInfo = () => {};

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

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await axios.get(`${API_URLS.ORDER}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orderList = Array.isArray(response.data)
          ? response.data
          : (Array.isArray(response.data?.data) ? response.data.data : []);
        setOrders(orderList);

        const deliveredOrders = orderList.filter((order) => {
          const status = String(order.status || "").toLowerCase();
          return status.includes("deliver") || status.includes("complete");
        });
        const reviewEntries = await Promise.all(deliveredOrders.map(async (order) => {
          try {
            const reviewResponse = await axios.get(`${API_URLS.RESTAURANT}/api/reviews/order/${order._id}`);
            return [order._id, Boolean(reviewResponse.data?.reviewed)];
          } catch {
            return [order._id, false];
          }
        }));
        setReviewedOrders(Object.fromEntries(reviewEntries));
      } catch (historyError) {
        console.warn("Purchase history fetch error:", historyError.message);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchPurchaseHistory();
  }, []);

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

  const completedOrders = orders.filter((order) => {
    const status = String(order.status || "").toLowerCase();
    return status.includes("deliver") || status.includes("complete");
  });
  const totalSpent = orders.reduce((total, order) => total + Number(order.totalAmount || order.total || 0), 0);
  const purchasedItemCount = orders.reduce(
    (total, order) => total + (order.items || []).reduce((itemTotal, item) => itemTotal + Number(item.quantity || 1), 0),
    0
  );

  const getOrderStatusLabel = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("deliver") || normalized.includes("complete")) return "Đã giao hàng";
    if (normalized.includes("cancel")) return "Đã hủy";
    if (normalized.includes("prepar")) return "Đang chuẩn bị";
    if (normalized.includes("confirm")) return "Đã xác nhận";
    return "Đang xử lý";
  };

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
                  value={orders.length ? "Thành viên SkyDish" : "Mới tham gia"}
                  subtitle={`${orders.length} đơn hàng đã đặt`}
                  icon={FaHeart}
                  iconBg="var(--sd-primary-light)"
                  iconColor="var(--sd-primary)"
                />

                <StatCard
                  title="Tổng chi tiêu"
                  value={formatCurrency(totalSpent)}
                  subtitle={`${purchasedItemCount} món đã mua`}
                  icon={FaReceipt}
                  iconBg="var(--sd-info-light)"
                  iconColor="var(--sd-info)"
                />

                <StatCard
                  title="Đã hoàn tất"
                  value={`${completedOrders.length} đơn`}
                  subtitle="Lịch sử giao hàng thành công"
                  icon={FaStar}
                  iconBg="#e7fbf8"
                  iconColor="#007d74"
                />
              </div>

              <section className="profile-purchase-history" aria-labelledby="purchase-history-heading">
                <div className="profile-history-heading">
                  <div>
                    <span className="profile-section-kicker">Dữ liệu thực tế từ hệ thống</span>
                    <h3 id="purchase-history-heading">Lịch sử đã mua</h3>
                    <p>Chỉ xem lịch sử đơn hàng và thực hiện báo cáo hoặc đánh giá sau khi nhận món.</p>
                  </div>
                  <Link to="/orders" className="profile-history-link">Xem toàn bộ <FaChevronRight size={11} /></Link>
                </div>

                {ordersLoading ? (
                  <LoadingSkeleton type="card" count={2} />
                ) : orders.length === 0 ? (
                  <EmptyState
                    icon={FaReceipt}
                    title="Chưa có lịch sử mua hàng"
                    description="Các đơn hàng của bạn sẽ xuất hiện tại đây sau khi đặt món."
                    actionLabel="Khám phá nhà hàng"
                    onAction={() => navigate("/customer/home")}
                  />
                ) : (
                  <div className="profile-history-list">
                    {orders.slice(0, 8).map((order) => {
                      const isCompleted = completedOrders.some((completed) => completed._id === order._id);
                      const restaurantName = order.restaurantName || order.restaurant?.name || "Nhà hàng SkyDish";
                      const itemCount = (order.items || []).reduce((total, item) => total + Number(item.quantity || 1), 0);
                      return (
                        <article className="profile-history-item" key={order._id}>
                          <div className="profile-history-main">
                            <div className="profile-history-icon"><FaReceipt /></div>
                            <div>
                              <h4>{restaurantName}</h4>
                              <p>#{String(order._id || "").slice(-8)} · {itemCount} món · {order.createdAt ? new Date(order.createdAt).toLocaleDateString("vi-VN") : "Gần đây"}</p>
                            </div>
                          </div>
                          <div className="profile-history-side">
                            <strong>{formatCurrency(order.totalAmount || order.total || 0)}</strong>
                            <span className={`profile-history-status profile-history-status--${isCompleted ? "done" : "pending"}`}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                            <div className="profile-history-actions">
                              <Link to={`/contact?orderId=${encodeURIComponent(order._id || "")}&type=order`} className="profile-report-link">
                                <FaFlag size={11} /> Báo cáo
                              </Link>
                              {isCompleted && (
                                reviewedOrders[order._id] ? (
                                  <button type="button" className="profile-review-button is-reviewed" disabled>
                                    <FaStar size={11} /> Đã đánh giá
                                  </button>
                                ) : (
                                  <Link to={`/orders/details/${order._id}`} className="profile-review-button">
                                    <FaStar size={11} /> Đánh giá
                                  </Link>
                                )
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

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
