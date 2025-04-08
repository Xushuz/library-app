const isAdmin = (req, res, next) => {
    // Assumes authenticateToken middleware runs first and attaches user
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: "Forbidden: Admin access required." });
    }
    next();
};

module.exports = isAdmin;