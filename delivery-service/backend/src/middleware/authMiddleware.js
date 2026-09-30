import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ success: false, message: "No token, authorization denied" });
  }

  try {
    const rawToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    const secret = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';
    const decoded = jwt.verify(rawToken, secret);

    const userId = decoded.id || decoded._id;
    decoded.id = userId;

    let role = decoded.role;
    if (role === 'superAdmin' || role === 'superadmin') {
      role = 'admin';
    }
    if (!role) {
      role = 'driver';
    }

    req.driver = userId;
    req.user = { ...decoded, role };
    req.role = role;
    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: isExpired ? "Token expired" : "Token is not valid"
    });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.role) {
      return res.status(403).json({ success: false, message: "Access denied: Role not found" });
    }

    const effectiveRole = (req.role === 'superAdmin' || req.role === 'superadmin') ? 'admin' : req.role;
    const normalizedRoles = roles.map(r => (r === 'superAdmin' || r === 'superadmin') ? 'admin' : r);

    if (!normalizedRoles.includes(effectiveRole) && effectiveRole !== 'admin') {
      return res.status(403).json({ success: false, message: "Access denied: Unauthorized role" });
    }

    next();
  };
};

const protect = authMiddleware;

export { authMiddleware, protect, authorizeRoles };
export default authMiddleware;
