// server/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables

// Import routes
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books'); // General book operations (GET, borrow, return)
const userRoutes = require('./routes/users');   // User-specific operations (my books, pay fine)
const adminRoutes = require('./routes/admin'); // Contains ALL admin actions (book CRUD, user management)

const app = express();
const PORT = process.env.PORT || 5001; // Use environment variable or default

// --- Middleware ---
app.use(cors({ // Configure CORS more securely if needed for production
    // origin: 'http://your-frontend-domain.com', // Allow only your frontend
    // methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
app.use(express.json()); // Parse JSON request bodies

// --- API Routes ---

// Authentication
app.use('/api', authRoutes); // Handles /api/login, /api/register

// General User Book Interactions + Admin Book CRUD
// Mounts GET /api/books, POST /api/books/borrow, POST /api/books/return from bookRoutes
// Also mounts POST /api/books/add, PATCH /api/books/:id, DELETE /api/books/:id from adminRoutes
app.use('/api/books', bookRoutes); // General user book access
app.use('/api/books', adminRoutes); // Admin book management actions (add, update, delete)

// User-Specific Data (e.g., their borrowed list, payments)
app.use('/api/users', userRoutes); // Handles /api/users/me/borrowed, /api/users/me/pay/:bookId

// Admin-Specific User Management
app.use('/api/admin', adminRoutes); // Handles /api/admin/users, /api/admin/users/:userId

// --- Basic Root Route (Optional) ---
app.get('/', (req, res) => {
    res.send('Library API is running!');
});

// --- Global Error Handler (Basic) ---
// Catches errors passed via next(err)
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack || err); // Log the full error stack
    res.status(err.status || 500).json({ // Use error status if available, otherwise 500
        message: err.message || 'Something went wrong on the server!'
        });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Trigger database initialization (connects, migrates, seeds)
    // It's okay that 'require' is here; it executes the connection logic once.
    require('./database');
});