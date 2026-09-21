import { API_URLS } from '../config/api';
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { BsFilePdf } from "react-icons/bs";
import { 
  FaArrowLeft, 
  FaMapMarkerAlt, 
  FaReceipt, 
  FaCheckCircle,
  FaStar,
  FaTimes,
  FaMotorcycle
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import Header from "./Header";
import Footer from "./Footer";
import Button from "./common/Button";
import LoadingSkeleton from "./common/LoadingSkeleton";
import EmptyState from "./common/EmptyState";
import { formatCurrency } from "../utils/currency";

function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Review states
  const [isReviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [existingReview, setExistingReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMsg, setReviewMsg] = useState({ type: "", text: "" });

  const checkExistingReview = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URLS.RESTAURANT}/api/reviews/order/${id}`);
      if (res.data.reviewed) {
        setExistingReview(res.data.review);
      }
    } catch (e) {
      console.warn("Could not check review:", e.message);
    }
  }, [id]);

  useEffect(() => {
    const fetchOrder = async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`${API_URLS.ORDER}/api/orders/${id}`, { headers });
        setOrder(res.data);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError("Không thể tải chi tiết đơn hàng. Vui lòng kiểm tra lại mã đơn.");
      } finally {
        if (!silent) setLoading(false);
      }
    };

    let refreshTimer;
    if (id) {
      fetchOrder();
      checkExistingReview();
      refreshTimer = window.setInterval(() => fetchOrder(true), 15000);
    }

    return () => window.clearInterval(refreshTimer);
  }, [id, checkExistingReview]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      setReviewMsg({ type: "error", text: "Vui lòng nhập nhận xét của bạn." });
      return;
    }
    setReviewLoading(true);
    setReviewMsg({ type: "", text: "" });
    try {
      // Find restaurantId by querying restaurant name or using order.restaurantId
      let rId = order.restaurantId;
      try {
        const rList = await axios.get(`${API_URLS.RESTAURANT}/api/restaurant`);
        const found = rList.data?.find((r) => r.name === order.restaurantId || r._id === order.restaurantId);
        if (found) rId = found._id;
        else if (rList.data?.[0]?._id) rId = rList.data[0]._id;
      } catch (e) {}

      const custName = localStorage.getItem("customerName") || order.customerId || "Khách hàng";
      const custId = localStorage.getItem("customerId") || localStorage.getItem("customerEmail") || "customer_1";

      const res = await axios.post(`${API_URLS.RESTAURANT}/api/reviews`, {
        orderId: id,
        customerId: custId,
        customerName: custName,
        restaurantId: rId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      setExistingReview(res.data.review);
      setReviewMsg({ type: "success", text: "Cảm ơn bạn đã gửi đánh giá!" });
      setTimeout(() => {
        setReviewModalOpen(false);
      }, 1500);
    } catch (err) {
      setReviewMsg({ type: "error", text: err.response?.data?.message || "Lỗi gửi đánh giá." });
    } finally {
      setReviewLoading(false);
    }
  };

  const generatePDF = () => {
    if (!order) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Brand Header
    doc.setFillColor(255, 87, 34); // SkyDish primary orange
    doc.rect(0, 0, pageWidth, 24, "F");

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("SkyDish Food Delivery — Official Invoice", pageWidth / 2, 16, { align: "center" });

    // Order Info Section
    let currentY = 38;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`Order ID: ${order._id}`, 20, currentY);

    currentY += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Date Placed: ${order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString()}`, 20, currentY);
    doc.text(`Status: ${order.status || "Confirmed"}`, pageWidth - 60, currentY);

    currentY += 6;
    const pmDisplay = order.paymentMethod === "BANK_TRANSFER"
      ? "Bank Transfer (MB Bank - 0932366523)"
      : (order.paymentMethod || "COD");
    doc.text(`Payment Method: ${pmDisplay}`, 20, currentY);
    doc.text(`Payment Status: ${order.paymentStatus || "Pending"}`, pageWidth - 60, currentY);

    currentY += 8;
    doc.setDrawColor(226, 232, 240);
    doc.line(20, currentY, pageWidth - 20, currentY);

    currentY += 10;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Customer Name: ${order.customerId}`, 20, currentY);
    doc.text(`Restaurant: ${order.restaurantId}`, pageWidth - 90, currentY);

    currentY += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`Delivery Address: ${order.deliveryAddress}`, 20, currentY);

    currentY += 14;
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(20, currentY, pageWidth - 40, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Item / Dish", 25, currentY + 6);
    doc.text("Qty", 120, currentY + 6);
    doc.text("Price (VND)", 145, currentY + 6);
    doc.text("Total (VND)", pageWidth - 45, currentY + 6);

    currentY += 12;
    doc.setFont("helvetica", "normal");

    order.items?.forEach((item) => {
      const itemPrice = Number(item.price) || 0;
      const itemQty = item.quantity || 1;
      const total = itemPrice * itemQty;

      doc.text(String(item.foodId || "Food Item"), 25, currentY);
      doc.text(String(itemQty), 125, currentY);
      doc.text(Number(itemPrice).toLocaleString("vi-VN"), 145, currentY);
      doc.text(Number(total).toLocaleString("vi-VN"), pageWidth - 45, currentY);
      currentY += 8;
    });

    currentY += 6;
    doc.line(20, currentY, pageWidth - 20, currentY);
    currentY += 10;

    // Total Due
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 87, 34);
    doc.text(`Total Amount: ${Number(order.totalPrice || 0).toLocaleString("vi-VN")} VND`, pageWidth - 80, currentY);

    // Footer note
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for ordering with SkyDish Food Delivery Platform.", pageWidth / 2, doc.internal.pageSize.height - 15, { align: "center" });

    doc.save(`SkyDish_Invoice_${order._id}.pdf`);
  };

  const steps = ["Chờ xử lý", "Đã xác nhận", "Đang chuẩn bị", "Đang giao hàng", "Đã giao hàng"];
  const currentStatus = order?.status || "Pending";
  const mapStatusToIdx = {
    pending: 0,
    confirmed: 1,
    preparing: 2,
    "out for delivery": 3,
    delivering: 3,
    delivered: 4,
  };
  const currentStepIdx = mapStatusToIdx[currentStatus.toLowerCase()] ?? 0;
  const isCancelled = currentStatus.toLowerCase().includes("cancel");
  const deliveryPartner = order?.deliveryPartner || order?.driver || order?.shipper || order?.delivery?.driver;
  const deliveryPartnerName = typeof deliveryPartner === "object"
    ? (deliveryPartner.name || deliveryPartner.fullName || deliveryPartner.driverName || "")
    : "";
  const deliveryPartnerPhone = typeof deliveryPartner === "object"
    ? (deliveryPartner.phone || deliveryPartner.phoneNumber || deliveryPartner.contactNumber || "")
    : "";

  return (
    <div className="customer-experience order-details-experience" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main className="order-details-main" style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              type="button"
              className="order-details-back-link"
              onClick={() => navigate("/orders")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 0.85rem",
                backgroundColor: "#ffffff",
                border: "1px solid var(--sd-border)",
                borderRadius: "var(--sd-radius-full)",
                color: "var(--sd-text-primary)",
                fontSize: "var(--sd-font-size-xs)",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <FaArrowLeft size={12} /> Quay lại danh sách đơn hàng
            </button>
          </div>

          {loading ? (
            <div style={{ maxWidth: "750px", margin: "0 auto" }}>
              <LoadingSkeleton type="text" count={3} />
              <LoadingSkeleton type="card" count={1} height="200px" style={{ marginTop: "1rem" }} />
            </div>
          ) : error || !order ? (
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <EmptyState
                icon={FaReceipt}
                title="Không tìm thấy đơn hàng"
                description={error || "Không thể tìm thấy thông tin đơn hàng được yêu cầu."}
                actionLabel="Quay lại danh sách đơn hàng"
                onAction={() => navigate("/orders")}
              />
            </div>
          ) : (
            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
              {/* Main Card */}
              <motion.div
                className="order-details-card"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--sd-radius-xl)",
                  border: "1px solid var(--sd-border)",
                  boxShadow: "var(--sd-shadow-md)",
                  padding: "2.5rem 2rem",
                }}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                    paddingBottom: "1.5rem",
                    borderBottom: "1px solid var(--sd-border)",
                    marginBottom: "2rem",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "var(--sd-font-size-xs)",
                        fontWeight: "700",
                        color: "var(--sd-primary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Đơn hàng SkyDish đã xác nhận
                    </span>
                    <h2 style={{ margin: "0.25rem 0", fontSize: "var(--sd-font-size-2xl)", fontWeight: "800" }}>
                      Mã đơn #{order._id?.slice(-8) || order._id}
                    </h2>
                    <p style={{ margin: 0, fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                      Đặt lúc: {order.createdAt ? new Date(order.createdAt).toLocaleString() : "Gần đây"}
                      {lastUpdated && ` · Cập nhật ${lastUpdated.toLocaleTimeString("vi-VN")}`}
                    </p>
                  </div>

                  <Button variant="primary" icon={BsFilePdf} onClick={generatePDF}>
                    Tải hóa đơn PDF
                  </Button>
                </div>

                {/* Status Timeline Stepper */}
                <div style={{ marginBottom: "2.5rem" }}>
                  <h4 style={{ fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)", marginBottom: "1rem" }}>
                    Tiến trình giao hàng
                  </h4>
                  {isCancelled && (
                    <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", borderRadius: "var(--sd-radius-md)", backgroundColor: "var(--sd-danger-light)", color: "var(--sd-danger-hover)", fontSize: "var(--sd-font-size-sm)", fontWeight: "600" }}>
                      Đơn hàng này đã được hủy và không còn được giao.
                    </div>
                  )}
                  <div
                    className="order-tracking-timeline"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      position: "relative",
                      gap: "0.5rem",
                      overflowX: "auto",
                      padding: "0.5rem 0",
                    }}
                  >
                    {steps.map((stepName, sIdx) => {
                      const isCompleted = sIdx <= currentStepIdx;
                      return (
                        <div key={stepName} className={`order-tracking-step ${isCompleted ? "is-complete" : ""}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "90px", textAlign: "center" }}>
                          <div
                            className="order-tracking-marker"
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: isCompleted ? "var(--sd-success)" : "var(--sd-bg-muted)",
                              color: isCompleted ? "#ffffff" : "var(--sd-text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "700",
                              fontSize: "0.85rem",
                              marginBottom: "0.4rem",
                              boxShadow: isCompleted ? "0 2px 6px rgba(16, 185, 129, 0.3)" : "none",
                              transition: "all var(--sd-transition-fast)",
                            }}
                          >
                            {isCompleted ? <FaCheckCircle size={16} /> : sIdx + 1}
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: isCompleted ? "700" : "500", color: isCompleted ? "var(--sd-text-primary)" : "var(--sd-text-muted)" }}>
                            {stepName}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Details Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1.5rem",
                    backgroundColor: "var(--sd-bg-muted)",
                    padding: "1.25rem",
                    borderRadius: "var(--sd-radius-lg)",
                    marginBottom: "2rem",
                  }}
                >
                  <div>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "600", color: "var(--sd-text-muted)" }}>
                      Tên khách hàng
                    </p>
                    <p style={{ margin: 0, fontWeight: "700", color: "var(--sd-text-primary)" }}>
                      {order.customerId}
                    </p>
                  </div>

                  <div>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "600", color: "var(--sd-text-muted)" }}>
                      Đối tác nhà hàng
                    </p>
                    <p style={{ margin: 0, fontWeight: "700", color: "var(--sd-text-primary)" }}>
                              {order.restaurantName || order.restaurant?.name || order.restaurantId || "Nhà hàng đối tác SkyDish"}
                    </p>
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "600", color: "var(--sd-text-muted)" }}>
                      Địa chỉ nhận hàng
                    </p>
                    <p style={{ margin: 0, fontWeight: "600", color: "var(--sd-text-primary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <FaMapMarkerAlt style={{ color: "var(--sd-primary)" }} /> {order.deliveryAddress}
                    </p>
                  </div>

                  {deliveryPartnerName && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "600", color: "var(--sd-text-muted)" }}>
                        Đối tác giao hàng
                      </p>
                      <p style={{ margin: 0, fontWeight: "600", color: "var(--sd-text-primary)", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                        <FaMotorcycle style={{ color: "var(--sd-primary)" }} /> {deliveryPartnerName}
                        {deliveryPartnerPhone && <span style={{ color: "var(--sd-text-secondary)", fontWeight: "500" }}>· {deliveryPartnerPhone}</span>}
                      </p>
                    </div>
                  )}

                  <div>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "600", color: "var(--sd-text-muted)" }}>
                      Phương thức thanh toán
                    </p>
                    <p style={{ margin: 0, fontWeight: "700", color: "var(--sd-text-primary)" }}>
                      {order.paymentMethod === "BANK_TRANSFER"
                        ? "Chuyển khoản Ngân hàng (MB Bank)"
                        : order.paymentMethod === "VNPAY"
                        ? "Cổng VNPay"
                        : order.paymentMethod === "MOMO"
                        ? "Ví MoMo"
                        : order.paymentMethod === "STRIPE"
                        ? "Thẻ Quốc tế"
                        : (order.paymentMethod || "COD")}
                    </p>
                  </div>

                  <div>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "600", color: "var(--sd-text-muted)" }}>
                      Trạng thái thanh toán
                    </p>
                    <p style={{ margin: 0, fontWeight: "700", color: order.paymentStatus === "Paid" ? "var(--sd-success)" : "var(--sd-warning)" }}>
                      {order.paymentStatus === "Paid" ? "✓ Đã thanh toán" : "⏳ Chờ xác nhận"}
                    </p>
                  </div>
                </div>

                {/* Itemized Receipt Table */}
                <div style={{ marginBottom: "2rem" }}>
                  <h4 style={{ fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)", marginBottom: "0.75rem" }}>
                    Bảng kê chi tiết món ăn
                  </h4>

                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--sd-border)", textAlign: "left" }}>
                        <th style={{ padding: "0.75rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", color: "var(--sd-text-secondary)" }}>Tên món ăn</th>
                        <th style={{ padding: "0.75rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", color: "var(--sd-text-secondary)", textAlign: "center" }}>Số lượng</th>
                        <th style={{ padding: "0.75rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", color: "var(--sd-text-secondary)", textAlign: "right" }}>Đơn giá</th>
                        <th style={{ padding: "0.75rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", color: "var(--sd-text-secondary)", textAlign: "right" }}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--sd-border)" }}>
                          <td style={{ padding: "0.75rem 0", fontWeight: "600" }}>{item.name || item.foodId}</td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>{item.quantity}</td>
                          <td style={{ padding: "0.75rem", textAlign: "right" }}>{formatCurrency(item.price)}</td>
                          <td style={{ padding: "0.75rem 0", textAlign: "right", fontWeight: "700" }}>
                            {formatCurrency(Number(item.price) * Number(item.quantity))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary row */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      paddingTop: "1.25rem",
                      gap: "2rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: "var(--sd-font-size-base)", fontWeight: "700", color: "var(--sd-text-secondary)" }}>
                      Tổng thanh toán:
                    </span>
                    <span style={{ fontSize: "var(--sd-font-size-2xl)", fontWeight: "800", color: "var(--sd-primary)" }}>
                      {formatCurrency(order.totalPrice)}
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div
                  style={{
                    paddingTop: "1.5rem",
                    borderTop: "1px solid var(--sd-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link to={`/orders/edit/${order._id}`}>
                      <Button variant="secondary" size="sm">
                        Chỉnh sửa đơn hàng
                      </Button>
                    </Link>

                    {/* Review Button for Delivered / Completed orders */}
                    {order.status === "Delivered" && (
                      <Button
                        type="button"
                        variant={existingReview ? "outline" : "primary"}
                        size="sm"
                        icon={FaStar}
                        onClick={() => setReviewModalOpen(true)}
                      >
                        {existingReview ? `Đã đánh giá (${existingReview.rating}⭐)` : "Đánh giá đơn hàng"}
                      </Button>
                    )}
                  </div>

                  <Link to="/customer/home">
                    <Button variant="primary" size="sm">
                      Đặt thêm món khác
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* REVIEW MODAL */}
        {isReviewModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "1.75rem",
                width: "100%",
                maxWidth: "460px",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
                  ⭐ Đánh giá đơn hàng #{order?._id?.slice(-6) || id}
                </h3>
                <FaTimes
                  size={16}
                  style={{ cursor: "pointer", color: "#94a3b8" }}
                  onClick={() => setReviewModalOpen(false)}
                />
              </div>

              {existingReview ? (
                <div>
                  <div style={{ textAlign: "center", padding: "1rem 0" }}>
                    <div style={{ fontSize: "1.75rem", color: "#f59e0b", marginBottom: "0.5rem" }}>
                      {"★".repeat(existingReview.rating)}{"☆".repeat(5 - existingReview.rating)}
                    </div>
                    <p style={{ margin: "0 0 0.5rem 0", fontWeight: "600", color: "#0f172a" }}>
                      "{existingReview.comment}"
                    </p>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Đã đánh giá vào {new Date(existingReview.createdAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  <div style={{ marginTop: "1rem", textAlign: "right" }}>
                    <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                      Đóng
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview}>
                  <div style={{ marginBottom: "1.25rem", textAlign: "center" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#64748b", marginBottom: "0.5rem" }}>
                      Chất lượng món ăn & phục vụ
                    </label>
                    <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FaStar
                          key={star}
                          size={28}
                          style={{
                            cursor: "pointer",
                            color: star <= reviewRating ? "#f59e0b" : "#e2e8f0",
                            transition: "color 0.15s ease",
                          }}
                          onClick={() => setReviewRating(star)}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#475569", marginBottom: "0.4rem" }}>
                      Chia sẻ cảm nhận của bạn *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Món ăn có hợp khẩu vị, đóng gói sạch sẽ và giao đúng giờ không..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.85rem",
                        resize: "none",
                        outline: "none",
                      }}
                    />
                  </div>

                  {reviewMsg.text && (
                    <div
                      style={{
                        marginBottom: "1rem",
                        padding: "0.5rem 0.75rem",
                        borderRadius: "6px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        backgroundColor: reviewMsg.type === "success" ? "#ecfdf5" : "#fef2f2",
                        color: reviewMsg.type === "success" ? "#047857" : "#b91c1c",
                      }}
                    >
                      {reviewMsg.text}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                    <Button variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
                      Hủy
                    </Button>
                    <Button type="submit" variant="primary" size="sm" disabled={reviewLoading}>
                      {reviewLoading ? "Đang gửi..." : "Gửi đánh giá"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default OrderDetails;
