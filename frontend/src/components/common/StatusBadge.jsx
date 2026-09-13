import React from "react";
import {
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaTruck,
  FaUtensils,
  FaMoneyBillWave,
  FaShieldAlt,
} from "react-icons/fa";

/**
 * Centralized Semantic Status Badges
 * Normalizes statuses across Customer, Restaurant, Shipper, and Admin
 */
const STATUS_CONFIGS = {
  // Order Statuses
  pending: { label: "Chờ xác nhận", bg: "#fef3c7", color: "#92400e", border: "#fde68a", icon: FaClock },
  confirmed: { label: "Đã xác nhận", bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", icon: FaCheckCircle },
  preparing: { label: "Đang chuẩn bị", bg: "#fff7ed", color: "#c2410c", border: "#ffedd5", icon: FaUtensils },
  ready_for_pickup: { label: "Sẵn sàng lấy món", bg: "#fdf4ff", color: "#86198f", border: "#f5d0fe", icon: FaUtensils },
  picked_up: { label: "Đã lấy món", bg: "#f0fdfa", color: "#0f766e", border: "#ccfbf1", icon: FaTruck },
  on_the_way: { label: "Đang giao hàng", bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe", icon: FaTruck },
  out_for_delivery: { label: "Đang giao hàng", bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe", icon: FaTruck },
  delivered: { label: "Đã giao hàng", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", icon: FaCheckCircle },
  completed: { label: "Đã hoàn thành", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", icon: FaCheckCircle },
  cancelled: { label: "Đã hủy", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", icon: FaTimesCircle },

  // Payment Statuses
  paid: { label: "Đã thanh toán", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", icon: FaCheckCircle },
  unpaid: { label: "Chưa thanh toán", bg: "#fef3c7", color: "#92400e", border: "#fde68a", icon: FaClock },
  failed: { label: "Thất bại", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", icon: FaTimesCircle },
  refunded: { label: "Đã hoàn tiền", bg: "#f1f5f9", color: "#475569", border: "#e2e8f0", icon: FaMoneyBillWave },

  // Operational / Partner Statuses
  active: { label: "Đang hoạt động", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", icon: FaCheckCircle },
  inactive: { label: "Ngưng hoạt động", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0", icon: FaTimesCircle },
  open: { label: "Đang mở cửa", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", icon: FaCheckCircle },
  closed: { label: "Tạm đóng cửa", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", icon: FaTimesCircle },
  online: { label: "Trực tuyến", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", icon: FaCheckCircle },
  offline: { label: "Ngoại tuyến", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0", icon: FaTimesCircle },
};

export default function StatusBadge({ status, size = "md", showIcon = true, className = "", style = {} }) {
  if (!status) return null;

  const normalizedKey = String(status).toLowerCase().replace(/[\s-]+/g, "_");
  const config = STATUS_CONFIGS[normalizedKey] || {
    label: status,
    bg: "#f1f5f9",
    color: "#475569",
    border: "#e2e8f0",
    icon: FaShieldAlt,
  };

  const Icon = config.icon;

  const isSmall = size === "sm";

  return (
    <span
      className={`sd-status-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: isSmall ? "0.25rem" : "0.35rem",
        padding: isSmall ? "0.2rem 0.5rem" : "0.3rem 0.7rem",
        backgroundColor: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        borderRadius: "var(--sd-radius-full)",
        fontSize: isSmall ? "0.72rem" : "0.8rem",
        fontWeight: "600",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {showIcon && Icon && <Icon size={isSmall ? 10 : 12} />}
      {config.label}
    </span>
  );
}
