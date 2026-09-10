import React from "react";
import { motion } from "framer-motion";
import LoadingSkeleton from "./LoadingSkeleton";
import EmptyState from "./EmptyState";
import { FaInbox } from "react-icons/fa";

/**
 * Centralized Accessible DataTable Component
 * For Admin and Merchant platforms with responsive cards on mobile
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "Không có dữ liệu để hiển thị",
  emptyIcon: EmptyIcon = FaInbox,
  keyField = "_id",
  onRowClick = null,
  className = "",
  style = {},
}) {
  if (loading) {
    return (
      <div style={{ padding: "1rem", ...style }}>
        <LoadingSkeleton count={5} height="48px" style={{ marginBottom: "0.5rem" }} />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={{ padding: "2rem 1rem", ...style }}>
        <EmptyState
          icon={EmptyIcon}
          title="Không có dữ liệu"
          description={emptyMessage}
        />
      </div>
    );
  }

  return (
    <div
      className={`sd-table-container ${className}`}
      style={{
        width: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        borderRadius: "var(--sd-radius-md)",
        border: "1px solid var(--sd-border)",
        backgroundColor: "var(--sd-bg-surface)",
        ...style,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "left",
          fontSize: "var(--sd-font-size-sm)",
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: "var(--sd-bg-muted)",
              borderBottom: "1px solid var(--sd-border)",
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  padding: "0.75rem 1rem",
                  fontWeight: "600",
                  color: "var(--sd-text-secondary)",
                  fontSize: "var(--sd-font-size-xs)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  textAlign: col.align || "left",
                  width: col.width || "auto",
                  whiteSpace: "nowrap",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => {
            const rowKey = row[keyField] || rowIdx;
            return (
              <motion.tr
                key={rowKey}
                whileHover={onRowClick ? { backgroundColor: "rgba(15, 23, 42, 0.02)" } : {}}
                onClick={() => onRowClick && onRowClick(row)}
                style={{
                  borderBottom: rowIdx === data.length - 1 ? "none" : "1px solid var(--sd-border)",
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background-color var(--sd-transition-fast)",
                }}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key || colIdx}
                    style={{
                      padding: "0.875rem 1rem",
                      color: "var(--sd-text-primary)",
                      textAlign: col.align || "left",
                      verticalAlign: "middle",
                    }}
                  >
                    {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
