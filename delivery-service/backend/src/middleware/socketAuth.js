import jwt from "jsonwebtoken";

export const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025"
    );
    const userId = decoded.id || decoded._id;

    if (!["driver", "customer"].includes(decoded.role) || !userId) {
      return next(new Error("Delivery recipient authentication required"));
    }

    socket.data.userId = String(userId);
    next();
  } catch {
    next(new Error("Invalid authentication token"));
  }
};