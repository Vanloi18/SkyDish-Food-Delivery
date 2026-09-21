import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaStar, 
  FaMapMarkerAlt, 
  FaHeart, 
  FaRegHeart 
} from "react-icons/fa";
import Badge from "./Badge";
import { resolveImageUrl, handleImageError } from "../../utils/imageHelper";

export default function RestaurantCard({ 
  restaurant, 
  onFavoriteToggle, 
  isFavorite: initialFavorite = false 
}) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  if (!restaurant) return null;

  const id = restaurant._id || restaurant.id;
  const name = restaurant.name || "Nhà hàng đối tác";
  const location = restaurant.location || "Trung tâm thành phố";
  const availability = restaurant.availability !== false; // default true
  
  // Format image URL safely with neutral SVG fallback
  const rawImage = restaurant.profilePicture || restaurant.imageURL || restaurant.image;
  const imageSrc = resolveImageUrl(rawImage, "restaurant");

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    if (onFavoriteToggle) onFavoriteToggle(id, !isFavorite);
  };

  const handleCardClick = () => {
    if (id) {
      navigate(`/customer/restaurant/${id}/foods`);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardClick();
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`Xem thực đơn ${name}`}
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
        transition: "box-shadow 0.2s ease",
      }}
      className="sd-card-interactive restaurant-card"
    >
      {/* Image Container with Badges */}
      <div className="restaurant-card-media" style={{ position: "relative", height: "190px", width: "100%", overflow: "hidden", backgroundColor: "#f1f5f9" }}>
        <img
          src={imageSrc}
          alt={name}
          onError={(e) => handleImageError(e, "restaurant")}
          className="restaurant-card-image"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.35s ease",
          }}
        />

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          aria-label="Lưu vào mục yêu thích"
          style={{
            position: "absolute",
            top: "12px",
            left: "12px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(4px)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isFavorite ? "var(--sd-primary)" : "var(--sd-text-secondary)",
            cursor: "pointer",
            boxShadow: "var(--sd-shadow-sm)",
            transition: "transform 0.15s ease, color 0.15s ease",
          }}
        >
          {isFavorite ? <FaHeart size={16} /> : <FaRegHeart size={16} />}
        </button>

        {/* Status & Verified Badges */}
        <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {restaurant.rating ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "var(--sd-radius-full)",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(4px)",
                color: "var(--sd-text-primary)",
                fontWeight: "700",
                fontSize: "0.75rem",
                boxShadow: "var(--sd-shadow-sm)",
              }}
            >
              <FaStar style={{ color: "#f59e0b" }} /> {restaurant.rating}
            </span>
          ) : null}
          <Badge variant={availability ? "success" : "danger"} size="sm">
            {availability ? "Đang mở cửa" : "Đã đóng cửa"}
          </Badge>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="restaurant-card-content" style={{ padding: "1.1rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "1.05rem",
                fontWeight: "600",
                color: "var(--sd-text-primary)",
                lineHeight: "1.35",
              }}
            >
              {name}
            </h3>
          </div>

          <p
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "0.825rem",
              color: "var(--sd-text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <FaMapMarkerAlt style={{ color: "var(--sd-primary)", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {location}
            </span>
          </p>
        </div>

        {/* Footer Meta Row */}
        <div
          style={{
            paddingTop: "0.65rem",
            borderTop: "1px solid var(--sd-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "var(--sd-text-secondary)",
            marginTop: "0.5rem",
          }}
        >
          <span style={{ color: "var(--sd-text-muted)", fontSize: "0.78rem" }}>
            {restaurant.ownerName ? `Chủ quán: ${restaurant.ownerName}` : "Đối tác chính thức"}
          </span>

          <span
            style={{
              fontWeight: "600",
              color: "var(--sd-primary)",
              display: "flex",
              alignItems: "center",
            }}
          >
            Xem thực đơn →
          </span>
        </div>
      </div>
    </motion.div>
  );
}
