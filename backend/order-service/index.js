import express from "express";
import dotenv from "dotenv";
import http from "http"; // Needed for WebSockets
import { Server } from "socket.io"; // Import Socket.io
import connectDB from "./config/db.js";
import cors from "cors";
import orderRoutes from "./routes/orderRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import jwt from "jsonwebtoken";
import { setIO } from "./utils/socket.js";

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
setIO(io);
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "order-service", timestamp: new Date().toISOString() });
});
app.use("/api/orders", orderRoutes);
app.use("/api/users", userRoutes);


// WebSocket Connection
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error("Authentication required"));
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { ...decoded, id: decoded.id || decoded._id };
        next();
    } catch (error) {
        next(new Error("Invalid token"));
    }
});

io.on("connection", (socket) => {
    const role = socket.user.role === "superAdmin" ? "admin" : socket.user.role;
    if (role === "restaurant") {
        socket.join(`restaurant:${socket.user.restaurantId || socket.user.id}`);
    } else if (role === "customer") {
        socket.join(`customer:${socket.user.id}`);
    } else if (role === "admin") {
        socket.join("admin:orders");
    }

    socket.on("disconnect", () => {
        console.log("Order socket disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, '0.0.0.0', () => console.log(`Order Service running on port ${PORT}`));
