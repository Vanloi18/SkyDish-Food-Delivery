import { API_URLS } from '../../config/api';
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { FaPlus, FaEye, FaEdit, FaTrashAlt, FaReceipt } from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { formatCurrency } from "../../utils/currency";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios.get(`${API_URLS.ORDER}/api/orders`, { headers })
      .then((response) => setOrders(Array.isArray(response.data) ? response.data : (Array.isArray(response.data?.data) ? response.data.data : [])))
      .catch((error) => console.error("Error fetching orders:", error))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios.delete(`${API_URLS.ORDER}/api/orders/${id}`, { headers })
      .then(() => setOrders(orders.filter(order => order._id !== id)))
      .catch((error) => console.error("Error deleting order:", error));
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />
      <main style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
            <div>
              <h1 className="sd-heading-1">Tổng quan đơn hàng</h1>
              <p style={{ margin: "0.25rem 0 0 0", color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)" }}>
                Danh sách chi tiết tất cả đơn hàng đã đặt
              </p>
            </div>
            <Link to="/orders/new">
              <Button variant="primary" icon={FaPlus}>
                Tạo đơn hàng mới
              </Button>
            </Link>
          </div>

          {loading ? (
            <LoadingSkeleton type="card" count={3} />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={FaReceipt}
              title="Không tìm thấy đơn hàng"
              description="Hiện tại chưa có đơn hàng nào được ghi nhận."
              actionLabel="Tạo đơn hàng"
              onAction={() => window.location.href = "/orders/new"}
            />
          ) : (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "var(--sd-radius-lg)", border: "1px solid var(--sd-border)", overflowX: "auto", boxShadow: "var(--sd-shadow-sm)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--sd-bg-muted)", borderBottom: "1px solid var(--sd-border)" }}>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Khách hàng</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Nhà hàng</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Chi tiết món</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Tổng tiền</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>Địa chỉ giao hàng</th>
                    <th style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)", textAlign: "right" }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id} style={{ borderBottom: "1px solid var(--sd-border)" }}>
                      <td style={{ padding: "1rem", fontWeight: "600" }}>{order.customerId}</td>
                      <td style={{ padding: "1rem" }}>{order.restaurantId}</td>
                      <td style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)" }}>
                        {order.items?.map((it, i) => (
                          <div key={i}>{it.foodId} × {it.quantity} ({formatCurrency(it.price)})</div>
                        ))}
                      </td>
                      <td style={{ padding: "1rem", fontWeight: "700", color: "var(--sd-primary)" }}>
                        {formatCurrency(order.totalPrice)}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-secondary)" }}>
                        {order.deliveryAddress}
                      </td>
                      <td style={{ padding: "1rem", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                          <Link to={`/orders/details/${order._id}`}>
                            <button title="Xem" style={{ padding: "0.4rem", borderRadius: "var(--sd-radius-sm)", backgroundColor: "#f1f5f9", color: "var(--sd-info)", border: "none", cursor: "pointer" }}>
                              <FaEye size={14} />
                            </button>
                          </Link>
                          <Link to={`/orders/edit/${order._id}`}>
                            <button title="Sửa" style={{ padding: "0.4rem", borderRadius: "var(--sd-radius-sm)", backgroundColor: "#f1f5f9", color: "#f59e0b", border: "none", cursor: "pointer" }}>
                              <FaEdit size={14} />
                            </button>
                          </Link>
                          <button
                            title="Hủy"
                            onClick={() => handleDelete(order._id)}
                            style={{ padding: "0.4rem", borderRadius: "var(--sd-radius-sm)", backgroundColor: "var(--sd-danger-light)", color: "var(--sd-danger)", border: "none", cursor: "pointer" }}
                          >
                            <FaTrashAlt size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Orders;
