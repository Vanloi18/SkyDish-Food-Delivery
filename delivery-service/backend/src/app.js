import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretjwtkeyforfooddeliverymicroservices2025')) {
  console.error('FATAL: Insecure or missing JWT_SECRET in production mode. Service refusing to start.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';

connectDB();

const app = express();  // Define app before using it
app.use(cors());
app.use(express.json());


app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "delivery-service", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/delivery", deliveryRoutes);

export default app;
