import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaArrowLeft, 
  FaPlus, 
  FaTrashAlt, 
  FaStore, 
  FaUser, 
  FaMapMarkerAlt, 
  FaSave 
} from "react-icons/fa";
import Header from "./Header";
import Footer from "./Footer";
import Input from "./common/Input";
import Button from "./common/Button";
import LoadingSkeleton from "./common/LoadingSkeleton";
import EmptyState from "./common/EmptyState";
import { formatCurrency } from "../utils/currency";

function UpdateOrder({ addOrder }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState({
    customerId: "",
    restaurantId: "",
    items: [{ foodId: "", quantity: 1, price: 0 }],
    deliveryAddress: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const res = await axios.get(`http://localhost:5005/api/orders/${id}`, { headers });
        if (res.data) {
          setOrder({
            customerId: res.data.customerId || "",
            restaurantId: res.data.restaurantId || "",
            items: res.data.items?.length ? res.data.items : [{ foodId: "", quantity: 1, price: 0 }],
            deliveryAddress: res.data.deliveryAddress || "",
          });
        }
      } catch (err) {
        console.error("Error fetching order for edit:", err);
        setServerError("Không thể tải thông tin đơn hàng.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

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

  const calculatedTotal = order.items.reduce(
    (acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1),
    0
  );

  const validate = () => {
    const errs = {};
    if (!order.customerId?.trim()) errs.customerId = "Vui lòng nhập tên khách hàng.";
    if (!order.restaurantId?.trim()) errs.restaurantId = "Vui lòng nhập tên nhà hàng.";
    if (!order.deliveryAddress?.trim()) errs.deliveryAddress = "Vui lòng nhập địa chỉ giao hàng.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setServerError("");

    const totalPrice = order.items.reduce(
      (total, item) => total + (Number(item.quantity) || 1) * (Number(item.price) || 0),
      0
    );

    const payload = {
      ...order,
      items: order.items.map((it) => ({
        foodId: it.foodId,
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
      })),
      totalPrice,
    };

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.patch(`http://localhost:5005/api/orders/${id}`, payload, { headers });
      if (addOrder) addOrder(res.data);
      navigate("/orders");
    } catch (err) {
      console.error("Error updating order:", err);
      setServerError("Không thể cập nhật đơn hàng. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          <div style={{ maxWidth: "680px", margin: "0 auto" }}>
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
              <LoadingSkeleton type="card" count={1} height="300px" />
            ) : serverError && !order.customerId ? (
              <EmptyState
                icon={FaSave}
                title="Đơn hàng không khả dụng"
                description={serverError}
                actionLabel="Quay lại danh sách đơn hàng"
                onAction={() => navigate("/orders")}
              />
            ) : (
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
                  <h1 className="sd-heading-2" style={{ margin: "0 0 0.25rem 0" }}>
                    Chỉnh sửa đơn hàng
                  </h1>
                  <p style={{ margin: 0, fontSize: "var(--sd-font-size-sm)", color: "var(--sd-text-secondary)" }}>
                    Cập nhật danh sách món, địa chỉ hoặc thông tin đơn hàng #{id?.slice(-8) || id}
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
                    icon={FaUser}
                    error={errors.customerId}
                    required
                  />

                  <Input
                    label="Tên nhà hàng"
                    name="restaurantId"
                    value={order.restaurantId}
                    onChange={(e) => setOrder({ ...order, restaurantId: e.target.value })}
                    icon={FaStore}
                    error={errors.restaurantId}
                    required
                  />

                  {/* Items */}
                  <div style={{ margin: "1.5rem 0", padding: "1.25rem", backgroundColor: "var(--sd-bg-muted)", borderRadius: "var(--sd-radius-lg)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                      <h4 style={{ margin: 0, fontSize: "var(--sd-font-size-sm)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-secondary)" }}>
                        Món ăn & Số lượng
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
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
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
                          <input
                            type="text"
                            placeholder="Tên món ăn"
                            value={item.foodId}
                            onChange={(e) => handleItemChange(idx, "foodId", e.target.value)}
                            required
                            style={{
                              padding: "0.55rem 0.75rem",
                              fontSize: "var(--sd-font-size-sm)",
                              border: "1px solid var(--sd-border)",
                              borderRadius: "var(--sd-radius-sm)",
                              outline: "none",
                            }}
                          />
                          <input
                            type="number"
                            placeholder="Số lượng"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            required
                            style={{
                              padding: "0.55rem 0.75rem",
                              fontSize: "var(--sd-font-size-sm)",
                              border: "1px solid var(--sd-border)",
                              borderRadius: "var(--sd-radius-sm)",
                              outline: "none",
                            }}
                          />
                          <input
                            type="number"
                            placeholder="Đơn giá"
                            min="1"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, "price", e.target.value)}
                            required
                            style={{
                              padding: "0.55rem 0.75rem",
                              fontSize: "var(--sd-font-size-sm)",
                              border: "1px solid var(--sd-border)",
                              borderRadius: "var(--sd-radius-sm)",
                              outline: "none",
                            }}
                          />
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
                      loading={saving}
                      icon={FaSave}
                    >
                      Lưu & Cập nhật đơn hàng
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default UpdateOrder;
