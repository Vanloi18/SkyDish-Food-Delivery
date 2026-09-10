import jwt from "jsonwebtoken";

// Middleware to protect routes by verifying JWT
const protect = (req, res, next) => {
    let token = req.header("Authorization");
    if (token && token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
    } else if (token) {
        token = token.trim();
    }

    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
        res.status(401).json({ message: "Invalid token" });
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
