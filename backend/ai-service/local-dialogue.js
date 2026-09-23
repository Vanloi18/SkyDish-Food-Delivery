const replies = {
  greeting: [
    "Chào bạn, hôm nay mình giúp gì cho bữa ăn của bạn đây? Bạn đang muốn ăn món cụ thể, tìm quán hay cần gợi ý?",
    "Chào bạn. Mình đang ở đây để tìm món và nhà hàng thật trên SkyDish. Bạn nói mình biết khẩu vị hoặc ngân sách nhé.",
  ],
  identity: [
    "Mình là trợ lý của SkyDish. Mình có thể tìm món, lọc theo giá, tìm nhà hàng, xem đơn và đưa bạn tới đúng màn hình cần dùng.",
    "Mình là SkyDish AI, một trợ lý đặt món chạy ngay trong ứng dụng này. Bạn cứ nói tự nhiên như đang nhờ một người chọn món cùng mình.",
  ],
  thanks: [
    "Không có gì, mình rất vui được giúp bạn. Bạn muốn xem thêm lựa chọn hay chốt một món luôn?",
    "Được giúp bạn là tốt rồi. Nếu vẫn chưa ưng món nào, cứ nói khẩu vị hoặc ngân sách, mình lọc lại nhé.",
  ],
  unclear: [
    "Mình chưa chắc đã hiểu đúng ý bạn. Bạn muốn mình tìm món, tìm nhà hàng, kiểm tra đơn hay hướng dẫn đặt món?",
    "Bạn nói thêm cho mình một chút nhé: đang muốn ăn gì, khoảng bao nhiêu tiền, hay cần hỗ trợ việc gì trong SkyDish?",
  ],
  wellbeing: [
    "Mình vẫn ổn và đang sẵn sàng tìm món cùng bạn. Còn bạn hôm nay muốn ăn nhẹ hay ăn thật no?",
    "Mình khỏe, cảm ơn bạn hỏi nhé. Giờ mình chọn giúp bạn một món ngon chứ?",
  ],
};

function pick(items, seed = "") {
  const score = [...String(seed)].reduce((total, character) => total + character.charCodeAt(0), 0);
  return items[score % items.length];
}

export function localDialogue(message = "", context = {}) {
  const normalized = message.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").trim();
  const recent = Array.isArray(context.recentMessages) ? context.recentMessages : [];
  const hasConversation = recent.some((entry) => entry?.role === "user");

  if (/^(hi|hello|hey|xin chao|chao|alo)\b/.test(normalized)) return pick(replies.greeting, message);
  if (/\b(ban la ai|ten ban|tro ly|ai vay|may la ai)\b/.test(normalized)) return pick(replies.identity, message);
  if (/\b(ban khoe khong|ban on khong|co noi chuyen duoc khong)\b/.test(normalized)) return pick(replies.wellbeing, message);
  if (/^(cam on|thanks|thank you|ok cam on|duoc roi)\b/.test(normalized)) return pick(replies.thanks, message);
  if (/^(uh|um|a|e|hmm|khong|chua biet|gi cung duoc)\b/.test(normalized) && !hasConversation) return pick(replies.unclear, message);
  return hasConversation ? "Mình muốn hiểu đúng ý bạn hơn. Bạn nói rõ giúp mình món, mức giá hoặc việc bạn muốn làm tiếp theo nhé." : pick(replies.unclear, message);
}