import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaStar, 
  FaMapMarkerAlt, 
  FaMotorcycle,
  FaUtensils,
  FaHeart, 
  FaRegHeart 
} from "react-icons/fa";
import Badge from "./Badge";
import { resolveImageUrl, handleImageError } from "../../utils/imageHelper";

export default function RestaurantCard({ 
  restaurant, 
  onFavoriteToggle, 
  isFavorite: initialFavorite = false,
  menuItemCount = 0
}) {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  if (!restaurant) return null;

  const id = restaurant._id || restaurant.id;
  const name = restaurant.name || "Nhà hàng đối tác";
  const location = restaurant.location || "Địa chỉ đang cập nhật";
  const availability = restaurant.availability !== false; // default true
  const cuisineSource = restaurant.cuisine || restaurant.cuisines || restaurant.category || restaurant.foodCategory;
  const cuisine = Array.isArray(cuisineSource) ? cuisineSource.filter(Boolean).join(" · ") : cuisineSource;
  const deliveryTime = restaurant.deliveryTime || restaurant.estimatedDeliveryTime || restaurant.deliveryDuration ||
    (restaurant.deliveryTimeMinutes ? `${restaurant.deliveryTimeMinutes} phút` : "");
  const distance = typeof restaurant.distance === "number" ? `${restaurant.distance} km` : (restaurant.distance || restaurant.distanceKm ? `${restaurant.distance || restaurant.distanceKm}${restaurant.distance ? "" : " km"}` : "");
  const promotionSource = restaurant.promotion || restaurant.promo || restaurant.discountLabel || restaurant.offer;
  const promotion = typeof promotionSource === "string" ? promotionSource : (promotionSource?.label || promotionSource?.title || "");
  
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
      whileHover={{ y: -8, scale: 1.005 }}
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
        borderRadius: "24px",
        border: "1px solid rgba(24, 32, 29, 0.08)",
        overflow: "hidden",
        boxShadow: "0 18px 30px -25px rgba(15, 23, 42, 0.38)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        transition: "box-shadow 0.2s ease, transform 0.2s ease, border-color 0.2s ease",
      }}
      className="sd-card-interactive restaurant-card premium-restaurant-card"
    >
      {/* Image Container with Badges */}
      <div className="restaurant-card-media" style={{ position: "relative", height: "210px", width: "100%", overflow: "hidden", backgroundColor: "#f5f3ee" }}>
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

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11, 17, 15, 0.08), rgba(11, 17, 15, 0.15))", pointerEvents: "none" }} />

        {promotion && <span className="restaurant-promo-badge">{promotion}</span>}

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
            backgroundColor: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(4px)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isFavorite ? "#d94a2d" : "#4b463f",
            cursor: "pointer",
            boxShadow: "0 8px 16px -12px rgba(15, 23, 42, 0.4)",
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
                padding: "0.28rem 0.64rem",
                borderRadius: "999px",
                backgroundColor: "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(4px)",
                color: "#1c1b1a",
                fontWeight: "800",
                fontSize: "0.75rem",
                boxShadow: "0 10px 16px -12px rgba(15, 23, 42, 0.5)",
              }}
            >
              <FaStar style={{ color: "#f59e0b" }} /> {restaurant.rating}
            </span>
          ) : null}
          <Badge variant={availability ? "success" : "danger"} size="sm" className="premium-badge">
            {availability ? "Đang mở cửa" : "Đã đóng cửa"}
          </Badge>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="restaurant-card-content" style={{ padding: "1.15rem 1.1rem 1rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(180deg, #fffdfd 0%, #fff 100%)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <h3
              style={{
                margin: 0,
                fontSize: "1.18rem",
                fontWeight: "700",
                color: "#1d1b1a",
                lineHeight: "1.35",
                letterSpacing: "-0.02em",
              }}
            >
              {name}
            </h3>
          </div>

          <p
            className="restaurant-card-location"
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "0.88rem",
              color: "#5d5652",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <FaMapMarkerAlt style={{ color: "#d94a2d", flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {location}
            </span>
          </p>

          {(cuisine || deliveryTime || distance) && (
            <div className="restaurant-card-meta" aria-label="Thông tin nhà hàng">
              {cuisine && <span className="restaurant-card-cuisine">{cuisine}</span>}
              {menuItemCount > 0 && <span><FaUtensils /> {menuItemCount} món</span>}
              {deliveryTime && <span><FaMotorcycle /> {deliveryTime}</span>}
              {distance && <span><FaMapMarkerAlt /> {distance}</span>}
            </div>
          )}
        </div>

        {/* Footer Meta Row */}
        <div
          style={{
            paddingTop: "0.8rem",
            borderTop: "1px solid #efe7e2",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.8rem",
            color: "#5d5652",
            marginTop: "0.5rem",
          }}
        >
          <span style={{ color: "#7a706b", fontSize: "0.78rem" }}>
            {restaurant.ownerName ? `Chủ quán: ${restaurant.ownerName}` : ""}
          </span>

          <span
            style={{
              fontWeight: "700",
              color: "#d74b2d",
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
