import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FaArrowRight,
  FaPlay,
  FaVolumeMute,
  FaVolumeUp,
  FaTicketAlt,
  FaUtensils,
  FaTh,
  FaMobileAlt,
  FaHeart,
  FaRegHeart,
  FaBookmark,
  FaRegBookmark,
  FaShare,
  FaStar,
  FaShoppingBag,
  FaTimes,
  FaChevronUp,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaFire,
} from "react-icons/fa";
import { API_URLS } from "../config/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/restaurant-showcase.css";

const campaigns = [
  {
    id: "pizza-4ps",
    match: "Pizza 4P's",
    foodName: "Salad Phô Mai Burrata Trái Cây",
    price: 185000,
    prepTime: "12-15 phút",
    rating: 4.9,
    reviewsCount: "2.8k+",
    likesCount: 1420,
    type: "Pizza & Salad",
    badge: "Món thủ công 4P's",
    tag: "Được yêu thích",
    title: "Phô mai Burrata tươi mềm, salad trái cây thanh mát",
    description: "Phô mai Burrata mềm béo tự làm tại Đà Lạt kết hợp cùng trái cây tươi và pizza nướng lò củi thủ công chuẩn Nhật - Ý.",
    videoUrl: "/videos/salad.mp4",
    fallbackVideoUrl: "https://assets.mixkit.co/active_storage/video_items/100348/1723062327/100348-video-720.mp4",
    poster: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&auto=format&fit=crop&q=85",
    author: "Pizza 4P's Tràng Tiền",
  },
  {
    id: "pho-thin",
    match: "Phở Thìn",
    foodName: "Phở Bò Tái Lăn Truyền Thống",
    price: 85000,
    prepTime: "5-10 phút",
    rating: 4.8,
    reviewsCount: "3.4k+",
    likesCount: 2310,
    type: "Món Việt",
    badge: "Vị truyền thống 40 năm",
    tag: "Đặc sản Hà Nội",
    title: "Nước dùng trong, phở tái lăn ngập tràn hành hoa",
    description: "Thịt bò xào lăn lửa lớn xèo xèo thơm nức mũi, chan nước dùng hầm xương gia truyền sánh ngọt ngập tràn vị giác.",
    videoUrl: "/videos/pho.mp4",
    fallbackVideoUrl: "https://assets.mixkit.co/videos/49015/49015-720.mp4",
    poster: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=1200&auto=format&fit=crop&q=85",
    author: "Phở Thìn 13 Lò Đúc",
  },
  {
    id: "bun-cha-huong-lien",
    match: "Bún Chả Hương Liên",
    foodName: "Suất Bún Chả Đặc Biệt Obama",
    price: 90000,
    prepTime: "10-15 phút",
    rating: 4.9,
    reviewsCount: "4.1k+",
    likesCount: 3120,
    type: "Món Việt",
    badge: "Di sản ẩm thực",
    tag: "Obama & Bourdain",
    title: "Bún chả nướng than hoa thơm lừng phố cổ",
    description: "Chả miếng, chả viên nướng xém cạnh trên than hoa đượm khói, ăn kèm nem cua bể giòn rụm và nước mắm chua ngọt trứ danh.",
    videoUrl: "/videos/buncha.mp4",
    fallbackVideoUrl: "https://assets.mixkit.co/videos/31348/31348-720.mp4",
    poster: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=1200&auto=format&fit=crop&q=85",
    author: "Bún Chả Hương Liên",
  },
  {
    id: "lotteria",
    match: "Lotteria",
    foodName: "Burger Bulgogi",
    price: 69000,
    prepTime: "8-12 phút",
    rating: 4.7,
    reviewsCount: "1.9k+",
    likesCount: 980,
    type: "Burger & Gà rán",
    badge: "Ăn nhanh vui miệng",
    tag: "Best Seller",
    title: "Burger bò Bulgogi nóng hổi, sốt Hàn đậm vị",
    description: "Bánh mềm thơm bơ, miếng bò nướng xốt Bulgogi ngọt đậm đà kết hợp rau xà lách tươi giòn cho ngày bận rộn đầy năng lượng.",
    videoUrl: "/videos/burger.mp4",
    fallbackVideoUrl: "https://assets.mixkit.co/videos/47191/47191-720.mp4",
    poster: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=85",
    author: "Lotteria Cầu Giấy",
  },
  {
    id: "kichi-kichi",
    match: "Kichi-Kichi",
    foodName: "Nước Lẩu Tomyum",
    price: 69000,
    prepTime: "10-15 phút",
    rating: 4.8,
    reviewsCount: "2.2k+",
    likesCount: 1650,
    type: "Lẩu & Nướng",
    badge: "Lẩu băng chuyền",
    tag: "Ăn là mê",
    title: "Nồi lẩu Tomyum nghi ngút cho buổi tối vui hơn",
    description: "Nước lẩu Tomyum chua thanh cay nồng thơm lừng mùi sả ớt, nhúng cùng bò Mỹ hảo hạng và hải sản tươi sống trên băng chuyền.",
    videoUrl: "/videos/hotpot.mp4",
    fallbackVideoUrl: "https://assets.mixkit.co/videos/24703/24703-720.mp4",
    poster: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=85",
    author: "Kichi-Kichi Cầu Giấy",
  },
  {
    id: "the-pizza-company",
    match: "The Pizza Company",
    foodName: "Pizza Pepperoni",
    price: 199000,
    prepTime: "15-20 phút",
    rating: 4.8,
    reviewsCount: "1.7k+",
    likesCount: 1240,
    type: "Pizza & Pasta",
    badge: "Pizza nóng lò",
    tag: "Phô mai kéo sợi",
    title: "Pizza pepperoni, ngập tràn phô mai béo ngậy",
    description: "Đế bánh nướng vàng ruộm, xúc xích pepperoni đậm vị và lớp phô mai Mozzarella nóng chảy kéo sợi kéo dài bất tận.",
    videoUrl: "/videos/pizza.mp4",
    fallbackVideoUrl: "https://assets.mixkit.co/videos/20913/20913-720.mp4",
    poster: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&auto=format&fit=crop&q=85",
    author: "The Pizza Company",
  },
  {
    id: "com-tam-phuc-loc-tho",
    match: "Cơm Tấm",
    foodName: "Cơm Tấm Sườn Bì Chả",
    price: 65000,
    prepTime: "5-10 phút",
    rating: 4.8,
    reviewsCount: "2.5k+",
    likesCount: 1890,
    type: "Món Việt",
    badge: "Đặc sản Sài Gòn",
    tag: "Sườn nướng than hoa",
    title: "Cơm tấm sườn cọng nướng than hoa mỡ hành",
    description: "Miếng sườn ướp đậm vị nướng xém cạnh thơm nức mũi, hạt cơm tấm dẻo bùi chan nước mắm chua ngọt cay tê đầu lưỡi.",
    videoUrl: "/videos/comtam.mp4",
    fallbackVideoUrl: "https://assets.mixkit.co/videos/45723/45723-720.mp4",
    poster: "https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=1200&auto=format&fit=crop&q=85",
    author: "Cơm Tấm Phúc Lộc Thọ",
  },
  {
    id: "banh-mi-huynh-hoa",
    match: "Bánh Mì Huỳnh Hoa",
    foodName: "Bánh Mì Đặc Biệt Huỳnh Hoa",
    price: 68000,
    prepTime: "5 phút",
    rating: 4.9,
    reviewsCount: "5.2k+",
    likesCount: 4100,
    type: "Món Việt",
    badge: "Bánh mì đắt xắt ra miếng",
    tag: "Vua bánh mì Sài Gòn",
    title: "Bánh mì ổ giòn rụm ngập tràn pate béo ngậy",
    description: "Ổ bánh mì nóng giòn nhân đầy ắp giò thủ, chả lụa, thịt nguội, quét lớp bơ vàng óng và pate gia truyền béo ngậy gây thương nhớ.",
    videoUrl: "/videos/banhmi.mp4",
    fallbackVideoUrl: "https://assets.mixkit.co/videos/43922/43922-720.mp4",
    poster: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&auto=format&fit=crop&q=85",
    author: "Bánh Mì Huỳnh Hoa",
  },
];

