import http from "http";
import { Server } from "socket.io";
import { authenticateSocket } from "./middleware/socketAuth.js";
import app from "./app.js";
import { setIO } from "./utils/socket.js";

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
io.use(authenticateSocket);

// Save socket globally
setIO(io);

// WebSocket connection
io.on("connection", (socket) => {
  console.log("📡 Delivery recipient connected:", socket.id);
  socket.join(socket.data.userId);

  socket.on("disconnect", () => {
    console.log("❌ Driver disconnected");
  });
});

const PORT = process.env.PORT || 5003;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Delivery Service running on port ${PORT}`);
});
