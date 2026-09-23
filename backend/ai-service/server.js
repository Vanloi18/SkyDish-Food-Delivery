import "dotenv/config";
import express from "express";
import cors from "cors";
import { buildNaturalFoodSearchText, buildRecommendationText, classifyIntent, extractSearchCriteria, isDrinkRequest, isFollowUpMessage } from "./intent.js";
import { enhanceResponse } from "./llm.js";
import { localDialogue } from "./local-dialogue.js";
import { getCustomerOrders, getCustomerProfile, getWeather, searchCatalog } from "./tools.js";

const app = express();
const port = Number(process.env.PORT || 5006);
const requestLog = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;

app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.get("/health", (_req, res) => res.json({ status: "ok", service: "ai-service", timestamp: new Date().toISOString() }));
app.get("/api/ai/health", (_req, res) => res.json({ status: "ok", service: "ai-service", timestamp: new Date().toISOString() }));

function rateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const entry = requestLog.get(key) || { started: now, count: 0 };
  if (now - entry.started > RATE_WINDOW_MS) {
    entry.started = now;
    entry.count = 0;
  }
  entry.count += 1;
  requestLog.set(key, entry);
  if (entry.count > RATE_LIMIT) return res.status(429).json({ message: "Bạn gửi hơi nhiều tin nhắn. Vui lòng thử lại sau một chút." });
  next();
}

function authHeader(req) {
  const raw = req.header("authorization");
  return raw?.startsWith("Bearer ") ? raw : null;
}

