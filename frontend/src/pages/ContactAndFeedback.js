import React, { useState } from "react";
import { 
  FaUser, 
  FaEnvelope, 
  FaCommentDots, 
  FaStar, 
  FaCheckCircle, 
  FaPaperPlane 
} from "react-icons/fa";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Card from "../components/common/Card";
import Input from "../components/common/Input";
import Button from "../components/common/Button";

function ContactAndFeedback() {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [feedbackForm, setFeedbackForm] = useState({ rating: "5", feedback: "" });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: "", email: "", message: "" });
    }, 4000);
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setFeedbackForm({ rating: "5", feedback: "" });
    }, 4000);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "3.5rem 0 6rem 0" }}>
        <div className="sd-container">
          <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 3.5rem auto" }}>
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
              <FaCommentDots /> Hỗ trợ khách hàng & Đóng góp ý kiến
            </span>
            <h1 className="sd-heading-1" style={{ marginBottom: "0.75rem" }}>
              Chúng tôi luôn sẵn sàng lắng nghe bạn
            </h1>
            <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-base)" }}>
              Bạn có câu hỏi về đơn hàng hoặc muốn chia sẻ trải nghiệm? Đội ngũ hỗ trợ SkyDish luôn sẵn sàng 24/7.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "2.5rem",
              alignItems: "flex-start",
            }}
          >
            {/* Contact Form */}
            <Card padding="2.5rem 2rem">
              <h2 style={{ fontSize: "var(--sd-font-size-xl)", fontWeight: "800", marginBottom: "0.5rem" }}>
                Gửi tin nhắn hỗ trợ
              </h2>
              <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", marginBottom: "1.5rem" }}>
                Dành cho các thắc mắc chung, câu hỏi hợp tác hoặc trợ giúp đơn hàng.
              </p>

              {contactSubmitted ? (
                <div
                  style={{
                    backgroundColor: "var(--sd-success-light)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "var(--sd-success-hover)",
                    padding: "1.25rem",
                    borderRadius: "var(--sd-radius-md)",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  <FaCheckCircle size={24} style={{ marginBottom: "0.5rem" }} />
                  <p style={{ margin: 0 }}>Cảm ơn bạn! Tin nhắn đã được gửi thành công. Đội ngũ hỗ trợ sẽ liên hệ lại với bạn trong thời gian sớm nhất.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit}>
                  <Input
                    label="Họ và Tên"
                    name="name"
                    placeholder="Ví dụ: Nguyễn Văn A"
                    icon={FaUser}
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                  />

                  <Input
                    label="Địa chỉ Email"
                    name="email"
                    type="email"
                    placeholder="ten@example.com"
                    icon={FaEnvelope}
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                  />

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "var(--sd-font-size-sm)", fontWeight: "600" }}>
                      Nội dung tin nhắn <span style={{ color: "var(--sd-danger)" }}>*</span>
                    </label>
                    <textarea
                      rows={4}
                      placeholder="SkyDish có thể giúp gì cho bạn hôm nay?"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "0.65rem 1rem",
                        borderRadius: "var(--sd-radius-md)",
                        border: "1px solid var(--sd-border)",
                        fontSize: "var(--sd-font-size-sm)",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <Button type="submit" variant="primary" fullWidth icon={FaPaperPlane}>
                    Gửi yêu cầu hỗ trợ
                  </Button>
                </form>
              )}
            </Card>

            {/* Feedback Form */}
            <Card padding="2.5rem 2rem">
              <h2 style={{ fontSize: "var(--sd-font-size-xl)", fontWeight: "800", marginBottom: "0.5rem" }}>
                Đánh giá trải nghiệm dịch vụ
              </h2>
              <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", marginBottom: "1.5rem" }}>
                Giúp chúng tôi nâng cao chất lượng món ăn và dịch vụ giao nhận của SkyDish.
              </p>

              {feedbackSubmitted ? (
                <div
                  style={{
                    backgroundColor: "var(--sd-success-light)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "var(--sd-success-hover)",
                    padding: "1.25rem",
                    borderRadius: "var(--sd-radius-md)",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  <FaCheckCircle size={24} style={{ marginBottom: "0.5rem" }} />
                  <p style={{ margin: 0 }}>Cảm ơn bạn đã gửi đóng góp quý báu! Chúng tôi luôn trân trọng sự tin tưởng của bạn.</p>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit}>
                  <div style={{ marginBottom: "1.25rem" }}>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "var(--sd-font-size-sm)", fontWeight: "600" }}>
                      Mức độ hài lòng
                    </label>
                    <select
                      value={feedbackForm.rating}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, rating: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "0.65rem 1rem",
                        borderRadius: "var(--sd-radius-md)",
                        border: "1px solid var(--sd-border)",
                        fontSize: "var(--sd-font-size-sm)",
                        outline: "none",
                      }}
                    >
                      <option value="5">⭐⭐⭐⭐⭐ 5 Sao - Tuyệt vời & Giao rất nhanh</option>
                      <option value="4">⭐⭐⭐⭐ 4 Sao - Rất tốt</option>
                      <option value="3">⭐⭐⭐ 3 Sao - Bình thường</option>
                      <option value="2">⭐⭐ 2 Sao - Cần cải thiện</option>
                      <option value="1">⭐ 1 Sao - Trải nghiệm chưa tốt</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "var(--sd-font-size-sm)", fontWeight: "600" }}>
                      Nhận xét & Góp ý của bạn
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Hãy chia sẻ điều bạn yêu thích hoặc góp ý để SkyDish phục vụ bạn tốt hơn..."
                      value={feedbackForm.feedback}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                      required
                      style={{
                        width: "100%",
                        padding: "0.65rem 1rem",
                        borderRadius: "var(--sd-radius-md)",
                        border: "1px solid var(--sd-border)",
                        fontSize: "var(--sd-font-size-sm)",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>

                  <Button type="submit" variant="secondary" fullWidth icon={FaStar}>
                    Gửi đánh giá dịch vụ
                  </Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default ContactAndFeedback;