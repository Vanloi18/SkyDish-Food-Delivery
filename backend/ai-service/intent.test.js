import test from "node:test";
import assert from "node:assert/strict";
import { buildNaturalFoodSearchText, buildRecommendationText, classifyIntent, extractBudget, extractSearchCriteria, isDrinkRequest, isFollowUpMessage } from "./intent.js";
import { localDialogue } from "./local-dialogue.js";

test("classifies Vietnamese food search and budget", () => {
  assert.equal(classifyIntent("Tìm burger dưới 100k"), "food_search");
  assert.deepEqual(extractBudget("Tìm món dưới 100k"), { max: 100000 });
  assert.equal(extractSearchCriteria("Tìm phở bò dưới 100k").query, "phở bò");
  assert.equal(extractSearchCriteria("Tìm món dưới 100k").query, "");
  assert.equal(classifyIntent("Tìm nhà hàng gần tôi"), "restaurant_search");
});

test("requires recommendation intent for meal questions", () => {
  assert.equal(classifyIntent("Trời nóng nên ăn gì?"), "recommendation");
  assert.equal(classifyIntent("Hôm nay ăn gì?"), "recommendation");
  assert.equal(classifyIntent("Nay uống gì?"), "recommendation");
  assert.equal(classifyIntent("Uống gì cho mát?"), "recommendation");
  assert.equal(isDrinkRequest("Nay uống gì?"), true);
  assert.match(buildRecommendationText(["Trà đào"], "Hà Nội", true), /món uống|đồ uống/i);
});

test("detects order and feature questions", () => {
  assert.equal(classifyIntent("Đơn hàng của tôi đâu?"), "order_status");
  assert.equal(classifyIntent("SkyDish có những chức năng gì?"), "features");
});

test("builds AI-like natural responses with follow-up guidance", () => {
  assert.match(buildNaturalFoodSearchText(8, 100000), /món phù hợp|nếu muốn|gợi ý/i);
  assert.match(buildRecommendationText(["Bún chả", "Cà phê"], "Hà Nội"), /gợi ý|Hà Nội|món/i);
});

test("recognizes natural follow-up messages", () => {
  assert.equal(isFollowUpMessage("rẻ hơn đi"), true);
  assert.equal(isFollowUpMessage("còn món khác không?"), true);
  assert.equal(isFollowUpMessage("Tìm pizza"), false);
});

test("answers common conversation locally without an external model", () => {
  assert.match(localDialogue("bạn là ai?"), /SkyDish|trợ lý/i);
  assert.match(localDialogue("cảm ơn"), /giúp|món|lựa chọn/i);
  assert.match(localDialogue("hmm"), /hiểu|món|giá/i);
});