function money(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} ₫`;
}

function foodActions(foods) {
  return foods.map((food) => ({
    type: "FOOD",
    label: "Xem món",
    food: {
      id: food._id,
      name: food.name,
      price: food.price,
      image: food.image,
      description: food.description,
      restaurantId: food.restaurant?._id || food.restaurant,
      restaurantName: food.restaurant?.name || "Nhà hàng SkyDish",
      available: food.availability !== false,
    },
  }));
}

async function handleChat({ message, token, context = {} }) {
  const recentMessages = Array.isArray(context.recentMessages) ? context.recentMessages : [];
  const previousUserMessage = [...recentMessages].reverse().find((entry) => entry?.role === "user")?.text || "";
  const followUp = isFollowUpMessage(message) && Boolean(previousUserMessage);
  const intent = followUp ? "food_search" : classifyIntent(message);
  const searchMessage = followUp ? `${previousUserMessage} ${message}` : message;
  const conversationLead = followUp ? "Mình hiểu rồi. " : "";
  if (intent === "greeting") return { text: localDialogue(message, context), actions: [{ type: "NAVIGATE", label: "Khám phá món ăn", path: "/customer/home" }] };
  if (intent === "small_talk") return { text: localDialogue(message, context), actions: [{ type: "NAVIGATE", label: "Khám phá món ăn", path: "/customer/home" }] };
  if (intent === "features") return { text: "SkyDish hỗ trợ tìm món và nhà hàng, xem thực đơn, thêm vào giỏ, checkout, thanh toán COD/VNPay/MoMo/Stripe và theo dõi đơn hàng.", actions: [{ type: "NAVIGATE", label: "Khám phá món ăn", path: "/customer/home" }] };
  if (intent === "payment") return { text: "Bạn có thể thanh toán bằng COD, chuyển khoản/VietQR và các cổng trực tuyến được bật trong checkout như VNPay, MoMo hoặc Stripe.", actions: [{ type: "NAVIGATE", label: "Mở checkout", path: "/checkout" }] };
  if (intent === "how_to_order") return { text: "Bạn chọn nhà hàng, mở thực đơn, bấm Thêm vào giỏ, kiểm tra địa chỉ rồi chọn phương thức thanh toán tại Checkout.", actions: [{ type: "NAVIGATE", label: "Khám phá nhà hàng", path: "/customer/home" }] };
  if (intent === "profile") return { text: "Bạn có thể cập nhật thông tin cá nhân trong trang Hồ sơ sau khi đăng nhập.", actions: [{ type: "NAVIGATE", label: "Mở hồ sơ", path: "/customer/profile" }] };
  if (intent === "forgot_password") return { text: "Bạn dùng luồng Quên mật khẩu để nhận OTP, xác thực rồi đặt lại mật khẩu.", actions: [{ type: "NAVIGATE", label: "Quên mật khẩu", path: "/auth/forgot-password" }] };

  if (intent === "help") return { text: localDialogue(message, context), actions: [] };

  if (intent === "order_status") {
    if (!token) return { text: "Để xem đơn hàng thật của bạn, hãy đăng nhập trước nhé.", actions: [{ type: "NAVIGATE", label: "Đăng nhập", path: "/auth/login?redirect=/orders" }] };
    try {
      const orders = await getCustomerOrders(token);
      if (!orders.length) return { text: "Mình chưa tìm thấy đơn hàng nào trong tài khoản của bạn.", actions: [{ type: "NAVIGATE", label: "Khám phá món", path: "/customer/home" }] };
      const order = orders[0];
      return { text: `Đơn gần nhất #${order._id || order.orderId} hiện ở trạng thái ${order.status || "Pending"}.`, actions: [{ type: "ORDER_STATUS", label: "Xem đơn hàng", order }] };
    } catch {
      return { text: "Mình chưa thể lấy trạng thái đơn lúc này. Bạn thử mở trang Đơn hàng để kiểm tra trực tiếp nhé.", actions: [{ type: "NAVIGATE", label: "Mở đơn hàng", path: "/orders" }] };
    }
  }

  const criteria = extractSearchCriteria(searchMessage);
  if (intent === "restaurant_search") {
    try {
      const result = await searchCatalog({ query: criteria.location || criteria.query, limit: 8 });
      return result.restaurants.length
        ? { text: `Mình tìm thấy ${result.restaurants.length} nhà hàng phù hợp.`, actions: result.restaurants.map((restaurant) => ({ type: "RESTAURANT", label: "Xem nhà hàng", restaurant })) }
        : { text: "Mình chưa tìm thấy nhà hàng phù hợp trong dữ liệu hiện tại.", actions: [] };
    } catch { return { text: "Mình chưa thể tải danh sách nhà hàng lúc này. Bạn thử lại sau nhé.", actions: [] }; }
  }

  if (intent === "recommendation") {
    const drinkRequest = isDrinkRequest(message);
    let weather = null;
    try { weather = context.location ? await getWeather(context.location) : null; } catch { /* Recommendations remain useful without weather. */ }
    const result = await searchCatalog({ query: "", limit: 20 });
    const foods = drinkRequest
      ? result.foods.filter((food) => /cà phê|ca phe|trà|tra |nước ép|nuoc ep|sinh tố|sinh to|smoothie|trà sữa|tra sua|bia/i.test(food.name || "")).slice(0, 6)
      : result.foods.slice(0, 6);
    const weatherText = weather ? ` Thời tiết tại ${weather.location} hiện khoảng ${Math.round(weather.temperature_2m)}°C.` : " Mình chưa lấy được thời tiết hiện tại, nhưng tôi vẫn có gợi ý món thật cho bạn.";
    return foods.length
      ? { text: buildRecommendationText(foods.map((food) => food.name), context.location || "thành phố của bạn", drinkRequest) + weatherText, actions: foodActions(foods), meta: { weather, category: drinkRequest ? "drink" : "food" } }
      : { text: "Hiện chưa có đủ món trong thực đơn để gợi ý, nhưng bạn có thể thử tìm theo giá hoặc quán gần bạn.", actions: [] };
  }

  try {
    const result = await searchCatalog({ query: criteria.query, minPrice: criteria.min, maxPrice: criteria.max, limit: 8 });
    const rankedFoods = [...result.foods].sort((left, right) => {
      const leftScore = left.name?.toLocaleLowerCase("vi-VN").includes((criteria.query || "").toLocaleLowerCase("vi-VN")) ? 1 : 0;
      const rightScore = right.name?.toLocaleLowerCase("vi-VN").includes((criteria.query || "").toLocaleLowerCase("vi-VN")) ? 1 : 0;
      return rightScore - leftScore || Number(left.price || 0) - Number(right.price || 0);
    });
    if (rankedFoods.length) return { text: `${conversationLead}${buildNaturalFoodSearchText(rankedFoods.length, criteria.max)}`, actions: foodActions(rankedFoods) };

    const fallback = await searchCatalog({ query: "", limit: 6 });
    const fallbackFoods = fallback.foods.slice(0, 3);
    return {
      text: `${conversationLead}Mình chưa thấy món nào đúng điều kiện đó. Bạn thử đổi mức giá hoặc nói rõ khẩu vị, ví dụ “món nhẹ”, “ít cay” hay “đồ uống”, mình sẽ lọc lại cho sát hơn.`,
      actions: fallbackFoods.length ? foodActions(fallbackFoods) : [],
    };
  } catch {
    return { text: "Xin lỗi, hiện tại mình chưa thể tìm dữ liệu món. Bạn thử lại sau nhé.", actions: [] };
  }
}

app.post("/api/ai/chat", rateLimit, async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 500) : "";
  if (!message) return res.status(400).json({ message: "Vui lòng nhập câu hỏi." });
  try {
    const token = authHeader(req);
    let profile = null;
    if (token) { try { profile = await getCustomerProfile(token); } catch { profile = null; } }
    const requestContext = { ...req.body.context, profile, location: req.body.context?.location || profile?.address || "" };
    const hasPreviousUserMessage = Array.isArray(requestContext.recentMessages)
      && requestContext.recentMessages.some((entry) => entry?.role === "user");
    const effectiveIntent = isFollowUpMessage(message) && hasPreviousUserMessage ? "food_search" : classifyIntent(message);
    const result = await handleChat({ message, token, context: requestContext });
    const response = await enhanceResponse({ message, result, intent: effectiveIntent, context: requestContext });
    return res.json({ ...response, intent: effectiveIntent, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("AI chat error:", error.message);
    return res.status(200).json({ text: "Xin lỗi, hiện tại mình chưa thể xử lý câu hỏi. Bạn thử lại sau nhé.", actions: [], degraded: true });
  }
});

app.listen(port, "0.0.0.0", () => console.log(`SkyDish AI service running on port ${port}`));
