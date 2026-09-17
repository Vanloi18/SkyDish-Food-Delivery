import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { setIO } from "./utils/socket.js"; // ✅ import setIO
import jwt from "jsonwebtoken";
import Driver from "./models/Driver.js";

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Save socket globally
setIO(io);

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

// WebSocket connection
io.on("connection", (socket) => {
  const role = socket.user.role === "superAdmin" ? "admin" : socket.user.role;
  if (role === "driver") socket.join(`driver:${socket.user.id}`);
  if (role === "restaurant") socket.join(`restaurant:${socket.user.restaurantId || socket.user.id}`);

  socket.on("location-update", async ({ longitude, latitude } = {}) => {
    if (role !== "driver") return;
    if (![longitude, latitude].every(Number.isFinite) || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) return;
    await Driver.updateOne(
      { _id: socket.user.id },
      { $set: { location: { type: "Point", coordinates: [longitude, latitude] } } }
    ).catch(() => {});
  });

  socket.on("disconnect", () => {
    console.log("❌ Driver disconnected");
  });
});

const PORT = process.env.PORT || 5003;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Delivery Service running on port ${PORT}`);
});
