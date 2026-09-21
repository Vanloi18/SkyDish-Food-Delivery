import { API_URLS } from '../../config/api';
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  FaSearch, 
  FaUtensils, 
  FaTimes,
  FaRedo,
  FaFilter,
  FaSortAmountDown
} from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import RestaurantCard from "../../components/common/RestaurantCard";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";

function CustomerHome() {
  const [restaurants, setRestaurants] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [sortBy, setSortBy] = useState("recommended");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchParams] = useSearchParams();
  const [foodsMap, setFoodsMap] = useState({});
  const [favoriteRestaurants, setFavoriteRestaurants] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("skydish_favorite_restaurants")) || {};
    } catch {
      return {};
    }
  });

  const categories = [
    "Tất cả", 
    "Phở", 
    "Bún chả", 
    "Cơm", 
    "Bánh mì", 
    "Pizza", 
    "Lẩu", 
    "Đồ ăn nhanh", 
    "Đồ uống", 
    "Tráng miệng"
  ];

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearchQuery(q);

    const cat = searchParams.get("category");
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem("skydish_favorite_restaurants", JSON.stringify(favoriteRestaurants));
  }, [favoriteRestaurants]);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [restRes, foodRes] = await Promise.all([
        fetch(`${API_URLS.RESTAURANT}/api/restaurant`).then((r) => r.ok ? r.json() : []),
        fetch(`${API_URLS.RESTAURANT}/api/food-items/all`).then((r) => r.ok ? r.json() : []),
      ]);

      if (Array.isArray(restRes)) {
        setRestaurants(restRes);
      } else {
        setError("Không thể tải danh sách nhà hàng");
      }

      if (Array.isArray(foodRes)) {
        const map = {};
        foodRes.forEach((f) => {
          const restId = typeof f.restaurant === "object" ? f.restaurant?._id : f.restaurant;
          if (restId) {
            if (!map[restId]) map[restId] = [];
            map[restId].push(f);
          }
        });
        setFoodsMap(map);
      }
    } catch (err) {
      console.error("Restaurant fetch error:", err);
      setError("Không thể kết nối đến Dịch vụ Nhà hàng. Vui lòng kiểm tra lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  // Filter & Sort Logic
  const filteredRestaurants = restaurants
    .filter((r) => {
      const name = (r.name || "").toLowerCase();
      const loc = (r.location || "").toLowerCase();
      const owner = (r.ownerName || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const rFoods = foodsMap[r._id] || [];
      const foodNames = rFoods.map((f) => (f.name || "").toLowerCase()).join(" ");
      const foodCategories = rFoods.map((f) => (f.category || "").toLowerCase());

      // Search matching
      const matchesSearch = !q || name.includes(q) || loc.includes(q) || owner.includes(q) || foodNames.includes(q);

      // Category matching
      let matchesCategory = selectedCategory === "Tất cả";
      if (!matchesCategory) {
        const catLower = selectedCategory.toLowerCase();
        const hasFoodCategory = foodCategories.some((c) => c.includes(catLower) || catLower.includes(c));
        const nameHasCategory = name.includes(catLower);
        matchesCategory = hasFoodCategory || nameHasCategory;
      }

      const matchesAvailability = !onlyOpen || r.availability !== false;
      return matchesSearch && matchesCategory && matchesAvailability;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "menu") {
        return (foodsMap[b._id] || []).length - (foodsMap[a._id] || []).length;
      }
      // Recommended: open restaurants first, then restaurants with more available choices.
      const availabilityDiff = Number(b.availability !== false) - Number(a.availability !== false);
      if (availabilityDiff) return availabilityDiff;
      return (foodsMap[b._id] || []).length - (foodsMap[a._id] || []).length;
    });

  const toggleFavoriteRestaurant = (restaurantId, isFavorite) => {
    if (!restaurantId) return;
    setFavoriteRestaurants((prev) => ({ ...prev, [restaurantId]: isFavorite }));
  };

  return (
    <div className="customer-experience customer-marketplace" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          {/* Marketplace Hero Header */}
          <div style={{ textAlign: "center", maxWidth: "780px", margin: "0 auto 2.5rem auto" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--sd-radius-full)",
                backgroundColor: "var(--sd-primary-light)",
                color: "var(--sd-primary)",
                fontSize: "var(--sd-font-size-xs)",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.75rem",
              }}
            >
              <FaUtensils /> Giao đồ ăn tận nơi khắp thành phố
            </span>
            <h1 className="sd-heading-1" style={{ marginBottom: "0.5rem" }}>
              Khám phá nhà hàng & quán ăn
            </h1>
            <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-base)" }}>
              Đặt những món ăn yêu thích từ các nhà hàng hàng đầu với dịch vụ giao hàng nhanh trong 30 phút.
            </p>

            {/* Integrated Search & Filter Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                maxWidth: "620px",
                margin: "1.75rem auto 1rem auto",
                backgroundColor: "#ffffff",
                border: "2px solid var(--sd-border)",
                borderRadius: "var(--sd-radius-full)",
                padding: "0.4rem 0.6rem 0.4rem 1.25rem",
                boxShadow: "var(--sd-shadow-sm)",
                transition: "all var(--sd-transition-fast)",
              }}
            >
              <FaSearch style={{ color: "var(--sd-text-muted)", marginRight: "0.75rem" }} />
              <input
                type="text"
                placeholder="Tìm kiếm nhà hàng, địa điểm hoặc món ăn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "var(--sd-font-size-sm)",
                  color: "var(--sd-text-primary)",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--sd-text-muted)",
                    padding: "0.4rem",
                    cursor: "pointer",
                  }}
                  title="Xóa tìm kiếm"
                >
                  <FaTimes size={14} />
                </button>
              )}
            </div>

            {/* Category Filter Chips Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "1.25rem",
              }}
            >
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: "0.45rem 1.1rem",
                      borderRadius: "var(--sd-radius-full)",
                      fontSize: "var(--sd-font-size-xs)",
                      fontWeight: isActive ? "700" : "500",
                      border: "1px solid",
                      borderColor: isActive ? "var(--sd-primary)" : "var(--sd-border)",
                      backgroundColor: isActive ? "var(--sd-primary)" : "#ffffff",
                      color: isActive ? "#ffffff" : "var(--sd-text-secondary)",
                      cursor: "pointer",
                      boxShadow: isActive ? "0 2px 8px rgba(255, 87, 34, 0.3)" : "var(--sd-shadow-xs)",
                      transition: "all var(--sd-transition-fast)",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results Header & Sorting Controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.75rem",
              paddingBottom: "1rem",
              borderBottom: "1px solid var(--sd-border)",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800", color: "var(--sd-secondary)" }}>
                {selectedCategory === "Tất cả" ? "Tất cả nhà hàng" : `Nhà hàng ${selectedCategory}`}
              </h2>
              <span style={{ fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-muted)" }}>
                Đang hiển thị {filteredRestaurants.length} nhà hàng{onlyOpen ? " đang mở cửa" : ""}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-secondary)" }}>
                <FaSortAmountDown />
                <span>Sắp xếp theo:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "var(--sd-radius-md)",
                    border: "1px solid var(--sd-border)",
                    backgroundColor: "#ffffff",
                    fontSize: "var(--sd-font-size-xs)",
                    color: "var(--sd-text-primary)",
                    outline: "none",
                  }}
                >
                  <option value="recommended">Đề xuất</option>
                  <option value="name">Tên (A-Z)</option>
                  <option value="menu">Nhiều món nhất</option>
                </select>
              </div>

              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "var(--sd-font-size-xs)", color: "var(--sd-text-secondary)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={onlyOpen}
                  onChange={(event) => setOnlyOpen(event.target.checked)}
                />
                Đang mở cửa
              </label>

              <Button
                variant="outline"
                size="sm"
                icon={FaFilter}
                onClick={() => {
                  setSelectedCategory("Tất cả");
                  setSearchQuery("");
                  setOnlyOpen(true);
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div
              style={{
                maxWidth: "600px",
                margin: "0 auto 2rem auto",
                padding: "1.25rem 1.5rem",
                backgroundColor: "var(--sd-danger-light)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "var(--sd-radius-lg)",
                color: "var(--sd-danger-hover)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <p style={{ margin: 0, fontWeight: "600" }}>{error}</p>
              <Button variant="outline" size="sm" icon={FaRedo} onClick={fetchRestaurants}>
                Thử lại
              </Button>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading ? (
            <LoadingSkeleton type="card" count={6} />
          ) : filteredRestaurants.length === 0 ? (
            <EmptyState
              icon={FaUtensils}
              title="Không tìm thấy nhà hàng"
              description={
                searchQuery
                  ? `Không tìm thấy nhà hàng nào khớp với "${searchQuery}". Vui lòng thử từ khóa khác hoặc xóa bộ lọc.`
                  : "Hiện tại chưa có nhà hàng đối tác nào hoạt động trong hệ thống."
              }
              actionLabel={searchQuery ? "Xóa bộ lọc tìm kiếm" : "Làm mới danh sách"}
              onAction={searchQuery ? () => setSearchQuery("") : fetchRestaurants}
            />
          ) : (
            /* Restaurant Grid */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                gap: "2rem",
              }}
            >
              {filteredRestaurants.map((rest, index) => (
                <RestaurantCard
                  key={rest._id || index}
                  restaurant={rest}
                  isFavorite={!!favoriteRestaurants[rest._id || rest.id]}
                  onFavoriteToggle={toggleFavoriteRestaurant}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CustomerHome;
