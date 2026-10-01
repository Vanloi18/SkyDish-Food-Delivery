import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaPlay, FaTicketAlt, FaUtensils } from "react-icons/fa";
import { API_URLS } from "../config/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/restaurant-showcase.css";

const campaigns = [
  {
    match: "Pizza 4P's",
    foodName: "Salad Phô Mai Burrata",
    videoQuery: "Salad Phô Mai Burrata recipe",
    type: "Pizza & salad",
    badge: "Món thủ công",
    title: "Pizza nướng lò, salad tươi mỗi ngày",
    description: "Một bữa ăn đẹp mắt bắt đầu từ nguyên liệu tử tế và chiếc lò nóng.",
    video: "https://cdn.coverr.co/videos/coverr-pizza-oven-1573/1080p.mp4",
    poster: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&auto=format&fit=crop&q=85",
    tag: "Được yêu thích",
  },
  {
    match: "The Pizza Company",
    foodName: "Pizza Pepperoni",
    videoQuery: "Pizza Pepperoni recipe",
    type: "Pizza & pasta",
    badge: "Pizza nóng lò",
    title: "Pizza pepperoni, kéo sợi phô mai",
    description: "Đế bánh nướng vàng, pepperoni đậm vị và phô mai tan chảy vừa tới.",
    video: "https://cdn.coverr.co/videos/coverr-preparing-a-pizza-in-a-pizzeria-1573/1080p.mp4",
    poster: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&auto=format&fit=crop&q=85",
    tag: "Pizza yêu thích",
  },
  {
    match: "Lotteria",
    foodName: "Burger Bulgogi",
    videoQuery: "Burger Bulgogi recipe",
    type: "Burger & gà rán",
    badge: "Ăn nhanh vui miệng",
    title: "Burger nóng hổi, sốt đậm vị",
    description: "Bánh mềm, thịt mọng và một cú cắn đầy năng lượng cho ngày bận rộn.",
    video: "https://cdn.coverr.co/videos/coverr-cooking-burger-1573/1080p.mp4",
    poster: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=85",
    tag: "Best seller",
  },
  {
    match: "Kichi-Kichi",
    foodName: "Nước Lẩu Tomyum",
    videoQuery: "Tom Yum hot pot recipe",
    type: "Lẩu",
    badge: "Quây quần",
    title: "Nồi lẩu nghi ngút cho buổi tối vui hơn",
    description: "Chọn món yêu thích, nhúng vừa chín tới và thưởng thức cùng người thân.",
    video: "https://cdn.coverr.co/videos/coverr-cooking-soup-1573/1080p.mp4",
    poster: "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&auto=format&fit=crop&q=85",
    tag: "Ăn là mê",
  },
  {
    match: "Phở Thìn",
    foodName: "Phở Bò Tái Lăn Truyền Thống",
    videoQuery: "Phở Bò Tái Lăn recipe",
    type: "Món Việt",
    badge: "Vị truyền thống",
    title: "Nước dùng trong, vị phở sâu",
    description: "Một tô phở nóng hổi cho những ngày cần được vỗ về bằng hương vị quen thuộc.",
    video: "https://cdn.coverr.co/videos/coverr-cooking-pho-1573/1080p.mp4",
    poster: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=1200&auto=format&fit=crop&q=85",
    tag: "Món Việt",
  },
];

const fallbackRestaurants = [
  { _id: "6aa43e2fc7180e019fa543c0", name: "Phở Thìn", location: "Hà Nội", availability: true },
  { _id: "6ab41a4bdca1a78e1e0eced5", name: "Lotteria Cầu Giấy", location: "Cầu Giấy, Hà Nội", availability: true },
  { _id: "6ab41a4bdca1a78e1e0eced4", name: "Kichi-Kichi", location: "Hà Nội", availability: true },
  { _id: "6aa43e2fc7180e019fa543bb", name: "Pizza 4P's Tràng Tiền", location: "Hoàn Kiếm, Hà Nội", availability: true },
];

function getCampaign(restaurant) {
  return campaigns.find((campaign) => restaurant.name?.toLowerCase().includes(campaign.match.toLowerCase())) || null;
}

function getFoodMenuPath(restaurant, campaign) {
  return `/customer/restaurant/${restaurant._id}/foods?food=${encodeURIComponent(campaign.foodName)}`;
}

