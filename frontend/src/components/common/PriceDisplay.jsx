import React from "react";
import { formatCurrency } from "../../utils/currency";

export default function PriceDisplay({
  amount,
  size = "md",
  color = "primary",
  highlight = false,
  className = "",
  style = {},
}) {
  const sizeStyles = {
    sm: { fontSize: "0.85rem", fontWeight: "600" },
    md: { fontSize: "1rem", fontWeight: "700" },
    lg: { fontSize: "1.25rem", fontWeight: "800" },
    xl: { fontSize: "1.5rem", fontWeight: "800" },
  };

  const colorStyles = {
    primary: "var(--sd-primary)",
    secondary: "var(--sd-text-primary)",
    muted: "var(--sd-text-secondary)",
    success: "#059669",
    warning: "#d97706",
  };

  return (
    <span
      className={`sd-price-display ${className}`}
      style={{
        display: "inline-block",
        color: colorStyles[color] || colorStyles.primary,
        ...(sizeStyles[size] || sizeStyles.md),
        ...(highlight ? { backgroundColor: "var(--sd-primary-light)", padding: "0.1rem 0.4rem", borderRadius: "4px" } : {}),
        ...style,
      }}
    >
      {formatCurrency(amount)}
    </span>
  );
}
