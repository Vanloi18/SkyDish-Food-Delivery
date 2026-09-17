import jwt from "jsonwebtoken";

// Middleware to protect routes by verifying JWT
const protect = (req, res, next) => {
    let token = req.header("Authorization");
    if (token && token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
    } else if (token) {
        token = token.trim();
    }

    if (!token || token === "null" || token === "undefined") {
        return res.status(401).json({
            success: false,
            message: "Vui lòng đăng nhập để đặt hàng.",
            error: "No token, authorization denied"
        });
    }

    try {
        const secret = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';
        const decoded = jwt.verify(token, secret);

        if (!decoded || (!decoded.id && !decoded._id)) {
            return res.status(401).json({
                success: false,
                message: "Vui lòng đăng nhập để đặt hàng.",
                error: "Invalid token: missing user identity"
            });
        }
        decoded.id = decoded.id || decoded._id;

        // Normalize roles for seamless RBAC
        if (!decoded.role) {
            decoded.role = "customer";
        }
        if (decoded.role === "superAdmin") {
            decoded.role = "admin";
        }

        req.user = decoded;
        next();
    } catch (error) {
        const isExpired = error.name === "TokenExpiredError";
        return res.status(401).json({
            success: false,
            message: "Vui lòng đăng nhập để đặt hàng.",
            error: isExpired ? "Token expired" : "Invalid token"
        });
    }
};

// Middleware to check for specific roles
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: "Access denied: Role not found" });
        }

        const effectiveRole = req.user.role === "superAdmin" ? "admin" : req.user.role;
        const normalizedRoles = roles.map(r => r === "superAdmin" ? "admin" : r);

        // Admin role always has access if explicitly listed or as system superuser
        if (!normalizedRoles.includes(effectiveRole) && effectiveRole !== "admin") {
            return res.status(403).json({ message: "Access denied: Unauthorized role" });
        }

        next();
    };
};

export { protect, authorizeRoles };
