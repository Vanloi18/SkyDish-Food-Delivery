import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaArrowLeft, 
  FaTrashAlt, 
  FaPlus, 
  FaMinus, 
  FaShoppingCart, 
  FaShieldAlt, 
  FaMotorcycle, 
  FaCreditCard,
  FaUtensils
} from "react-icons/fa";
import { CartContext } from "../contexts/CartContext";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import { formatCurrency } from "../../utils/currency";
import { resolveImageUrl, handleImageError } from "../../utils/imageHelper";
import { getValidToken } from "../../utils/authHelper";

function AddToCartPage() {
  const { 
    cartItems, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    subtotal, 
    deliveryFee, 
    totalAmount, 
    totalItemCount,
    cartRestaurantName,
    hasMixedRestaurants
  } = useContext(CartContext);

  const navigate = useNavigate();

  const handleProceedToCheckout = () => {
    const token = getValidToken();
    if (!token) {
      navigate(`/auth/login?redirect=/checkout&message=${encodeURIComponent("Vui lòng đăng nhập để đặt hàng.")}`);
      return;
    }
    navigate("/checkout");
  };

  return (
    <div className="customer-experience cart-experience" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main className="cart-page-main" style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          {/* Breadcrumb / Back Link */}
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              type="button"
              className="cart-back-link"
              onClick={() => navigate("/customer/home")}
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
                transition: "all var(--sd-transition-fast)",
              }}
            >
              <FaArrowLeft size={12} /> Tiếp tục mua sắm
            </button>
          </div>

          {/* Page Title */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 className="sd-heading-1" style={{ margin: "0 0 0.25rem 0" }}>
                Giỏ hàng của bạn
              </h1>
              <p style={{ margin: 0, color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)" }}>
                {totalItemCount > 0 ? `Bạn có ${totalItemCount} món ăn trong giỏ` : "Giỏ hàng hiện đang trống"}
              </p>
            </div>

            {cartItems.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon={FaTrashAlt}
                onClick={clearCart}
                style={{ color: "var(--sd-danger)", borderColor: "rgba(239, 68, 68, 0.3)" }}
              >
                Xóa tất cả món
              </Button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div style={{ maxWidth: "580px", margin: "3rem auto" }}>
              <EmptyState
                icon={FaShoppingCart}
                title="Giỏ hàng của bạn đang trống"
                description="Hãy khám phá các nhà hàng đối tác tuyệt vời của SkyDish và thưởng thức những món ăn yêu thích ngay bây giờ!"
                actionLabel="Khám phá món ngon ngay"
                onAction={() => navigate("/customer/home")}
              />
            </div>
          ) : (
            <>
              {hasMixedRestaurants && (
                <div style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem", borderRadius: "var(--sd-radius-md)", backgroundColor: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: "var(--sd-font-size-sm)", fontWeight: "600" }}>
                  Giỏ hàng cũ có món từ nhiều nhà hàng. Vui lòng chỉ giữ món của một nhà hàng trước khi thanh toán để đơn được gửi đúng nơi.
                </div>
              )}
              {cartRestaurantName && (
                <div style={{ marginBottom: "1rem", color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)" }}>
                  Đơn hàng này được giao từ <strong style={{ color: "var(--sd-text-primary)" }}>{cartRestaurantName}</strong>. Mỗi lần thanh toán áp dụng cho một nhà hàng.
                </div>
              )}
              <div
                className="cart-layout"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.6fr 1fr",
                  gap: "2.5rem",
                  alignItems: "flex-start",
                }}
              >
              {/* Left Column: Cart Items List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {cartItems.map((item) => {
                  const itemPrice = Number(item.price) || 0;
                  const itemQty = item.quantity || 1;
                  const itemTotal = itemPrice * itemQty;

                  return (
                    <motion.div
                      key={item.cartKey || item._id}
                      className="cart-item-card"
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "var(--sd-radius-lg)",
                        border: "1px solid var(--sd-border)",
                        padding: "1.25rem 1.5rem",
                        boxShadow: "var(--sd-shadow-xs)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "1rem",
                      }}
                    >
                      {/* Dish Thumbnail & Info */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                        <img
                          src={resolveImageUrl(item.image, "food")}
                          alt={item.name}
                          onError={(e) => handleImageError(e, "food")}
                          style={{
                            width: "72px",
                            height: "72px",
                            borderRadius: "var(--sd-radius-md)",
                            objectFit: "cover",
                            backgroundColor: "#f1f5f9",
                          }}
                        />
                        <div>
                          <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "var(--sd-font-size-base)", fontWeight: "700" }}>
                            {item.name}
                          </h4>
                          <p style={{ margin: 0, fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                            {formatCurrency(itemPrice)} / phần
                          </p>
                          {item.category && (
                            <span style={{ fontSize: "0.75rem", color: "var(--sd-primary)", fontWeight: "600" }}>
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper & Price */}
                      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                        {/* Stepper */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            backgroundColor: "var(--sd-bg-muted)",
                            borderRadius: "var(--sd-radius-full)",
                            padding: "0.25rem",
                            border: "1px solid var(--sd-border)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartKey || item._id, itemQty - 1)}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              backgroundColor: "#ffffff",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "var(--sd-text-primary)",
                            }}
                          >
                            <FaMinus size={10} />
                          </button>
                          <span style={{ width: "32px", textAlign: "center", fontWeight: "700", fontSize: "0.9rem" }}>
                            {itemQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.cartKey || item._id, itemQty + 1)}
                            disabled={itemQty >= 99}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              backgroundColor: "#ffffff",
                              border: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "var(--sd-text-primary)",
                            }}
                          >
                            <FaPlus size={10} />
                          </button>
                        </div>

                        {/* Item Total */}
                        <span style={{ minWidth: "110px", textAlign: "right", fontWeight: "800", fontSize: "1.1rem", color: "var(--sd-text-primary)" }}>
                          {formatCurrency(itemTotal)}
                        </span>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartKey || item._id)}
                          title="Xóa món"
                          style={{
                            border: "none",
                            background: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "0.5rem",
                            transition: "color var(--sd-transition-fast)",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sd-danger)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                        >
                          <FaTrashAlt size={15} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Order Summary Card */}
              <Card className="cart-summary-card" padding="2rem" style={{ position: "sticky", top: "100px" }}>
                <h3
                  style={{
                    margin: "0 0 1.25rem 0",
                    fontSize: "var(--sd-font-size-lg)",
                    fontWeight: "800",
                    borderBottom: "1px solid var(--sd-border)",
                    paddingBottom: "0.75rem",
                  }}
                >
                  Tóm tắt đơn hàng
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--sd-font-size-sm)", color: "var(--sd-text-secondary)" }}>
                    <span>Tạm tính</span>
                    <span style={{ fontWeight: "600", color: "var(--sd-text-primary)" }}>{formatCurrency(subtotal)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--sd-font-size-sm)", color: "var(--sd-text-secondary)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <FaMotorcycle style={{ color: "var(--sd-primary)" }} /> Phí giao hàng
                    </span>
                    <span style={{ fontWeight: "600", color: "var(--sd-text-primary)" }}>
                      {deliveryFee === 0 ? "Miễn phí" : formatCurrency(deliveryFee)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "var(--sd-font-size-base)",
                      fontWeight: "800",
                      color: "var(--sd-text-primary)",
                      paddingTop: "1rem",
                      borderTop: "1px solid var(--sd-border)",
                      marginTop: "0.5rem",
                    }}
                  >
                    <span>Tổng tiền</span>
                    <span style={{ color: "var(--sd-primary)", fontSize: "1.25rem" }}>
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    icon={FaCreditCard}
                    onClick={handleProceedToCheckout}
                    disabled={hasMixedRestaurants}
                  >
                    Tiến hành thanh toán
                  </Button>

                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    icon={FaUtensils}
                    onClick={() => navigate("/customer/home")}
                  >
                    Tiếp tục chọn thêm món
                  </Button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginTop: "1.5rem",
                    paddingTop: "1rem",
                    borderTop: "1px solid var(--sd-border)",
                    color: "var(--sd-text-muted)",
                    fontSize: "var(--sd-font-size-xs)",
                  }}
                >
                  <FaShieldAlt style={{ color: "var(--sd-success)" }} />
                  <span>Bảo mật SSL 256-bit & Thanh toán an toàn</span>
                </div>
              </Card>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AddToCartPage;
