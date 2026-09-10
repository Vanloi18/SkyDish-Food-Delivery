import React from "react";

export default function AdminKpiCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  colorScheme = "primary",
  trend
}) {
  const colorSchemes = {
    primary: { bg: "#fff7ed", color: "#ea580c" },
    blue: { bg: "#eff6ff", color: "#2563eb" },
    green: { bg: "#ecfdf5", color: "#059669" },
    amber: { bg: "#fef3c7", color: "#d97706" },
    purple: { bg: "#faf5ff", color: "#7c3aed" },
  };

  const currentTheme = colorSchemes[colorScheme] || colorSchemes.primary;

  return (
    <div className="admin-kpi-card">
      <div className="admin-kpi-header">
        <span className="admin-kpi-title">{title}</span>
        {Icon && (
          <div 
            className="admin-kpi-icon-box" 
            style={{ backgroundColor: currentTheme.bg, color: currentTheme.color }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <h3 
        className="admin-kpi-value"
        style={colorScheme === "green" ? { color: "#059669" } : colorScheme === "primary" ? { color: "#ea580c" } : {}}
      >
        {value !== undefined && value !== null ? value : "Chưa có dữ liệu"}
      </h3>

      {(subtitle || trend) && (
        <div className="admin-kpi-trend">
          <span>{subtitle || trend}</span>
        </div>
      )}
    </div>
  );
}
