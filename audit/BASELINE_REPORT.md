# SKYDISH PLATFORM — BASELINE AUDIT & SYSTEM DISCOVERY REPORT
**Date:** 2026-09-13  
**Status:** COMPLETE  
**Auditor:** Principal SDET / Microservices Security Architect  

---

## 1. EXECUTIVE BASELINE SUMMARY

An evidence-based, zero-trust audit was executed across the SkyDish Vietnamese Food Delivery repository. Historical "100% pass" claims were treated with strict skepticism. The initial investigation uncovered critical security leaks, environment crashes, inter-service networking blocks, and module resolution issues that invalidated previous test reports.

### Key Baseline Findings & Deficiencies Uncovered:
1. **P0 Guest Payment Vulnerability:** Payment creation and payment status queries were accessible without authentication.
2. **P0 Registration Privilege Escalation:** Customer signup endpoint on order-service allowed arbitrary `role: "admin"` injection.
3. **P1 IPv6 Socket Interception:** Zombie Docker/WSL bindings on `::1` caused inter-service communication to hang indefinitely.
4. **P1 Missing Fallbacks:** Microservices crashed upon launch if `.env` files were absent due to hardcoded requirements without default values.
5. **P1 Broken Root Module Resolution:** Running test runners from root threw unhandled Node.js ESM `ERR_MODULE_NOT_FOUND`.
6. **P2 PowerShell Unicode Parser Crash:** Windows PowerShell 5.1 crashed when evaluating UTF-8 emojis in automation scripts.
7. **P2 Mocked Security Assertions:** Matrix test #18 used an in-memory JS condition check rather than an actual live HTTP GET assertion.

---

## 2. SYSTEM INVENTORY

### A. Backend Microservices
- **Auth Service (Port 4000):** Express, MongoDB, Bcrypt, JWT, Customer & Admin authentication.
- **Restaurant Service (Port 5002):** Express, MongoDB, Menus, Vietnamese categories, Vouchers, SuperAdmin.
- **Delivery Service (Port 5003):** Express, Socket.IO, Driver assignments, GPS live telemetry.
- **Payment Service (Port 5004):** Express, Stripe, VNPay (HMAC-SHA512), MoMo (HMAC-SHA256), Cash on Delivery, VietQR.
- **Order Service (Port 5005):** Express, MongoDB, Server Authority pricing, Cart validation, Order tracking.

### B. Frontend Portals
- **Customer Web Portal (`frontend/`):** React 18, TailwindCSS, Vietnamese localization, Cart, Realtime order tracking.
- **Delivery Driver Portal (`delivery-service/frontend/`):** React 19, Order pickup/delivery workflow, Live status toggles.
- **Restaurant Management Portal:** Embedded within restaurant-service APIs & frontend dashboard.
- **SuperAdmin Portal:** Embedded within admin interfaces & management endpoints.

---

## 3. SEEDED VIETNAMESE RESTAURANT BASELINE

Database verification confirmed 17 authentic Vietnamese restaurants seeded in `food_delivery_db` without any legacy demo or placeholder data:
- Pizza 4P's Tràng Tiền (Hà Nội)
- Phở Thìn Lò Đúc (Hà Nội)
- Bún Chả Hương Liên (Hà Nội)
- Bánh Mì Phố Cổ (Hà Nội)
- Cơm Tấm Ba Ghiền (TP. Hồ Chí Minh)
- Chả Cá Thăng Long (Hà Nội)
- All menus normalized in Vietnamese Dong (VND) ranging from 5.000 ₫ to 369.000 ₫.
