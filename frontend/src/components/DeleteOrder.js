import { API_URLS } from '../config/api';
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowLeft, FaExclamationTriangle, FaTrashAlt } from "react-icons/fa";
import Header from "./Header";
import Footer from "./Footer";
import Button from "./common/Button";
import LoadingSkeleton from "./common/LoadingSkeleton";
import EmptyState from "./common/EmptyState";
import { formatCurrency } from "../utils/currency";

function DeleteOrder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`${API_URLS.ORDER}/api/orders/${id}`, { headers });
        setOrder(res.data);
      } catch (err) {
        console.error("Error fetching order for deletion:", err);
        setError("Không tìm thấy đơn hàng hoặc đơn hàng đã bị hủy.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.delete(`${API_URLS.ORDER}/api/orders/${id}`, { headers });
      navigate("/orders");
    } catch (err) {
      console.error("Error canceling order:", err);
      alert("Không thể hủy đơn hàng. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          <div style={{ maxWidth: "540px", margin: "0 auto" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <button
                type="button"
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
              <LoadingSkeleton type="card" count={1} height="200px" />
            ) : error || !order ? (
              <EmptyState
                icon={FaExclamationTriangle}
                title="Không tìm thấy đơn hàng"
                description={error || "Không thể tìm thấy thông tin đơn hàng."}
                actionLabel="Quay lại danh sách đơn hàng"
                onAction={() => navigate("/orders")}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--sd-radius-xl)",
                  border: "1px solid var(--sd-border)",
                  padding: "2.5rem 2rem",
                  boxShadow: "var(--sd-shadow-md)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "var(--sd-danger-light)",
                    color: "var(--sd-danger)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1.25rem",
                  }}
                >
                  <FaExclamationTriangle size={24} />
                </div>

                <h2 style={{ fontSize: "var(--sd-font-size-xl)", fontWeight: "800", marginBottom: "0.5rem" }}>
                  Xác nhận hủy đơn hàng
                </h2>
                <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", marginBottom: "1.75rem" }}>
                  Bạn có chắc chắn muốn hủy đơn hàng này không? Thao tác này không thể hoàn tác.
                </p>

                <div
                  style={{
                    backgroundColor: "var(--sd-bg-muted)",
                    borderRadius: "var(--sd-radius-lg)",
                    padding: "1.25rem",
                    textAlign: "left",
                    marginBottom: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    fontSize: "var(--sd-font-size-sm)",
                  }}
                >
                  <div>
                    <strong>Khách hàng:</strong> {order.customerId}
                  </div>
                  <div>
                    <strong>Nhà hàng:</strong> {order.restaurantId}
                  </div>
                  <div>
                    <strong>Tổng tiền:</strong> {formatCurrency(order.totalPrice)}
                  </div>
                  <div>
                    <strong>Địa chỉ giao:</strong> {order.deliveryAddress}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem" }}>
                  <Button
                    variant="outline"
                    fullWidth
                    onClick={() => navigate("/orders")}
                  >
                    Giữ đơn hàng
                  </Button>

                  <Button
                    variant="danger"
                    fullWidth
                    loading={deleting}
                    icon={FaTrashAlt}
                    onClick={handleDelete}
                  >
                    Xác nhận hủy
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default DeleteOrder;
