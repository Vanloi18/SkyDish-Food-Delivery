import { API_URLS } from '../config/api';
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaArrowRight, FaChevronLeft, FaChevronRight, FaStar, FaMotorcycle, FaShieldAlt } from "react-icons/fa";
import Header from "../components/Header";
import Footer from "../components/Footer";
import RestaurantCard from "../components/common/RestaurantCard";
import { handleImageError } from "../utils/imageHelper";
import "../styles/home.css";

const categories = [
  {
    name: "Phở",
    image: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Bún chả",
    image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Cơm",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Bánh mì",
    image: "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Pizza",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Lẩu",
    image: "https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Đồ ăn nhanh",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Đồ uống",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80"
  },
  {
    name: "Tráng miệng",
    image: "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=300&auto=format&fit=crop&q=80"
  },
];

const quickSearchTags = [
  "Phở Thìn",
  "Bún chả",
  "Cơm tấm",
  "Bánh mì",
  "Pizza 4P's",
  "Highlands Coffee"
];

const steps = [
  {
    num: "01",
    title: "Khám phá",
    desc: "Tìm kiếm nhà hàng yêu thích và món ăn hấp dẫn trong khu vực gần bạn."
  },
  {
    num: "02",
    title: "Chọn món",
    desc: "Tùy chọn khẩu phần, thêm gia vị và đưa vào giỏ hàng dễ dàng."
  },
  {
    num: "03",
    title: "Thanh toán",
    desc: "Linh hoạt qua Stripe, VNPay, MoMo hoặc nhận hàng trả tiền (COD)."
  },
  {
    num: "04",
    title: "Theo dõi đơn",
    desc: "Cập nhật tiến độ chuẩn bị và nhận món ăn nóng hổi tận cửa."
  }
];

/**
 * CategoryCarousel — horizontal auto-scrolling marketplace carousel
 *
 * Features:
 * - Desktop left/right arrow controls
 * - Touch swipe support with native momentum
 * - Mouse drag support without accidental click triggers
 * - Keyboard navigation (ArrowLeft / ArrowRight)
 * - Smooth horizontal scrolling without mandatory snap jumps
 * - Pause during user interaction (drag, touch, click, scroll, keyboard)
 * - Pause on hover and focus
 * - Resume after 3.0s idle (2–4 seconds specification)
 * - Disables auto-scroll under prefers-reduced-motion
 * - Avoid visual jumps (smooth loop back)
 * - Categories remain real project data
 */
