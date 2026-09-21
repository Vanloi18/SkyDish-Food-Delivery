# Delivery Service

## Run locally

From the repository root, start MongoDB first:

```powershell
docker compose up -d mongo
```

Then run the service:

```powershell
cd delivery-service/backend
npm install
npm start
```

The service listens on port `5003`. Set `MONGO_URI` when using a database other than the project default:

```powershell
$env:MONGO_URI = "mongodb://127.0.0.1:27017/food_delivery_db"
```

## Test

With MongoDB running, execute the delivery test suite:

```powershell
npm test
```

The suite covers driver assignment, ownership checks, status lifecycle, pagination, and schema validation.