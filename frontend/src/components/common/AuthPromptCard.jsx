import React from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaSignInAlt, FaUserPlus } from "react-icons/fa";
import Button from "./Button";
import Card from "./Card";

export default function AuthPromptCard({ 
  title = "Đăng nhập để xem đơn hàng", 
  description = "Đăng nhập bằng tài khoản SkyDish của bạn để theo dõi đơn hàng thời gian thực, xem lại lịch sử và hóa đơn.",
  returnUrl = "/orders"
}) {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: "560px", margin: "3rem auto", textAlign: "center" }}>
      <Card padding="3rem 2rem">
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "var(--sd-primary-light)",
            color: "var(--sd-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem auto",
          }}
        >
          <FaLock size={30} />
        </div>

        <h2 className="sd-heading-2" style={{ marginBottom: "0.75rem" }}>
          {title}
        </h2>
        <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-base)", lineHeight: "1.6", marginBottom: "2rem" }}>
          {description}
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            variant="primary"
            size="lg"
            icon={FaSignInAlt}
            onClick={() => navigate("/auth/login")}
          >
            Đăng nhập SkyDish
          </Button>

          <Button
            variant="outline"
            size="lg"
            icon={FaUserPlus}
            onClick={() => navigate("/auth/register")}
          >
            Đăng ký tài khoản
          </Button>
        </div>
      </Card>
    </div>
  );
}