function getVideoSearchUrl(campaign) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(campaign.videoQuery)}`;
}

export default function RestaurantShowcase() {
  const [restaurants, setRestaurants] = useState([]);
  const [activeType, setActiveType] = useState("Tất cả");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_URLS.RESTAURANT}/api/restaurant`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load restaurants");
        return response.json();
      })
      .then((data) => mounted && setRestaurants(Array.isArray(data) ? data.filter((restaurant) => restaurant.availability !== false) : []))
      .catch(() => mounted && setRestaurants([]))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const displayedRestaurants = useMemo(() => {
    const source = restaurants.length ? restaurants : fallbackRestaurants;
    return source
      .map((restaurant) => ({ restaurant, campaign: getCampaign(restaurant) }))
      .filter(({ campaign }) => campaign)
      .filter(({ campaign }) => activeType === "Tất cả" || campaign.type === activeType);
  }, [restaurants, activeType]);

  const types = ["Tất cả", ...new Set(campaigns.map((campaign) => campaign.type))];

  return (
    <div className="restaurant-showcase-page">
      <Header />
      <main>
        <section className="showcase-hero">
          <div className="showcase-hero-copy">
            <span className="showcase-eyebrow"><FaUtensils /> SkyDish Food Stories</span>
            <h1>Món ngon không chỉ để nhìn.<br /><em>Hãy để vị giác lên tiếng.</em></h1>
            <p>Khám phá những nhà hàng đang tạo nên bữa ăn đáng nhớ, xem câu chuyện món ăn và đặt ngay chỉ với một chạm.</p>
            <div className="showcase-hero-actions">
              <a href="#restaurant-stories" className="showcase-primary-button">Xem câu chuyện món ăn <FaArrowRight /></a>
              <Link to="/customer/home" className="showcase-secondary-button">Tìm nhà hàng</Link>
            </div>
          </div>
          <div className="showcase-hero-collage" aria-label="Món ăn nổi bật">
            <Link
              to="/customer/restaurant/6aa43e2fc7180e019fa543bb/foods?food=Salad%20Ph%C3%B4%20Mai%20Burrata"
              className="showcase-hero-image showcase-hero-image-main"
              aria-label="Xem Salad Phô Mai Burrata tại Pizza 4P's Tràng Tiền"
            >
              <img src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1000&auto=format&fit=crop&q=85" alt="Món ăn tươi ngon tại Pizza 4P's" />
            </Link>
            <Link
              to="/customer/restaurant/6ab41a4bdca1a78e1e0eced5/foods?food=Burger%20Bulgogi"
              className="showcase-hero-image showcase-hero-image-small"
              aria-label="Xem Burger Bulgogi tại Lotteria Cầu Giấy"
            >
              <img src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=700&auto=format&fit=crop&q=85" alt="Burger Bulgogi tại Lotteria" />
            </Link>
            <span className="showcase-hero-note">Tươi ngon mỗi ngày</span>
          </div>
        </section>

        <section className="showcase-content" id="restaurant-stories">
          <div className="showcase-section-heading">
            <div>
              <span className="showcase-section-kicker">Đang được khám phá</span>
              <h2>Nhà hàng kể chuyện bằng món ăn</h2>
            </div>
            <p>Chạm vào video để cảm nhận không khí bếp, rồi chọn món bạn muốn thưởng thức ngay hôm nay.</p>
          </div>

          <div className="showcase-filter-row" aria-label="Lọc loại món ăn">
            {types.map((type) => (
              <button key={type} type="button" className={activeType === type ? "is-active" : ""} onClick={() => setActiveType(type)}>{type}</button>
            ))}
          </div>

          {loading ? (
            <div className="showcase-loading">Đang tải những nhà hàng nổi bật...</div>
          ) : (
            <div className="showcase-grid">
              {displayedRestaurants.map(({ restaurant, campaign }) => (
                <article className="showcase-card" key={restaurant._id}>
                  <div className="showcase-media" aria-label={`Video giới thiệu ${campaign.foodName}`}>
                    <a
                      className="showcase-media-link"
                      href={getVideoSearchUrl(campaign)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Tìm video ${campaign.foodName} trên YouTube`}
                    >
                      <img src={campaign.poster} alt={`Hình ảnh ${campaign.foodName}`} loading="lazy" />
                    </a>
                    <div className="showcase-media-overlay" />
                    <span className="showcase-play-badge"><FaPlay /> Xem video</span>
                    <span className="showcase-card-tag">{campaign.tag}</span>
                  </div>
                  <div className="showcase-card-body">
                    <div className="showcase-card-meta"><span>{campaign.badge}</span><span>{restaurant.location || "SkyDish"}</span></div>
                    <h3>{campaign.title}</h3>
                    <p>{campaign.description}</p>
                    <div className="showcase-card-footer">
                      <div><strong>{restaurant.name}</strong><small>{campaign.foodName}</small></div>
                      <Link to={getFoodMenuPath(restaurant, campaign)} aria-label={`Đặt ${campaign.foodName} tại ${restaurant.name}`}><FaArrowRight /></Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="showcase-voucher-band">
          <div><span className="showcase-section-kicker">Ăn ngon hơn, ưu đãi hơn</span><h2>Nhà hàng yêu thích đã sẵn sàng phục vụ bạn.</h2></div>
          <div className="showcase-voucher-mark"><FaTicketAlt /><span>Voucher nhà hàng<br /><strong>Chọn tại Checkout</strong></span></div>
          <Link to="/customer/home" className="showcase-primary-button">Khám phá tất cả <FaArrowRight /></Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}
