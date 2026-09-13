import { API_URLS } from '../../config/api';
import React, { useEffect, useState, useContext } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaReceipt, 
  FaArrowLeft, 
  FaShieldAlt
} from "react-icons/fa";
import { CartContext } from "../contexts/CartContext";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { formatCurrency } from "../../utils/currency";

const VNPayCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useContext(CartContext);

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyTransaction = async () => {
      try {
        const queryStr = searchParams.toString();
        if (!queryStr) {
          setError("Không tìm thấy tham số giao dịch trong đường dẫn phản hồi.");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `${API_URLS.PAYMENT}/api/payment/vnpay/callback?${queryStr}`
        );

        setResult(response.data);
        if (response.data.isSuccess) {
          clearCart();
        }
      } catch (err) {
        console.error("VNPay callback verification error:", err);
        setError("Không thể xác thực trạng thái giao dịch VNPay với dịch vụ thanh toán.");
      } finally {
        setLoading(false);
      }
    };

    verifyTransaction();
  }, [searchParams, clearCart]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "3.5rem 0 5rem 0" }}>
        <div className="sd-container" style={{ maxWidth: "680px" }}>
          <Card padding="2.5rem" style={{ textAlign: "center" }}>
            {loading ? (
              <div style={{ padding: "2rem 0" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    border: "4px solid #e2e8f0",
                    borderTopColor: "var(--sd-primary)",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 1.5rem auto",
                  }}
                />
                <h2 className="sd-heading-2" style={{ marginBottom: "0.5rem" }}>
                  Đang xác thực giao dịch VNPay...
                </h2>
                <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)" }}>
                  Đang kết nối an toàn đến cổng thanh toán SkyDish để kiểm tra chữ ký giao dịch.
                </p>
              </div>
            ) : result?.isSuccess ? (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: "var(--sd-success-light)",
                    color: "var(--sd-success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.25rem auto",
                  }}
                >
                  <FaCheckCircle size={36} />
                </div>

                <span
                  style={{
                    fontSize: "var(--sd-font-size-xs)",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    color: "var(--sd-success)",
                    letterSpacing: "0.05em",
                  }}
                >
                  Đã xác nhận thanh toán
                </span>
                <h1 className="sd-heading-1" style={{ margin: "0.35rem 0 1rem 0" }}>
                  Thanh toán VNPay thành công!
                </h1>
                <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", marginBottom: "2rem" }}>
                  Đơn hàng của bạn đã được tiếp nhận và đang được nhà bếp chuẩn bị.
                </p>

                {/* Transaction details box */}
                <div
                  style={{
                    backgroundColor: "var(--sd-bg-muted)",
                    borderRadius: "var(--sd-radius-lg)",
                    padding: "1.25rem 1.5rem",
                    textAlign: "left",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.65rem",
                    marginBottom: "2rem",
                    fontSize: "var(--sd-font-size-sm)",
                    border: "1px solid var(--sd-border)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--sd-text-secondary)" }}>Mã đơn hàng:</span>
                    <strong style={{ color: "var(--sd-text-primary)" }}>{result.orderId}</strong>
                  </div>
                  {result.transactionNo && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--sd-text-secondary)" }}>Mã giao dịch VNPay:</span>
                      <span style={{ color: "var(--sd-text-primary)" }}>{result.transactionNo}</span>
                    </div>
                  )}
                  {result.bankCode && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--sd-text-secondary)" }}>Ngân hàng / Phương thức:</span>
                      <span style={{ color: "var(--sd-text-primary)" }}>{result.bankCode}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--sd-border)", paddingTop: "0.65rem", marginTop: "0.25rem" }}>
                    <span style={{ fontWeight: "700" }}>Số tiền thanh toán:</span>
                    <strong style={{ color: "var(--sd-primary)", fontSize: "1.1rem" }}>
                      {formatCurrency(result.amount)}
                    </strong>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <Link to="/orders">
                    <Button variant="primary" size="lg" icon={FaReceipt}>
                      Xem trong Lịch sử đơn hàng
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" onClick={() => navigate("/customer/home")}>
                    Tiếp tục mua sắm
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: "var(--sd-danger-light)",
                    color: "var(--sd-danger)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.25rem auto",
                  }}
                >
                  <FaExclamationCircle size={36} />
                </div>

                <h1 className="sd-heading-1" style={{ margin: "0.35rem 0 1rem 0" }}>
                  Thanh toán VNPay chưa hoàn tất
                </h1>
                <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", marginBottom: "2rem" }}>
                  {error || result?.message || "Giao dịch VNPay đã bị hủy hoặc không thể hoàn tất."}
                </p>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                  <Button variant="primary" icon={FaArrowLeft} onClick={() => navigate("/checkout")}>
                    Quay lại trang thanh toán
                  </Button>
                </div>
              </motion.div>
            )}

            <div
              style={{
                marginTop: "2rem",
                paddingTop: "1.25rem",
                borderTop: "1px solid var(--sd-border)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "var(--sd-font-size-xs)",
                color: "var(--sd-text-muted)",
                justifyContent: "center",
              }}
            >
              <FaShieldAlt style={{ color: "var(--sd-success)" }} /> Xác thực chữ ký điện tử an toàn chuẩn SHA512 của VNPay
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VNPayCallback;
