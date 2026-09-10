import React, { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

export default function AdminModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = "540px",
  footer 
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#0f172a" }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              padding: "0.25rem",
              borderRadius: "4px",
              transition: "color 0.15s ease",
            }}
            aria-label="Đóng cửa sổ"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.5rem", flex: 1 }}>
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid #f1f5f9",
              backgroundColor: "#fafafa",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              borderRadius: "0 0 12px 12px",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
