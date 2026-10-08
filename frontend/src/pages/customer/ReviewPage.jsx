import { API_URLS } from "../../config/api";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaCheckCircle, FaStar } from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import { getAuthHeaders } from "../../utils/authHelper";
import { formatCurrency } from "../../utils/currency";
import "../../styles/experience.css";

export default function ReviewPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [existingReview, setExistingReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = getAuthHeaders();
        const [orderResponse, reviewResponse] = await Promise.all([
          axios.get(`${API_URLS.ORDER}/api/orders/${orderId}`, { headers }),
          axios.get(`${API_URLS.RESTAURANT}/api/reviews/order/${orderId}`, { headers }),
        ]);
        setOrder(orderResponse.data);
        if (reviewResponse.data.reviewed) setExistingReview(reviewResponse.data.review);
      } catch (error) {
        setStatus({ type: "error", text: error.response?.data?.message || "Không thể tải đơn hàng để đánh giá." });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  const submitReview = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return setStatus({ type: "error", text: "Bạn hãy viết một nhận xét trước khi gửi." });
    setSubmitting(true);
    setStatus({ type: "", text: "" });
    try {
      const formData = new FormData();
      formData.append("orderId", orderId);
      formData.append("restaurantId", order.restaurantId);
      formData.append("rating", String(rating));
      formData.append("comment", comment.trim());
      images.slice(0, 5).forEach((image) => formData.append("images", image));
      const response = await axios.post(`${API_URLS.RESTAURANT}/api/reviews`, formData, { headers: getAuthHeaders() });
      setExistingReview(response.data.review);
      setStatus({ type: "success", text: "Cảm ơn bạn. Đánh giá đã được ghi nhận." });
    } catch (error) {
      setStatus({ type: "error", text: error.response?.data?.message || "Không thể gửi đánh giá." });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="customer-experience"><Header /><main className="review-page"><div className="sd-container">Đang tải đơn hàng...</div></main><Footer /></div>;

  return (
    <div className="customer-experience">
      <Header />
      <main className="review-page">
        <div className="sd-container review-page-inner">
          <Link className="review-back-link" to={`/orders/details/${orderId}`}><FaArrowLeft /> Quay lại đơn hàng</Link>
          <section className="review-page-card">
            <span className="review-eyebrow">Đơn đã giao thành công</span>
            <h1>Đánh giá món bạn đã mua</h1>
            <p className="review-intro">Chia sẻ trải nghiệm thật để người khác chọn món dễ hơn.</p>
            {order && <div className="review-order-summary"><strong>{order.restaurantName}</strong><span>{order.items?.map((item) => `${item.name} x${item.quantity}`).join(", ")}</span><b>{formatCurrency(order.totalPrice)}</b></div>}

            {existingReview ? (
              <div className="review-submitted"><FaCheckCircle /><div><strong>Bạn đã đánh giá đơn này</strong><p>{"★".repeat(existingReview.rating)}{"☆".repeat(5 - existingReview.rating)} · {existingReview.comment}</p>{existingReview.images?.length > 0 && <div className="review-image-grid">{existingReview.images.map((image) => <img key={image} src={image} alt="Ảnh từ đánh giá" />)}</div>}</div></div>
            ) : order?.status !== "Delivered" || order?.paymentStatus !== "Paid" ? (
              <div className="review-locked">Chỉ đơn đã thanh toán và giao thành công mới có thể đánh giá.</div>
            ) : (
              <form onSubmit={submitReview} className="review-form">
                <label>Điểm đánh giá</label>
                <div className="review-star-picker">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} aria-label={`${star} sao`} onClick={() => setRating(star)}><FaStar color={star <= rating ? "#f59e0b" : "#d9e1df"} /></button>)}</div>
                <label htmlFor="review-comment">Nhận xét của bạn</label>
                <textarea id="review-comment" rows="5" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Món ăn, đóng gói, thời gian giao hàng..." />
                <label htmlFor="review-images">Ảnh món ăn <span>(tối đa 5 ảnh, mỗi ảnh 5MB)</span></label>
                <input id="review-images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => setImages(Array.from(event.target.files || []).slice(0, 5))} />
                {images.length > 0 && <div className="review-upload-preview">{images.map((image) => <img key={`${image.name}-${image.lastModified}`} src={URL.createObjectURL(image)} alt="Ảnh món đang chọn" />)}</div>}
                {status.text && <div className={`review-form-status ${status.type}`}>{status.text}</div>}
                <Button type="submit" variant="primary" disabled={submitting}>{submitting ? "Đang gửi..." : "Gửi đánh giá"}</Button>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
