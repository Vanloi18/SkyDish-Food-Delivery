import { API_URLS } from '../../config/api';
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  FaSearch, 
  FaEdit, 
  FaTrashAlt, 
  FaEye, 
  FaReceipt, 
  FaMapMarkerAlt, 
  FaStore,
  FaRedo,
  FaSyncAlt,
  FaClock,
  FaMotorcycle
} from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import AuthPromptCard from "../../components/common/AuthPromptCard";
import { formatCurrency } from "../../utils/currency";

function OrderHome() {
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    setIsUnauthorized(false);

    const token = localStorage.getItem("token");
    if (!token) {
      setIsUnauthorized(true);
      setLoading(false);
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URLS.ORDER}/api/orders`, { headers });
      const orderList = Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : []);
      setOrders(orderList);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching orders:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setIsUnauthorized(true);
      } else {
        setError("Không thể kết nối đến Dịch vụ Đơn hàng. Vui lòng kiểm tra lại kết nối mạng.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!autoRefresh || isUnauthorized) return undefined;
    const refreshTimer = window.setInterval(() => fetchOrders(true), 15000);
    return () => window.clearInterval(refreshTimer);
  }, [autoRefresh, isUnauthorized, fetchOrders]);

  const getStatusBadge = (status) => {
    const s = (status || "Pending").toLowerCase();
    if (s.includes("deliver")) return <Badge variant="success">Đã giao hàng</Badge>;
    if (s.includes("cancel")) return <Badge variant="danger">Đã hủy</Badge>;
    if (s.includes("out") || s.includes("way")) return <Badge variant="warning">Đang giao hàng</Badge>;
    if (s.includes("prepar")) return <Badge variant="info">Đang chuẩn bị</Badge>;
    if (s.includes("confirm")) return <Badge variant="info">Đã xác nhận</Badge>;
    return <Badge variant="neutral">Chờ xử lý</Badge>;
  };

  const filteredOrders = orders
    .filter((order) => {
      const s = (order.status || "Pending").toLowerCase();
      if (statusFilter === "Đang xử lý") return s !== "canceled" && s !== "delivered";
      if (statusFilter === "Đã giao hàng") return s === "delivered";
      if (statusFilter === "Đã hủy") return s === "canceled";
      return true;
    })
    .filter((order) => {
      const rest = (order.restaurantId || "").toLowerCase();
      const restName = (order.restaurantName || order.restaurant?.name || "").toLowerCase();
      const cust = (order.customerId || "").toLowerCase();
      const addr = (order.deliveryAddress || "").toLowerCase();
      const items = (order.items || []).map((item) => item.name || item.foodId || "").join(" ").toLowerCase();
      const q = searchQuery.toLowerCase();
      return rest.includes(q) || restName.includes(q) || cust.includes(q) || addr.includes(q) || items.includes(q);
    });

  return (
    <div className="customer-experience orders-experience" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main className="orders-page-main" style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          {/* Header Bar */}
          <div
            className="orders-page-hero"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <div>
              <h1 className="sd-heading-1" style={{ margin: 0 }}>
                Quản lý & Lịch sử đơn hàng
              </h1>
              <p style={{ margin: "0.35rem 0 0 0", color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)" }}>
                Theo dõi tiến trình đơn hàng và xem lại hóa đơn của bạn
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <Button variant="outline" size="sm" icon={FaSyncAlt} onClick={() => fetchOrders()} disabled={loading}>
                Làm mới
              </Button>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-xs)", cursor: "pointer" }}>
                <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
                Tự cập nhật
              </label>
            </div>
          </div>

          {/* Unauthenticated Prompt */}
          {isUnauthorized ? (
            <AuthPromptCard
              title="Đăng nhập để xem đơn hàng của bạn"
              description="Đăng nhập bằng tài khoản SkyDish của bạn để xem tình trạng giao hàng, kiểm tra lịch sử đặt món và tải hóa đơn PDF."
              returnUrl="/orders"
            />
          ) : (
            <>
              {/* Filters & Search */}
              {lastUpdated && (
                <p style={{ display: "flex", alignItems: "center", gap: "0.35rem", margin: "0 0 0.75rem", color: "var(--sd-text-muted)", fontSize: "0.75rem" }}>
                  <FaClock size={12} /> Cập nhật lần cuối: {lastUpdated.toLocaleTimeString("vi-VN")}{autoRefresh ? " · Tự làm mới mỗi 15 giây" : ""}
                </p>
              )}
              <div
                className="orders-filter-bar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                  marginBottom: "2rem",
                  backgroundColor: "#ffffff",
                  padding: "1rem 1.25rem",
                  borderRadius: "var(--sd-radius-lg)",
                  border: "1px solid var(--sd-border)",
                  boxShadow: "var(--sd-shadow-xs)",
                }}
              >
                {/* Search */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "240px" }}>
                  <FaSearch style={{ color: "var(--sd-text-muted)" }} />
                  <input
                    type="text"
                    placeholder="Tìm nhà hàng, món ăn hoặc địa chỉ..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      border: "none",
                      outline: "none",
                      width: "100%",
                      fontSize: "var(--sd-font-size-sm)",
                      color: "var(--sd-text-primary)",
                    }}
                  />
                </div>

                {/* Status Pills */}
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {["Tất cả", "Đang xử lý", "Đã giao hàng", "Đã hủy"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      style={{
                        padding: "0.35rem 0.85rem",
                        borderRadius: "var(--sd-radius-full)",
                        fontSize: "var(--sd-font-size-xs)",
                        fontWeight: "600",
                        border: "1px solid",
                        borderColor: statusFilter === status ? "var(--sd-primary)" : "var(--sd-border)",
                        backgroundColor: statusFilter === status ? "var(--sd-primary)" : "transparent",
                        color: statusFilter === status ? "#ffffff" : "var(--sd-text-secondary)",
                        cursor: "pointer",
                        transition: "all var(--sd-transition-fast)",
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Banner */}
              {error && (
                <div
                  style={{
                    padding: "1rem 1.5rem",
                    backgroundColor: "var(--sd-danger-light)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "var(--sd-radius-md)",
                    color: "var(--sd-danger-hover)",
                    textAlign: "center",
                    marginBottom: "2rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1rem",
                  }}
                >
                  <span>{error}</span>
                  <Button variant="outline" size="sm" icon={FaRedo} onClick={fetchOrders}>
                    Thử lại
                  </Button>
                </div>
              )}

              {/* Content Body */}
              {loading ? (
                <LoadingSkeleton type="card" count={4} />
              ) : filteredOrders.length === 0 ? (
                <EmptyState
                  icon={FaReceipt}
                  title="Không tìm thấy đơn hàng"
                  description={
                    searchQuery
                      ? `Không tìm thấy đơn hàng nào khớp với "${searchQuery}".`
                      : "Bạn chưa có đơn hàng nào. Hãy khám phá thực đơn các nhà hàng để đặt món ăn thơm ngon!"
                  }
                  actionLabel="Khám phá nhà hàng"
                  onAction={() => navigate("/customer/home")}
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {filteredOrders.map((order) => {
                    const itemCount = order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 0;
                    const createdDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : "Gần đây";

                    return (
                      <motion.div
                        key={order._id}
                        className="order-list-card"
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: "var(--sd-radius-lg)",
                          border: "1px solid var(--sd-border)",
                          padding: "1.5rem",
                          boxShadow: "var(--sd-shadow-xs)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                        }}
                      >
                        {/* Top Row: Info & Status */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "0.75rem",
                            paddingBottom: "0.75rem",
                            borderBottom: "1px solid var(--sd-border)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "var(--sd-radius-md)",
                                backgroundColor: "var(--sd-primary-light)",
                                color: "var(--sd-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <FaStore size={18} />
                            </div>
                            <div>
                              <h3 style={{ margin: 0, fontSize: "var(--sd-font-size-base)", fontWeight: "700" }}>
                                {order.restaurantName || order.restaurant?.name || order.restaurantId || "Nhà hàng đối tác SkyDish"}
                              </h3>
                              <p style={{ margin: 0, fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                                Mã đơn: <code style={{ color: "var(--sd-text-secondary)" }}>{order._id}</code> • {createdDate}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {getStatusBadge(order.status)}
                            <span style={{ fontSize: "var(--sd-font-size-lg)", fontWeight: "800", color: "var(--sd-primary)" }}>
                              {formatCurrency(order.totalPrice)}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Items & Delivery Address */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                            gap: "1.5rem",
                          }}
                        >
                          <div>
                            <p style={{ margin: "0 0 0.35rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)" }}>
                              Món ăn ({itemCount})
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                              {order.items?.map((item, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    padding: "0.25rem 0.6rem",
                                    backgroundColor: "var(--sd-bg-muted)",
                                    borderRadius: "var(--sd-radius-sm)",
                                    fontSize: "var(--sd-font-size-xs)",
                                    color: "var(--sd-text-secondary)",
                                  }}
                                >
                                  <strong>{item.name || item.foodId}</strong> × {item.quantity} ({formatCurrency(item.price)})
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p style={{ margin: "0 0 0.35rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)" }}>
                              Địa chỉ giao hàng
                            </p>
                            <p style={{ margin: 0, fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <FaMapMarkerAlt style={{ color: "var(--sd-primary)" }} /> {order.deliveryAddress}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Row: Actions */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "0.75rem",
                            paddingTop: "0.5rem",
                          }}
                        >
                          <Link to={`/orders/details/${order._id}`}>
                            <Button variant="outline" size="sm" icon={order.status?.toLowerCase().includes("deliver") ? FaEye : FaMotorcycle}>
                              {order.status?.toLowerCase().includes("deliver") ? "Xem hóa đơn" : "Theo dõi đơn"}
                            </Button>
                          </Link>

                          <Link to={`/orders/edit/${order._id}`}>
                            <Button variant="secondary" size="sm" icon={FaEdit}>
                              Chỉnh sửa
                            </Button>
                          </Link>

                          <Link to={`/orders/delete/${order._id}`}>
                            <Button variant="ghost" size="sm" icon={FaTrashAlt} style={{ color: "var(--sd-danger)" }}>
                              Hủy đơn
                            </Button>
                          </Link>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default OrderHome;