const fallbackRestaurants = [
  { _id: "6aa43e2fc7180e019fa543bb", name: "Pizza 4P's Tràng Tiền", location: "11B Tràng Tiền, Hoàn Kiếm, Hà Nội", availability: true },
  { _id: "6aa43e2fc7180e019fa543c0", name: "Phở Thìn Lò Đúc", location: "13 Lò Đúc, Hai Bà Trưng, Hà Nội", availability: true },
  { _id: "6aa43e2fc7180e019fa543c4", name: "Bún Chả Hương Liên (Obama)", location: "24 Lê Văn Hưu, Hai Bà Trưng, Hà Nội", availability: true },
  { _id: "6ab41a4bdca1a78e1e0eced5", name: "Lotteria Cầu Giấy", location: "241 Xuân Thủy, Cầu Giấy, Hà Nội", availability: true },
  { _id: "6ab41a4bdca1a78e1e0eced4", name: "Kichi-Kichi Lẩu Băng Chuyền Cầu Giấy", location: "222 Trần Duy Hưng, Cầu Giấy, Hà Nội", availability: true },
  { _id: "6ab41a4bdca1a78e1e0eced3", name: "The Pizza Company Cầu Giấy", location: "26 Nguyễn Khang, Cầu Giấy, Hà Nội", availability: true },
  { _id: "6aa43e2fc7180e019fa543c7", name: "Cơm Tấm Phúc Lộc Thọ", location: "223 Nguyễn Trãi, Quận 5, TP.HCM", availability: true },
  { _id: "6ab416612e20c4042e5188ee", name: "Bánh Mì Huỳnh Hoa", location: "26 Lê Thị Riêng, Quận 1, TP.HCM", availability: true },
];

