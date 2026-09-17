// backend/auth-service/middlewares/auth.js
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

/**
 * Middleware to protect routes by verifying Bearer JWT
 */
exports.protect = async (req, res, next) => {
  try {
    // 1) Check for Bearer token
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token || token.trim() === "" || token === "null" || token === "undefined") {
      return res
        .status(401)
        .json({ message: "You are not logged in. Please log in first." });
    }

    // 2) Verify token
    const secret = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";
    const decoded = jwt.verify(token.trim(), secret);

    if (!decoded || (!decoded.id && !decoded._id)) {
      return res.status(401).json({ message: "Invalid token payload: missing user identity." });
    }

    const userId = decoded.id || decoded._id;
    const userRole = decoded.role || "customer";

    // 3) Verify user existence if MongoDB is connected and role is customer
    if (Customer.db && Customer.db.readyState === 1 && userRole === "customer") {
      const user = await Customer.findById(userId);
      if (!user) {
        return res
          .status(401)
          .json({ message: "The user belonging to this token no longer exists." });
      }
    }

    // 4) Grant access & attach user context
    req.userId = userId;
    req.userRole = userRole;
    req.user = {
      id: userId,
      role: userRole,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    return res.status(401).json({
      message: isExpired
        ? "Token has expired. Please log in again."
        : "Token is invalid or expired.",
      error: err.name,
    });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware
 * Enforces that authenticated user belongs to at least one of the specified roles.
 * Example: router.get('/admin', protect, requireRole('admin', 'superAdmin'), controller);
 */
exports.requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.userRole) {
      return res.status(401).json({ message: "Authentication required before checking permissions." });
    }

    const currentRole = (req.userRole || "").toLowerCase();
    const normalizedRoles = allowedRoles.map((r) => r.toLowerCase());

    // superAdmin always satisfies admin requirement
    const isAllowed =
      normalizedRoles.includes(currentRole) ||
      (normalizedRoles.includes("admin") && currentRole === "superadmin");

    if (!isAllowed) {
      return res.status(403).json({
        message: `Access denied: Role '${req.userRole}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

