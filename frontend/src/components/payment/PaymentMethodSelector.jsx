import React from "react";
import { motion } from "framer-motion";
import { 
  FaMoneyBillWave, 
  FaQrcode, 
  FaShieldAlt,
  FaUniversity
} from "react-icons/fa";

const PAYMENT_METHODS = [
  {
    id: "VNPAY",
    title: "Cổng VNPay",
    description: "Thanh toán qua VNPay-QR, thẻ ATM nội địa hoặc Internet Banking",
    icon: FaQrcode,
    badge: "Phổ biến",
    badgeColor: "#ef4444",
    color: "#e11d48",
  },
  {
    id: "MOMO",
    title: "Ví điện tử MoMo",
    description: "Thanh toán nhanh chóng bằng ứng dụng MoMo hoặc quét mã QR",
    icon: FaQrcode,
    badge: "Ví điện tử",
    badgeColor: "#ec4899",
    color: "#a21caf",
  },
  {
    id: "BANK_TRANSFER",
    title: "Chuyển khoản ngân hàng",
    description: "Quét mã QR để chuyển khoản trực tiếp (MB Bank / VietQR)",
    icon: FaUniversity,
    badge: "VietQR 24/7",
    badgeColor: "#0284c7",
    color: "#0369a1",
  },
  {
    id: "COD",
    title: "Thanh toán khi nhận hàng (COD)",
    description: "Thanh toán bằng tiền mặt cho shipper khi đơn hàng được giao đến",
    icon: FaMoneyBillWave,
    badge: "Tiện lợi",
    badgeColor: "#10b981",
    color: "#059669",
  },
];

const PaymentMethodSelector = ({ selectedMethod, onSelectMethod }) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.75rem" }}>
      <label
        style={{
          fontSize: "var(--sd-font-size-sm)",
          fontWeight: "700",
          color: "var(--sd-text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
        }}
      >
        <FaShieldAlt style={{ color: "var(--sd-primary)" }} /> Chọn phương thức thanh toán
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethod === method.id;
          const Icon = method.icon;

          return (
            <motion.div
              key={method.id}
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => onSelectMethod(method.id)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.85rem",
                padding: "1rem 1.15rem",
                borderRadius: "var(--sd-radius-lg)",
                border: isSelected
                  ? `2px solid ${method.color}`
                  : "1px solid var(--sd-border)",
                backgroundColor: isSelected ? "rgba(99, 102, 241, 0.04)" : "#ffffff",
                cursor: "pointer",
                position: "relative",
                transition: "all var(--sd-transition-fast)",
                boxShadow: isSelected
                  ? "0 4px 12px rgba(99, 102, 241, 0.12)"
                  : "var(--sd-shadow-xs)",
              }}
            >
              {/* Radio Indicator */}
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: isSelected ? `6px solid ${method.color}` : "2px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  marginTop: "0.15rem",
                  flexShrink: 0,
                  transition: "all var(--sd-transition-fast)",
                }}
              />

              {/* Method Info */}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "var(--sd-font-size-sm)", fontWeight: "700", color: "var(--sd-text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Icon size={15} style={{ color: method.color }} /> {method.title}
                  </span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      fontWeight: "700",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "var(--sd-radius-full)",
                      backgroundColor: `${method.badgeColor}15`,
                      color: method.badgeColor,
                    }}
                  >
                    {method.badge}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-secondary)", lineHeight: "1.4" }}>
                  {method.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
