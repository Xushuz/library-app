const jwt = require('jsonwebtoken');
require('dotenv').config(); // To access JWT_SECRET

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
            return res.sendStatus(403); // Invalid token
        }
        // Attach user info (id, username, isAdmin) to the request object
        req.user = user;
        next(); // pass the execution off to whatever request the user intended
    });
};

module.exports = authenticateToken;