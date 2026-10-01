const normalize = (value = "") => value
  .toLocaleLowerCase("vi-VN")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d");

const FOOD_TERMS = [
  "pho", "bun", "com", "banh mi", "pizza", "burger", "sushi", "salad",
  "mi", "lau", "ga", "bo", "hai san", "chay", "healthy", "do uong",
  "ca phe", "trung", "nem", "quay"
];

const DRINK_TERMS = ["uong", "do uong", "nuoc", "tra", "ca phe", "sinh to", "nuoc ep", "tra sua", "smoothie", "bia"];

const SEARCH_TERM_BY_NORMALIZED = {
  pho: "phở",
  bun: "bún",
  com: "cơm",
  "banh mi": "bánh mì",
  mi: "mì",
  lau: "lẩu",
  ga: "gà",
  bo: "bò",
  "hai san": "hải sản",
  chay: "chay",
  "ca phe": "cà phê",
  trung: "trứng",
  nem: "nem",
  quay: "quẩy",
};

const SEARCH_PHRASES = [
  ["pho bo", "phở bò"],
  ["bun cha", "bún chả"],
  ["com tam", "cơm tấm"],
  ["banh mi", "bánh mì"],
  ["ca phe", "cà phê"],
];

const FUNCTION_PATTERNS = [
  [/chuc nang|lam duoc gi|tinh nang/, "features"],
  [/thanh toan|vnpay|momo|stripe|cod/, "payment"],
  [/doi.*(dia chi|so dien thoai)|cap nhat.*(dia chi|so dien thoai)/, "profile"],
  [/quen mat khau|dat lai mat khau/, "forgot_password"],
  [/dat mon|mua mon|them vao gio/, "how_to_order"],
  [/theo doi|don hang.*(dau|nao|trang thai)|don gan nhat/, "order_status"],
];

export function extractBudget(text) {
  const normalized = normalize(text).replace(/\./g, "");
  const under = normalized.match(/(?:duoi|toi da|khong qua|<=)\s*(\d+)\s*(k|nghin|trieu)?/);
  if (under) return { max: Number(under[1]) * (under[2] === "trieu" ? 1000000 : 1000) };
  const around = normalized.match(/(?:khoang|tam|du tam)\s*(\d+)\s*(k|nghin|trieu)?/);
  if (around) {
    const amount = Number(around[1]) * (around[2] === "trieu" ? 1000000 : 1000);
    return { min: Math.round(amount * 0.7), max: Math.round(amount * 1.3) };
  }
  return {};
}

export function classifyIntent(text = "") {
  const normalized = normalize(text);  if (/^(hi|hello|hey|xin chao|chao|chào|alo)/.test(normalized.trim())) return "greeting";
  if (/cam on|cảm ơn|thanks|thank you|ban la ai|bạn là ai|ten ban la gi|tên bạn là gì|ban khoe khong|bạn khỏe không|co noi chuyen duoc khong/.test(normalized)) return "small_talk";  for (const [pattern, intent] of FUNCTION_PATTERNS) {
    if (pattern.test(normalized)) return intent;
  }
  if (/don hang|order|giao chua|shipper/.test(normalized)) return "order_status";
  if (/nha hang|quan an|quán ăn|gan toi|gần tôi|quan\s*\d|giao nhanh|tim nha hang|tìm quán/.test(normalized)) return "restaurant_search";
  if (/hom nay an gi|an gi|ăn gì|hom nay uong gi|nay uong gi|uong gi|uống gì|khong biet an gi|không biết ăn gì|troi nong|troi lanh|mua|buoi toi|buổi tối|buoi trua|buổi trua|buoi sang|buổi sáng|mon nhe|món nhé|goi y|gợi ý/.test(normalized)) return "recommendation";
  if (/tim|tìm|co mon|có món|co .*khong|có .*không|muon an|muốn ăn|mon duoi|món dưới|mon chay|món chay/.test(normalized) || FOOD_TERMS.some((term) => normalized.includes(term)) || DRINK_TERMS.some((term) => normalized.includes(term))) return "food_search";
  return "help";
}

export function isFollowUpMessage(text = "") {
  const normalized = normalize(text).trim();
  return /^(re hon|dat hon|re hon nua|mon khac|con mon khac|them mon|them nua|mon do|cai do|co nua khong|goi y them|loc them|khong thich|doi mon)/.test(normalized);
}

export function isDrinkRequest(text = "") {
  const normalized = normalize(text);
  return /uong gi|uống gì|do uong|đồ uống|nuoc|nước|tra sua|trà sữa|ca phe|cà phê|sinh to|sinh tố|nuoc ep|nước ép|smoothie/.test(normalized);
}

export function extractSearchCriteria(text = "") {
  const normalized = normalize(text);
  const budget = extractBudget(text);
  const phrase = SEARCH_PHRASES.find(([term]) => normalized.includes(term));
  const normalizedFoodTerm = FOOD_TERMS.find((term) => normalized.includes(term));
  const foodTerm = phrase?.[1] || SEARCH_TERM_BY_NORMALIZED[normalizedFoodTerm] || normalizedFoodTerm;

  const genericFoodSearch = /(?:tim|tìm)\s*(?:mon|món)\b|\bmon\b.*(?:duoi|dưới|under|<=)/i.test(text)
    || /(?:an gi|ăn gì|gợi ý|goi y)\b.*(?:duoi|dưới|under|<=)/i.test(text)
    || /\b(?:mon|món)\b\s*(?:duoi|dưới|under|<=)/i.test(text);

  const restaurantSearch = /(?:tim|tìm)\s*(?:nha hang|nhà hàng|quan an|quán ăn|quán)/i.test(text);
  const locationMatch = text.match(/(?:quan|q\.)\s*([0-9]{1,2})|(?:o|tai|gan|gần)\s+([^,.!?]+)/i);
  const location = locationMatch ? (locationMatch[1] ? `Quận ${locationMatch[1]}` : locationMatch[2].trim()) : "";

  return {
    query: restaurantSearch ? (location || "") : (genericFoodSearch ? "" : (foodTerm || text.trim())),
    location,
    ...budget,
  };
}

export function buildNaturalFoodSearchText(count = 0, maxPrice = null) {
  const amountText = maxPrice ? ` dưới ${Number(maxPrice).toLocaleString("vi-VN")} ₫` : "";
  const lead = count > 0
    ? `Mình thấy ${count} món phù hợp${amountText}.`
    : "Mình chưa thấy món nào thật sự khớp với yêu cầu của bạn.";

  if (count > 0) {
    return `${lead} Nếu bạn muốn, mình có thể gợi ý thêm theo mức giá, món nóng, món chay hoặc nhà hàng gần bạn nhất.`;
  }

  return `${lead} Bạn có thể thử mô tả rõ hơn như “món ăn nhẹ”, “cơm tấm”, hoặc “dưới 120k” để mình lọc chính xác hơn.`;
}

export function buildRecommendationText(foodNames = [], city = "", drinkRequest = false) {
  const names = foodNames.slice(0, 3).join(", ");
  const cityText = city ? ` ở ${city}` : "";
  const category = drinkRequest ? "món uống" : "món ăn";
  const next = drinkRequest ? "đồ uống mát, ít ngọt hoặc cà phê" : "món nóng, món chay hoặc món dưới 150k";
  return `Mình gợi ý bạn thử ${names}${cityText}. Đây là vài ${category} dễ đặt ngay; nếu muốn mình có thể lọc tiếp theo ${next}.`;
}

export { normalize };
