const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
require('dotenv').config();

const router = express.Router();
const saltRounds = 10;

// POST /api/register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const sql = "INSERT INTO users (username, passwordHash) VALUES (?, ?)";

        db.run(sql, [username, hashedPassword], function (err) {
            if (err) {
                // Check for unique constraint violation (username already exists)
                if (err.message.includes('UNIQUE constraint failed: users.username')) {
                    return res.status(409).json({ message: "Username already taken." });
                }
                console.error("Registration DB error:", err.message);
                return res.status(500).json({ message: "Failed to register user." });
            }
            res.status(201).json({ message: "User registered successfully.", userId: this.lastID });
        });
    } catch (error) {
        console.error("Registration process error:", error);
        res.status(500).json({ message: "Server error during registration." });
    }
});

// POST /api/login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
    }

    const sql = "SELECT * FROM users WHERE username = ?";
    db.get(sql, [username], async (err, user) => {
        if (err) {
            console.error("Login DB error:", err.message);
            return res.status(500).json({ message: "Server error during login." });
        }
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." }); // User not found
        }

        try {
            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid credentials." }); // Password mismatch
            }

            // Credentials match, generate JWT
            const payload = {
                id: user.id,
                username: user.username,
                isAdmin: user.isAdmin === 1 // Ensure boolean type
            };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

            res.json({
                message: "Login successful",
                token: token,
                user: { // Send back some user info (optional, but helpful for frontend)
                    id: user.id,
                    username: user.username,
                    isAdmin: user.isAdmin === 1
                }
            });

        } catch (error) {
            console.error("Login process error:", error);
            res.status(500).json({ message: "Server error during login." });
        }
    });
});

module.exports = router;