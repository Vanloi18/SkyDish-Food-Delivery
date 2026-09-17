import { getDeliverySocketOptions, getDeliverySocketUrl } from '../../config/api';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import { FaPlay, FaStop, FaArrowLeft, FaSatellite } from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";

let socket;

export default function DriverSimulator() {
  const navigate = useNavigate();
  const [isMoving, setIsMoving] = useState(false);
  const [location, setLocation] = useState({ lat: 21.0285, lng: 105.8542 });
  const [orderId, setOrderId] = useState("ORDER-9901");
  const [coordsLog, setCoordsLog] = useState([]);

  useEffect(() => {
    try {
      const token = localStorage.getItem("driverToken") || localStorage.getItem("token");
      if (!token) {
        navigate("/delivery/login");
        return undefined;
      }
      socket = io(getDeliverySocketUrl(), getDeliverySocketOptions(token));
    } catch (e) {
      console.warn("Socket init error:", e);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [navigate]);

  useEffect(() => {
    let interval;
    if (isMoving) {
      interval = setInterval(() => {
        const deltaLat = (Math.random() - 0.48) * 0.0008;
        const deltaLng = (Math.random() - 0.48) * 0.0008;

        setLocation((prev) => {
          const next = {
            lat: parseFloat((prev.lat + deltaLat).toFixed(6)),
            lng: parseFloat((prev.lng + deltaLng).toFixed(6)),
          };

          if (socket) {
            socket.emit("location-update", {
              orderId,
              latitude: next.lat,
              longitude: next.lng,
            });
          }

          setCoordsLog((log) => [`Vĩ độ: ${next.lat}, Kinh độ: ${next.lng} (${new Date().toLocaleTimeString()})`, ...log.slice(0, 7)]);
          return next;
        });
      }, 1800);
    }

    return () => clearInterval(interval);
  }, [isMoving, orderId]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--sd-bg-main)" }}>
      <Header />

      <main style={{ flex: 1, padding: "2.5rem 0 5rem 0" }}>
        <div className="sd-container">
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              type="button"
              onClick={() => navigate("/delivery/dashboard")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.45rem 0.85rem",
                backgroundColor: "#ffffff",
                border: "1px solid var(--sd-border)",
                borderRadius: "var(--sd-radius-full)",
                color: "var(--sd-text-primary)",
                fontSize: "var(--sd-font-size-xs)",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <FaArrowLeft size={12} /> Quay lại Bảng điều khiển
            </button>
          </div>

          <div style={{ maxWidth: "620px", margin: "0 auto" }}>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "var(--sd-radius-xl)",
                border: "1px solid var(--sd-border)",
                padding: "2.5rem 2rem",
                boxShadow: "var(--sd-shadow-sm)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: isMoving ? "var(--sd-success-light)" : "var(--sd-bg-muted)",
                  color: isMoving ? "var(--sd-success)" : "var(--sd-text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1rem",
                  transition: "all var(--sd-transition-fast)",
                }}
              >
                <FaSatellite size={24} />
              </div>

              <h1 className="sd-heading-2" style={{ margin: "0 0 0.5rem 0" }}>
                Mô phỏng Di chuyển GPS Trực tiếp
              </h1>
              <p style={{ color: "var(--sd-text-secondary)", fontSize: "var(--sd-font-size-sm)", marginBottom: "2rem" }}>
                Phát tọa độ thời gian thực qua WebSocket để theo dõi lộ trình đơn hàng đang giao
              </p>

              <div style={{ textAlign: "left", marginBottom: "1.5rem" }}>
                <Input
                  label="Mã đơn hàng đích"
                  name="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Ví dụ: ORDER-9901"
                  required
                />
              </div>

              {/* Coordinates Preview */}
              <div
                style={{
                  backgroundColor: "var(--sd-secondary)",
                  color: "#10b981",
                  fontFamily: "monospace",
                  padding: "1.25rem",
                  borderRadius: "var(--sd-radius-lg)",
                  textAlign: "left",
                  fontSize: "0.85rem",
                  marginBottom: "2rem",
                }}
              >
                <p style={{ margin: "0 0 0.5rem 0", color: "#94a3b8" }}>
                  {"// Vị trí GPS hiện tại:"}
                </p>
                <p style={{ margin: 0, fontWeight: "700", fontSize: "1rem" }}>
                  Vĩ độ: {location.lat} | Kinh độ: {location.lng}
                </p>
                <p style={{ margin: "0.5rem 0 0 0", color: isMoving ? "#34d399" : "#f87171", fontSize: "0.75rem" }}>
                  Trạng thái: {isMoving ? "● ĐANG PHÁT TỌA ĐỘ QUA SOCKET" : "○ MÔ PHỎNG ĐANG DỪNG"}
                </p>
              </div>

              {/* Action Button */}
              <Button
                variant={isMoving ? "danger" : "success"}
                size="lg"
                fullWidth
                icon={isMoving ? FaStop : FaPlay}
                onClick={() => setIsMoving(!isMoving)}
              >
                {isMoving ? "Dừng phát tọa độ GPS" : "Bắt đầu mô phỏng lộ trình GPS"}
              </Button>

              {/* Log stream */}
              {coordsLog.length > 0 && (
                <div style={{ marginTop: "1.5rem", textAlign: "left", borderTop: "1px solid var(--sd-border)", paddingTop: "1rem" }}>
                  <span style={{ fontSize: "var(--sd-font-size-xs)", fontWeight: "700", textTransform: "uppercase", color: "var(--sd-text-muted)" }}>
                    Lịch sử truyền tin gần nhất
                  </span>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0 0", fontSize: "0.75rem", color: "var(--sd-text-secondary)" }}>
                    {coordsLog.map((log, i) => (
                      <li key={i} style={{ padding: "0.2rem 0" }}>📡 {log}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
