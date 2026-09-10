import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const rawToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token;
    const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
    req.driver = decoded.id;
    req.user = decoded;
    req.role = decoded.role || 'driver';
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

export default authMiddleware;
