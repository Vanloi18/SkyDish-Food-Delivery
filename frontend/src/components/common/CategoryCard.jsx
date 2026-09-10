import React from "react";
import { motion } from "framer-motion";

export default function CategoryCard({ category, onClick }) {
  if (!category) return null;

  const { name, image, count, tag } = category;

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "var(--sd-radius-xl)",
        border: "1px solid var(--sd-border)",
        overflow: "hidden",
        boxShadow: "var(--sd-shadow-sm)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
      className="sd-card-interactive"
    >
      {/* Category Image Cover */}
      <div style={{ position: "relative", height: "130px", width: "100%", overflow: "hidden", backgroundColor: "#f1f5f9" }}>
        <img
          src={image}
          alt={name}
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80";
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.35s ease",
          }}
        />
        {tag && (
          <span
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              padding: "0.2rem 0.55rem",
              borderRadius: "var(--sd-radius-full)",
              backgroundColor: "var(--sd-primary)",
              color: "#ffffff",
              fontSize: "0.65rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              boxShadow: "0 2px 4px rgba(255, 87, 34, 0.3)",
            }}
          >
            {tag}
          </span>
        )}
      </div>

      {/* Body Info */}
      <div style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h4
            style={{
              margin: "0 0 0.15rem 0",
              fontSize: "0.95rem",
              fontWeight: "700",
              color: "var(--sd-text-primary)",
            }}
          >
            {name}
          </h4>
          <span style={{ fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
            {count || "Khám phá ngay"}
          </span>
        </div>

        <span
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            backgroundColor: "var(--sd-bg-muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--sd-primary)",
            fontWeight: "700",
            fontSize: "0.8rem",
          }}
        >
          →
        </span>
      </div>
    </motion.div>
  );
}
