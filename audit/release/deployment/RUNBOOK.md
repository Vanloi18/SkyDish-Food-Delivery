# SKYDISH FOOD DELIVERY PLATFORM — PRODUCTION OPERATIONS & DEPLOYMENT RUNBOOK

**Target Environment**: Public Production Web  
**Version**: 3.0-PRODUCTION  
**Last Updated**: 2026-09-13  

---

## 1. Production Architecture Overview

SkyDish operates as an event-driven, containerized microservices architecture with an Nginx reverse-proxy API Gateway serving a modern React SPA frontend:

```
[ Client Requests (HTTPS / WSS) ]
                │
                ▼
      [ Nginx Gateway :3000 ]
      ├── /                  --> React Static SPA (HTML/CSS/JS)
      ├── /api/auth          --> auth-service:4000
      ├── /api/restaurant    --> restaurant-service:5002
      ├── /api/food-items    --> restaurant-service:5002
      ├── /api/coupons       --> restaurant-service:5002
      ├── /api/reviews       --> restaurant-service:5002
      ├── /api/notifications --> restaurant-service:5002
      ├── /api/orders        --> order-service:5005
      ├── /api/delivery      --> delivery-service:5003
      ├── /api/payment       --> payment-service:5004
      ├── /uploads           --> restaurant-service:5002/uploads
      ├── /socket.io/        --> order-service:5005 (WSS)
      └── /delivery-socket.io/ -> delivery-service:5003 (WSS)
```

---

## 2. Standard Deployment Procedures

### 2.1 Starting the Production Stack (Docker Compose)
```bash
# 1. Ensure Docker Engine is active
docker version

# 2. Verify configuration
docker compose config

# 3. Build and launch all 7 containers in detached mode
docker compose up -d --build

# 4. Verify health of all services
docker compose ps
```

### 2.2 Verifying Microservice Health Endpoints
Each service provides an explicit JSON health check:
```bash
curl -i http://127.0.0.1:4000/health  # auth-service
curl -i http://127.0.0.1:5002/health  # restaurant-service
curl -i http://127.0.0.1:5003/health  # delivery-service
curl -i http://127.0.0.1:5004/health  # payment-service
curl -i http://127.0.0.1:5005/health  # order-service
curl -i http://127.0.0.1:3000         # frontend SPA
```

### 2.3 Exposing Public HTTPS Gateway
```bash
# Launch public HTTPS tunnel terminating on port 3000
ngrok http 3000 --log=stdout
```

---

## 3. Production Secret Management & Rotation Policy

### 3.1 Rules
1. **Never commit `.env` files** to Git. Use `.env.example` as the canonical reference.
2. **Production Fail-Fast Guard**: When `NODE_ENV=production`, microservices will immediately terminate (`process.exit(1)`) if `JWT_SECRET` is unset or equals the development fallback.
3. **Secret Rotation Procedure**:
   - Step 1: Generate a high-entropy 256-bit secret (`openssl rand -hex 32`).
   - Step 2: Update `JWT_SECRET` in production secret store / environment variables.
   - Step 3: Perform rolling restart of all 5 services:
     ```bash
     docker compose up -d --no-deps auth-service restaurant-service order-service delivery-service payment-service
     ```
   - Step 4: Existing active JWTs will expire naturally within their `JWT_EXPIRES_IN` window (7 days).

---

## 4. Custom Domain & DNS Configuration Guide

To bind a custom domain (e.g. `skydish.vn` or `app.skydish.com`):

### 4.1 DNS Records
| Record Type | Hostname | Target / Value | TTL |
|---|---|---|---|
| **A** | `skydish.vn` | `<Production Load Balancer / Server IP>` | 300s |
| **CNAME** | `www.skydish.vn` | `skydish.vn` | 300s |
| **CNAME** | `api.skydish.vn` | `<Production Gateway Ingress>` | 300s |

### 4.2 Automated TLS via Let's Encrypt / Certbot
```bash
# In Nginx or Traefik reverse proxy
certbot certonly --nginx -d skydish.vn -d www.skydish.vn
```

---

## 5. Automated Verification & Smoke Testing

Run the comprehensive post-deployment verification suite:
```bash
# Verify all 30 production checkpoints against the live public domain
node scripts/verify-public-production.mjs
```

Expected Output:
```
====================================================
📊 FINAL PUBLIC PRODUCTION VERIFICATION SUMMARY
====================================================
Total Checks: 30
Passed Checks: 30
Failed Checks: 0
Success Rate: 100%
Overall Gate Status: 🟢 100% PASS — PRODUCTION LIVE
```

---

## 6. Disaster Recovery & Backup Plan

### 6.1 Database Backups (MongoDB)
```bash
# Create an on-demand snapshot of food_delivery_db
docker exec skydish-mongo mongodump --db food_delivery_db --out /data/db/backups/$(date +%Y%m%d_%H%M%S)

# Restore from snapshot
docker exec skydish-mongo mongorestore --db food_delivery_db /data/db/backups/<timestamp>/food_delivery_db
```

### 6.2 Service Failure Recovery
- **Docker Auto-Restart**: All containers are configured with `restart: unless-stopped` (and `restart: always` for MongoDB).
- **Graceful Isolation**: In the event of an upstream payment gateway outage or individual microservice container failure, Nginx returns HTTP 502 Bad Gateway for only that route while keeping the frontend SPA and all other 4 microservices operational.