function getFoodMenuPath(restaurant, campaign) {
  return `/customer/restaurant/${restaurant._id}/foods?food=${encodeURIComponent(campaign.foodName)}`;
}

function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN").format(price) + " ₫";
}

export default function RestaurantShowcase() {
  const [restaurants, setRestaurants] = useState([]);
  const [activeType, setActiveType] = useState("Tất cả");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "shorts"
  const [loading, setLoading] = useState(true);

  // Modal Video State (Grid mode)
  const [activeVideoItem, setActiveVideoItem] = useState(null);

  // Shorts State (Reels mode)
  const [shortsIndex, setShortsIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const shortsVideoRef = useRef(null);
  const [failedVideos, setFailedVideos] = useState({});
  const [videoSrcMap, setVideoSrcMap] = useState({});

  const getVideoSrc = (campaign) => {
    if (!campaign) return null;
    return videoSrcMap[campaign.id] || campaign.videoUrl || campaign.fallbackVideoUrl || null;
  };

  const handleVideoError = (campaign) => {
    if (!campaign) return;
    const currentSrc = getVideoSrc(campaign);
    if (campaign.fallbackVideoUrl && currentSrc !== campaign.fallbackVideoUrl) {
      setVideoSrcMap((prev) => ({
        ...prev,
        [campaign.id]: campaign.fallbackVideoUrl,
      }));
    } else {
      setFailedVideos((prev) => ({
        ...prev,
        [campaign.id]: true,
      }));
      setIsPlaying(false);
    }
  };

  // Social States
  const [likedMap, setLikedMap] = useState({});
  const [savedMap, setSavedMap] = useState({});
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch(`${API_URLS.RESTAURANT}/api/restaurant`)
      .then((res) => {
        if (!res.ok) throw new Error("Could not load restaurants");
        return res.json();
      })
      .then((data) => {
        if (mounted) {
          setRestaurants(Array.isArray(data) ? data.filter((r) => r.availability !== false) : []);
        }
      })
      .catch(() => mounted && setRestaurants([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const displayedItems = useMemo(() => {
    const source = restaurants.length ? restaurants : fallbackRestaurants;
    return campaigns
      .map((campaign) => {
        const found = source.find((r) => r.name?.toLowerCase().includes(campaign.match.toLowerCase()));
        const restaurant = found || fallbackRestaurants.find((r) => r.name.toLowerCase().includes(campaign.match.toLowerCase())) || {
          _id: "demo",
          name: campaign.match,
          location: "Hà Nội / TP.HCM",
        };
        return { restaurant, campaign };
      })
      .filter(({ campaign }) => activeType === "Tất cả" || campaign.type === activeType);
  }, [restaurants, activeType]);

  const types = ["Tất cả", ...new Set(campaigns.map((c) => c.type))];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2800);
  };

  const toggleLike = (id, e) => {
    if (e) e.stopPropagation();
    setLikedMap((prev) => {
      const next = !prev[id];
      if (next) showToast("❤️ Đã thêm vào video yêu thích!");
      return { ...prev, [id]: next };
    });
  };

  const toggleSave = (id, e) => {
    if (e) e.stopPropagation();
    setSavedMap((prev) => {
      const next = !prev[id];
      if (next) showToast("⭐ Đã lưu món ăn vào bộ sưu tập!");
      return { ...prev, [id]: next };
    });
  };

  const handleShare = (campaign, e) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast(`🔗 Đã sao chép link món: ${campaign.foodName}`);
    } else {
      showToast(`🔗 Đang chia sẻ: ${campaign.foodName}`);
    }
  };

  const togglePlayPause = () => {
    if (!shortsVideoRef.current || shortsVideoRef.current.error) return;
    if (shortsVideoRef.current.paused) {
      shortsVideoRef.current.play();
      setIsPlaying(true);
    } else {
      shortsVideoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (shortsVideoRef.current) {
        shortsVideoRef.current.muted = next;
      }
      return next;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeVideoItem) {
        if (e.key === "Escape") {
          setActiveVideoItem(null);
        } else if (e.key === "ArrowRight") {
          const currentIndex = displayedItems.findIndex((it) => it.campaign.id === activeVideoItem.campaign.id);
          if (currentIndex < displayedItems.length - 1) {
            setActiveVideoItem(displayedItems[currentIndex + 1]);
          }
        } else if (e.key === "ArrowLeft") {
          const currentIndex = displayedItems.findIndex((it) => it.campaign.id === activeVideoItem.campaign.id);
          if (currentIndex > 0) {
            setActiveVideoItem(displayedItems[currentIndex - 1]);
          }
        }
      } else if (viewMode === "shorts") {
        if (e.key === "ArrowDown") {
          setShortsIndex((prev) => Math.min(displayedItems.length - 1, prev + 1));
        } else if (e.key === "ArrowUp") {
          setShortsIndex((prev) => Math.max(0, prev - 1));
        } else if (e.key === " ") {
          e.preventDefault();
          togglePlayPause();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeVideoItem, viewMode, displayedItems]);

  const currentShortsItem = displayedItems[shortsIndex] || displayedItems[0];
  const currentShortsVideoSrc = currentShortsItem ? getVideoSrc(currentShortsItem.campaign) : null;
  const currentShortsVideoUnavailable =
    !currentShortsVideoSrc || failedVideos[currentShortsItem?.campaign.id];
  const activeModalVideoSrc = activeVideoItem ? getVideoSrc(activeVideoItem.campaign) : null;

  return (
    <div className="restaurant-showcase-page">
      <Header />

      {/* Toast Notification */}
      {toastMessage && <div className="showcase-toast-bubble">{toastMessage}</div>}

      <main>
        {/* HERO SECTION */}
        <section className="showcase-hero">
          <div className="showcase-hero-copy">
            <span className="showcase-eyebrow">
              <FaUtensils /> SkyDish Video Món Ngon
            </span>
            <h1>
              Thưởng thức bằng mắt.<br />
              <em>Cảm nhận bằng vị giác.</em>
            </h1>
            <p>
              Khám phá video quảng bá món ăn thật từ những bếp trưởng hàng đầu. Xem quy trình xèo xèo nướng chín, phô mai kéo sợi và đặt món ăn nóng hổi về nhà ngay trên SkyDish!
            </p>
            <div className="showcase-hero-actions">
              <a href="#showcase-hub" className="showcase-primary-button">
                Xem video món ngon <FaPlay style={{ fontSize: "0.8em" }} />
              </a>
              <button
                type="button"
                className={`showcase-mode-hero-btn ${viewMode === "shorts" ? "active" : ""}`}
                onClick={() => {
                  setViewMode("shorts");
                  document.getElementById("showcase-hub")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <FaMobileAlt /> Lướt Video Reels <span className="hero-hot-tag">Hot</span>
              </button>
            </div>
          </div>

          <div className="showcase-hero-collage" aria-label="Món ăn nổi bật">
            <div
              className="showcase-hero-image showcase-hero-image-main"
              onClick={() => setActiveVideoItem(displayedItems[0])}
              title="Bấm xem video Pizza 4P's trực tiếp"
            >
              <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1000&auto=format&fit=crop&q=85" alt="Pizza 4P's Burrata" />
              <div className="hero-img-badge">
                <FaPlay /> Video Pizza 4P's
              </div>
            </div>
            <div
              className="showcase-hero-image showcase-hero-image-small"
              onClick={() => setActiveVideoItem(displayedItems[1])}
              title="Bấm xem video Phở Thìn trực tiếp"
            >
              <img src="https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=700&auto=format&fit=crop&q=85" alt="Phở Thìn Lò Đúc" />
              <div className="hero-img-badge">
                <FaPlay /> Video Phở Thìn
              </div>
            </div>
            <span className="showcase-hero-note">🔥 Xem trực tiếp trên SkyDish</span>
          </div>
        </section>

        {/* MAIN SHOWCASE HUB */}
        <section className="showcase-content" id="showcase-hub">
          {/* Header Row: Title & View Switcher */}
          <div className="showcase-section-heading">
            <div>
              <span className="showcase-section-kicker">
                <FaFire style={{ color: "#ff5722" }} /> Video ẩm thực độc quyền SkyDish
              </span>
              <h2>Nhà hàng kể chuyện bằng món ăn</h2>
            </div>

            {/* View Mode Switcher */}
            <div className="showcase-view-switch-box" role="radiogroup" aria-label="Chọn chế độ xem">
              <button
                type="button"
                className={`view-switch-btn ${viewMode === "grid" ? "is-active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Xem dạng lưới thẻ nhà hàng"
              >
                <FaTh /> Dạng Lưới
              </button>
              <button
                type="button"
                className={`view-switch-btn ${viewMode === "shorts" ? "is-active" : ""}`}
                onClick={() => setViewMode("shorts")}
                title="Lướt video ẩm thực dạng Reels / TikTok"
              >
                <FaMobileAlt /> Lướt Reels <span className="switch-live-indicator">LIVE</span>
              </button>
            </div>
          </div>

          {/* Filter Categories */}
          <div className="showcase-filter-row" aria-label="Lọc loại món ăn">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                className={activeType === type ? "is-active" : ""}
                onClick={() => {
                  setActiveType(type);
                  setShortsIndex(0);
                }}
              >
                {type}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="showcase-loading">
              <div className="showcase-spinner" />
              <p>Đang tải video món ngon...</p>
            </div>
          ) : viewMode === "grid" ? (
            /* ========================================================
               CHẾ ĐỘ 1: DẠNG LƯỚI (GRID CARDS)
               ======================================================== */
            <div className="showcase-grid">
              {displayedItems.map(({ restaurant, campaign }) => {
                const isLiked = !!likedMap[campaign.id];
                const isSaved = !!savedMap[campaign.id];

                return (
                  <article className="showcase-card" key={campaign.id || restaurant._id}>
                    {/* Media Container - Click to open In-App Video Modal */}
                    <div
                      className="showcase-media"
                      onClick={() => setActiveVideoItem({ restaurant, campaign })}
                      title={`Xem video ${campaign.foodName} trực tiếp trên SkyDish`}
                    >
                      <img src={campaign.poster} alt={`Hình ảnh ${campaign.foodName}`} loading="lazy" />
                      <div className="showcase-media-overlay" />

                      {/* Badges */}
                      <span className="showcase-play-badge">
                        <FaPlay className="play-icon-pulse" /> Xem video trên SkyDish
                      </span>
                      <span className="showcase-card-tag">{campaign.tag}</span>

                      {/* Center Play Button */}
                      <div className="showcase-center-play-btn">
                        <FaPlay />
                      </div>

                      {/* Price Pill */}
                      <div className="showcase-card-price-pill">
                        {formatPrice(campaign.price)}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="showcase-card-body">
                      <div className="showcase-card-meta">
                        <span className="campaign-badge">{campaign.badge}</span>
                        <span className="restaurant-location">{restaurant.location || "Việt Nam"}</span>
                      </div>

                      <h3
                        className="showcase-card-title"
                        onClick={() => setActiveVideoItem({ restaurant, campaign })}
                      >
                        {campaign.title}
                      </h3>

                      <p className="showcase-card-desc">{campaign.description}</p>

                      {/* Rating & Social actions */}
                      <div className="showcase-card-social-row">
                        <div className="rating-pill">
                          <FaStar style={{ color: "#ffb400" }} /> {campaign.rating}{" "}
                          <span className="reviews-sub">({campaign.reviewsCount})</span>
                        </div>
                        <div className="card-social-actions">
                          <button
                            type="button"
                            className={`card-action-icon-btn ${isLiked ? "liked" : ""}`}
                            onClick={(e) => toggleLike(campaign.id, e)}
                            title="Thích video này"
                          >
                            {isLiked ? <FaHeart style={{ color: "#ff385c" }} /> : <FaRegHeart />}
                            <span className="action-count">{campaign.likesCount + (isLiked ? 1 : 0)}</span>
                          </button>
                          <button
                            type="button"
                            className={`card-action-icon-btn ${isSaved ? "saved" : ""}`}
                            onClick={(e) => toggleSave(campaign.id, e)}
                            title="Lưu món ăn"
                          >
                            {isSaved ? <FaBookmark style={{ color: "#ff9800" }} /> : <FaRegBookmark />}
                          </button>
                          <button
                            type="button"
                            className="card-action-icon-btn"
                            onClick={(e) => handleShare(campaign, e)}
                            title="Chia sẻ video"
                          >
                            <FaShare />
                          </button>
                        </div>
                      </div>

                      {/* Card Footer: Restaurant info & Order CTA */}
                      <div className="showcase-card-footer">
                        <div className="footer-restaurant-info">
                          <strong>{restaurant.name}</strong>
                          <small>Món: {campaign.foodName}</small>
                        </div>
                        <Link
                          to={getFoodMenuPath(restaurant, campaign)}
                          className="showcase-card-order-btn"
                          aria-label={`Đặt món ${campaign.foodName} tại ${restaurant.name}`}
                          title={`Đặt món ngay: ${campaign.foodName}`}
                        >
                          <FaShoppingBag />
                          <span>Đặt món</span>
                          <FaArrowRight />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* ========================================================
               CHẾ ĐỘ 2: LƯỚT VIDEO NATIVE TRÊN SKYDISH (REELS STYLE)
               ======================================================== */
            <div className="showcase-shorts-stage">
              <div className="shorts-header-tips">
                <span>
                  {currentShortsVideoUnavailable
                    ? "Video chưa có sẵn; đang hiển thị ảnh món ăn."
                    : "💡 Bấm vào video để Tạm dừng/Phát • Dùng nút ▲ / ▼ để lướt món"}
                </span>
                <span className="shorts-counter-badge">
                  {shortsIndex + 1} / {displayedItems.length} Video
                </span>
              </div>

              {currentShortsItem && (
                <div className="shorts-phone-frame">
                  {/* Native Video Screen */}
                  <div className="shorts-screen">
                    {currentShortsVideoUnavailable ? (
                      <img
                        className="shorts-native-video-elem"
                        src={currentShortsItem.campaign.poster}
                        alt={currentShortsItem.campaign.foodName}
                      />
                    ) : (
                      <video
                        key={currentShortsVideoSrc}
                        ref={shortsVideoRef}
                        className="shorts-native-video-elem"
                        src={currentShortsVideoSrc}
                        poster={currentShortsItem.campaign.poster}
                        autoPlay
                        loop
                        playsInline
                        muted={isMuted}
                        onClick={togglePlayPause}
                        onError={() => handleVideoError(currentShortsItem.campaign)}
                      />
                    )}

                    {/* Play/Pause Center Indicator */}
                    {!isPlaying && !currentShortsVideoUnavailable && (
                      <div className="shorts-play-pause-overlay" onClick={togglePlayPause}>
                        <div className="play-pause-icon-circle">
                          <FaPlay />
                        </div>
                      </div>
                    )}

                    {/* Gradient Overlay for bottom text readability */}
                    <div className="shorts-bottom-scrim" />

                    {/* Left/Bottom Overlay: Food & Restaurant Info */}
                    <div className="shorts-overlay-info">
                      <div className="shorts-badge-row">
                        <span className="shorts-tag-pill">{currentShortsItem.campaign.tag}</span>
                        <span className="shorts-cuisine-pill">{currentShortsItem.campaign.badge}</span>
                      </div>

                      <div className="shorts-restaurant-bar">
                        <div className="restaurant-avatar-circle">
                          <FaUtensils />
                        </div>
                        <span className="shorts-res-name">{currentShortsItem.restaurant.name}</span>
                        <FaCheckCircle className="verified-icon" title="Đối tác SkyDish chính hãng" />
                      </div>

                      <h3 className="shorts-food-title">
                        {currentShortsItem.campaign.foodName}
                        <span className="shorts-price-tag">
                          {formatPrice(currentShortsItem.campaign.price)}
                        </span>
                      </h3>

                      <p className="shorts-description-text">
                        {currentShortsItem.campaign.description}
                      </p>

                      {/* Direct Order Button */}
                      <div className="shorts-action-cta-row">
                        <Link
                          to={getFoodMenuPath(currentShortsItem.restaurant, currentShortsItem.campaign)}
                          className="shorts-order-primary-btn"
                        >
                          <FaShoppingBag />
                          <span>Đặt món này ngay • {formatPrice(currentShortsItem.campaign.price)}</span>
                          <FaArrowRight />
                        </Link>
                      </div>
                    </div>

                    {/* Right Floating Actions (Reels style) */}
                    <div className="shorts-side-actions">
                      {/* Sound Toggle */}
                      {!currentShortsVideoUnavailable && (
                        <button
                          type="button"
                          className="side-action-btn"
                          onClick={toggleMute}
                          title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
                        >
                          <div className="side-action-icon sound-icon">
                            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                          </div>
                          <span className="side-action-label">{isMuted ? "Tắt tiếng" : "Bật tiếng"}</span>
                        </button>
                      )}

                      {/* Like */}
                      <button
                        type="button"
                        className={`side-action-btn ${likedMap[currentShortsItem.campaign.id] ? "is-liked" : ""}`}
                        onClick={(e) => toggleLike(currentShortsItem.campaign.id, e)}
                        title="Thích video"
                      >
                        <div className="side-action-icon">
                          {likedMap[currentShortsItem.campaign.id] ? (
                            <FaHeart style={{ color: "#ff2a5f" }} />
                          ) : (
                            <FaHeart />
                          )}
                        </div>
                        <span className="side-action-label">
                          {currentShortsItem.campaign.likesCount +
                            (likedMap[currentShortsItem.campaign.id] ? 1 : 0)}
                        </span>
                      </button>

                      {/* Save */}
                      <button
                        type="button"
                        className={`side-action-btn ${savedMap[currentShortsItem.campaign.id] ? "is-saved" : ""}`}
                        onClick={(e) => toggleSave(currentShortsItem.campaign.id, e)}
                        title="Lưu món ăn"
                      >
                        <div className="side-action-icon">
                          {savedMap[currentShortsItem.campaign.id] ? (
                            <FaBookmark style={{ color: "#ffb400" }} />
                          ) : (
                            <FaBookmark />
                          )}
                        </div>
                        <span className="side-action-label">Lưu</span>
                      </button>

                      {/* Share */}
                      <button
                        type="button"
                        className="side-action-btn"
                        onClick={(e) => handleShare(currentShortsItem.campaign, e)}
                        title="Chia sẻ link món"
                      >
                        <div className="side-action-icon">
                          <FaShare />
                        </div>
                        <span className="side-action-label">Chia sẻ</span>
                      </button>

                      {/* Navigation: Prev / Next */}
                      <div className="shorts-nav-arrows">
                        <button
                          type="button"
                          className="nav-arrow-btn"
                          disabled={shortsIndex === 0}
                          onClick={() => setShortsIndex((prev) => Math.max(0, prev - 1))}
                          title="Món trước (Mũi tên lên)"
                        >
                          <FaChevronUp />
                        </button>
                        <button
                          type="button"
                          className="nav-arrow-btn"
                          disabled={shortsIndex === displayedItems.length - 1}
                          onClick={() =>
                            setShortsIndex((prev) => Math.min(displayedItems.length - 1, prev + 1))
                          }
                          title="Món tiếp theo (Mũi tên xuống)"
                        >
                          <FaChevronDown />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Thumbnails Carousel below phone frame */}
                  <div className="shorts-thumbnails-track">
                    {displayedItems.map((item, idx) => (
                      <div
                        key={item.campaign.id}
                        className={`shorts-thumb-card ${idx === shortsIndex ? "is-active" : ""}`}
                        onClick={() => setShortsIndex(idx)}
                      >
                        <img src={item.campaign.poster} alt={item.campaign.foodName} />
                        <div className="thumb-info">
                          <span className="thumb-name">{item.campaign.foodName}</span>
                          <span className="thumb-price">{formatPrice(item.campaign.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* CINEMA VIDEO MODAL PLAYER (Opened from Grid View) */}
        {activeVideoItem && (
          <div
            className="showcase-cinema-modal-backdrop"
            onClick={() => setActiveVideoItem(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="showcase-cinema-modal-box"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                className="cinema-modal-close-btn"
                onClick={() => setActiveVideoItem(null)}
                title="Đóng (ESC)"
              >
                <FaTimes />
              </button>

              <div className="cinema-modal-grid">
                {/* Left: Native Video Player */}
                <div className="cinema-modal-player-col">
                  <div className="cinema-video-wrapper">
                    {!activeModalVideoSrc || failedVideos[activeVideoItem.campaign.id] ? (
                      <img
                        className="cinema-native-video-elem"
                        src={activeVideoItem.campaign.poster}
                        alt={activeVideoItem.campaign.foodName}
                      />
                    ) : (
                      <video
                        key={activeModalVideoSrc}
                        className="cinema-native-video-elem"
                        src={activeModalVideoSrc}
                        poster={activeVideoItem.campaign.poster}
                        controls
                        autoPlay
                        loop
                        playsInline
                        onError={() => handleVideoError(activeVideoItem.campaign)}
                      />
                    )}
                  </div>

                  {/* Modal Footer Controls */}
                  <div className="cinema-modal-quick-nav">
                    <button
                      type="button"
                      className="cinema-nav-step-btn"
                      onClick={() => {
                        const idx = displayedItems.findIndex(
                          (it) => it.campaign.id === activeVideoItem.campaign.id
                        );
                        if (idx > 0) setActiveVideoItem(displayedItems[idx - 1]);
                      }}
                      disabled={
                        displayedItems.findIndex(
                          (it) => it.campaign.id === activeVideoItem.campaign.id
                        ) === 0
                      }
                    >
                      <FaChevronLeft /> Món trước
                    </button>
                    <span className="cinema-nav-index-text">
                      {displayedItems.findIndex(
                        (it) => it.campaign.id === activeVideoItem.campaign.id
                      ) + 1}{" "}
                      / {displayedItems.length} Món
                    </span>
                    <button
                      type="button"
                      className="cinema-nav-step-btn"
                      onClick={() => {
                        const idx = displayedItems.findIndex(
                          (it) => it.campaign.id === activeVideoItem.campaign.id
                        );
                        if (idx < displayedItems.length - 1)
                          setActiveVideoItem(displayedItems[idx + 1]);
                      }}
                      disabled={
                        displayedItems.findIndex(
                          (it) => it.campaign.id === activeVideoItem.campaign.id
                        ) ===
                        displayedItems.length - 1
                      }
                    >
                      Món tiếp theo <FaChevronRight />
                    </button>
                  </div>
                </div>

                {/* Right: Dish Info & Order Panel */}
                <div className="cinema-modal-info-col">
                  <div className="modal-header-meta">
                    <span className="modal-badge">{activeVideoItem.campaign.badge}</span>
                    <span className="modal-tag">{activeVideoItem.campaign.tag}</span>
                  </div>

                  <h2 className="modal-dish-title">{activeVideoItem.campaign.foodName}</h2>

                  <div className="modal-restaurant-row">
                    <div className="modal-res-avatar">
                      <FaUtensils />
                    </div>
                    <div>
                      <strong className="modal-res-name">{activeVideoItem.restaurant.name}</strong>
                      <span className="modal-res-location">{activeVideoItem.restaurant.location}</span>
                    </div>
                  </div>

                  <div className="modal-stats-card">
                    <div className="stat-item">
                      <span className="stat-label">Giá niêm yết</span>
                      <span className="stat-value price">
                        {formatPrice(activeVideoItem.campaign.price)}
                      </span>
                    </div>
                    <div className="stat-divider" />
                    <div className="stat-item">
                      <span className="stat-label">Đánh giá</span>
                      <span className="stat-value rating">
                        <FaStar style={{ color: "#ffb400", marginRight: 4 }} />
                        {activeVideoItem.campaign.rating} ({activeVideoItem.campaign.reviewsCount})
                      </span>
                    </div>
                    <div className="stat-divider" />
                    <div className="stat-item">
                      <span className="stat-label">Thời gian làm</span>
                      <span className="stat-value">{activeVideoItem.campaign.prepTime}</span>
                    </div>
                  </div>

                  <div className="modal-story-box">
                    <h4>Câu chuyện món ăn</h4>
                    <p>{activeVideoItem.campaign.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="modal-action-buttons">
                    <Link
                      to={getFoodMenuPath(activeVideoItem.restaurant, activeVideoItem.campaign)}
                      className="modal-order-primary-btn"
                      onClick={() => setActiveVideoItem(null)}
                    >
                      <FaShoppingBag />
                      <span>Đặt món này ngay</span>
                      <FaArrowRight />
                    </Link>

                    <div className="modal-secondary-actions">
                      <button
                        type="button"
                        className={`modal-icon-btn ${likedMap[activeVideoItem.campaign.id] ? "liked" : ""}`}
                        onClick={() => toggleLike(activeVideoItem.campaign.id)}
                        title="Thích video"
                      >
                        <FaHeart />
                        <span>
                          {activeVideoItem.campaign.likesCount +
                            (likedMap[activeVideoItem.campaign.id] ? 1 : 0)}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`modal-icon-btn ${savedMap[activeVideoItem.campaign.id] ? "saved" : ""}`}
                        onClick={() => toggleSave(activeVideoItem.campaign.id)}
                        title="Lưu món ăn"
                      >
                        <FaBookmark />
                        <span>Lưu</span>
                      </button>
                      <button
                        type="button"
                        className="modal-icon-btn"
                        onClick={() => handleShare(activeVideoItem.campaign)}
                        title="Chia sẻ video"
                      >
                        <FaShare />
                        <span>Chia sẻ</span>
                      </button>
                    </div>
                  </div>

                  {/* Playlist / Next recommendations */}
                  <div className="modal-recommendations-box">
                    <span className="rec-heading">Món ngon khác trong bộ sưu tập:</span>
                    <div className="rec-thumbnails-row">
                      {displayedItems
                        .filter((it) => it.campaign.id !== activeVideoItem.campaign.id)
                        .slice(0, 4)
                        .map((it) => (
                          <div
                            key={it.campaign.id}
                            className="rec-thumb-item"
                            onClick={() => setActiveVideoItem(it)}
                            title={`Xem ${it.campaign.foodName}`}
                          >
                            <img src={it.campaign.poster} alt={it.campaign.foodName} />
                            <span>{it.campaign.foodName}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VOUCHER / PROMO BAND */}
        <section className="showcase-voucher-band">
          <div>
            <span className="showcase-section-kicker">Ăn ngon hơn, ưu đãi hơn</span>
            <h2>Nhà hàng yêu thích đã sẵn sàng phục vụ bạn.</h2>
          </div>
          <div className="showcase-voucher-mark">
            <FaTicketAlt />
            <span>
              Voucher nhà hàng<br />
              <strong>Chọn tại Checkout</strong>
            </span>
          </div>
          <Link to="/customer/home" className="showcase-primary-button">
            Khám phá tất cả <FaArrowRight />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
