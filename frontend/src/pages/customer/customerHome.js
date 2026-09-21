import { API_URLS } from '../../config/api';
import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  FaSearch, 
  FaUtensils, 
  FaTimes,
  FaRedo,
  FaFilter,
  FaSortAmountDown,
  FaMotorcycle,
  FaStar,
  FaArrowRight
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

  const totalMenuItems = Object.values(foodsMap).reduce((total, items) => total + items.length, 0);
  const hasActiveFilters = searchQuery.trim() || selectedCategory !== "Tất cả" || !onlyOpen;

  return (
    <div className="customer-experience customer-marketplace" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main className="marketplace-main" style={{ flex: 1 }}>
        <div className="sd-container">
          <section className="marketplace-hero">
            <div className="marketplace-hero-copy">
              <span className="marketplace-eyebrow"><FaUtensils /> SkyDish food marketplace</span>
              <h1>Hôm nay, bạn muốn<br /><em>ăn món gì?</em></h1>
              <p>Khám phá thực đơn tươi ngon từ những nhà hàng được yêu thích. Chọn món, theo dõi đơn và tận hưởng bữa ăn của bạn.</p>

              <div className="marketplace-search-shell">
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

              <div className="marketplace-quick-meta">
                <span><FaMotorcycle /> Dễ dàng theo dõi đơn</span>
                <span><FaStar /> Lưu quán yêu thích</span>
              </div>
            </div>

            <aside className="marketplace-hero-panel" aria-label="Tổng quan thực đơn">
              <div className="marketplace-panel-highlight">
                <span>Khám phá hôm nay</span>
                <strong>{loading ? "..." : filteredRestaurants.length}</strong>
                <small>nhà hàng phù hợp với bạn</small>
              </div>
              <div className="marketplace-panel-row">
                <span><FaUtensils /> Thực đơn</span>
                <strong>{totalMenuItems || "Nhiều"} món</strong>
              </div>
              <div className="marketplace-panel-row">
                <span><FaMotorcycle /> Trạng thái</span>
                <strong>{onlyOpen ? "Đang mở cửa" : "Tất cả quán"}</strong>
              </div>
              <button type="button" className="marketplace-panel-link" onClick={() => document.getElementById("restaurant-results")?.scrollIntoView({ behavior: "smooth" })}>
                Xem nhà hàng <FaArrowRight />
              </button>
            </aside>
          </section>

          <section className="marketplace-categories" aria-label="Danh mục món ăn">
            <div className="marketplace-section-kicker">Chọn nhanh theo khẩu vị</div>
            <div className="marketplace-category-row">
              {categories.map((cat) => {
                const isActive = selectedCategory === cat;
                const categoryFoodCount = cat === "Tất cả"
                  ? totalMenuItems
                  : Object.values(foodsMap).flat().filter((food) => {
                    const foodCategory = String(food.category || "").toLowerCase();
                    return foodCategory && (foodCategory.includes(cat.toLowerCase()) || cat.toLowerCase().includes(foodCategory));
                  }).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`marketplace-category-chip ${isActive ? "is-active" : ""}`}
                  >
                    <span>{cat}</span>
                    {categoryFoodCount > 0 && <small>{categoryFoodCount}</small>}
                  </button>
                );
              })}
            </div>
          </section>

          <section id="restaurant-results" className="marketplace-results">
          <div className="marketplace-results-toolbar">
            <div>
              <span className="marketplace-section-kicker">Nhà hàng dành cho bạn</span>
              <h2>
                {selectedCategory === "Tất cả" ? "Tất cả nhà hàng" : `Nhà hàng ${selectedCategory}`}
              </h2>
              <p>
                Đang hiển thị {filteredRestaurants.length} nhà hàng{onlyOpen ? " đang mở cửa" : ""}
              </p>
            </div>

            <div className="marketplace-controls">
              <label className="marketplace-sort-control">
                <FaSortAmountDown />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="recommended">Đề xuất</option>
                  <option value="name">Tên (A-Z)</option>
                  <option value="menu">Nhiều món nhất</option>
                </select>
              </label>

              <label className="marketplace-open-toggle">
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
                disabled={!hasActiveFilters}
              >
                Đặt lại
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
            <div className="marketplace-restaurant-grid">
              {filteredRestaurants.map((rest, index) => (
                <RestaurantCard
                  key={rest._id || index}
                  restaurant={rest}
                  menuItemCount={(foodsMap[rest._id] || []).length}
                  isFavorite={!!favoriteRestaurants[rest._id || rest.id]}
                  onFavoriteToggle={toggleFavoriteRestaurant}
                />
              ))}
            </div>
          )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CustomerHome;
