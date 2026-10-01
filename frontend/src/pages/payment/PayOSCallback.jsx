import { API_URLS } from "../../config/api";
import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaExclamationCircle, FaReceipt, FaShieldAlt } from "react-icons/fa";
import { CartContext } from "../contexts/CartContext";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { formatCurrency } from "../../utils/currency";

const PayOSCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useContext(CartContext);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      const orderCode = searchParams.get("orderCode");
      if (!orderCode) {
        setError("Không tìm thấy mã giao dịch PayOS trong đường dẫn phản hồi.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URLS.PAYMENT}/api/payment/payos/return?orderCode=${encodeURIComponent(orderCode)}`
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Không thể xác minh giao dịch PayOS.");
        setResult(data);
        if (data.isSuccess) clearCart();
      } catch (verificationError) {
        setError(verificationError.message || "Không thể xác minh giao dịch PayOS.");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams, clearCart]);

  const isSuccess = result?.isSuccess;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />
      <main style={{ flex: 1, padding: "3.5rem 0 5rem" }}>
        <div className="sd-container" style={{ maxWidth: "680px" }}>
          <Card padding="2.5rem" style={{ textAlign: "center" }}>
            {loading ? (
              <div style={{ padding: "2rem 0" }}>
                <div style={{ width: "48px", height: "48px", border: "4px solid #dbeafe", borderTopColor: "#0068ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1.5rem" }} />
                <h2 className="sd-heading-2">Đang xác minh thanh toán PayOS...</h2>
              </div>
            ) : (
              <>
                {isSuccess ? <FaCheckCircle size={48} color="var(--sd-success)" /> : <FaExclamationCircle size={48} color="var(--sd-danger)" />}
                <h1 className="sd-heading-1" style={{ margin: "1rem 0 0.5rem" }}>
                  {isSuccess ? "Thanh toán PayOS thành công" : "Thanh toán chưa hoàn tất"}
                </h1>
                <p style={{ color: "var(--sd-text-secondary)", marginBottom: "1.5rem" }}>
                  {error || result?.message || "Bạn có thể thử lại từ trang thanh toán."}
                </p>
                {result?.orderId && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", textAlign: "left", padding: "1rem", border: "1px solid var(--sd-border)", borderRadius: "8px", marginBottom: "1.5rem" }}>
                    <span>Mã đơn hàng: <strong>{result.orderId}</strong></span>
                    {result.transactionId && <span>Mã giao dịch: <strong>{result.transactionId}</strong></span>}
                    {result.amount != null && <span>Số tiền: <strong>{formatCurrency(result.amount)}</strong></span>}
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                  {isSuccess ? (
                    <Link to="/orders"><Button variant="primary" size="lg" icon={FaReceipt}>Xem đơn hàng</Button></Link>
                  ) : (
                    <Button variant="primary" size="lg" onClick={() => navigate("/checkout")}>Quay lại thanh toán</Button>
                  )}
                  <Button variant="outline" size="lg" onClick={() => navigate("/customer/home")}>Tiếp tục mua sắm</Button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", marginTop: "1.5rem", color: "var(--sd-text-muted)", fontSize: "var(--sd-font-size-xs)" }}>
                  <FaShieldAlt /> Trạng thái giao dịch được xác minh trực tiếp với PayOS
                </div>
              </>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PayOSCallback;