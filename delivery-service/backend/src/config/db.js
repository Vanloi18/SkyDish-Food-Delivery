import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Delivery service database connection.
const connectDB = async () => {
  try {
    // Match the project’s actual MongoDB port used in Docker and local development.
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/food_delivery_db";
    const conn = await mongoose.connect(mongoUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
