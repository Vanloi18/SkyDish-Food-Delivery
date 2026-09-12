// backend/auth-service/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27000/food_delivery_db";
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB Connected – Auth Service");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