function CategoryCarousel({ onCategoryClick }) {
  const trackRef = useRef(null);
  const autoScrollRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);

  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const ITEM_WIDTH = 148; // card width + gap
  const AUTO_SCROLL_STEP_MS = 3800; // subtle step advance every 3.8s
  const RESUME_IDLE_DELAY_MS = 3000; // 3 seconds idle resume (within 2-4s range)

  // Listen to prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e) => setPrefersReducedMotion(e.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // Update button visibility based on scroll position
  const updateScrollButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  // Schedule auto-scroll resume after idle delay
  const scheduleResume = useCallback(() => {
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsPaused(false);
    }, RESUME_IDLE_DELAY_MS);
  }, [RESUME_IDLE_DELAY_MS]);

  // Pause auto-scroll immediately upon interaction
  const pauseInteraction = useCallback(() => {
    setIsPaused(true);
    clearTimeout(resumeTimerRef.current);
  }, []);

  // Manual scroll by distance
  const scrollByAmount = useCallback((amount) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: prefersReducedMotion ? "auto" : "smooth" });
    setTimeout(updateScrollButtons, 350);
  }, [prefersReducedMotion, updateScrollButtons]);

  // Auto-scroll loop
  useEffect(() => {
    if (prefersReducedMotion) return;

    const tick = () => {
      if (isPaused) return;
      const el = trackRef.current;
      if (!el) return;

      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) {
        // Smoothly loop back to start without abrupt jumps
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: ITEM_WIDTH, behavior: "smooth" });
      }
      setTimeout(updateScrollButtons, 400);
    };

    autoScrollRef.current = setInterval(tick, AUTO_SCROLL_STEP_MS);
    return () => clearInterval(autoScrollRef.current);
  }, [isPaused, prefersReducedMotion, updateScrollButtons]);

  // Initial scroll button check
  useEffect(() => {
    updateScrollButtons();
  }, [updateScrollButtons]);

  // Mouse drag handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Primary click only
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragStartX.current = e.pageX;
    dragStartScroll.current = trackRef.current ? trackRef.current.scrollLeft : 0;
    setIsDraggingState(true);
    pauseInteraction();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current || !trackRef.current) return;
    const deltaX = e.pageX - dragStartX.current;
    if (Math.abs(deltaX) > 5) {
      hasDraggedRef.current = true;
    }
    trackRef.current.scrollLeft = dragStartScroll.current - deltaX;
    updateScrollButtons();
  }, [updateScrollButtons]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDraggingState(false);
      scheduleResume();
    }
  }, [scheduleResume]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Keyboard navigation when track is focused
  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollByAmount(ITEM_WIDTH * 2);
      pauseInteraction();
      scheduleResume();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollByAmount(-ITEM_WIDTH * 2);
      pauseInteraction();
      scheduleResume();
    }
  };

  const handleItemClick = (catName) => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    onCategoryClick(catName);
  };

  return (
    <div
      className="category-carousel-wrapper"
      onMouseEnter={pauseInteraction}
      onMouseLeave={scheduleResume}
      onFocus={pauseInteraction}
      onBlur={scheduleResume}
    >
      {/* Desktop Left Control */}
      {canScrollLeft && (
        <button
          type="button"
          className="carousel-nav-btn carousel-nav-btn--left"
          onClick={() => {
            scrollByAmount(-ITEM_WIDTH * 2.5);
            pauseInteraction();
            scheduleResume();
          }}
          aria-label="Cuộn danh mục sang trái"
          tabIndex={-1}
        >
          <FaChevronLeft size={13} />
        </button>
      )}

      {/* Carousel Track */}
      <div
        ref={trackRef}
        className={`category-carousel-track${isDraggingState ? " is-dragging" : ""}`}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        onTouchStart={pauseInteraction}
        onTouchEnd={scheduleResume}
        onScroll={() => {
          updateScrollButtons();
          if (!isDraggingRef.current) {
            pauseInteraction();
            scheduleResume();
          }
        }}
        tabIndex={0}
        role="region"
        aria-label="Danh mục món ăn — dùng phím mũi tên để duyệt"
      >
        {categories.map((cat) => (
          <div
            key={cat.name}
            className="category-carousel-item"
            onClick={() => handleItemClick(cat.name)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCategoryClick(cat.name);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label={`Xem danh mục ${cat.name}`}
          >
            <div className="category-carousel-img-box">
              <img
                src={cat.image}
                alt={cat.name}
                className="category-carousel-img"
                loading="lazy"
                draggable={false}
                onError={(e) => handleImageError(e, "food")}
              />
            </div>
            <span className="category-carousel-name">{cat.name}</span>
          </div>
        ))}
      </div>

      {/* Desktop Right Control */}
      {canScrollRight && (
        <button
          type="button"
          className="carousel-nav-btn carousel-nav-btn--right"
          onClick={() => {
            scrollByAmount(ITEM_WIDTH * 2.5);
            pauseInteraction();
            scheduleResume();
          }}
          aria-label="Cuộn danh mục sang phải"
          tabIndex={-1}
        >
          <FaChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

/**
 * RestaurantSkeletons — shimmer placeholders while real data loads
 */
function RestaurantSkeletons({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="restaurant-skeleton-card">
          <div className="restaurant-skeleton-img sd-skeleton" />
          <div className="restaurant-skeleton-body">
            <div className="restaurant-skeleton-line sd-skeleton" style={{ width: "70%" }} />
            <div className="restaurant-skeleton-line sd-skeleton" style={{ width: "45%", height: "0.75rem" }} />
            <div className="restaurant-skeleton-line sd-skeleton" style={{ width: "55%", height: "0.75rem" }} />
          </div>
        </div>
      ))}
    </>
  );
}

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  // Explicit states: "loading" | "success" | "empty" | "error"
  const [restaurantStatus, setRestaurantStatus] = useState("loading");
  const navigate = useNavigate();

  // Fetch live restaurants from backend for showcase
  const fetchRestaurants = useCallback(async () => {
    setRestaurantStatus("loading");
    try {
      const res = await fetch(`${API_URLS.RESTAURANT}/api/restaurant`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setRestaurants(data.slice(0, 8));
        setRestaurantStatus("success");
      } else {
        setRestaurants([]);
        setRestaurantStatus("empty");
      }
    } catch (err) {
      console.warn("Featured restaurants fetch error:", err.message);
      setRestaurants([]);
      setRestaurantStatus("error");
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customer/home?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/customer/home");
    }
  };

  const handleCategoryClick = (categoryName) => {
    navigate(`/customer/home?category=${encodeURIComponent(categoryName)}`);
  };

  return (
    <div className="landing-page-wrapper">
      <Header />

      <main className="landing-main-content">
        {/* ====================================================================
            1. HERO SECTION
            ==================================================================== */}
        <section className="landing-hero-section">
          <div className="sd-container">
            <div className="landing-hero-grid">
              {/* Left Column: Editorial Copy, Search, CTAs */}
              <div className="landing-hero-copy">
                <span className="landing-hero-eyebrow">
                  Ứng dụng giao đồ ăn SkyDish
                </span>

                <h1 className="landing-hero-title">
                  Đặt món ngon. <br />
                  <span>Giao tận cửa.</span>
                </h1>

                <p className="landing-hero-desc">
                  Khám phá hàng trăm nhà hàng yêu thích và nhận món ăn nóng hổi nhanh chóng ngay tại khu vực của bạn.
                </p>

                {/* Core Search Form */}
                <form onSubmit={handleSearchSubmit} className="landing-hero-search" role="search">
                  <FaSearch style={{ color: "#94a3b8", marginRight: "0.5rem", flexShrink: 0 }} />
                  <input
                    type="search"
                    className="landing-search-input"
                    placeholder="Tìm món ăn, nhà hàng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Tìm kiếm món ăn hoặc nhà hàng"
                  />
                  <button type="submit" className="landing-search-btn" aria-label="Tìm kiếm">
                    Tìm món
                  </button>
                </form>

                {/* Quick Search Chips */}
                <div className="landing-hero-tags" aria-label="Gợi ý tìm kiếm nhanh">
                  <span className="landing-tag-label">Gợi ý:</span>
                  {quickSearchTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="landing-tag-chip"
                      onClick={() => navigate(`/customer/home?q=${encodeURIComponent(tag)}`)}
                      aria-label={`Tìm kiếm ${tag}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Action CTAs */}
                <div className="landing-hero-actions">
                  <Link to="/customer/home" className="landing-btn-primary">
                    Khám phá nhà hàng <FaArrowRight size={13} />
                  </Link>
                  <Link to="/orders" className="landing-btn-secondary">
                    Xem đơn hàng
                  </Link>
                </div>
              </div>

              {/* Right Column: Clean Food Photography */}
              <div className="landing-hero-visual">
                <div className="landing-hero-ambient landing-hero-ambient--one" />
                <div className="landing-hero-ambient landing-hero-ambient--two" />
                <div className="landing-hero-img-container">
                  <img
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&auto=format&fit=crop&q=80"
                    alt="Món ngon giao tận nơi SkyDish"
                    className="landing-hero-img"
                  />
                </div>
                <div className="landing-hero-float-card landing-hero-rating-card">
                  <span className="landing-float-icon landing-float-icon--gold"><FaStar /></span>
                  <span><strong>Chọn món theo gu</strong><small>Hàng trăm món ngon chờ bạn</small></span>
                </div>
                <div className="landing-hero-float-card landing-hero-delivery-card">
                  <span className="landing-float-icon landing-float-icon--orange"><FaMotorcycle /></span>
                  <span><strong>Giao tận nơi</strong><small>Theo dõi đơn hàng dễ dàng</small></span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            2. POPULAR CATEGORIES — Professional Horizontal Carousel
            ==================================================================== */}
        <section className="landing-categories-section" aria-labelledby="categories-heading">
          <div className="sd-container">
            <div className="landing-section-header">
              <div className="landing-section-title-group">
                <h2 id="categories-heading" className="landing-section-title">Danh mục món ăn</h2>
                <p className="landing-section-subtitle">
                  Khám phá thực đơn phong phú từ các nhóm món được yêu thích nhất
                </p>
              </div>
              <Link to="/customer/home" className="landing-section-link">
                Xem toàn bộ <FaArrowRight size={12} />
              </Link>
            </div>

            <CategoryCarousel onCategoryClick={handleCategoryClick} />
          </div>
        </section>

        {/* ====================================================================
            3. FEATURED RESTAURANTS (Explicit States: Loading, Success, Empty, Error)
            ==================================================================== */}
        <section className="landing-featured-section" aria-labelledby="featured-heading">
          <div className="sd-container">
            <div className="landing-section-header">
              <div className="landing-section-title-group">
                <h2 id="featured-heading" className="landing-section-title">Nhà hàng nổi bật</h2>
                <p className="landing-section-subtitle">
                  Những địa điểm ẩm thực được đánh giá cao và yêu thích gần bạn
                </p>
              </div>
              <Link to="/customer/home" className="landing-section-link">
                Xem tất cả nhà hàng <FaArrowRight size={12} />
              </Link>
            </div>

            <div className="landing-restaurants-grid">
              {/* 1. Loading State: Skeleton shimmer placeholders */}
              {restaurantStatus === "loading" && (
                <RestaurantSkeletons count={4} />
              )}

              {/* 2. Success State with Data */}
              {restaurantStatus === "success" && (
                restaurants.map((rest) => (
                  <RestaurantCard key={rest._id} restaurant={rest} />
                ))
              )}

              {/* 3. Success Empty State */}
              {restaurantStatus === "empty" && (
                <div className="landing-restaurants-empty" role="status">
                  <p className="landing-empty-text">Chưa có dữ liệu</p>
                </div>
              )}

              {/* 4. Error State */}
              {restaurantStatus === "error" && (
                <div className="landing-restaurants-error" role="alert">
                  <p className="landing-error-text">Không thể tải dữ liệu</p>
                  <button
                    type="button"
                    className="landing-retry-btn"
                    onClick={fetchRestaurants}
                  >
                    Thử lại
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. HOW SKYDISH WORKS (Simple Linear Rhythm)
            ==================================================================== */}
        <section className="landing-how-section" aria-labelledby="how-heading">
          <div className="sd-container">
            <div className="landing-section-header">
              <div className="landing-section-title-group">
                <h2 id="how-heading" className="landing-section-title">Cách SkyDish hoạt động</h2>
                <p className="landing-section-subtitle">
                  Quy trình đặt và nhận món nhanh chóng chỉ trong 4 bước đơn giản
                </p>
              </div>
            </div>

            <div className="landing-how-grid">
              {steps.map((st) => (
                <div key={st.num} className="landing-how-step">
                  <span className="landing-step-number">{st.num}</span>
                  <h3 className="landing-step-title">{st.title}</h3>
                  <p className="landing-step-desc">{st.desc}</p>
                </div>
              ))}
            </div>

            <div className="landing-confidence-row" aria-label="Cam kết dịch vụ SkyDish">
              <span><FaShieldAlt /> Thanh toán bảo mật</span>
              <span><FaMotorcycle /> Theo dõi đơn hàng trực quan</span>
              <span><FaStar /> Đánh giá sau khi nhận món</span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            5. PROMOTIONAL CTA BANNER
            ==================================================================== */}
        <section className="landing-cta-section">
          <div className="sd-container">
            <div className="landing-cta-card">
              <h2 className="landing-cta-title">Đói rồi? Đặt món ngay.</h2>
              <p className="landing-cta-desc">
                Khám phá hàng trăm món ngon chuẩn vị từ các nhà hàng uy tín xung quanh bạn với SkyDish.
              </p>
              <Link to="/customer/home" className="landing-cta-btn">
                Khám phá nhà hàng <FaArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
