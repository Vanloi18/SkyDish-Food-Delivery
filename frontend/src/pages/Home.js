import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaArrowRight } from "react-icons/fa";
import Header from "../components/Header";
import Footer from "../components/Footer";
import RestaurantCard from "../components/common/RestaurantCard";
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

const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const navigate = useNavigate();

  // Fetch live restaurants from backend for showcase
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const res = await fetch("http://localhost:5002/api/restaurant");
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setRestaurants(data.slice(0, 8));
        }
      } catch (err) {
        console.warn("Featured restaurants fetch note:", err.message);
      }
    };
    fetchRestaurants();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/customer/home?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/customer/home");
    }
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
                <form onSubmit={handleSearchSubmit} className="landing-hero-search">
                  <FaSearch style={{ color: "#94a3b8", marginRight: "0.5rem" }} />
                  <input
                    type="text"
                    className="landing-search-input"
                    placeholder="Tìm món ăn, nhà hàng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit" className="landing-search-btn">
                    Tìm món
                  </button>
                </form>

                {/* Quick Search Chips */}
                <div className="landing-hero-tags">
                  <span className="landing-tag-label">Gợi ý:</span>
                  {quickSearchTags.map((tag) => (
                    <span
                      key={tag}
                      className="landing-tag-chip"
                      onClick={() => navigate(`/customer/home?q=${encodeURIComponent(tag)}`)}
                    >
                      {tag}
                    </span>
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
                <div className="landing-hero-img-container">
                  <img
                    src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&auto=format&fit=crop&q=80"
                    alt="Món ngon giao tận nơi SkyDish"
                    className="landing-hero-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            2. POPULAR CATEGORIES (Lightweight Horizontal Flow)
            ==================================================================== */}
        <section className="landing-categories-section">
          <div className="sd-container">
            <div className="landing-section-header">
              <div className="landing-section-title-group">
                <h2 className="landing-section-title">Danh mục món ăn</h2>
                <p className="landing-section-subtitle">
                  Khám phá thực đơn phong phú từ các nhóm món được yêu thích nhất
                </p>
              </div>
              <Link to="/customer/home" className="landing-section-link">
                Xem toàn bộ <FaArrowRight size={12} />
              </Link>
            </div>

            <div className="landing-categories-grid">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className="landing-category-pill-card"
                  onClick={() => navigate(`/customer/home?category=${encodeURIComponent(cat.name)}`)}
                >
                  <div className="landing-category-img-box">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="landing-category-img"
                      loading="lazy"
                    />
                  </div>
                  <h3 className="landing-category-name">{cat.name}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            3. FEATURED RESTAURANTS (Real Backend Data)
            ==================================================================== */}
        <section className="landing-featured-section">
          <div className="sd-container">
            <div className="landing-section-header">
              <div className="landing-section-title-group">
                <h2 className="landing-section-title">Nhà hàng nổi bật</h2>
                <p className="landing-section-subtitle">
                  Những địa điểm ẩm thực được đánh giá cao và yêu thích gần bạn
                </p>
              </div>
              <Link to="/customer/home" className="landing-section-link">
                Xem tất cả ({restaurants.length > 0 ? `${restaurants.length} nhà hàng` : "Xem thêm"}) <FaArrowRight size={12} />
              </Link>
            </div>

            <div className="landing-restaurants-grid">
              {restaurants.map((rest) => (
                <RestaurantCard key={rest._id} restaurant={rest} />
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. HOW SKYDISH WORKS (Simple Linear Rhythm)
            ==================================================================== */}
        <section className="landing-how-section">
          <div className="sd-container">
            <div className="landing-section-header">
              <div className="landing-section-title-group">
                <h2 className="landing-section-title">Cách SkyDish hoạt động</h2>
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
