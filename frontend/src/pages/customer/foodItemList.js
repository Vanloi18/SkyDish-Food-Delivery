import { API_URLS } from '../../config/api';
import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { 
  FaArrowLeft, 
  FaMapMarkerAlt, 
  FaPhoneAlt, 
  FaStar, 
  FaHeart, 
  FaPlus, 
  FaShoppingCart, 
  FaUtensils, 
  FaCheck,
  FaExclamationCircle
} from "react-icons/fa";
import { CartContext } from "../contexts/CartContext";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { formatCurrency } from "../../utils/currency";
import { resolveImageUrl, handleImageError } from "../../utils/imageHelper";

function FoodItemList() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const { addToCart, totalItemCount, totalAmount } = useContext(CartContext);

  const [foods, setFoods] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [foodQuery, setFoodQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("skydish_favorite_foods")) || {};
    } catch {
      return {};
    }
  });
  const [addedItemToast, setAddedItemToast] = useState(null);

  useEffect(() => {
    localStorage.setItem("skydish_favorite_foods", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        // 1. Fetch Restaurant Foods
        const foodRes = await axios.get(
          `${API_URLS.RESTAURANT}/api/food-items/restaurant/${restaurantId}`,
          { headers }
        );
        const foodList = Array.isArray(foodRes.data) ? foodRes.data : [];
        setFoods(foodList);

        // 2. Fetch Restaurant Info
        try {
          const restRes = await axios.get(
            `${API_URLS.RESTAURANT}/api/restaurant/${restaurantId}`
          );
          setRestaurant(restRes.data);
        } catch {
          setRestaurant({ name: "Nhà hàng SkyDish", location: "Trung tâm ẩm thực" });
        }
      } catch (err) {
        console.error("Food items load error:", err);
        setError("Không thể tải danh sách món ăn của nhà hàng này. Vui lòng kiểm tra lại kết nối.");
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) fetchData();
  }, [restaurantId]);

  const toggleFavorite = (foodId) => {
    setFavorites((prev) => ({
      ...prev,
      [foodId]: !prev[foodId],
    }));
  };

  const handleAddToCart = (food) => {
    const isRestaurantAvailable = restaurant?.availability !== false;
    if (food.availability === false || !isRestaurantAvailable) {
      setAddedItemToast({
        type: "warning",
        text: food.availability === false ? "Món này hiện đã hết. Vui lòng chọn món khác." : "Nhà hàng hiện đang tạm đóng cửa.",
      });
      setTimeout(() => setAddedItemToast(null), 3000);
      return;
    }

    // Explicitly attach restaurantId and restaurantName so Cart & Checkout can resolve them instantly.
    const targetRestId =
      restaurantId ||
      (typeof food.restaurant === "object" ? food.restaurant?._id : food.restaurant) ||
      food.restaurantId ||
      "";
    const targetRestName =
      restaurant?.name ||
      (typeof food.restaurant === "object" ? food.restaurant?.name : "") ||
      food.restaurantName ||
      "";

    const result = addToCart({ ...food, restaurantId: targetRestId, restaurantName: targetRestName }, 1);
    if (!result?.added) {
      setAddedItemToast({
        type: "warning",
        text: `Giỏ hàng đang có món từ ${result?.restaurantName || "một nhà hàng khác"}. Hãy hoàn tất hoặc xóa giỏ hiện tại trước.`,
      });
      setTimeout(() => setAddedItemToast(null), 3500);
      return;
    }

    setAddedItemToast({ type: "success", text: `Đã thêm ${food.name} vào giỏ hàng!` });
    setTimeout(() => setAddedItemToast(null), 2500);
  };

  // Derive unique categories
  const rawCategories = Array.from(new Set(foods.map((f) => f.category).filter(Boolean)));
  const availableCategories = ["Tất cả", ...rawCategories];

  const filteredFoods = (selectedCategory === "Tất cả"
    ? foods
    : foods.filter((f) => f.category?.toLowerCase() === selectedCategory.toLowerCase()))
    .filter((food) => {
      const query = foodQuery.trim().toLowerCase();
      return !query || [food.name, food.description, food.category].some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });

  return (
    <div className="customer-experience customer-menu-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      {/* Added to cart Toast */}
      <AnimatePresence>
        {addedItemToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            style={{
              position: "fixed",
              top: "90px",
              left: "50%",
              backgroundColor: addedItemToast.type === "success" ? "var(--sd-secondary)" : "#b45309",
              color: "#ffffff",
              padding: "0.75rem 1.5rem",
              borderRadius: "var(--sd-radius-full)",
              boxShadow: "var(--sd-shadow-xl)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              zIndex: 1100,
              fontSize: "var(--sd-font-size-sm)",
              fontWeight: "600",
            }}
          >
            {addedItemToast.type === "success" ? <FaCheck style={{ color: "var(--sd-success)" }} /> : <FaExclamationCircle />}
            <span>{addedItemToast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main style={{ flex: 1, padding: "2rem 0 5rem 0" }}>
        <div className="sd-container">
          {/* Back to restaurants button */}
          <button
            type="button"
            onClick={() => navigate("/customer/home")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#ffffff",
              border: "1px solid var(--sd-border)",
              borderRadius: "var(--sd-radius-full)",
              color: "var(--sd-text-primary)",
              fontSize: "var(--sd-font-size-sm)",
              fontWeight: "600",
              cursor: "pointer",
              marginBottom: "1.5rem",
              boxShadow: "var(--sd-shadow-xs)",
              transition: "all var(--sd-transition-fast)",
            }}
          >
            <FaArrowLeft size={12} /> Quay lại danh sách nhà hàng
          </button>

          {/* Restaurant Header Banner */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "var(--sd-radius-xl)",
              border: "1px solid var(--sd-border)",
              padding: "2rem",
              boxShadow: "var(--sd-shadow-sm)",
              marginBottom: "2.5rem",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "var(--sd-radius-lg)",
                  backgroundColor: "var(--sd-primary-light)",
                  color: "var(--sd-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  border: "1px solid var(--sd-border)",
                  flexShrink: 0,
                }}
              >
                {restaurant?.profilePicture ? (
                  <img
                    src={resolveImageUrl(restaurant.profilePicture, "restaurant")}
                    alt={restaurant.name || "Nhà hàng"}
                    onError={(e) => handleImageError(e, "restaurant")}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <FaUtensils size={32} />
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <h1 className="sd-heading-2" style={{ margin: 0 }}>
                    {restaurant?.name || "Thực đơn nhà hàng"}
                  </h1>
                  <Badge variant={restaurant?.availability === false ? "danger" : "success"} size="sm">
                    {restaurant?.availability === false ? "Tạm đóng cửa" : "Đang mở cửa"}
                  </Badge>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  {restaurant?.location && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-secondary)" }}>
                      <FaMapMarkerAlt style={{ color: "var(--sd-primary)" }} /> {restaurant.location}
                    </span>
                  )}
                  {restaurant?.contactNumber && (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-secondary)" }}>
                      <FaPhoneAlt style={{ color: "var(--sd-success)" }} /> {restaurant.contactNumber}
                    </span>
                  )}
                  <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "600", color: "#f59e0b" }}>
                    <FaStar /> 4.8 (120+ Đánh giá)
                  </span>
                </div>
              </div>
            </div>

            <Link to="/customer/cart">
              <Button variant="primary" icon={FaShoppingCart}>
                Xem giỏ hàng ({totalItemCount})
              </Button>
            </Link>
          </motion.div>

          {/* Category Tabs */}
          {availableCategories.length > 1 && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                overflowX: "auto",
                paddingBottom: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "0.5rem 1.25rem",
                    borderRadius: "var(--sd-radius-full)",
                    fontSize: "var(--sd-font-size-sm)",
                    fontWeight: "600",
                    border: "1px solid",
                    borderColor: selectedCategory === cat ? "var(--sd-primary)" : "var(--sd-border)",
                    backgroundColor: selectedCategory === cat ? "var(--sd-primary)" : "#ffffff",
                    color: selectedCategory === cat ? "#ffffff" : "var(--sd-text-secondary)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all var(--sd-transition-fast)",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {!loading && foods.length > 0 && (
            <div style={{ marginBottom: "1.5rem", maxWidth: "460px" }}>
              <label htmlFor="food-search" style={{ display: "block", marginBottom: "0.4rem", fontSize: "var(--sd-font-size-xs)", fontWeight: "700", color: "var(--sd-text-secondary)" }}>
                Tìm trong thực đơn
              </label>
              <input
                id="food-search"
                type="search"
                value={foodQuery}
                onChange={(event) => setFoodQuery(event.target.value)}
                placeholder="Tên món, danh mục hoặc mô tả..."
                style={{ width: "100%", padding: "0.7rem 0.85rem", border: "1px solid var(--sd-border)", borderRadius: "var(--sd-radius-md)", backgroundColor: "#ffffff", fontSize: "var(--sd-font-size-sm)" }}
              />
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              style={{
                padding: "1rem 1.5rem",
                backgroundColor: "var(--sd-danger-light)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "var(--sd-radius-md)",
                color: "var(--sd-danger-hover)",
                textAlign: "center",
                marginBottom: "2rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Food Items List */}
          {loading ? (
            <LoadingSkeleton type="card" count={6} />
          ) : filteredFoods.length === 0 ? (
            <EmptyState
              icon={FaUtensils}
              title="Không có món trong danh mục này"
              description="Nhà hàng hiện chưa có món ăn nào trong danh mục đã chọn."
              actionLabel={foodQuery ? "Xóa tìm kiếm" : "Xem tất cả món"}
              onAction={() => {
                setSelectedCategory("Tất cả");
                setFoodQuery("");
              }}
            />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.75rem",
              }}
            >
              {filteredFoods.map((food) => {
                const isFav = !!favorites[food._id];
                const isAvailable = food.availability !== false && restaurant?.availability !== false;
                return (
                  <motion.div
                    key={food._id}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "var(--sd-radius-xl)",
                      border: "1px solid var(--sd-border)",
                      overflow: "hidden",
                      boxShadow: "var(--sd-shadow-sm)",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                    }}
                  >
                    {/* Food Image */}
                    <div style={{ position: "relative", height: "180px", backgroundColor: "#f1f5f9" }}>
                      <img
                        src={resolveImageUrl(food.image, "food")}
                        alt={food.name}
                        onError={(e) => handleImageError(e, "food")}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(food._id)}
                        title="Thêm vào yêu thích"
                        style={{
                          position: "absolute",
                          top: "12px",
                          right: "12px",
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          border: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: isFav ? "var(--sd-danger)" : "#94a3b8",
                          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                          cursor: "pointer",
                          transition: "all var(--sd-transition-fast)",
                        }}
                      >
                        <FaHeart size={16} />
                      </button>

                      {food.category && (
                        <span
                          style={{
                            position: "absolute",
                            bottom: "12px",
                            left: "12px",
                            padding: "0.25rem 0.6rem",
                            borderRadius: "var(--sd-radius-full)",
                            backgroundColor: "rgba(15, 23, 42, 0.8)",
                            color: "#ffffff",
                            fontSize: "0.7rem",
                            fontWeight: "600",
                            backdropFilter: "blur(4px)",
                          }}
                        >
                          {food.category}
                        </span>
                      )}

                      {!isAvailable && (
                        <span
                          style={{ position: "absolute", bottom: "12px", right: "12px", padding: "0.25rem 0.6rem", borderRadius: "var(--sd-radius-full)", backgroundColor: "rgba(127, 29, 29, 0.88)", color: "#ffffff", fontSize: "0.7rem", fontWeight: "700" }}
                        >
                          {restaurant?.availability === false ? "Tạm đóng cửa" : "Tạm hết món"}
                        </span>
                      )}
                    </div>

                    {/* Food Info */}
                    <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <h4
                          style={{
                            margin: "0 0 0.4rem 0",
                            fontSize: "var(--sd-font-size-base)",
                            fontWeight: "700",
                            color: "var(--sd-text-primary)",
                          }}
                        >
                          {food.name}
                        </h4>
                        <p
                          style={{
                            margin: "0 0 1rem 0",
                            fontSize: "var(--sd-font-size-xs)",
                            color: "var(--sd-text-secondary)",
                            lineHeight: "1.5",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {food.description || "Được chế biến tươi mới từ nguyên liệu hảo hạng."}
                        </p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingTop: "0.75rem",
                          borderTop: "1px solid var(--sd-border)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "var(--sd-font-size-lg)",
                            fontWeight: "800",
                            color: "var(--sd-primary)",
                          }}
                        >
                          {formatCurrency(food.price)}
                        </span>

                        <Button
                          variant="primary"
                          size="sm"
                          icon={FaPlus}
                          onClick={() => handleAddToCart(food)}
                          disabled={!isAvailable}
                        >
                          {isAvailable ? "Thêm" : "Hết món"}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar if items exist */}
      {totalItemCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "var(--sd-secondary)",
            color: "#ffffff",
            borderRadius: "var(--sd-radius-full)",
            padding: "0.75rem 1.5rem",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            zIndex: 1000,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "var(--sd-primary)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "700",
                fontSize: "0.85rem",
              }}
            >
              {totalItemCount}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>Tạm tính giỏ hàng</p>
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: "700" }}>{formatCurrency(totalAmount)}</p>
            </div>
          </div>

          <Link to="/customer/cart">
            <Button variant="primary" size="sm" icon={FaShoppingCart}>
              Xem giỏ hàng
            </Button>
          </Link>
        </motion.div>
      )}

      <Footer />
    </div>
  );
}

export default FoodItemList;
