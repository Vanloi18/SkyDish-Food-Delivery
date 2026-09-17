import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) return res.status(401).json({ message: "No token, authorization denied" });

  try {
    const rawToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token;
    const secret = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';
    const decoded = jwt.verify(rawToken, secret);
    req.driver = decoded.id;
    req.user = decoded;
    req.role = decoded.role;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

export default authMiddleware;

export const authorizeRoles = (...roles) => (req, res, next) => {
  const normalizedRole = req.role === 'superAdmin' ? 'admin' : req.role;
  if (!normalizedRole || !roles.includes(normalizedRole)) {
    return res.status(403).json({ success: false, message: 'Access denied: Unauthorized role' });
  }
  next();
};
