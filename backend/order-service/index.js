import express from "express";
import dotenv from "dotenv";
import http from "http"; // Needed for WebSockets
import { Server } from "socket.io"; // Import Socket.io
import connectDB from "./config/db.js";
import cors from "cors";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'supersecretjwtkeyforfooddeliverymicroservices2025')) {
  console.error('FATAL: Insecure or missing JWT_SECRET in production mode. Service refusing to start.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';

connectDB();

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow frontend connections
        methods: ["GET", "POST"]
    }
});
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "order-service", timestamp: new Date().toISOString() });
});
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);


// WebSocket Connection
io.on("connection", (socket) => {
    console.log("A user connected: ", socket.id);

    // Listen for order status updates
    socket.on("orderStatusUpdate", (data) => {
        console.log("Order Update:", data);
        io.emit("updateOrder", data); // Broadcast update to all clients
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, '0.0.0.0', () => console.log(`Order Service running on port ${PORT}`));
