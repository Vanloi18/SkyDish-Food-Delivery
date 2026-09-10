import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaArrowLeft, 
  FaPlus, 
  FaTrashAlt, 
  FaStore, 
  FaUser, 
  FaMapMarkerAlt, 
  FaCheckCircle,
  FaReceipt
} from "react-icons/fa";
import { CartContext } from "../pages/contexts/CartContext";
import Header from "./Header";
import Footer from "./Footer";
import Input from "./common/Input";
import Button from "./common/Button";
import { formatCurrency } from "../utils/currency";

function OrderForm({ addOrder }) {
  const navigate = useNavigate();
  const { clearCart } = useContext(CartContext);

  const defaultCustomer = localStorage.getItem("customerName") || "Khách hàng";

  const [order, setOrder] = useState({
    customerId: defaultCustomer,
    restaurantId: "SkyDish Hub",
    items: [{ foodId: "Burger Giòn Rụm", quantity: 1, price: 85000 }],
    deliveryAddress: "45 Đường Ẩm Thực, Quận 1",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleItemChange = (index, field, value) => {
    const newItems = [...order.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setOrder({ ...order, items: newItems });
  };

  const handleAddItem = () => {
    setOrder({
      ...order,
      items: [...order.items, { foodId: "", quantity: 1, price: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    if (order.items.length === 1) return;
    const newItems = order.items.filter((_, i) => i !== index);
    setOrder({ ...order, items: newItems });
  };

  const validate = () => {
    const errs = {};
    if (!order.customerId?.trim()) errs.customerId = "Vui lòng nhập tên khách hàng.";
    if (!order.restaurantId?.trim()) errs.restaurantId = "Vui lòng nhập tên nhà hàng.";
    if (!order.deliveryAddress?.trim() || order.deliveryAddress.trim().length < 5) {
      errs.deliveryAddress = "Vui lòng nhập địa chỉ giao hàng hợp lệ (tối thiểu 5 ký tự).";
    }

    order.items.forEach((item, idx) => {
      if (!item.foodId?.trim()) errs[`food_${idx}`] = "Vui lòng nhập tên món ăn.";
      if (Number(item.quantity) <= 0) errs[`qty_${idx}`] = "Số lượng phải lớn hơn 0.";
      if (Number(item.price) <= 0) errs[`price_${idx}`] = "Đơn giá phải lớn hơn 0.";
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setLoading(true);
    const totalPrice = order.items.reduce(
      (total, item) => total + (Number(item.quantity) || 1) * (Number(item.price) || 0),
      0
    );

    const payload = {
      customerId: order.customerId,
      restaurantId: order.restaurantId,
      items: order.items.map((it) => ({
        foodId: it.foodId,
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      })),
      totalPrice,
      deliveryAddress: order.deliveryAddress,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post("http://localhost:5005/api/orders", payload, { headers });

      if (addOrder) addOrder(res.data);
      clearCart();
      navigate("/orders");
    } catch (err) {
      console.error("Order creation error:", err);
      setServerError(
        err.response?.data?.message ||
        "Lỗi khi tạo đơn hàng. Vui lòng kiểm tra lại kết nối mạng."
      );
    } finally {
      setLoading(false);
    }
  };

  const calculatedTotal = order.items.reduce(
    (total, item) => total + (Number(item.quantity) || 1) * (Number(item.price) || 0),
    0
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
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
                <FaArrowLeft size={12} /> Quay lại
              </button>
            </div>

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
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "var(--sd-radius-lg)",
                    backgroundColor: "var(--sd-primary-light)",
                    color: "var(--sd-primary)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <FaReceipt size={22} />
                </div>
                <h1 className="sd-heading-2" style={{ margin: "0 0 0.25rem 0" }}>
                  Tạo đơn hàng mới
                </h1>
                <p style={{ margin: 0, fontSize: "var(--sd-font-size-sm)", color: "var(--sd-text-secondary)" }}>
                  Thiết lập thông tin khách hàng, chọn món ăn và địa chỉ nhận hàng
                </p>
              </div>

              {serverError && (
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    backgroundColor: "var(--sd-danger-light)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "var(--sd-radius-md)",
                    color: "var(--sd-danger-hover)",
                    fontSize: "var(--sd-font-size-sm)",
                    marginBottom: "1.5rem",
                  }}
                >
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <Input
                  label="Tên khách hàng"
                  name="customerId"
                  value={order.customerId}
                  onChange={(e) => setOrder({ ...order, customerId: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  icon={FaUser}
                  error={errors.customerId}
                  required
                />

                <Input
                  label="Đối tác nhà hàng"
                  name="restaurantId"
                  value={order.restaurantId}
                  onChange={(e) => setOrder({ ...order, restaurantId: e.target.value })}
                  placeholder="Ví dụ: Sky Burger Hub"
                  icon={FaStore}
                  error={errors.restaurantId}
                  required
                />

                {/* Items Section */}
                <div style={{ margin: "1.5rem 0", padding: "1.25rem", backgroundColor: "var(--sd-bg-muted)", borderRadius: "var(--sd-radius-lg)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, fontSize: "var(--sd-font-size-sm)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>
                      Danh sách món ăn
                    </h4>
                    <Button type="button" variant="outline" size="sm" icon={FaPlus} onClick={handleAddItem}>
                      Thêm món
                    </Button>
                  </div>

                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: "#ffffff",
                        padding: "1rem",
                        borderRadius: "var(--sd-radius-md)",
                        border: "1px solid var(--sd-border)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "var(--sd-font-size-xs)", fontWeight: "700", color: "var(--sd-text-muted)" }}>
                          Món #{idx + 1}
                        </span>
                        {order.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            style={{ color: "var(--sd-danger)", border: "none", background: "none", cursor: "pointer", fontSize: "0.8rem" }}
                          >
                            <FaTrashAlt />
                          </button>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem" }}>
                        <div>
                          <input
                            type="text"
                            placeholder="Tên món ăn"
                            value={item.foodId}
                            onChange={(e) => handleItemChange(idx, "foodId", e.target.value)}
                            required
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.75rem",
                              fontSize: "var(--sd-font-size-sm)",
                              border: "1px solid var(--sd-border)",
                              borderRadius: "var(--sd-radius-sm)",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            placeholder="Số lượng"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            required
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.75rem",
                              fontSize: "var(--sd-font-size-sm)",
                              border: "1px solid var(--sd-border)",
                              borderRadius: "var(--sd-radius-sm)",
                              outline: "none",
                            }}
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            placeholder="Đơn giá (Rs)"
                            min="1"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                            required
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.75rem",
                              fontSize: "var(--sd-font-size-sm)",
                              border: "1px solid var(--sd-border)",
                              borderRadius: "var(--sd-radius-sm)",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ textAlign: "right", marginTop: "0.5rem", fontSize: "var(--sd-font-size-sm)", fontWeight: "700" }}>
                    Tạm tính: <span style={{ color: "var(--sd-primary)" }}>{formatCurrency(calculatedTotal)}</span>
                  </div>
                </div>

                <Input
                  label="Địa chỉ giao hàng"
                  name="deliveryAddress"
                  value={order.deliveryAddress}
                  onChange={(e) => setOrder({ ...order, deliveryAddress: e.target.value })}
                  placeholder="Ví dụ: 45 Đường Ẩm Thực, Quận 1"
                  icon={FaMapMarkerAlt}
                  error={errors.deliveryAddress}
                  required
                />

                <div style={{ marginTop: "2rem" }}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    icon={FaCheckCircle}
                  >
                    Đặt & Xác nhận đơn hàng
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default OrderForm;
