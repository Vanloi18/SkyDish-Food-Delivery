import { API_URLS, getDeliverySocketOptions, getDeliverySocketUrl, getOrderSocketUrl } from '../../../config/api';
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { io } from "socket.io-client";
import { 
  FaStore, 
  FaUtensils, 
  FaPlus, 
  FaEdit, 
  FaTrashAlt, 
  FaSearch, 
  FaSignOutAlt, 
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaTimes,
  FaChartLine,
  FaStar,
  FaTicketAlt,
  FaBell,
  FaBars,
  FaBan,
  FaExclamationTriangle
} from "react-icons/fa";
import { formatCurrency } from "../../../utils/currency";
import { resolveImageUrl, handleImageError } from "../../../utils/imageHelper";
import ImageUploadPreview from "../../../components/common/ImageUploadPreview";
import AdminModal from "../../../components/admin/AdminModal";
import "../../../styles/restaurant-partner.css";

let socket;
let deliverySocket;

export default function RestaurantDashboard() {
  const navigate = useNavigate();

  // Navigation State
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "orders" | "menu" | "profile" | "reviews" | "promotions" | "analytics" | "notifications"
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restaurant Profile & State
  const [restaurant, setRestaurant] = useState({});
  const [availability, setAvailability] = useState(true);
  const [foodItems, setFoodItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [alertMsg, setAlertMsg] = useState({ type: "", text: "" });

  // Food Item Modal States
  const [isFoodModalOpen, setFoodModalOpen] = useState(false);
  const [isEditingFood, setIsEditingFood] = useState(false);
  const [foodForm, setFoodForm] = useState({
    id: "",
    name: "",
    description: "",
    price: "",
    category: "Phở & Bún",
    image: "",
    imageFile: null,
    imageRemoved: false,
    availability: true,
  });

  // Food Item Delete Confirmation Modal
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState(null);

  // Order Details Modal
  const [isOrderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Order Reject / Cancel Modal State
  const [isRejectModalOpen, setRejectModalOpen] = useState(false);
  const [orderToReject, setOrderToReject] = useState(null);
  const [rejectReasonPreset, setRejectReasonPreset] = useState("Hết món / nguyên liệu chế biến");
  const [rejectReasonCustom, setRejectReasonCustom] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Reviews State
  const [reviewsData, setReviewsData] = useState({ totalReviews: 0, averageRating: 5.0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, reviews: [] });
  const [replyReviewId, setReplyReviewId] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Coupons State
  const [coupons, setCoupons] = useState([]);
  const [isCouponModalOpen, setCouponModalOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    description: "",
    discountType: "fixed",
    discountValue: 20000,
    minOrderValue: 100000,
    usageLimit: 500,
  });

  // Notifications State
  const [notifications, setNotifications] = useState([]);

  const unreadNotificationsCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  // Aggregate top-selling dishes dynamically from real fulfilled orders
  const topSellingItems = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== "Canceled");
    const counts = {};
    validOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const key = item.foodId || item.name;
        if (!key) return;
        if (!counts[key]) {
          counts[key] = {
            id: key,
            name: item.name || "Món ăn",
            count: 0,
            price: item.price || 0,
          };
        }
        counts[key].count += item.quantity || 1;
        if (item.price) counts[key].price = item.price;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  const token = localStorage.getItem("restaurantToken") || localStorage.getItem("token");

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg({ type: "", text: "" }), 4000);
  };

  // 1. Fetch Restaurant Profile
  const fetchRestaurantProfile = useCallback(async () => {
    try {
      if (!token) {
        navigate("/restaurant/login");
        return;
      }
      const res = await axios.get(`${API_URLS.RESTAURANT}/api/restaurant/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data) {
        setRestaurant(res.data);
        setAvailability(!!res.data.availability);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("restaurantToken");
        localStorage.removeItem("token");
        navigate("/restaurant/login");
      }
    }
  }, [token, navigate]);

  // 2. Fetch Food Items
  const fetchFoodItems = useCallback(async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${API_URLS.RESTAURANT}/api/food-items/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(res.data)) {
        setFoodItems(res.data);
      }
    } catch (err) {
      console.warn("Fetch food items notice:", err.message);
    }
  }, [token]);

  // 3. Fetch Orders for this Restaurant
  const fetchOrders = useCallback(async () => {
    try {
      const restToken = localStorage.getItem("restaurantToken") || localStorage.getItem("token");
      const headers = restToken ? { Authorization: `Bearer ${restToken}` } : {};
      const res = await axios.get(`${API_URLS.ORDER}/api/orders`, { headers });
      const orderList = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
      setOrders(orderList);
    } catch (err) {
      console.warn("Fetch orders notice:", err.message);
    }
  }, []);

  // 4. Fetch Real Reviews
  const fetchReviews = useCallback(async (rId) => {
    try {
      if (!rId) return;
      const res = await axios.get(`${API_URLS.RESTAURANT}/api/reviews/restaurant/${rId}`);
      if (res.data) {
        setReviewsData(res.data);
      }
    } catch (err) {
      console.warn("Fetch reviews notice:", err.message);
    }
  }, []);

  // 5. Fetch Real Coupons
  const fetchCoupons = useCallback(async (rId) => {
    try {
      const url = rId
        ? `${API_URLS.RESTAURANT}/api/coupons/restaurant/${rId}`
        : `${API_URLS.RESTAURANT}/api/coupons`;
      const res = await axios.get(url);
      if (Array.isArray(res.data)) {
        setCoupons(res.data);
      }
    } catch (err) {
      console.warn("Fetch coupons notice:", err.message);
    }
  }, []);

  // 6. Fetch Real Notifications
  const fetchNotifications = useCallback(async (rId) => {
    try {
      const url = rId
        ? `${API_URLS.RESTAURANT}/api/notifications?userId=${rId}&role=restaurant`
        : `${API_URLS.RESTAURANT}/api/notifications?role=restaurant`;
      const res = await axios.get(url);
      if (res.data?.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.warn("Fetch notifications notice:", err.message);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    if (!token) {
      navigate("/restaurant/login");
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchRestaurantProfile(),
        fetchFoodItems(),
        fetchOrders(),
        fetchReviews(restaurant._id),
        fetchCoupons(restaurant._id),
        fetchNotifications(restaurant._id),
      ]);
      setLoading(false);
    };
    loadAll();

    // Socket.IO for incoming orders
    try {
      socket = io(getOrderSocketUrl(), { auth: { token }, autoConnect: false });
      socket.connect();

      socket.on("updateOrder", (data) => {
        setOrders((prev) => prev.map((o) => (o._id === data.orderId ? { ...o, status: data.status } : o)));
      });

      socket.on("new-order", (newOrder) => {
        const currentRestaurantId = restaurant._id?.toString();
        if (currentRestaurantId && newOrder.restaurantId?.toString() !== currentRestaurantId) return;
        setOrders((prev) => [newOrder, ...prev]);
        setNotifications((prev) => [
          {
            id: Date.now(),
            title: "Có đơn hàng mới!",
            message: `Mã đơn #${newOrder._id?.slice(-6) || "Mới"} vừa được đặt.`,
            time: "Vừa xong",
            isRead: false,
            type: "order",
          },
          ...prev,
        ]);
        showAlert("success", "🔔 Quán vừa nhận được đơn hàng mới từ khách!");
      });

      deliverySocket = io(getDeliverySocketUrl(), { ...getDeliverySocketOptions(token), autoConnect: false });
      deliverySocket.connect();
      deliverySocket.on("order-status-updated", ({ orderId, status }) => {
        setOrders((prev) => prev.map((order) => order._id === orderId ? { ...order, status } : order));
      });
    } catch (e) {
      console.warn("Socket.io init notice:", e);
    }

    return () => {
      if (socket) socket.disconnect();
      if (deliverySocket) deliverySocket.disconnect();
    };
  }, [token, navigate, fetchRestaurantProfile, fetchFoodItems, fetchOrders, fetchReviews, fetchCoupons, fetchNotifications, restaurant._id]);

  // Toggle Store Availability
  const handleToggleStoreAvailability = async () => {
    try {
      const nextState = !availability;
      const res = await axios.put(
        `${API_URLS.RESTAURANT}/api/restaurant/availability`,
        { availability: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) {
        setAvailability(nextState);
        showAlert("success", nextState ? "🟢 Nhà hàng đã mở cửa nhận đơn trực tuyến." : "⚪ Nhà hàng đã tạm đóng cửa.");
      }
    } catch (err) {
      showAlert("danger", "Không thể cập nhật trạng thái mở cửa của nhà hàng.");
    }
  };

  // Toggle Food Availability
  const handleToggleFoodAvailability = async (foodId, currentStatus) => {
    try {
      const res = await axios.put(
        `${API_URLS.RESTAURANT}/api/food-items/availability/${foodId}`,
        { availability: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data) {
        setFoodItems((prev) => prev.map((item) => (item._id === foodId ? { ...item, availability: !currentStatus } : item)));
        showAlert("success", "Đã cập nhật trạng thái món ăn!");
      }
    } catch (err) {
      showAlert("danger", "Không thể cập nhật trạng thái món ăn.");
    }
  };

  // Save Food Item (Create or Edit)
  const handleSaveFoodItem = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!foodForm.name || !foodForm.price) {
      showAlert("danger", "Vui lòng nhập tên món và giá bán.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", foodForm.name.trim());
      formData.append("description", foodForm.description ? foodForm.description.trim() : "");
      formData.append("price", String(foodForm.price));
      formData.append("category", foodForm.category || "Phở & Bún");
      formData.append("availability", String(foodForm.availability));

      if (foodForm.imageFile) {
        formData.append("image", foodForm.imageFile);
      } else if (foodForm.imageRemoved) {
        formData.append("image", "");
        formData.append("imageUrl", "");
      } else if (foodForm.image) {
        formData.append("image", foodForm.image);
        formData.append("imageUrl", foodForm.image);
      }

      if (isEditingFood) {
        // Edit Food Item
        await axios.put(
          `${API_URLS.RESTAURANT}/api/food-items/${foodForm.id}`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        showAlert("success", "Cập nhật món ăn thành công!");
      } else {
        // Create Food Item
        await axios.post(
          `${API_URLS.RESTAURANT}/api/food-items/create`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        showAlert("success", "Thêm món ăn mới thành công!");
      }
      setFoodModalOpen(false);
      await fetchFoodItems();
    } catch (err) {
      showAlert("danger", err.response?.data?.message || "Lỗi lưu thông tin món ăn.");
    }
  };

  // Delete Food Item
  const handleConfirmDeleteFood = async () => {
    if (!foodToDelete) return;
    try {
      await axios.delete(`${API_URLS.RESTAURANT}/api/food-items/${foodToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showAlert("success", "Đã xóa món ăn khỏi thực đơn.");
      setDeleteModalOpen(false);
      setFoodToDelete(null);
      await fetchFoodItems();
    } catch (err) {
      showAlert("danger", "Không thể xóa món ăn này.");
    }
  };

  // Update Order Status (Authoritative backend call & immediate state sync)
  const handleUpdateOrderStatus = async (orderId, nextStatus, reason = null) => {
    try {
      const payload = { status: nextStatus };
      if (reason) payload.cancellationReason = reason;

      const res = await axios.patch(
        `${API_URLS.ORDER}/api/orders/${orderId}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedOrder = res.data;
      // Immediately sync state with the updated order returned by Order Service
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, ...updatedOrder } : o))
      );
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, ...updatedOrder }));
      }

      const msg =
        nextStatus === "Confirmed"
          ? "Đơn hàng đã được xác nhận thành công!"
          : nextStatus === "Canceled"
          ? "Đơn hàng đã được từ chối / hủy."
          : nextStatus === "Preparing"
          ? "Đơn hàng đã chuyển sang giai đoạn chuẩn bị món."
          : `Đơn hàng đã được chuyển sang trạng thái '${nextStatus}'!`;

      showAlert("success", msg);
      await fetchOrders();
      return updatedOrder;
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Không thể cập nhật trạng thái đơn hàng.";
      showAlert("danger", errMsg);
      throw err;
    }
  };

  // Open Reject / Cancel Order Modal
  const handleOpenRejectModal = (order) => {
    setOrderToReject(order);
    setRejectReasonPreset("Hết món / nguyên liệu chế biến");
    setRejectReasonCustom("");
    setRejectModalOpen(true);
  };

  // Confirm Reject Order from Modal
  const handleConfirmReject = async () => {
    if (!orderToReject) return;
    const finalReason =
      rejectReasonPreset === "Lý do khác"
        ? (rejectReasonCustom.trim() || "Lý do khác")
        : rejectReasonPreset;
    setIsSubmittingReject(true);
    try {
      await handleUpdateOrderStatus(orderToReject._id, "Canceled", finalReason);
      setRejectModalOpen(false);
      setOrderToReject(null);
    } catch (e) {
      // Alert already handled in handleUpdateOrderStatus
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Save Coupon (Merchant creates voucher)
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    if (!couponForm.code || !couponForm.discountValue) {
      showAlert("danger", "Vui lòng nhập mã và giá trị ưu đãi.");
      return;
    }
    try {
      await axios.post(
        `${API_URLS.RESTAURANT}/api/coupons/create`,
        { ...couponForm, restaurantId: restaurant._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showAlert("success", "Tạo mã khuyến mãi thành công!");
      setCouponModalOpen(false);
      setCouponForm({ code: "", description: "", discountType: "fixed", discountValue: 20000, minOrderValue: 100000, usageLimit: 500 });
      await fetchCoupons(restaurant._id);
    } catch (err) {
      showAlert("danger", err.response?.data?.message || "Lỗi tạo mã giảm giá.");
    }
  };

  // Toggle Coupon Status
  const handleToggleCoupon = async (couponId) => {
    try {
      const res = await axios.put(
        `${API_URLS.RESTAURANT}/api/coupons/${couponId}/deactivate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showAlert("success", res.data.message);
      await fetchCoupons(restaurant._id);
    } catch (err) {
      showAlert("danger", "Lỗi cập nhật trạng thái mã.");
    }
  };

  // Reply to Customer Review
  const handleSendReply = async (reviewId) => {
    if (!replyText.trim()) return;
    try {
      await axios.put(
        `${API_URLS.RESTAURANT}/api/reviews/${reviewId}/reply`,
        { replyComment: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showAlert("success", "Đã gửi phản hồi đến thực khách!");
      setReplyReviewId(null);
      setReplyText("");
      await fetchReviews(restaurant._id);
    } catch (err) {
      showAlert("danger", err.response?.data?.message || "Lỗi gửi phản hồi.");
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("restaurantToken");
    localStorage.removeItem("token");
    navigate("/restaurant/login");
  };

  // Calculated Real KPIs
  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === "Delivered" || o.status === "Confirmed" || o.status === "Preparing")
      .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.status === "Pending");
  }, [orders]);

  const preparingOrders = useMemo(() => {
    return orders.filter((o) => o.status === "Confirmed" || o.status === "Preparing");
  }, [orders]);

  const inProgressOrders = useMemo(() => {
    return orders.filter((o) => o.status === "Pending" || o.status === "Confirmed" || o.status === "Preparing");
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === "Delivered");
  }, [orders]);

  // Filtered Food Items
  const filteredFoodItems = useMemo(() => {
    return foodItems.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = categoryFilter === "ALL" || item.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [foodItems, searchQuery, categoryFilter]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      if (orderStatusFilter === "ALL") return true;
      return ord.status === orderStatusFilter;
    });
  }, [orders, orderStatusFilter]);

  return (
    <div className="merchant-layout-wrapper">
      {/* 1. SIDEBAR */}
      <aside className={`merchant-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="merchant-sidebar-brand">
          <div className="merchant-brand-logo">
            <FaStore />
          </div>
          {!collapsed && (
            <div>
              <h2 className="merchant-brand-text">SkyDish Quán</h2>
              <span className="merchant-brand-sub">Cổng Đối Tác Ẩm Thực</span>
            </div>
          )}
        </div>

        <nav className="merchant-nav-menu">
          <button
            type="button"
            className={`merchant-nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <FaStore size={16} /> {!collapsed && <span>Tổng quan</span>}
          </button>

          <button
            type="button"
            className={`merchant-nav-item ${activeTab === "orders" ? "active" : ""}`}
            onClick={() => setActiveTab("orders")}
          >
            <FaBoxOpen size={16} /> {!collapsed && <span>Đơn hàng</span>}
            {inProgressOrders.length > 0 && !collapsed && (
              <span style={{ marginLeft: "auto", backgroundColor: "#ff5722", color: "#ffffff", padding: "0.15rem 0.45rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: "700" }}>
                {inProgressOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`merchant-nav-item ${activeTab === "menu" ? "active" : ""}`}
            onClick={() => setActiveTab("menu")}
          >
            <FaUtensils size={16} /> {!collapsed && <span>Thực đơn ({foodItems.length})</span>}
          </button>

          <button
            type="button"
            className={`merchant-nav-item ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <FaStore size={16} /> {!collapsed && <span>Hồ sơ quán</span>}
          </button>

          <button
            type="button"
            className={`merchant-nav-item ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
          >
            <FaStar size={16} /> {!collapsed && <span>Đánh giá</span>}
          </button>

          <button
            type="button"
            className={`merchant-nav-item ${activeTab === "promotions" ? "active" : ""}`}
            onClick={() => setActiveTab("promotions")}
          >
            <FaTicketAlt size={16} /> {!collapsed && <span>Khuyến mãi</span>}
          </button>

          <button
            type="button"
            className={`merchant-nav-item ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab("analytics")}
          >
            <FaChartLine size={16} /> {!collapsed && <span>Phân tích</span>}
          </button>

          <button
            type="button"
            className={`merchant-nav-item ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            <FaBell size={16} /> {!collapsed && <span>Thông báo</span>}
            {unreadNotificationsCount > 0 && !collapsed && (
              <span style={{ marginLeft: "auto", backgroundColor: "#ef4444", color: "#ffffff", padding: "0.15rem 0.45rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: "700" }}>
                {unreadNotificationsCount}
              </span>
            )}
          </button>
        </nav>

        <div style={{ padding: "1rem 0.65rem", borderTop: "1px solid #1e293b" }}>
          <button
            type="button"
            className="merchant-nav-item"
            style={{ color: "#f87171" }}
            onClick={handleLogout}
          >
            <FaSignOutAlt size={16} /> {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* 2. MAIN AREA */}
      <div className={`merchant-main-area ${collapsed ? "sidebar-collapsed" : ""}`}>
        {/* Topbar */}
        <header className="merchant-topbar">
          <div className="merchant-topbar-left">
            <button
              type="button"
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.4rem" }}
              onClick={() => {
                setCollapsed(!collapsed);
                setMobileOpen(!mobileOpen);
              }}
              aria-label="Thu gọn hoặc mở rộng thanh điều hướng"
            >
              <FaBars size={16} />
            </button>
            <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
              {restaurant.name || "Nhà hàng đối tác SkyDish"}
            </h1>
          </div>

          <div className="merchant-topbar-right">
            <button
              type="button"
              className={`merchant-store-status-btn ${availability ? "open" : "closed"}`}
              onClick={handleToggleStoreAvailability}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: availability ? "#10b981" : "#ef4444" }} />
              <span>{availability ? "Đang mở cửa" : "Đã đóng cửa"}</span>
            </button>
          </div>
        </header>

        {/* FEEDBACK ALERT */}
        <AnimatePresence>
          {alertMsg.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                margin: "1rem 2rem 0 2rem",
                padding: "0.75rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: alertMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: alertMsg.type === "success" ? "#047857" : "#b91c1c",
                border: `1px solid ${alertMsg.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                zIndex: 45,
              }}
            >
              <span>{alertMsg.text}</span>
              <FaTimes size={13} style={{ cursor: "pointer" }} onClick={() => setAlertMsg({ type: "", text: "" })} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONTENT CANVAS */}
        <main className="merchant-content-canvas">
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <div style={{ width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTopColor: "var(--merch-primary)", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem auto" }} />
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>Đang tải dữ liệu nhà hàng...</p>
            </div>
          ) : (
            <>
              {/* =========================================================================
                  TAB 1: 🏠 TỔNG QUAN (OVERVIEW)
                  ========================================================================= */}
              {activeTab === "overview" && (
                <div>
                  <div className="merchant-kpi-grid">
                    <div className="merchant-kpi-card">
                      <div className="merchant-kpi-header">
                        <span className="merchant-kpi-title">Doanh thu hôm nay</span>
                        <div className="merchant-kpi-icon-box" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>
                          <FaChartLine size={18} />
                        </div>
                      </div>
                      <h3 className="merchant-kpi-val" style={{ color: "#059669" }}>{formatCurrency(totalRevenue)}</h3>
                    </div>

                    <div className="merchant-kpi-card">
                      <div className="merchant-kpi-header">
                        <span className="merchant-kpi-title">Đơn hàng hôm nay</span>
                        <div className="merchant-kpi-icon-box" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
                          <FaBoxOpen size={18} />
                        </div>
                      </div>
                      <h3 className="merchant-kpi-val" style={{ color: "#ea580c" }}>{orders.length}</h3>
                    </div>

                    <div className="merchant-kpi-card">
                      <div className="merchant-kpi-header">
                        <span className="merchant-kpi-title">Đơn đang xử lý</span>
                        <div className="merchant-kpi-icon-box" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                          <FaClock size={18} />
                        </div>
                      </div>
                      <h3 className="merchant-kpi-val" style={{ color: "#2563eb" }}>{inProgressOrders.length}</h3>
                    </div>

                    <div className="merchant-kpi-card">
                      <div className="merchant-kpi-header">
                        <span className="merchant-kpi-title">Món ăn trong thực đơn</span>
                        <div className="merchant-kpi-icon-box" style={{ backgroundColor: "#faf5ff", color: "#7c3aed" }}>
                          <FaUtensils size={18} />
                        </div>
                      </div>
                      <h3 className="merchant-kpi-val">{foodItems.length}</h3>
                    </div>
                  </div>

                  {/* Active Orders List */}
                  <div className="merchant-card-box">
                    <div className="merchant-card-header">
                      <h3 className="merchant-card-title">
                        <FaClock style={{ color: "var(--merch-primary)" }} /> Đơn hàng cần xử lý ngay ({inProgressOrders.length})
                        {pendingOrders.length > 0 && (
                          <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", backgroundColor: "#fee2e2", color: "#dc2626", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                            {pendingOrders.length} chờ duyệt
                          </span>
                        )}
                        {preparingOrders.length > 0 && (
                          <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", backgroundColor: "#eff6ff", color: "#2563eb", padding: "0.15rem 0.5rem", borderRadius: "9999px" }}>
                            {preparingOrders.length} đang làm
                          </span>
                        )}
                      </h3>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "var(--merch-primary)", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
                        onClick={() => setActiveTab("orders")}
                      >
                        Xem tất cả đơn →
                      </button>
                    </div>

                    {inProgressOrders.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2rem 1rem", color: "#64748b", fontSize: "0.9rem" }}>
                        <FaCheckCircle size={32} style={{ color: "#10b981", marginBottom: "0.5rem" }} />
                        <p style={{ margin: 0 }}>Tất cả các đơn hàng đã được chuẩn bị xong!</p>
                      </div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                              <th style={{ padding: "0.75rem 0.5rem" }}>Mã đơn</th>
                              <th style={{ padding: "0.75rem 0.5rem" }}>Khách hàng</th>
                              <th style={{ padding: "0.75rem 0.5rem" }}>Tổng tiền</th>
                              <th style={{ padding: "0.75rem 0.5rem" }}>Thanh toán</th>
                              <th style={{ padding: "0.75rem 0.5rem" }}>Trạng thái</th>
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inProgressOrders.map((ord) => (
                              <tr key={ord._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                <td style={{ padding: "0.85rem 0.5rem", fontWeight: "700" }}>#{ord._id?.slice(-6) || ord.orderId}</td>
                                <td style={{ padding: "0.85rem 0.5rem" }}>{ord.customerId || "Khách Hàng"}</td>
                                <td style={{ padding: "0.85rem 0.5rem", fontWeight: "700", color: "var(--merch-primary)" }}>{formatCurrency(ord.totalPrice || 0)}</td>
                                <td style={{ padding: "0.85rem 0.5rem" }}>
                                  {ord.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản (MB Bank)" : (ord.paymentMethod || "COD")}
                                </td>
                                <td style={{ padding: "0.85rem 0.5rem" }}>
                                  <span style={{
                                    padding: "0.2rem 0.55rem",
                                    borderRadius: "9999px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    backgroundColor: ord.status === "Delivered" ? "#ecfdf5" : ord.status === "Preparing" ? "#eff6ff" : ord.status === "Confirmed" ? "#f0fdf4" : ord.status === "Canceled" ? "#fef2f2" : "#fff7ed",
                                    color: ord.status === "Delivered" ? "#047857" : ord.status === "Preparing" ? "#2563eb" : ord.status === "Confirmed" ? "#16a34a" : ord.status === "Canceled" ? "#dc2626" : "#ea580c",
                                  }}>
                                    {ord.status === "Pending" ? "Chờ xác nhận" : ord.status === "Confirmed" ? "Đã xác nhận" : ord.status === "Preparing" ? "Đang chuẩn bị" : ord.status === "Out for Delivery" ? "Đang giao" : ord.status === "Delivered" ? "Đã giao" : "Đã hủy"}
                                  </span>
                                </td>
                                <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                                  <button
                                    type="button"
                                    style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "#0f172a", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", marginRight: "0.4rem" }}
                                    onClick={() => {
                                      setSelectedOrder(ord);
                                      setOrderDetailOpen(true);
                                    }}
                                  >
                                    Chi tiết
                                  </button>
                                  {ord.status === "Pending" && (
                                    <>
                                      <button
                                        type="button"
                                        style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "var(--merch-primary)", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", marginRight: "0.4rem" }}
                                        onClick={() => handleUpdateOrderStatus(ord._id, "Confirmed")}
                                      >
                                        Xác nhận
                                      </button>
                                      <button
                                        type="button"
                                        style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                                        onClick={() => handleOpenRejectModal(ord)}
                                      >
                                        <FaBan size={11} /> Từ chối
                                      </button>
                                    </>
                                  )}
                                  {ord.status === "Confirmed" && (
                                    <>
                                      <button
                                        type="button"
                                        style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", marginRight: "0.4rem" }}
                                        onClick={() => handleUpdateOrderStatus(ord._id, "Preparing")}
                                      >
                                        Bắt đầu làm
                                      </button>
                                      <button
                                        type="button"
                                        style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" }}
                                        onClick={() => handleOpenRejectModal(ord)}
                                      >
                                        Hủy đơn
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 2: 📦 ĐƠN HÀNG (ORDERS)
                  ========================================================================= */}
              {activeTab === "orders" && (
                <div>
                  <div className="merchant-card-box">
                    <div className="merchant-card-header" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
                      <h3 className="merchant-card-title">
                        <FaBoxOpen style={{ color: "var(--merch-primary)" }} /> Quản lý đơn hàng ({filteredOrders.length})
                      </h3>

                      {/* Filter Status Pills */}
                      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                        {["ALL", "Pending", "Confirmed", "Preparing", "Out for Delivery", "Delivered", "Canceled"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            style={{
                              padding: "0.35rem 0.75rem",
                              borderRadius: "20px",
                              fontSize: "0.78rem",
                              fontWeight: "600",
                              border: "1px solid #e2e8f0",
                              backgroundColor: orderStatusFilter === st ? "#0f172a" : "#ffffff",
                              color: orderStatusFilter === st ? "#ffffff" : "#64748b",
                              cursor: "pointer",
                            }}
                            onClick={() => setOrderStatusFilter(st)}
                          >
                            {st === "ALL" ? "Tất cả" : st === "Pending" ? "Chờ xác nhận" : st === "Confirmed" ? "Đã xác nhận" : st === "Preparing" ? "Đang chuẩn bị" : st === "Out for Delivery" ? "Đang giao" : st === "Delivered" ? "Hoàn thành" : "Đã hủy"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                            <th style={{ padding: "0.75rem 0.5rem" }}>Mã đơn</th>
                            <th style={{ padding: "0.75rem 0.5rem" }}>Khách hàng</th>
                            <th style={{ padding: "0.75rem 0.5rem" }}>Địa chỉ giao</th>
                            <th style={{ padding: "0.75rem 0.5rem" }}>Tổng tiền</th>
                            <th style={{ padding: "0.75rem 0.5rem" }}>Thanh toán</th>
                            <th style={{ padding: "0.75rem 0.5rem" }}>Trạng thái</th>
                            <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map((ord) => (
                            <tr key={ord._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "0.85rem 0.5rem", fontWeight: "700" }}>#{ord._id?.slice(-6) || ord.orderId}</td>
                              <td style={{ padding: "0.85rem 0.5rem" }}>{ord.customerId || "Khách Hàng"}</td>
                              <td style={{ padding: "0.85rem 0.5rem", color: "#64748b", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {ord.deliveryAddress || "Chưa có địa chỉ"}
                              </td>
                              <td style={{ padding: "0.85rem 0.5rem", fontWeight: "700", color: "var(--merch-primary)" }}>{formatCurrency(ord.totalPrice || 0)}</td>
                              <td style={{ padding: "0.85rem 0.5rem" }}>
                                {ord.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản (MB Bank)" : (ord.paymentMethod || "COD")}
                              </td>
                              <td style={{ padding: "0.85rem 0.5rem" }}>
                                <span
                                  style={{
                                    padding: "0.2rem 0.55rem",
                                    borderRadius: "9999px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    backgroundColor: ord.status === "Delivered" ? "#ecfdf5" : ord.status === "Preparing" ? "#eff6ff" : ord.status === "Confirmed" ? "#f0fdf4" : "#fff7ed",
                                    color: ord.status === "Delivered" ? "#047857" : ord.status === "Preparing" ? "#2563eb" : ord.status === "Confirmed" ? "#16a34a" : "#ea580c",
                                  }}
                                >
                                  {ord.status === "Pending" ? "Chờ xác nhận" : ord.status === "Confirmed" ? "Đã xác nhận" : ord.status === "Preparing" ? "Đang chuẩn bị" : ord.status === "Out for Delivery" ? "Đang giao" : ord.status === "Delivered" ? "Đã giao" : "Đã hủy"}
                                </span>
                              </td>
                              <td style={{ padding: "0.85rem 0.5rem", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "0.35rem", justifyContent: "flex-end", alignItems: "center" }}>
                                  <button
                                    type="button"
                                    style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "#0f172a", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" }}
                                    onClick={() => {
                                      setSelectedOrder(ord);
                                      setOrderDetailOpen(true);
                                    }}
                                  >
                                    Xem chi tiết
                                  </button>
                                  {ord.status === "Pending" && (
                                    <>
                                      <button
                                        type="button"
                                        style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "var(--merch-primary)", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" }}
                                        onClick={() => handleUpdateOrderStatus(ord._id, "Confirmed")}
                                      >
                                        Xác nhận
                                      </button>
                                      <button
                                        type="button"
                                        style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                                        onClick={() => handleOpenRejectModal(ord)}
                                      >
                                        <FaBan size={11} /> Từ chối
                                      </button>
                                    </>
                                  )}
                                  {ord.status === "Confirmed" && (
                                    <>
                                      <button
                                        type="button"
                                        style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" }}
                                        onClick={() => handleUpdateOrderStatus(ord._id, "Preparing")}
                                      >
                                        Bắt đầu làm
                                      </button>
                                      <button
                                        type="button"
                                        style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" }}
                                        onClick={() => handleOpenRejectModal(ord)}
                                      >
                                        Hủy đơn
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 3: 🍜 THỰC ĐƠN & MÓN ĂN (MENU)
                  ========================================================================= */}
              {activeTab === "menu" && (
                <div>
                  <div className="merchant-card-box">
                    <div className="merchant-card-header" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
                      <div>
                        <h3 className="merchant-card-title">
                          <FaUtensils style={{ color: "var(--merch-primary)" }} /> Quản lý món ăn ({filteredFoodItems.length})
                        </h3>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>Thêm, sửa, cập nhật giá VND và trạng thái hết món.</p>
                      </div>

                      <button
                        type="button"
                        style={{ padding: "0.6rem 1.15rem", borderRadius: "8px", backgroundColor: "var(--merch-primary)", color: "#ffffff", border: "none", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                        onClick={() => {
                          setIsEditingFood(false);
                          setFoodForm({ id: "", name: "", description: "", price: "", category: "Phở & Bún", image: "", imageFile: null, imageRemoved: false, availability: true });
                          setFoodModalOpen(true);
                        }}
                      >
                        <FaPlus size={12} /> Thêm món mới
                      </button>
                    </div>

                    {/* Search & Category Filter */}
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                      <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
                        <FaSearch size={14} style={{ position: "absolute", left: "12px", top: "12px", color: "#94a3b8" }} />
                        <input
                          type="text"
                          placeholder="Tìm kiếm tên món ăn..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ width: "100%", padding: "0.6rem 1rem 0.6rem 2.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                        />
                      </div>

                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        style={{ padding: "0.6rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", backgroundColor: "#ffffff" }}
                      >
                        <option value="ALL">Tất cả danh mục</option>
                        <option value="Phở & Bún">Phở & Bún</option>
                        <option value="Cơm & Bánh Mì">Cơm & Bánh Mì</option>
                        <option value="Pizza & Pasta">Pizza & Pasta</option>
                        <option value="Lẩu & Nướng">Lẩu & Nướng</option>
                        <option value="Đồ Ăn Nhanh">Đồ Ăn Nhanh</option>
                        <option value="Đồ Uống">Đồ Uống</option>
                        <option value="Tráng Miệng">Tráng Miệng</option>
                      </select>
                    </div>

                    {/* Foods Grid */}
                    {filteredFoodItems.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                        <FaUtensils size={36} style={{ color: "#cbd5e1", marginBottom: "0.75rem" }} />
                        <p style={{ margin: 0 }}>Không tìm thấy món ăn phù hợp.</p>
                      </div>
                    ) : (
                      <div className="merchant-food-grid">
                        {filteredFoodItems.map((food) => (
                          <div key={food._id} className="merchant-food-card">
                            <img
                              src={resolveImageUrl(food.image, "food")}
                              alt={food.name}
                              className="merchant-food-img"
                              onError={(e) => handleImageError(e, "food")}
                            />
                            <div className="merchant-food-body">
                              <h4 className="merchant-food-name">{food.name}</h4>
                              <p className="merchant-food-desc">{food.description || "Món ngon chất lượng từ nhà hàng."}</p>
                              
                              <div className="merchant-food-footer">
                                <span className="merchant-food-price">{formatCurrency(food.price)}</span>
                                <button
                                   type="button"
                                   style={{
                                     padding: "0.25rem 0.6rem",
                                     borderRadius: "12px",
                                     fontSize: "0.75rem",
                                     fontWeight: "600",
                                     border: "none",
                                     cursor: "pointer",
                                     backgroundColor: food.availability ? "#ecfdf5" : "#f1f5f9",
                                     color: food.availability ? "#047857" : "#64748b",
                                   }}
                                   onClick={() => handleToggleFoodAvailability(food._id, food.availability)}
                                 >
                                   {food.availability ? "🟢 Đang bán" : "⚪ Hết món"}
                                 </button>
                               </div>

                              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem" }}>
                                <button
                                   type="button"
                                   style={{ flex: 1, padding: "0.4rem", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#0f172a", border: "none", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}
                                   onClick={() => {
                                     setIsEditingFood(true);
                                     setFoodForm({
                                       id: food._id,
                                       name: food.name,
                                       description: food.description || "",
                                       price: food.price,
                                       category: food.category || "Phở & Bún",
                                       image: food.image || "",
                                       imageFile: null,
                                       imageRemoved: false,
                                       availability: food.availability,
                                     });
                                     setFoodModalOpen(true);
                                   }}
                                 >
                                  <FaEdit size={12} /> Sửa
                                </button>
                                <button
                                  type="button"
                                  style={{ padding: "0.4rem 0.65rem", borderRadius: "6px", backgroundColor: "#fef2f2", color: "#dc2626", border: "none", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer" }}
                                  onClick={() => {
                                    setFoodToDelete(food);
                                    setDeleteModalOpen(true);
                                  }}
                                >
                                  <FaTrashAlt size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 4: 🏪 HỒ SƠ NHÀ HÀNG (PROFILE)
                  ========================================================================= */}
              {activeTab === "profile" && (
                <div>
                  <div className="merchant-card-box" style={{ maxWidth: "700px" }}>
                    <div className="merchant-card-header">
                      <h3 className="merchant-card-title">
                        <FaStore style={{ color: "var(--merch-primary)" }} /> Thông tin quán
                      </h3>
                      <button
                        type="button"
                        className={`merchant-store-status-btn ${availability ? "open" : "closed"}`}
                        onClick={handleToggleStoreAvailability}
                      >
                        {availability ? "🟢 Đang mở cửa" : "⚪ Đã đóng cửa"}
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.9rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                          Tên nhà hàng
                        </label>
                        <input
                          type="text"
                          value={restaurant.name || ""}
                          disabled
                          style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                          Chủ quản lý
                        </label>
                        <input
                          type="text"
                          value={restaurant.ownerName || "Chưa có dữ liệu"}
                          disabled
                          style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                          Địa chỉ chi nhánh tại Hà Nội
                        </label>
                        <input
                          type="text"
                          value={restaurant.location || "Chưa có dữ liệu"}
                          disabled
                          style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                          Số điện thoại liên hệ
                        </label>
                        <input
                          type="text"
                          value={restaurant.contactNumber || "024 3934 7888"}
                          disabled
                          style={{ width: "100%", padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 5: ⭐ ĐÁNH GIÁ (REVIEWS)
                  ========================================================================= */}
              {activeTab === "reviews" && (
                <div>
                  <div className="merchant-card-box">
                    <div className="merchant-card-header">
                      <div>
                        <h3 className="merchant-card-title">
                          <FaStar style={{ color: "#f59e0b" }} /> Đánh giá & Nhận xét từ thực khách
                        </h3>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                          Đánh giá thực tế từ các đơn hàng đã giao thành công.
                        </p>
                      </div>
                      <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "#059669" }}>
                        ⭐ {reviewsData.averageRating} / 5.0 ({reviewsData.totalReviews} đánh giá)
                      </span>
                    </div>

                    {reviewsData.reviews.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                        <FaStar size={36} style={{ color: "#cbd5e1", marginBottom: "0.75rem" }} />
                        <p style={{ margin: 0 }}>Chưa có đánh giá nào cho nhà hàng.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {reviewsData.reviews.map((rev) => (
                          <div key={rev._id} style={{ padding: "1.15rem", backgroundColor: "#fafafa", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                              <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>{rev.customerName || "Thực khách"}</strong>
                              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                                {new Date(rev.createdAt).toLocaleDateString("vi-VN")}
                              </span>
                            </div>
                            <div style={{ color: "#f59e0b", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                              {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                            </div>
                            <p style={{ margin: "0 0 0.6rem 0", fontSize: "0.85rem", color: "#334155", lineHeight: "1.4" }}>
                              "{rev.comment}"
                            </p>

                            {/* Reply Display or Reply Button */}
                            {rev.reply?.comment ? (
                              <div style={{ backgroundColor: "#f0fdf4", borderLeft: "3px solid #10b981", padding: "0.5rem 0.75rem", borderRadius: "4px", marginTop: "0.5rem" }}>
                                <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#047857" }}>Phản hồi từ quán:</span>
                                <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.8rem", color: "#166534" }}>{rev.reply.comment}</p>
                              </div>
                            ) : replyReviewId === rev._id ? (
                              <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.4rem" }}>
                                <input
                                  type="text"
                                  placeholder="Nhập nội dung phản hồi khách..."
                                  value={replyText}
                                  onChange={(e) => setReplyText(e.target.value)}
                                  style={{ flex: 1, padding: "0.4rem 0.65rem", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSendReply(rev._id)}
                                  style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", backgroundColor: "var(--merch-primary)", color: "#ffffff", border: "none", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer" }}
                                >
                                  Gửi
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReplyReviewId(null)}
                                  style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", backgroundColor: "#e2e8f0", color: "#475569", border: "none", fontSize: "0.8rem", cursor: "pointer" }}
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyReviewId(rev._id);
                                  setReplyText("");
                                }}
                                style={{ background: "none", border: "none", color: "var(--merch-primary)", fontSize: "0.78rem", fontWeight: "700", cursor: "pointer", padding: 0 }}
                              >
                                💬 Phản hồi đánh giá
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 6: 🎟️ KHUYẾN MÃI (PROMOTIONS)
                  ========================================================================= */}
              {activeTab === "promotions" && (
                <div>
                  <div className="merchant-card-box">
                    <div className="merchant-card-header" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
                      <div>
                        <h3 className="merchant-card-title">
                          <FaTicketAlt style={{ color: "var(--merch-primary)" }} /> Chương trình ưu đãi & Mã giảm giá ({coupons.length})
                        </h3>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                          Quản lý mã voucher kích cầu ẩm thực cho quán.
                        </p>
                      </div>

                      <button
                        type="button"
                        style={{ padding: "0.55rem 1.1rem", borderRadius: "8px", backgroundColor: "var(--merch-primary)", color: "#ffffff", border: "none", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                        onClick={() => setCouponModalOpen(true)}
                      >
                        <FaPlus size={12} /> Tạo mã voucher mới
                      </button>
                    </div>

                    {coupons.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
                        <FaTicketAlt size={36} style={{ color: "#cbd5e1", marginBottom: "0.75rem" }} />
                        <p style={{ margin: 0 }}>Chưa có mã giảm giá nào được tạo.</p>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                        {coupons.map((c) => (
                          <div
                            key={c._id}
                            style={{
                              padding: "1.25rem",
                              borderRadius: "12px",
                              border: `1px dashed ${c.isActive ? "var(--merch-primary)" : "#cbd5e1"}`,
                              backgroundColor: c.isActive ? "#fff7ed" : "#f8fafc",
                              display: "flex",
                              flexDirection: "column",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: c.isActive ? "var(--merch-primary)" : "#64748b", textTransform: "uppercase" }}>
                                {c.restaurantId === "PLATFORM" ? "Voucher Toàn Sàn" : "Voucher Quán"}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  fontWeight: "700",
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "6px",
                                  backgroundColor: c.isActive ? "#ecfdf5" : "#fee2e2",
                                  color: c.isActive ? "#047857" : "#b91c1c",
                                }}
                              >
                                {c.isActive ? "Đang áp dụng" : "Tạm dừng"}
                              </span>
                            </div>

                            <h4 style={{ margin: "0.4rem 0 0.2rem 0", fontSize: "1.2rem", fontWeight: "800", color: "#0f172a" }}>
                              {c.code}
                            </h4>
                            <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.8rem", color: "#475569", flex: 1 }}>
                              {c.description}
                            </p>

                            <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                Đã dùng: <strong>{c.usedCount || 0}</strong>/{c.usageLimit}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleCoupon(c._id)}
                                style={{
                                  padding: "0.3rem 0.65rem",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  border: "none",
                                  cursor: "pointer",
                                  backgroundColor: c.isActive ? "#fee2e2" : "#ecfdf5",
                                  color: c.isActive ? "#dc2626" : "#047857",
                                }}
                              >
                                {c.isActive ? "Tạm dừng mã" : "Kích hoạt lại"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 7: 📊 PHÂN TÍCH (ANALYTICS)
                  ========================================================================= */}
              {activeTab === "analytics" && (
                <div>
                  <div className="merchant-card-box">
                    <div className="merchant-card-header">
                      <h3 className="merchant-card-title">
                        <FaChartLine style={{ color: "#059669" }} /> Báo cáo doanh số & Món bán chạy
                      </h3>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                      <div style={{ padding: "1.25rem", backgroundColor: "#fafafa", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Giá trị trung bình đơn (AOV)</span>
                        <h3 style={{ margin: "0.35rem 0 0 0", fontSize: "1.5rem", fontWeight: "800", color: "var(--merch-primary)" }}>
                          {formatCurrency(orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0)}
                        </h3>
                      </div>
                      <div style={{ padding: "1.25rem", backgroundColor: "#fafafa", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Tỷ lệ giao hoàn tất</span>
                        <h3 style={{ margin: "0.35rem 0 0 0", fontSize: "1.5rem", fontWeight: "800", color: "#059669" }}>
                          {orders.length > 0 ? `${Math.round((completedOrders.length / orders.length) * 100)}%` : "—"}
                        </h3>
                      </div>
                    </div>

                    <h4 style={{ margin: "0 0 0.85rem 0", fontSize: "0.95rem" }}>Món ăn được đặt nhiều nhất</h4>
                    {topSellingItems.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "1.5rem", color: "#64748b", fontSize: "0.85rem", backgroundColor: "#fafafa", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                        Chưa có dữ liệu đặt món.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {topSellingItems.map((f, idx) => (
                          <div key={f.id || idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                            <div>
                              <span style={{ fontWeight: "700", marginRight: "0.5rem", color: "var(--merch-primary)" }}>#{idx + 1}</span>
                              <strong>{f.name}</strong>
                              <span style={{ marginLeft: "0.75rem", fontSize: "0.8rem", color: "#64748b" }}>({f.count} lượt đặt)</span>
                            </div>
                            <span style={{ fontWeight: "700", color: "var(--merch-primary)" }}>{formatCurrency(f.price)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* =========================================================================
                  TAB 8: 🔔 THÔNG BÁO (NOTIFICATIONS)
                  ========================================================================= */}
              {activeTab === "notifications" && (
                <div>
                  <div className="merchant-card-box">
                    <div className="merchant-card-header">
                      <h3 className="merchant-card-title">
                        <FaBell style={{ color: "var(--merch-primary)" }} /> Trung tâm thông báo ({notifications.length})
                      </h3>
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.8rem", fontWeight: "600", cursor: "pointer" }}
                        onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
                      >
                        Đánh dấu đã đọc
                      </button>
                    </div>

                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          backgroundColor: n.read ? "#ffffff" : "#fff7ed",
                          border: `1px solid ${n.read ? "#e2e8f0" : "#fed7aa"}`,
                          borderRadius: "10px",
                          padding: "1rem",
                          marginBottom: "0.75rem",
                          display: "flex",
                          gap: "0.75rem",
                        }}
                      >
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: n.type === "order" ? "#fff7ed" : "#f1f5f9", color: n.type === "order" ? "var(--merch-primary)" : "#64748b", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* =========================================================================
          MODALS
          ========================================================================= */}
      {/* 1. Add / Edit Food Modal */}
      <AdminModal
        isOpen={isFoodModalOpen}
        onClose={() => setFoodModalOpen(false)}
        title={isEditingFood ? "Chỉnh sửa món ăn" : "Thêm món ăn mới"}
        maxWidth="500px"
        footer={
          <>
            <button
              type="button"
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
              onClick={() => setFoodModalOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", backgroundColor: "var(--merch-primary)", color: "#ffffff", border: "none", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" }}
              onClick={handleSaveFoodItem}
            >
              {isEditingFood ? "Lưu thay đổi" : "Thêm vào thực đơn"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveFoodItem} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Tên món ăn *</label>
            <input
              type="text"
              required
              value={foodForm.name}
              onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
              style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
              placeholder="VD: Phở Bò Tái Lăn"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Mô tả món ăn</label>
            <textarea
              rows={3}
              value={foodForm.description}
              onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
              style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", resize: "none" }}
              placeholder="Thịt bò xào lăn thơm phức, nước dùng đậm đà truyền thống..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Giá bán (VNĐ) *</label>
              <input
                type="number"
                required
                min={0}
                step="any"
                value={foodForm.price}
                onChange={(e) => setFoodForm({ ...foodForm, price: e.target.value })}
                style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
                placeholder="VD: 65000"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Danh mục</label>
              <select
                value={foodForm.category}
                onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
                style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", backgroundColor: "#ffffff" }}
              >
                <option value="Phở & Bún">Phở & Bún</option>
                <option value="Cơm & Bánh Mì">Cơm & Bánh Mì</option>
                <option value="Pizza & Pasta">Pizza & Pasta</option>
                <option value="Lẩu & Nướng">Lẩu & Nướng</option>
                <option value="Đồ Ăn Nhanh">Đồ Ăn Nhanh</option>
                <option value="Đồ Uống">Đồ Uống</option>
                <option value="Tráng Miệng">Tráng Miệng</option>
              </select>
            </div>
          </div>

          <div>
            <ImageUploadPreview
              currentImageUrl={foodForm.image}
              onFileSelect={(file) => setFoodForm((prev) => ({ ...prev, imageFile: file, imageRemoved: false }))}
              onRemove={() => setFoodForm((prev) => ({ ...prev, imageFile: null, image: "", imageRemoved: true }))}
              label="Hình ảnh món ăn"
              type="food"
            />
            <div style={{ marginTop: "0.5rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "#94a3b8", marginBottom: "0.2rem" }}>Hoặc nhập liên kết hình ảnh (tùy chọn)</label>
              <input
                type="text"
                value={foodForm.imageFile ? "" : foodForm.image}
                disabled={!!foodForm.imageFile}
                onChange={(e) => setFoodForm({ ...foodForm, image: e.target.value, imageRemoved: false })}
                style={{ width: "100%", padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}
                placeholder="https://..."
              />
            </div>
          </div>
        </form>
      </AdminModal>

      {/* 2. Delete Confirmation Modal */}
      <AdminModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Xác nhận xóa món ăn"
        maxWidth="440px"
        footer={
          <>
            <button
              type="button"
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
              onClick={() => setDeleteModalOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", backgroundColor: "#dc2626", color: "#ffffff", border: "none", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" }}
              onClick={handleConfirmDeleteFood}
            >
              Xác nhận xóa
            </button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", lineHeight: "1.5" }}>
          Bạn có chắc chắn muốn xóa món <strong>{foodToDelete?.name}</strong> khỏi thực đơn của quán không? Hành động này không thể hoàn tác.
        </p>
      </AdminModal>

      {/* 3. Order Details Modal */}
      <AdminModal
        isOpen={isOrderDetailOpen}
        onClose={() => setOrderDetailOpen(false)}
        title={`Chi tiết đơn hàng #${selectedOrder?._id?.slice(-6) || selectedOrder?.orderId}`}
        maxWidth="540px"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <div>
              {selectedOrder?.status === "Pending" && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    style={{ padding: "0.5rem 1rem", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" }}
                    onClick={() => {
                      setOrderDetailOpen(false);
                      handleOpenRejectModal(selectedOrder);
                    }}
                  >
                    Từ chối đơn
                  </button>
                  <button
                    type="button"
                    style={{ padding: "0.5rem 1rem", borderRadius: "6px", backgroundColor: "var(--merch-primary)", color: "#ffffff", border: "none", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" }}
                    onClick={async () => {
                      await handleUpdateOrderStatus(selectedOrder._id, "Confirmed");
                      setOrderDetailOpen(false);
                    }}
                  >
                    Xác nhận đơn
                  </button>
                </div>
              )}
              {selectedOrder?.status === "Confirmed" && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button"
                    style={{ padding: "0.5rem 1rem", borderRadius: "6px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" }}
                    onClick={() => {
                      setOrderDetailOpen(false);
                      handleOpenRejectModal(selectedOrder);
                    }}
                  >
                    Hủy đơn
                  </button>
                  <button
                    type="button"
                    style={{ padding: "0.5rem 1rem", borderRadius: "6px", backgroundColor: "#2563eb", color: "#ffffff", border: "none", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer" }}
                    onClick={async () => {
                      await handleUpdateOrderStatus(selectedOrder._id, "Preparing");
                      setOrderDetailOpen(false);
                    }}
                  >
                    Bắt đầu làm món
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", backgroundColor: "#0f172a", color: "#ffffff", border: "none", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" }}
              onClick={() => setOrderDetailOpen(false)}
            >
              Đóng
            </button>
          </div>
        }
      >
        {selectedOrder && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
              <span style={{ color: "#64748b" }}>Khách hàng:</span>
              <strong style={{ color: "#0f172a" }}>{selectedOrder.customerName || selectedOrder.customerId || "Khách Hàng"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
              <span style={{ color: "#64748b" }}>Địa chỉ giao:</span>
              <strong style={{ color: "#0f172a", textAlign: "right", maxWidth: "300px" }}>{selectedOrder.deliveryAddress || "Chưa có địa chỉ"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
              <span style={{ color: "#64748b" }}>Thanh toán:</span>
              <strong style={{ color: "#0f172a" }}>
                {selectedOrder.paymentMethod === "BANK_TRANSFER" ? "Chuyển khoản (MB Bank)" : (selectedOrder.paymentMethod || "COD")} ({selectedOrder.paymentStatus === "Completed" ? "Đã thanh toán" : selectedOrder.paymentStatus === "Failed" ? "Thất bại/Đã hủy" : "Chờ thanh toán"})
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.6rem" }}>
              <span style={{ color: "#64748b" }}>Trạng thái:</span>
              <span style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: "700",
                backgroundColor: selectedOrder.status === "Delivered" ? "#ecfdf5" : selectedOrder.status === "Preparing" ? "#eff6ff" : selectedOrder.status === "Confirmed" ? "#f0fdf4" : selectedOrder.status === "Canceled" ? "#fef2f2" : "#fff7ed",
                color: selectedOrder.status === "Delivered" ? "#047857" : selectedOrder.status === "Preparing" ? "#2563eb" : selectedOrder.status === "Confirmed" ? "#16a34a" : selectedOrder.status === "Canceled" ? "#dc2626" : "#ea580c"
              }}>
                {selectedOrder.status === "Pending" ? "Chờ xác nhận" : selectedOrder.status === "Confirmed" ? "Đã xác nhận" : selectedOrder.status === "Preparing" ? "Đang chuẩn bị" : selectedOrder.status === "Out for Delivery" ? "Đang giao" : selectedOrder.status === "Delivered" ? "Đã giao" : "Đã hủy"}
              </span>
            </div>

            {selectedOrder.status === "Canceled" && (
              <div style={{ padding: "0.75rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#dc2626", fontWeight: "700", marginBottom: "0.25rem" }}>
                  <FaExclamationTriangle size={14} /> Thông tin hủy đơn:
                </div>
                <div style={{ fontSize: "0.82rem", color: "#991b1b" }}>
                  <strong>Lý do:</strong> {selectedOrder.cancellationReason || "Không nêu lý do"}
                </div>
                {selectedOrder.cancelledBy && (
                  <div style={{ fontSize: "0.82rem", color: "#991b1b" }}>
                    <strong>Hủy bởi:</strong> {selectedOrder.cancelledBy}
                  </div>
                )}
                {selectedOrder.cancelledAt && (
                  <div style={{ fontSize: "0.82rem", color: "#991b1b" }}>
                    <strong>Thời gian:</strong> {new Date(selectedOrder.cancelledAt).toLocaleString("vi-VN")}
                  </div>
                )}
              </div>
            )}

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.6rem" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#64748b", display: "block", marginBottom: "0.4rem" }}>Danh sách món:</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                      <span>{item.name} <span style={{ color: "#94a3b8" }}>x{item.quantity}</span></span>
                      <strong style={{ color: "#0f172a" }}>{formatCurrency((item.price || 0) * (item.quantity || 1))}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: "800", borderTop: "2px solid #f1f5f9", paddingTop: "0.75rem" }}>
              <span>Tổng tiền thanh toán:</span>
              <span style={{ color: "var(--merch-primary)" }}>{formatCurrency(selectedOrder.totalPrice || 0)}</span>
            </div>
          </div>
        )}
      </AdminModal>

      {/* 3.1 Reject / Cancel Order Modal */}
      <AdminModal
        isOpen={isRejectModalOpen}
        onClose={() => !isSubmittingReject && setRejectModalOpen(false)}
        title={`Từ chối / Hủy đơn hàng #${orderToReject?._id?.slice(-6) || orderToReject?.orderId}`}
        maxWidth="480px"
        footer={
          <>
            <button
              type="button"
              disabled={isSubmittingReject}
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
              onClick={() => setRejectModalOpen(false)}
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={isSubmittingReject}
              style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", backgroundColor: "#dc2626", color: "#ffffff", border: "none", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
              onClick={handleConfirmReject}
            >
              {isSubmittingReject ? "Đang xử lý..." : "Xác nhận từ chối / hủy"}
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#334155", lineHeight: "1.5" }}>
            Bạn đang từ chối hoặc hủy đơn hàng <strong>#{orderToReject?._id?.slice(-6)}</strong> của khách hàng <strong>{orderToReject?.customerName || orderToReject?.customerId}</strong> (Tổng tiền: <strong>{formatCurrency(orderToReject?.totalPrice || 0)}</strong>).
          </p>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>
              Lý do từ chối / hủy đơn *
            </label>
            <select
              value={rejectReasonPreset}
              onChange={(e) => setRejectReasonPreset(e.target.value)}
              style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", backgroundColor: "#ffffff" }}
            >
              <option value="Hết món / nguyên liệu chế biến">Quán hết món hoặc nguyên liệu chế biến</option>
              <option value="Quán đang quá tải, không kịp chuẩn bị">Quán đang quá tải, không kịp chuẩn bị món</option>
              <option value="Quán sắp đến giờ đóng cửa">Quán sắp đến giờ đóng cửa</option>
              <option value="Không liên lạc được với khách hàng">Không liên lạc được với khách hàng để xác nhận</option>
              <option value="Khách hàng yêu cầu hủy đơn">Khách hàng liên hệ yêu cầu hủy đơn</option>
              <option value="Lý do khác">Lý do khác (Nhập chi tiết bên dưới)</option>
            </select>
          </div>

          {rejectReasonPreset === "Lý do khác" && (
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>
                Chi tiết lý do khác *
              </label>
              <textarea
                rows={3}
                value={rejectReasonCustom}
                onChange={(e) => setRejectReasonCustom(e.target.value)}
                style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", resize: "none" }}
                placeholder="Nhập lý do cụ thể..."
              />
            </div>
          )}
        </div>
      </AdminModal>

      {/* 4. Create Coupon Modal */}
      <AdminModal
        isOpen={isCouponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title="Tạo mã khuyến mãi / Voucher mới"
        maxWidth="480px"
        footer={
          <>
            <button
              type="button"
              style={{ padding: "0.5rem 1rem", borderRadius: "6px", backgroundColor: "#f1f5f9", color: "#475569", border: "none", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer" }}
              onClick={() => setCouponModalOpen(false)}
            >
              Hủy
            </button>
            <button
              type="button"
              style={{ padding: "0.5rem 1.25rem", borderRadius: "6px", backgroundColor: "var(--merch-primary)", color: "#ffffff", border: "none", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" }}
              onClick={handleSaveCoupon}
            >
              Tạo mã voucher
            </button>
          </>
        }
      >
        <form onSubmit={handleSaveCoupon} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Mã Voucher *</label>
            <input
              type="text"
              required
              placeholder="VD: QUANNGON20K"
              value={couponForm.code}
              onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
              style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "700" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Mô tả chương trình</label>
            <input
              type="text"
              placeholder="VD: Giảm 20.000 ₫ cho hóa đơn từ 120.000 ₫"
              value={couponForm.description}
              onChange={(e) => setCouponForm({ ...couponForm, description: e.target.value })}
              style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Loại ưu đãi</label>
              <select
                value={couponForm.discountType}
                onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
                style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", backgroundColor: "#ffffff" }}
              >
                <option value="fixed">Giảm tiền mặt (VNĐ)</option>
                <option value="percentage">Giảm theo %</option>
                <option value="shipping">Miễn phí vận chuyển</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Giá trị giảm *</label>
              <input
                type="number"
                required
                min={0}
                placeholder="VD: 20000 hoặc 10"
                value={couponForm.discountValue}
                onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
                style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Đơn tối thiểu (VNĐ)</label>
              <input
                type="number"
                min={0}
                placeholder="VD: 100000"
                value={couponForm.minOrderValue}
                onChange={(e) => setCouponForm({ ...couponForm, minOrderValue: e.target.value })}
                style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#64748b", marginBottom: "0.3rem" }}>Giới hạn lượt dùng</label>
              <input
                type="number"
                min={1}
                value={couponForm.usageLimit}
                onChange={(e) => setCouponForm({ ...couponForm, usageLimit: e.target.value })}
                style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem" }}
              />
            </div>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
