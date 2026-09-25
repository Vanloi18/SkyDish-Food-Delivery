import React, { useEffect, useRef, useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaRobot, FaTimes, FaTrashAlt, FaPaperPlane, FaUtensils, FaStore, FaBoxOpen, FaPlus, FaArrowRight } from "react-icons/fa";
import { API_URLS } from "../../config/api";
import { CartContext } from "../../pages/contexts/CartContext";
import { getAuthHeaders } from "../../utils/authHelper";
import "../../styles/assistant.css";

const QUICK_ACTIONS = [
  { label: "Hôm nay ăn gì?", icon: FaUtensils },
  { label: "Tìm món dưới 100k", icon: FaPlus },
  { label: "Tìm nhà hàng", icon: FaStore },
  { label: "Theo dõi đơn hàng", icon: FaBoxOpen },
];

const initialMessage = {
  id: "welcome",
  role: "assistant",
  text: "Xin chào 👋 Mình là SkyDish AI. Mình có thể tìm món thật, tìm nhà hàng hoặc kiểm tra đơn hàng giúp bạn.",
};

function formatPrice(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

export default function SkyDishAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext) || {};
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([initialMessage]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const hidden = /^(\/admin|\/superadmin|\/restaurant|\/delivery)/i.test(location.pathname);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (hidden) return null;

  const sendMessage = async (value = input) => {
    const message = value.trim();
    if (!message || loading) return;
    setInput("");
    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: "user", text: message }]);
    setLoading(true);
    try {
      const response = await fetch(`${API_URLS.AI}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          message,
          context: {
            location: localStorage.getItem("addr_city") || "",
            recentMessages: messages.slice(-6).map(({ role, text }) => ({ role, text })),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Assistant unavailable");
      setMessages((current) => [...current, { id: `${Date.now()}-assistant`, role: "assistant", text: data.text, actions: data.actions || [] }]);
    } catch {
      setMessages((current) => [...current, { id: `${Date.now()}-error`, role: "assistant", text: "Xin lỗi, hiện tại mình chưa thể kết nối dữ liệu. Bạn thử lại sau nhé." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action.type === "NAVIGATE") navigate(action.path);
    if (action.type === "RESTAURANT" && action.restaurant?._id) navigate(`/customer/restaurant/${action.restaurant._id}/foods`);
    if (action.type === "ORDER_STATUS") navigate("/orders");
    if (action.type === "FOOD" && action.food) navigate(`/customer/restaurant/${action.food.restaurantId}/foods`);
  };

  const addFood = (food) => {
    if (!food || !addToCart) return;
    const result = addToCart({ ...food, _id: food.id, restaurantId: food.restaurantId, restaurantName: food.restaurantName }, 1);
    if (result?.added) setMessages((current) => [...current, { id: `${Date.now()}-cart`, role: "assistant", text: `Đã thêm ${food.name} vào giỏ hàng của bạn.` }]);
    else setMessages((current) => [...current, { id: `${Date.now()}-cart-error`, role: "assistant", text: result?.reason === "different-restaurant" ? `Giỏ hàng đang thuộc về ${result.restaurantName}. Bạn có thể mở món để xem trước.` : "Mình chưa thể thêm món này vào giỏ." }]);
  };

  return (
    <>
      {open && (
        <section className="skydish-assistant-panel" aria-label="SkyDish AI Assistant">
          <header className="skydish-assistant-header">
            <div className="skydish-assistant-brand"><span className="skydish-assistant-avatar"><FaRobot /></span><span><strong>SkyDish AI</strong><small>Đang trực tuyến</small></span></div>
            <div className="skydish-assistant-tools"><button type="button" onClick={() => setMessages([initialMessage])} aria-label="Xóa cuộc trò chuyện" title="Xóa cuộc trò chuyện"><FaTrashAlt /></button><button type="button" onClick={() => setOpen(false)} aria-label="Thu nhỏ chatbot" title="Thu nhỏ"><FaTimes /></button></div>
          </header>
          <div className="skydish-assistant-messages" ref={scrollRef}>
            {messages.map((message) => (
              <div className={`skydish-assistant-message ${message.role}`} key={message.id}>
                <div className="skydish-assistant-bubble">{message.text}</div>
                {message.actions?.length > 0 && <div className="skydish-assistant-actions">{message.actions.slice(0, 8).map((action, index) => action.type === "FOOD" ? (
                  <article className="skydish-assistant-food-card" key={`${message.id}-${index}`}>
                    {action.food.image && <img src={action.food.image} alt="" />}
                    <div><strong>{action.food.name}</strong><small>{action.food.restaurantName} · {formatPrice(action.food.price)}</small><div><button type="button" onClick={() => handleAction(action)}>Xem món <FaArrowRight /></button><button type="button" onClick={() => addFood(action.food)}><FaPlus /> Thêm</button></div></div>
                  </article>
                ) : action.type === "RESTAURANT" ? (
                  <button className="skydish-assistant-action-link" type="button" key={`${message.id}-${index}`} onClick={() => handleAction(action)}><FaStore /> {action.label}: {action.restaurant?.name || "Nhà hàng"}</button>
                ) : (
                  <button className="skydish-assistant-action-link" type="button" key={`${message.id}-${index}`} onClick={() => handleAction(action)}>{action.label} <FaArrowRight /></button>
                ))}</div>}
              </div>
            ))}
            {loading && <div className="skydish-assistant-message assistant"><div className="skydish-assistant-bubble skydish-assistant-typing"><i /><i /><i /></div></div>}
          </div>
          <div className="skydish-assistant-quick-actions">{QUICK_ACTIONS.map(({ label, icon: Icon }) => <button type="button" key={label} onClick={() => sendMessage(label)}><Icon /> {label}</button>)}</div>
          <form className="skydish-assistant-composer" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Bạn muốn ăn gì hôm nay?" aria-label="Nhập tin nhắn cho SkyDish AI" maxLength={500} /><button type="submit" disabled={!input.trim() || loading} aria-label="Gửi tin nhắn"><FaPaperPlane /></button></form>
        </section>
      )}
      <button type="button" className={`skydish-assistant-launcher ${open ? "is-open" : ""}`} onClick={() => setOpen((value) => !value)} aria-label={open ? "Đóng SkyDish AI" : "Mở SkyDish AI"} title="SkyDish AI"><FaRobot /><span>AI</span></button>
    </>
  );
}
