import { API_URLS, getDeliverySocketOptions, getDeliverySocketUrl } from '../../config/api';
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { io } from "socket.io-client";
import { 
  FaHome,
  FaBoxOpen,
  FaMapMarkedAlt,
  FaWallet,
  FaBell,
  FaUser,
  FaMotorcycle,
  FaCheckCircle,
  FaClock,
  FaPhoneAlt,
  FaDirections,
  FaSignOutAlt,
  FaStore,
  FaMapMarkerAlt,
  FaCheck,
  FaArrowRight,
  FaShieldAlt,
  FaTimes
} from "react-icons/fa";
import { formatCurrency } from "../../utils/currency";
import "../../styles/shipper.css";

let socket;

export default function DriverDashboard() {
  const navigate = useNavigate();

  // Navigation State
  const [activeTab, setActiveTab] = useState("home"); // "home" | "orders" | "map" | "earnings" | "notifications" | "profile"
  const [ordersSubTab, setOrdersSubTab] = useState("available"); // "available" | "my_deliveries"

  // Driver Profile & Status
  const [driverProfile, setDriverProfile] = useState({
    name: localStorage.getItem("driverName") || "Shipper",
    email: localStorage.getItem("driverEmail") || "",
    phone: "",
    vehicleType: "",
    vehiclePlate: "",
    area: "Chưa cập nhật",
  });
  const [isOnline, setIsOnline] = useState(true);

  // Delivery & Orders Data
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [alertMsg, setAlertMsg] = useState({ type: "", text: "" });

  // Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Chào mừng đối tác Shipper!",
      message: "Chúc bạn một ngày làm việc an toàn và thuận lợi cùng SkyDish.",
      time: "Vừa xong",
      read: false,
      type: "system"
    }
  ]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  // Auth Verification
  const token = localStorage.getItem("driverToken") || localStorage.getItem("token");

  // Fetch Deliveries assigned to this driver
  const fetchDeliveries = useCallback(async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${API_URLS.DELIVERY}/api/delivery`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data?.deliveries || (Array.isArray(res.data) ? res.data : []);
      setMyDeliveries(list);
    } catch (err) {
      console.warn("Fetch deliveries note:", err.message);
    }
  }, [token]);

  // Fetch available orders from Order Service
  const fetchAvailableOrders = useCallback(async () => {
    try {
      const driverToken = localStorage.getItem("driverToken") || localStorage.getItem("token");
      const headers = driverToken ? { Authorization: `Bearer ${driverToken}` } : {};
      const res = await axios.get(`${API_URLS.DELIVERY}/api/delivery/available`, { headers });
      setAvailableOrders(Array.isArray(res.data?.orders) ? res.data.orders : []);
    } catch (err) {
      console.warn("Fetch available orders note:", err.message);
    }
  }, []);

  // Fetch Driver Profile
  const fetchDriverProfile = useCallback(async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${API_URLS.DELIVERY}/api/delivery/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && (res.data?.driver || res.data?.data)) {
        const d = res.data.driver || res.data.data;
        setDriverProfile({
          name: d.name || "Shipper",
          email: d.email || "",
          phone: d.phone || "",
          vehicleType: d.vehicleType || "",
          vehiclePlate: d.vehicleNumber || "",
          area: d.location?.coordinates?.length === 2 ? d.location.coordinates.join(", ") : "Chưa cập nhật",
        });
        setIsOnline(d.status !== "offline");
      }
    } catch (err) {
      console.warn("Fetch driver profile note:", err.message);
    }
  }, [token]);

  // Initial Load & Socket.IO initialization
  useEffect(() => {
    if (!token) {
      navigate("/delivery/login");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDeliveries(), fetchAvailableOrders(), fetchDriverProfile()]);
      setLoading(false);
    };
    loadData();

    // Socket.IO Realtime Connection
    try {
      socket = io(getDeliverySocketUrl(), { ...getDeliverySocketOptions(token), autoConnect: false });
      socket.connect();

      socket.on("new-delivery", (deliveryData) => {
        setMyDeliveries((prev) => [deliveryData, ...prev]);
        setNotifications((prev) => [
          {
            id: Date.now(),
            title: "Có đơn hàng giao mới!",
            message: `Mã đơn #${deliveryData.orderId || "Mới"} đã được gán cho bạn.`,
            time: "Vừa xong",
            read: false,
            type: "order"
          },
          ...prev
        ]);
      });
      socket.on("delivery-status", (deliveryData) => {
        setMyDeliveries((prev) => prev.map((item) => item._id === deliveryData._id ? deliveryData : item));
      });
    } catch (e) {
      console.warn("Socket initialization note:", e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [token, navigate, fetchDeliveries, fetchAvailableOrders, fetchDriverProfile]);

  // Alert dismiss helper
  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: "", text: "" }), 4000);
  };

  // Toggle Online/Offline
  const handleToggleOnline = async () => {
    const nextStatus = !isOnline;
    try {
      await axios.put(
        `${API_URLS.DELIVERY}/api/delivery/driver/availability`,
        { available: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsOnline(nextStatus);
      showAlert("success", nextStatus ? "🟢 Bạn đã chuyển sang trạng thái Đang hoạt động." : "⚪ Bạn đã tạm nghỉ nhận đơn.");
    } catch (err) {
      showAlert("danger", err.response?.data?.message || "Không thể cập nhật trạng thái hoạt động.");
    }
  };

  // Accept Order Handler
  const handleAcceptOrder = async (order) => {
    if (!isOnline) {
      showAlert("warning", "Vui lòng bật trạng thái Đang hoạt động để nhận đơn.");
      return;
    }

    setAcceptingId(order._id || order.orderId);
    try {
      const res = await axios.post(
        `${API_URLS.DELIVERY}/api/delivery/create`,
        {
          orderId: order._id || order.orderId || `ORD_${Date.now()}`,
          pickupAddress: order.restaurantName || order.restaurantId,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("success", "🎉 Nhận đơn giao thành công! Vui lòng di chuyển đến nhà hàng.");
        await fetchDeliveries();
        await fetchAvailableOrders();
        setActiveTab("orders");
        setOrdersSubTab("my_deliveries");
      } else {
        showAlert("danger", res.data?.message || "Không thể nhận đơn này.");
      }
    } catch (err) {
      showAlert("danger", "Đơn hàng này có thể đã được shipper khác tiếp nhận.");
    } finally {
      setAcceptingId(null);
    }
  };

  // Update Status Handler
  const handleUpdateStatus = async (deliveryId, nextStatus) => {
    setStatusUpdatingId(deliveryId);
    try {
      const res = await axios.put(
        `${API_URLS.DELIVERY}/api/delivery/${deliveryId}/status`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("success", `Cập nhật trạng thái '${nextStatus}' thành công!`);
        await fetchDeliveries();
      } else {
        showAlert("danger", "Không thể cập nhật trạng thái đơn giao.");
      }
    } catch (err) {
      showAlert("danger", "Lỗi kết nối máy chủ giao hàng.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("driverToken");
    localStorage.removeItem("driverId");
    localStorage.removeItem("driverName");
    navigate("/delivery/login");
  };

  // Active delivery (ongoing)
  const activeDelivery = useMemo(() => {
    return myDeliveries.find(d => d.status !== "Delivered");
  }, [myDeliveries]);

  // Completed deliveries
  const completedDeliveries = useMemo(() => {
    return myDeliveries.filter(d => d.status === "Delivered");
  }, [myDeliveries]);

  // Estimated Earnings: 25.000 VND per completed delivery
  const todayEarnings = useMemo(() => {
    return completedDeliveries.length * 25000;
  }, [completedDeliveries]);

  return (
    <div className="shipper-app-wrapper">
      <div className="shipper-mobile-frame">
        {/* TOP HEADER */}
        <header className="shipper-top-header">
          <div className="shipper-brand-info">
            <div className="shipper-avatar-circle">
              {driverProfile.name.charAt(0)}
            </div>
            <div>
              <h1 className="shipper-name-text">{driverProfile.name}</h1>
              <div className={`shipper-status-badge ${isOnline ? "online" : "offline"}`}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: isOnline ? "#10b981" : "#94a3b8" }} />
                {isOnline ? "Đang hoạt động" : "Tạm nghỉ"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className={`shipper-toggle-btn ${isOnline ? "is-online" : "is-offline"}`}
            onClick={handleToggleOnline}
          >
            <FaMotorcycle size={13} />
            <span>{isOnline ? "Tạm nghỉ" : "Bật nhận đơn"}</span>
          </button>
        </header>

        {/* FEEDBACK ALERT */}
        <AnimatePresence>
          {alertMsg.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                margin: "0.5rem 1rem 0 1rem",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: alertMsg.type === "success" ? "#ecfdf5" : alertMsg.type === "warning" ? "#fffbeb" : "#fef2f2",
                color: alertMsg.type === "success" ? "#047857" : alertMsg.type === "warning" ? "#b45309" : "#b91c1c",
                border: `1px solid ${alertMsg.type === "success" ? "#a7f3d0" : alertMsg.type === "warning" ? "#fde68a" : "#fecaca"}`,
                zIndex: 45
              }}
            >
              <span>{alertMsg.text}</span>
              <FaTimes size={12} style={{ cursor: "pointer" }} onClick={() => setAlertMsg({ type: "", text: "" })} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="shipper-content-scroll">
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  border: "3px solid #e2e8f0",
                  borderTopColor: "var(--shipper-primary)",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 1rem auto",
                }}
              />
              <p style={{ color: "#64748b", fontSize: "0.85rem", margin: 0 }}>Đang tải dữ liệu giao hàng...</p>
            </div>
          ) : (
            <>
              {/* =========================================================================
                  TAB 1: 🏠 TRANG CHỦ (HOME)
                  ========================================================================= */}
              {activeTab === "home" && (
            <div>
              {/* Daily KPI summary cards */}
              <div className="shipper-kpi-grid">
                <div className="shipper-kpi-card">
                  <div className="shipper-kpi-card-title">Đơn hôm nay</div>
                  <h3 className="shipper-kpi-card-val primary">{myDeliveries.length}</h3>
                </div>
                <div className="shipper-kpi-card">
                  <div className="shipper-kpi-card-title">Hoàn thành</div>
                  <h3 className="shipper-kpi-card-val success">{completedDeliveries.length}</h3>
                </div>
                <div className="shipper-kpi-card">
                  <div className="shipper-kpi-card-title">Thu nhập ước tính</div>
                  <h3 className="shipper-kpi-card-val" style={{ fontSize: "1.05rem" }}>
                    {formatCurrency(todayEarnings)}
                  </h3>
                </div>
                <div className="shipper-kpi-card">
                  <div className="shipper-kpi-card-title">Đơn đang giao</div>
                  <h3 className="shipper-kpi-card-val">{activeDelivery ? 1 : 0}</h3>
                </div>
              </div>

              {/* Active Delivery Card Highlight */}
              {activeDelivery && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <div className="shipper-section-head">
                    <h3 className="shipper-section-title">
                      <FaClock style={{ color: "var(--shipper-primary)" }} /> Đơn đang thực hiện
                    </h3>
                  </div>

                  <div className="shipper-order-card" style={{ borderColor: "#fdba74", backgroundColor: "#fffaf5" }}>
                    <div className="shipper-order-header">
                      <span className="shipper-order-id">Mã đơn: #{activeDelivery.orderId}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#c2410c", backgroundColor: "#ffedd5", padding: "0.2rem 0.5rem", borderRadius: "9999px" }}>
                        {activeDelivery.status === "assigned" ? "Đã nhận đơn" : activeDelivery.status === "To be delivered" ? "Đến nhà hàng" : "Đang giao"}
                      </span>
                    </div>

                    <div className="shipper-route-flow">
                      <div className="shipper-route-step">
                        <div className="shipper-step-pin pickup"><FaStore size={11} /></div>
                        <div className="shipper-step-info">
                          <span className="shipper-step-label">Lấy món</span>
                          <p className="shipper-step-addr">{activeDelivery.pickupAddressString || activeDelivery.pickupAddress || "Nhà hàng đối tác SkyDish"}</p>
                        </div>
                      </div>
                      <div className="shipper-route-step">
                        <div className="shipper-step-pin dropoff"><FaMapMarkerAlt size={11} /></div>
                        <div className="shipper-step-info">
                          <span className="shipper-step-label">Giao tận cửa</span>
                          <p className="shipper-step-addr">{activeDelivery.deliveryAddressString || activeDelivery.deliveryAddress}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="shipper-action-btn primary"
                      onClick={() => {
                        setActiveTab("orders");
                        setOrdersSubTab("my_deliveries");
                      }}
                    >
                      Tiến độ giao hàng <FaArrowRight size={12} />
                    </button>
                  </div>
                </div>
              )}

              {/* Available Orders Section */}
              <div>
                <div className="shipper-section-head">
                  <h3 className="shipper-section-title">
                    <FaBoxOpen style={{ color: "#0284c7" }} /> Đơn hàng khả dụng ({availableOrders.length})
                  </h3>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--shipper-primary)", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                    onClick={() => {
                      setActiveTab("orders");
                      setOrdersSubTab("available");
                    }}
                  >
                    Xem tất cả →
                  </button>
                </div>

                {availableOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem 1rem", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid var(--shipper-border)" }}>
                    <FaMotorcycle size={32} style={{ color: "#cbd5e1", marginBottom: "0.5rem" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Hiện chưa có đơn hàng chờ giao mới.</p>
                  </div>
                ) : (
                  availableOrders.slice(0, 3).map((ord) => (
                    <div key={ord._id} className="shipper-order-card">
                      <div className="shipper-order-header">
                        <span className="shipper-order-id">#{ord._id?.slice(-6) || ord.orderId}</span>
                        <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#059669" }}>
                          +25.000 ₫ (Phí ship)
                        </span>
                      </div>

                      <div className="shipper-route-flow">
                        <div className="shipper-route-step">
                          <div className="shipper-step-pin pickup"><FaStore size={11} /></div>
                          <div className="shipper-step-info">
                            <span className="shipper-step-label">Nhà hàng</span>
                            <h4 className="shipper-step-name">{ord.restaurantId || "Pizza 4P's Tràng Tiền"}</h4>
                          </div>
                        </div>
                        <div className="shipper-route-step">
                          <div className="shipper-step-pin dropoff"><FaMapMarkerAlt size={11} /></div>
                          <div className="shipper-step-info">
                            <span className="shipper-step-label">Địa chỉ giao</span>
                            <p className="shipper-step-addr">{ord.deliveryAddress || "Chưa có địa chỉ giao hàng"}</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", fontSize: "0.8rem", color: "#64748b" }}>
                        <span>Thanh toán: <strong style={{ color: "#0f172a" }}>{ord.paymentMethod || "COD"}</strong></span>
                        <span>Tổng đơn: <strong style={{ color: "var(--shipper-primary)" }}>{formatCurrency(ord.totalPrice || 0)}</strong></span>
                      </div>

                      <button
                        type="button"
                        className="shipper-action-btn primary"
                        disabled={acceptingId === ord._id}
                        onClick={() => handleAcceptOrder(ord)}
                      >
                        {acceptingId === ord._id ? "Đang nhận đơn..." : "Nhận đơn ngay"}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: 📦 ĐƠN HÀNG (ORDERS)
              ========================================================================= */}
          {activeTab === "orders" && (
            <div>
              {/* Sub-tab pills */}
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.15rem", backgroundColor: "#f1f5f9", padding: "0.25rem", borderRadius: "10px" }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    border: "none",
                    padding: "0.55rem 0",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    backgroundColor: ordersSubTab === "available" ? "#ffffff" : "transparent",
                    color: ordersSubTab === "available" ? "var(--shipper-navy)" : "#64748b",
                    boxShadow: ordersSubTab === "available" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                  }}
                  onClick={() => setOrdersSubTab("available")}
                >
                  Đơn khả dụng ({availableOrders.length})
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    border: "none",
                    padding: "0.55rem 0",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    backgroundColor: ordersSubTab === "my_deliveries" ? "#ffffff" : "transparent",
                    color: ordersSubTab === "my_deliveries" ? "var(--shipper-navy)" : "#64748b",
                    boxShadow: ordersSubTab === "my_deliveries" ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                  }}
                  onClick={() => setOrdersSubTab("my_deliveries")}
                >
                  Đơn của tôi ({myDeliveries.length})
                </button>
              </div>

              {/* Sub-tab 1: Available Orders */}
              {ordersSubTab === "available" && (
                <div>
                  {availableOrders.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem 1rem", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid var(--shipper-border)" }}>
                      <FaBoxOpen size={40} style={{ color: "#cbd5e1", marginBottom: "0.75rem" }} />
                      <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "0.95rem" }}>Chưa có đơn chờ giao</h4>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>Các đơn hàng mới của khách sẽ tự động xuất hiện tại đây.</p>
                    </div>
                  ) : (
                    availableOrders.map((ord) => (
                      <div key={ord._id} className="shipper-order-card">
                        <div className="shipper-order-header">
                          <span className="shipper-order-id">#{ord._id?.slice(-6) || ord.orderId}</span>
                          <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#059669" }}>
                            +25.000 ₫ (Thu nhập)
                          </span>
                        </div>

                        <div className="shipper-route-flow">
                          <div className="shipper-route-step">
                            <div className="shipper-step-pin pickup"><FaStore size={11} /></div>
                            <div className="shipper-step-info">
                              <span className="shipper-step-label">Nhà hàng</span>
                              <h4 className="shipper-step-name">{ord.restaurantId || "Pizza 4P's Tràng Tiền"}</h4>
                            </div>
                          </div>
                          <div className="shipper-route-step">
                            <div className="shipper-step-pin dropoff"><FaMapMarkerAlt size={11} /></div>
                            <div className="shipper-step-info">
                              <span className="shipper-step-label">Địa chỉ giao</span>
                              <p className="shipper-step-addr">{ord.deliveryAddress || "Chưa có địa chỉ giao hàng"}</p>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", fontSize: "0.8rem", color: "#64748b" }}>
                          <span>Thanh toán: <strong style={{ color: "#0f172a" }}>{ord.paymentMethod || "COD"}</strong></span>
                          <span>Thu khách: <strong style={{ color: "var(--shipper-primary)" }}>{formatCurrency(ord.totalPrice || 0)}</strong></span>
                        </div>

                        <button
                          type="button"
                          className="shipper-action-btn primary"
                          disabled={acceptingId === ord._id}
                          onClick={() => handleAcceptOrder(ord)}
                        >
                          {acceptingId === ord._id ? "Đang ghi nhận..." : "Nhận đơn giao này"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sub-tab 2: My Deliveries */}
              {ordersSubTab === "my_deliveries" && (
                <div>
                  {myDeliveries.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "3rem 1rem", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid var(--shipper-border)" }}>
                      <FaMotorcycle size={40} style={{ color: "#cbd5e1", marginBottom: "0.75rem" }} />
                      <h4 style={{ margin: "0 0 0.35rem 0", fontSize: "0.95rem" }}>Chưa có đơn đã nhận</h4>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>Vui lòng qua tab 'Đơn khả dụng' để tiếp nhận đơn giao.</p>
                    </div>
                  ) : (
                    myDeliveries.map((del) => {
                      const isDelivered = del.status === "Delivered";
                      const isPickedUp = del.status === "Picked-up";
                      const isToBeDelivered = del.status === "To be delivered";

                      return (
                        <div key={del._id} className="shipper-order-card" style={isDelivered ? { opacity: 0.85 } : {}}>
                          <div className="shipper-order-header">
                            <span className="shipper-order-id">Mã đơn: #{del.orderId}</span>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                padding: "0.2rem 0.55rem",
                                borderRadius: "9999px",
                                backgroundColor: isDelivered ? "#ecfdf5" : isPickedUp ? "#f0fdf4" : isToBeDelivered ? "#fff7ed" : "#f1f5f9",
                                color: isDelivered ? "#047857" : isPickedUp ? "#16a34a" : isToBeDelivered ? "#ea580c" : "#475569",
                              }}
                            >
                              {isDelivered ? "Đã giao thành công" : isPickedUp ? "Đã lấy món (Đang giao)" : isToBeDelivered ? "Đã đến nhà hàng" : "Đã nhận đơn"}
                            </span>
                          </div>

                          {/* Stepper Visualization */}
                          <div className="shipper-stepper">
                            <div className="shipper-stepper-step completed">
                              <div className="shipper-stepper-circle"><FaCheck size={10} /></div>
                              <span className="shipper-stepper-label">Nhận đơn</span>
                            </div>
                            <div className={`shipper-stepper-step ${isToBeDelivered || isPickedUp || isDelivered ? "completed" : "active"}`}>
                              <div className="shipper-stepper-circle">2</div>
                              <span className="shipper-stepper-label">Đến quán</span>
                            </div>
                            <div className={`shipper-stepper-step ${isPickedUp || isDelivered ? "completed" : isToBeDelivered ? "active" : ""}`}>
                              <div className="shipper-stepper-circle">3</div>
                              <span className="shipper-stepper-label">Lấy món</span>
                            </div>
                            <div className={`shipper-stepper-step ${isDelivered ? "completed" : isPickedUp ? "active" : ""}`}>
                              <div className="shipper-stepper-circle">4</div>
                              <span className="shipper-stepper-label">Giao xong</span>
                            </div>
                          </div>

                          <div className="shipper-route-flow">
                            <div className="shipper-route-step">
                              <div className="shipper-step-pin pickup"><FaStore size={11} /></div>
                              <div className="shipper-step-info">
                                <span className="shipper-step-label">Lấy món tại</span>
                                <p className="shipper-step-addr">{del.pickupAddressString || del.pickupAddress || "Nhà hàng đối tác SkyDish"}</p>
                              </div>
                            </div>
                            <div className="shipper-route-step">
                              <div className="shipper-step-pin dropoff"><FaMapMarkerAlt size={11} /></div>
                              <div className="shipper-step-info">
                                <span className="shipper-step-label">Giao tới khách</span>
                                <p className="shipper-step-addr">{del.deliveryAddressString || del.deliveryAddress}</p>
                              </div>
                            </div>
                          </div>

                          {/* Interactive Action Transition Buttons */}
                          {!isDelivered ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {del.status === "assigned" && (
                                <button
                                  type="button"
                                  className="shipper-action-btn primary"
                                  disabled={statusUpdatingId === del._id}
                                  onClick={() => handleUpdateStatus(del._id, "To be delivered")}
                                >
                                  {statusUpdatingId === del._id ? "Đang cập nhật..." : "1. Đã đến nhà hàng"}
                                </button>
                              )}

                              {isToBeDelivered && (
                                <button
                                  type="button"
                                  className="shipper-action-btn primary"
                                  style={{ backgroundColor: "#2563eb" }}
                                  disabled={statusUpdatingId === del._id}
                                  onClick={() => handleUpdateStatus(del._id, "Picked-up")}
                                >
                                  {statusUpdatingId === del._id ? "Đang cập nhật..." : "2. Đã nhận món (Bắt đầu giao)"}
                                </button>
                              )}

                              {isPickedUp && (
                                <button
                                  type="button"
                                  className="shipper-action-btn success"
                                  disabled={statusUpdatingId === del._id}
                                  onClick={() => handleUpdateStatus(del._id, "Delivered")}
                                >
                                  <FaCheckCircle size={14} />
                                  {statusUpdatingId === del._id ? "Đang hoàn tất..." : "3. Xác nhận đã giao thành công"}
                                </button>
                              )}

                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.25rem" }}>
                                <button type="button" disabled className="shipper-action-btn outline">
                                  <FaPhoneAlt size={12} /> Chưa có SĐT
                                </button>
                                <button
                                  type="button"
                                  className="shipper-action-btn outline"
                                  onClick={() => setActiveTab("map")}
                                >
                                  <FaDirections size={13} /> Chỉ đường
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ backgroundColor: "#ecfdf5", padding: "0.65rem 0.85rem", borderRadius: "10px", textAlign: "center", color: "#047857", fontSize: "0.8rem", fontWeight: "700" }}>
                              <FaCheckCircle size={13} style={{ marginRight: "0.35rem" }} /> Đã hoàn tất giao hàng
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 3: 🗺️ BẢN ĐỒ (MAP & ROUTE)
              ========================================================================= */}
          {activeTab === "map" && (
            <div>
              <div className="shipper-section-head">
                <h3 className="shipper-section-title">
                  <FaMapMarkedAlt style={{ color: "var(--shipper-primary)" }} /> Lộ trình giao hàng
                </h3>
              </div>

              <div className="shipper-map-container">
                {/* Visual Route Canvas */}
                <div className="shipper-map-view" style={{ background: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)", flexDirection: "column", padding: "1.5rem" }}>
                  <div style={{ width: "100%", height: "100%", border: "2px dashed #94a3b8", borderRadius: "12px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", backgroundColor: "rgba(255,255,255,0.7)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.25rem auto", border: "1px solid #fed7aa" }}>
                          <FaStore size={16} />
                        </div>
                        <span style={{ fontSize: "0.7rem", fontWeight: "700" }}>Nhà hàng</span>
                      </div>

                      <div style={{ height: "2px", width: "70px", backgroundColor: "#ff5722", position: "relative" }}>
                        <FaMotorcycle size={14} style={{ color: "#ff5722", position: "absolute", top: "-14px", left: "26px" }} />
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.25rem auto", border: "1px solid #a7f3d0" }}>
                          <FaMapMarkerAlt size={16} />
                        </div>
                        <span style={{ fontSize: "0.7rem", fontWeight: "700" }}>Khách hàng</span>
                      </div>
                    </div>

                    <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
                      Khoảng cách: ~2.8 km • Thời gian di chuyển: ~12 phút
                    </span>
                  </div>
                </div>

                <div className="shipper-map-info-box">
                  <div style={{ marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Điểm đón (Nhà hàng)</span>
                    <p style={{ margin: "0.2rem 0 0.5rem 0", fontSize: "0.85rem", fontWeight: "600" }}>
                      {activeDelivery ? (activeDelivery.pickupAddressString || activeDelivery.pickupAddress) : "Chưa có đơn giao đang hoạt động"}
                    </p>

                    <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Điểm giao (Khách hàng)</span>
                    <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.85rem", fontWeight: "600" }}>
                      {activeDelivery ? (activeDelivery.deliveryAddressString || activeDelivery.deliveryAddress) : "Chưa có đơn giao đang hoạt động"}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <a
                      href={activeDelivery ? `https://maps.google.com/?q=${encodeURIComponent(activeDelivery.pickupAddressString || activeDelivery.pickupAddress || "")}` : undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="shipper-action-btn primary"
                      style={{ flex: 1, textDecoration: "none", fontSize: "0.82rem" }}
                    >
                      <FaDirections size={13} /> Chỉ đường Google Maps
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ padding: "0.85rem", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid var(--shipper-border)", fontSize: "0.75rem", color: "#64748b" }}>
                <p style={{ margin: 0 }}>
                  <FaShieldAlt style={{ color: "var(--shipper-primary)", marginRight: "0.3rem" }} />
                  Định vị lộ trình hiển thị theo thông số định vị thực tế của đơn hàng trên địa bàn Hà Nội.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 4: 💰 THU NHẬP (EARNINGS)
              ========================================================================= */}
          {activeTab === "earnings" && (
            <div>
              <div className="shipper-section-head">
                <h3 className="shipper-section-title">
                  <FaWallet style={{ color: "#059669" }} /> Thống kê thu nhập
                </h3>
              </div>

              <div style={{ backgroundColor: "#0f172a", color: "#ffffff", borderRadius: "18px", padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)" }}>
                <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600" }}>Thu nhập hôm nay</span>
                <h2 style={{ fontSize: "2rem", fontWeight: "800", color: "#ffffff", margin: "0.35rem 0 1rem 0" }}>
                  {formatCurrency(todayEarnings)}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", borderTop: "1px solid #334155", paddingTop: "0.85rem", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Đơn hoàn thành</span>
                    <p style={{ margin: "0.15rem 0 0 0", fontWeight: "700", fontSize: "1.1rem" }}>{completedDeliveries.length}</p>
                  </div>
                  <div>
                    <span style={{ color: "#94a3b8" }}>Mức trung bình / đơn</span>
                    <p style={{ margin: "0.15rem 0 0 0", fontWeight: "700", fontSize: "1.1rem", color: "#34d399" }}>25.000 ₫</p>
                  </div>
                </div>
              </div>

              <div className="shipper-section-head">
                <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: "700" }}>Lịch sử hoàn tất ({completedDeliveries.length})</h4>
              </div>

              {completedDeliveries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid var(--shipper-border)" }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>Bạn chưa có đơn giao hoàn thành trong ngày hôm nay.</p>
                </div>
              ) : (
                completedDeliveries.map((del) => (
                  <div key={del._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid var(--shipper-border)", marginBottom: "0.6rem" }}>
                    <div>
                      <span style={{ fontWeight: "700", fontSize: "0.85rem", color: "#0f172a" }}>#{del.orderId}</span>
                      <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.75rem", color: "#64748b" }}>{del.deliveryAddressString || del.deliveryAddress}</p>
                    </div>
                    <span style={{ fontWeight: "700", fontSize: "0.9rem", color: "#059669" }}>+25.000 ₫</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 5: 🔔 THÔNG BÁO (NOTIFICATIONS)
              ========================================================================= */}
          {activeTab === "notifications" && (
            <div>
              <div className="shipper-section-head">
                <h3 className="shipper-section-title">
                  <FaBell style={{ color: "var(--shipper-primary)" }} /> Thông báo ({notifications.length})
                </h3>
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" }}
                  onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                >
                  Đánh dấu đã đọc
                </button>
              </div>

              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    backgroundColor: n.read ? "#ffffff" : "#fff7ed",
                    border: `1px solid ${n.read ? "var(--shipper-border)" : "#fed7aa"}`,
                    borderRadius: "14px",
                    padding: "1rem",
                    marginBottom: "0.75rem",
                    display: "flex",
                    gap: "0.75rem"
                  }}
                >
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: n.type === "order" ? "#fff7ed" : "#f1f5f9", color: n.type === "order" ? "var(--shipper-primary)" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {n.type === "order" ? <FaBoxOpen size={14} /> : <FaBell size={14} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: "700" }}>{n.title}</h4>
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{n.time}</span>
                    </div>
                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.78rem", color: "#475569" }}>{n.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =========================================================================
              TAB 6: 👤 HỒ SƠ (PROFILE)
              ========================================================================= */}
          {activeTab === "profile" && (
            <div>
              <div className="shipper-section-head">
                <h3 className="shipper-section-title">
                  <FaUser style={{ color: "var(--shipper-primary)" }} /> Thông tin cá nhân
                </h3>
              </div>

              <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid var(--shipper-border)", padding: "1.25rem", marginBottom: "1.25rem", textAlign: "center" }}>
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "var(--shipper-primary-light)", color: "var(--shipper-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: "800", margin: "0 auto 0.75rem auto", border: "2px solid var(--shipper-primary)" }}>
                  {driverProfile.name.charAt(0)}
                </div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "800" }}>{driverProfile.name}</h3>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>Đối tác Shipper SkyDish</p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", backgroundColor: "#ecfdf5", color: "#047857", padding: "0.25rem 0.65rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "700", marginTop: "0.5rem" }}>
                  <FaShieldAlt size={12} /> Tài khoản đã xác minh
                </div>
              </div>

              <div style={{ backgroundColor: "#ffffff", borderRadius: "16px", border: "1px solid var(--shipper-border)", padding: "1.15rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", fontSize: "0.82rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
                    <span style={{ color: "#64748b" }}>Số điện thoại</span>
                    <strong style={{ color: "#0f172a" }}>{driverProfile.phone}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
                    <span style={{ color: "#64748b" }}>Email</span>
                    <strong style={{ color: "#0f172a" }}>{driverProfile.email}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
                    <span style={{ color: "#64748b" }}>Phương tiện</span>
                    <strong style={{ color: "#0f172a" }}>{driverProfile.vehicleType}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
                    <span style={{ color: "#64748b" }}>Biển số xe</span>
                    <strong style={{ color: "#0f172a" }}>{driverProfile.vehiclePlate}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Khu vực</span>
                    <strong style={{ color: "#0f172a" }}>{driverProfile.area}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="shipper-action-btn outline"
                style={{ borderColor: "#fecaca", color: "#dc2626" }}
                onClick={handleLogout}
              >
                <FaSignOutAlt size={14} /> Đăng xuất tài khoản
              </button>
            </div>
          )}
        </>
      )}
    </main>

        {/* BOTTOM NAVIGATION BAR */}
        <nav className="shipper-bottom-nav">
          <button
            type="button"
            className={`shipper-nav-item ${activeTab === "home" ? "active" : ""}`}
            onClick={() => setActiveTab("home")}
          >
            <FaHome size={18} />
            <span>Trang chủ</span>
          </button>

          <button
            type="button"
            className={`shipper-nav-item ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <FaBoxOpen size={18} />
            <span>Đơn hàng</span>
            {availableOrders.length > 0 && (
              <span className="shipper-nav-badge">{availableOrders.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`shipper-nav-item ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
          >
            <FaMapMarkedAlt size={18} />
            <span>Bản đồ</span>
          </button>

          <button
            type="button"
            className={`shipper-nav-item ${activeTab === "earnings" ? "active" : ""}`}
            onClick={() => setActiveTab("earnings")}
          >
            <FaWallet size={18} />
            <span>Thu nhập</span>
          </button>

          <button
            type="button"
            className={`shipper-nav-item ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            <FaBell size={18} />
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <span className="shipper-nav-badge">{unreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`shipper-nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <FaUser size={18} />
            <span>Hồ sơ</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
