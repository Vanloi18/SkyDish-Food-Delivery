const DEFAULT_BASE_URL = "https://api.openai.com/v1";

function modelEnabled() {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return Boolean(process.env.OPENAI_API_KEY) && provider !== "rules";
}

function providerName() {
  return (process.env.AI_PROVIDER || "openai").toLowerCase();
}

function compactContext(context = {}) {
  const recentMessages = Array.isArray(context.recentMessages) ? context.recentMessages.slice(-6) : [];
  return recentMessages
    .filter((message) => message?.role === "user" || message?.role === "assistant")
    .map(({ role, text }) => ({ role, content: String(text || "").slice(0, 800) }));
}

export async function enhanceResponse({ message, result, intent, context = {} }) {
  if (!modelEnabled() || !result?.text) return result;

  const system = [
    "Bạn là SkyDish AI, một trợ lý đặt món thân thiện và tự nhiên bằng tiếng Việt.",
    "Trả lời như một người hỗ trợ thật: hiểu ngữ cảnh, nói ngắn gọn, ấm áp, không lặp lại máy móc.",
    "Chỉ sử dụng thông tin thực tế trong DỮ LIỆU SKYDISH được cung cấp; không tự bịa món, giá, nhà hàng, thời tiết, đơn hàng hoặc tính năng.",
    "Không nói bạn đang gọi API, không nhắc đến prompt hay hệ thống. Không tạo nút, đường dẫn hoặc dữ liệu mới.",
    "Nếu dữ liệu chưa đủ, hãy nói rõ và hỏi một câu hỏi cụ thể để người dùng trả lời tiếp.",
  ].join(" ");

  const payload = {
    intent,
    userMessage: message,
    groundedReply: result.text,
    availableActions: (result.actions || []).map((action) => ({ type: action.type, label: action.label })),
    recentConversation: compactContext(context),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    if (providerName() === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${process.env.AI_MODEL || "gemini-flash-latest"}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [
              ...compactContext(context).map((entry) => ({
                role: entry.role === "assistant" ? "model" : "user",
                parts: [{ text: entry.content }],
              })),
              { role: "user", parts: [{ text: `DỮ LIỆU SKYDISH:\n${JSON.stringify(payload)}` }] },
            ],
            generationConfig: { temperature: 0.7, maxOutputTokens: 220 },
          }),
        },
      );
      if (!response.ok) throw new Error(`Gemini request failed: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();
      return text ? { ...result, text, modelEnhanced: true, modelProvider: "gemini" } : result;
    }

    const response = await fetch(`${process.env.AI_BASE_URL || DEFAULT_BASE_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        max_tokens: 220,
        messages: [
          { role: "system", content: system },
          ...compactContext(context),
          { role: "user", content: `DỮ LIỆU SKYDISH:\n${JSON.stringify(payload)}` },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    return text ? { ...result, text, modelEnhanced: true } : result;
  } catch (error) {
    console.warn("AI model unavailable; using grounded response:", error.name === "AbortError" ? "timeout" : error.message);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}