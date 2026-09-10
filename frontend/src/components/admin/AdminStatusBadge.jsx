import React from "react";

const badgeStyles = {
  success: { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" },
  warning: { bg: "#fffbeb", color: "#b45309", border: "#fde68a" },
  danger: { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  info: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  purple: { bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff" },
  neutral: { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

const statusMap = {
  // Order statuses
  Delivered: { type: "success", label: "Đã giao hàng" },
  Completed: { type: "success", label: "Hoàn tất" },
  Preparing: { type: "info", label: "Đang chuẩn bị" },
  Confirmed: { type: "info", label: "Đã xác nhận" },
  Pending: { type: "warning", label: "Chờ xử lý" },
  "Out for Delivery": { type: "purple", label: "Đang giao hàng" },
  Canceled: { type: "danger", label: "Đã hủy đơn" },
  
  // Restaurant statuses
  Open: { type: "success", label: "Đang mở cửa" },
  Closed: { type: "danger", label: "Đã đóng cửa" },
  
  // User statuses & roles
  Active: { type: "success", label: "Đang hoạt động" },
  Paused: { type: "warning", label: "Tạm dừng" },
  Inactive: { type: "danger", label: "Không hoạt động" },
  CUSTOMER: { type: "info", label: "Khách hàng" },
  RESTAURANT_PARTNER: { type: "warning", label: "Đối tác nhà hàng" },
  DELIVERY_PERSONNEL: { type: "purple", label: "Shipper" },
  SUPER_ADMIN: { type: "success", label: "Quản trị viên" },
  
  // Payment statuses
  Paid: { type: "success", label: "Đã thanh toán" },
  Failed: { type: "danger", label: "Thất bại" },
  Refunded: { type: "neutral", label: "Đã hoàn tiền" },
};

export default function AdminStatusBadge({ status, variant, customLabel }) {
  const config = statusMap[status] || { type: variant || "neutral", label: customLabel || status };
  const style = badgeStyles[config.type] || badgeStyles.neutral;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.22rem 0.65rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: "600",
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: "nowrap",
        letterSpacing: "0.01em",
      }}
    >
      {customLabel || config.label}
    </span>
  );
}
