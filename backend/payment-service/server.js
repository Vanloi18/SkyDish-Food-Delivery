require("dotenv").config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretjwtkeyforfooddeliverymicroservices2025')) {
  console.error('FATAL: Insecure or missing JWT_SECRET in production mode. Service refusing to start.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const paymentRoutes = require("./routes/paymentRoutes");
const webhookRoutes = require("./routes/webhookRoutes");

// Connect to MongoDB
if (require.main === module) {
  connectDB();
}

const app = express();

// Enable CORS for frontend and external callers
app.use(cors());

// IMPORTANT: Mount the webhook route with raw body parsing BEFORE JSON parser middleware.
app.use("/api/payment/webhook", express.raw({ type: "application/json" }), webhookRoutes);

// JSON parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// VNPay calls this public endpoint server-to-server after payment completion.
app.post("/webhooks/vnpay/ipn", paymentRoutes.handleVNPayIpn);

// Swagger Configuration (optional)
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Payment Service API",
      version: "1.0.0",
      description: "API documentation for Payment Microservice (Stripe Integration)",
    },
  },
  apis: ["./routes/*.js"],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Mount payment routes
app.use("/api/payment", paymentRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "payment-service", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => res.send("Payment Service Running"));

const PORT = process.env.PORT || 5004;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Payment Service running on port ${PORT}`);
    console.log(`🌍 API Base URL: http://localhost:${PORT}`);
    console.log(`📖 Swagger API Docs: http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
