# SkyDish AI Assistant

## Current Architecture

The assistant is an isolated `backend/ai-service` on port `5006`. The frontend calls it through the existing Nginx gateway at `/api/ai/chat`, so customer browsers do not need a new public backend origin.

```text
Customer UI -> /api/ai/chat -> ai-service
                              -> restaurant-service search API
                              -> order-service API (JWT forwarded)
                              -> auth-service profile API (JWT forwarded)
                              -> Open-Meteo weather tools when a user location is available
```

The current provider is `rules`: intent detection and recommendation orchestration work without an external model key. The service boundary is ready for a model provider later through `AI_PROVIDER`, `AI_MODEL`, and `OPENAI_API_KEY`.

## Implemented Capabilities

- Floating customer-only chat UI with responsive layout.
- Quick actions, typing indicator, auto-scroll, clear conversation, minimize, retry-safe errors.
- Real food search with price filters from `/api/search`.
- Real restaurant search from `/api/search`.
- Customer order lookup using the current JWT and `/api/orders` ownership rules.
- Customer profile forwarding for future personalization.
- Weather lookup through Open-Meteo only when the customer supplies a location.
- Structured actions for food cards, restaurant navigation, order navigation, and page navigation.
- Add-to-cart action reusing the existing `CartContext` and single-restaurant cart rule.
- In-memory rate limit: 30 chat requests per IP per minute.
- No database access from the AI service and no API key exposed to the frontend.

## Environment

```env
AI_PORT=5006
AI_PROVIDER=rules
AI_MODEL=
OPENAI_API_KEY=
```

The AI service uses these internal defaults in Docker:

```env
RESTAURANT_SERVICE_URL=http://restaurant-service:5002
ORDER_SERVICE_URL=http://order-service:5005
AUTH_SERVICE_URL=http://auth-service:4000
```

## API

### `POST /api/ai/chat`

Request:

```json
{
  "message": "Tìm phở bò dưới 100k",
  "context": {
    "location": "Quận 1"
  }
}
```

The frontend forwards `Authorization: Bearer <customer-jwt>` when available.

Response contains:

- `text`: assistant response grounded in tool results.
- `intent`: detected intent.
- `actions`: structured UI actions such as `FOOD`, `RESTAURANT`, `ORDER_STATUS`, and `NAVIGATE`.
- `meta.weather`: weather data when location lookup succeeds.

## Test Checklist

- `Tìm phở bò dưới 100k` returns food records from the restaurant database.
- `Tìm burger dưới 150k` applies a real price filter.
- `Tìm nhà hàng ở Quận 1` uses the restaurant search API.
- `Đơn hàng của tôi đâu?` asks for login when unauthenticated and uses the order API when authenticated.
- `Trời nóng nên ăn gì?` returns real catalog items and does not invent weather when no location is available.
- `SkyDish có những chức năng gì?` returns only currently implemented customer capabilities.
- A failed tool request produces a friendly fallback instead of crashing the frontend.

Run the service tests:

```powershell
cd backend/ai-service
npm test
```

Run the Docker smoke check:

```powershell
docker compose up -d --build ai-service frontend
Invoke-WebRequest http://localhost:5006/health
```
