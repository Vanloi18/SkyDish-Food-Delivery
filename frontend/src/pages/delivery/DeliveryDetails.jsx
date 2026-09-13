import { API_URLS } from '../../config/api';
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  FaArrowLeft, 
  FaBoxOpen, 
  FaMapMarkerAlt, 
  FaCheckCircle
} from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";

export default function DeliveryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchDelivery = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("driverToken") || localStorage.getItem("token");
      const res = await axios.get(`${API_URLS.DELIVERY}/api/delivery/${id}`, {
        headers: { Authorization: token },
      });
      setDelivery(res.data?.delivery || res.data);
    } catch (err) {
      console.error("Error fetching delivery details:", err);
      setError("Không thể tải thông tin chi tiết đơn giao hàng.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchDelivery();
  }, [id, fetchDelivery]);

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem("driverToken") || localStorage.getItem("token");
      await axios.put(
        `${API_URLS.DELIVERY}/api/delivery/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: token } }
      );
      fetchDelivery();
    } catch (err) {
      setError("Lỗi khi cập nhật trạng thái");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              type="button"
              onClick={() => navigate("/delivery/dashboard")}
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
              <FaArrowLeft size={12} /> Quay lại Bảng điều khiển Shipper
            </button>
          </div>

          {loading ? (
            <div style={{ maxWidth: "680px", margin: "0 auto" }}>
              <LoadingSkeleton type="card" count={1} height="280px" />
            </div>
          ) : error || !delivery ? (
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <EmptyState
                icon={FaBoxOpen}
                title="Không tìm thấy đơn giao hàng"
                description={error || "Không thể tìm thấy thông tin đơn giao hàng."}
                actionLabel="Quay lại Bảng điều khiển"
                onAction={() => navigate("/delivery/dashboard")}
              />
            </div>
          ) : (
            <div style={{ maxWidth: "720px", margin: "0 auto" }}>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--sd-radius-xl)",
                  border: "1px solid var(--sd-border)",
                  padding: "2.5rem 2rem",
                  boxShadow: "var(--sd-shadow-sm)",
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
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "var(--sd-radius-md)",
                        backgroundColor: "#ecfdf5",
                        color: "#10b981",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <FaBoxOpen size={22} />
                    </div>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "var(--sd-font-size-xl)", fontWeight: "800" }}>
                        Chi tiết đơn giao hàng
                      </h2>
                      <span style={{ fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                        Mã chuyến: {delivery._id}
                      </span>
                    </div>
                  </div>

                  <Badge variant="primary" size="md">
                    {delivery.status || "Đã phân công"}
                  </Badge>
                </div>

                {/* Details Breakdown */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1.5rem",
                    marginBottom: "2rem",
                  }}
                >
                  <div style={{ backgroundColor: "var(--sd-bg-muted)", padding: "1.25rem", borderRadius: "var(--sd-radius-lg)" }}>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)" }}>
                      Mã đơn hàng liên kết
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--sd-font-size-base)", fontWeight: "700", color: "var(--sd-text-primary)" }}>
                      {delivery.orderId}
                    </p>
                  </div>

                  <div style={{ backgroundColor: "var(--sd-bg-muted)", padding: "1.25rem", borderRadius: "var(--sd-radius-lg)" }}>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)" }}>
                      Tên / Mã khách hàng
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--sd-font-size-base)", fontWeight: "700", color: "var(--sd-text-primary)" }}>
                      {delivery.customerId}
                    </p>
                  </div>

                  <div style={{ gridColumn: "1 / -1", backgroundColor: "var(--sd-bg-muted)", padding: "1.25rem", borderRadius: "var(--sd-radius-lg)" }}>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)" }}>
                      Địa chỉ lấy món ăn
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--sd-font-size-sm)", fontWeight: "600", color: "var(--sd-text-primary)" }}>
                      <FaMapMarkerAlt style={{ color: "#3b82f6" }} /> {delivery.pickupAddressString || delivery.pickupAddress || "Nhà hàng đối tác"}
                    </p>
                  </div>

                  <div style={{ gridColumn: "1 / -1", backgroundColor: "var(--sd-bg-muted)", padding: "1.25rem", borderRadius: "var(--sd-radius-lg)" }}>
                    <p style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)" }}>
                      Địa chỉ giao đến cho khách
                    </p>
                    <p style={{ margin: 0, fontSize: "var(--sd-font-size-sm)", fontWeight: "600", color: "var(--sd-primary)" }}>
                      <FaMapMarkerAlt style={{ color: "var(--sd-primary)" }} /> {delivery.deliveryAddressString || delivery.deliveryAddress || "Địa chỉ của khách"}
                    </p>
                  </div>
                </div>

                {/* Status Transition Buttons */}
                <div style={{ borderTop: "1px solid var(--sd-border)", paddingTop: "1.5rem" }}>
                  <h4 style={{ fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)", marginBottom: "1rem" }}>
                    Cập nhật tiến trình giao hàng
                  </h4>

                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    {delivery.status === "assigned" && (
                      <Button
                        variant="primary"
                        loading={updating}
                        onClick={() => handleUpdateStatus("To be delivered")}
                      >
                        Nhận đơn giao hàng
                      </Button>
                    )}

                    {delivery.status === "To be delivered" && (
                      <Button
                        variant="secondary"
                        loading={updating}
                        onClick={() => handleUpdateStatus("Picked-up")}
                      >
                        Xác nhận đã lấy món ăn từ nhà bếp
                      </Button>
                    )}

                    {delivery.status === "Picked-up" && (
                      <Button
                        variant="success"
                        loading={updating}
                        icon={FaCheckCircle}
                        onClick={() => handleUpdateStatus("Delivered")}
                      >
                        Xác nhận đã giao tận tay khách hàng
                      </Button>
                    )}

                    {delivery.status === "Delivered" && (
                      <div style={{ color: "var(--sd-success)", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FaCheckCircle /> Đơn hàng này đã được hoàn thành xuất sắc.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
