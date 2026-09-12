# SKYDISH FOOD DELIVERY PLATFORM — DEPLOYMENT & RUNTIME GUIDE

## 1. ARCHITECTURE & PORTS

| Service | Port | Base URL | Database URI |
| :--- | :---: | :--- | :--- |
| **Auth Service** | 4000 | `http://127.0.0.1:4000` | `mongodb://127.0.0.1:27000/food_delivery_db` |
| **Restaurant Service** | 5002 | `http://127.0.0.1:5002` | `mongodb://127.0.0.1:27000/food_delivery_db` |
| **Delivery Service** | 5003 | `http://127.0.0.1:5003` | `mongodb://127.0.0.1:27000/food_delivery_db` |
| **Payment Service** | 5004 | `http://127.0.0.1:5004` | `mongodb://127.0.0.1:27000/food_delivery_db` |
| **Order Service** | 5005 | `http://127.0.0.1:5005` | `mongodb://127.0.0.1:27000/food_delivery_db` |
| **Customer Web App** | 3000 | `http://127.0.0.1:3000` | REST & WebSockets |
| **Driver Web App** | 3001 | `http://127.0.0.1:3001` | REST & WebSockets |

## 2. HOW TO RUN MASTER AUDIT TESTS

### Via Node.js
```bash
node scripts/test-all.mjs
```

### Via Windows PowerShell
```powershell
powershell -File .\\scripts\\test-all.ps1
```

## 3. DOCKER DEPLOYMENT
When Docker Engine is active:
```bash
docker compose up -d
```
