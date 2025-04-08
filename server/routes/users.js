// server/routes/users.js
const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// Constants for pricing/fines
const PRICE_PER_DAY = 1.00; // $1 per day
const OVERDUE_FINE = 20.00; // $20 flat fine for being overdue

// GET /api/users/me/borrowed - Get books borrowed by the current logged-in user
router.get('/me/borrowed', authenticateToken, (req, res) => {
    const userId = req.user.id;
    // Select details of books borrowed by this user
    const sql = `
        SELECT id, title, author, coverImageUrl, borrowedAt, dueDate
        FROM books
        WHERE borrowedBy = ?
        ORDER BY dueDate ASC -- Show books due soonest first
    `;
    db.all(sql, [userId], (err, books) => {
        if (err) {
            console.error("Error fetching user's borrowed books:", err.message);
            return res.status(500).json({ message: "Failed to retrieve borrowed books." });
        }

        // Calculate current status and potential fines for each book
        const now = new Date();
        const booksWithStatus = books.map(book => {
            if (!book.dueDate || !book.borrowedAt) {
                console.warn(`Book ID ${book.id} borrowed by user ${userId} is missing date info.`);
                return { ...book, isOverdue: false, fine: 0, daysOverdue: 0, baseCost: 0 };
            }

            const due = new Date(book.dueDate);
            const borrowed = new Date(book.borrowedAt);
            const isOverdue = now > due;

            let fine = 0;
            let daysOverdue = 0;
            let baseCost = 0;

             // Calculate base cost based on intended duration
            if (borrowed < due) {
                const durationMs = due.getTime() - borrowed.getTime();
                const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
                baseCost = Math.max(1, durationDays) * PRICE_PER_DAY; // Min $1 cost
            } else {
                console.warn(`Book ID ${book.id} has borrowedAt date >= dueDate.`);
                 baseCost = PRICE_PER_DAY; // Default to 1 day cost
            }


            if (isOverdue) {
                const overdueMs = now.getTime() - due.getTime();
                 daysOverdue = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));
                 fine = baseCost + OVERDUE_FINE; // Total fine = base cost + flat penalty
            }

            return {
                ...book,
                isOverdue,
                 fine: isOverdue ? fine : 0, // Only apply fine if actually overdue
                daysOverdue: isOverdue ? daysOverdue : 0,
                 baseCost // Pass base cost for potential display
            };
        });
        res.json(booksWithStatus);
    });
});

 // POST /api/users/me/pay/:bookId - Simulate paying fine (Route path simplified)
 router.post('/me/pay/:bookId', authenticateToken, (req, res) => { // MODIFIED: Removed (\d+)
    const userId = req.user.id;
     const bookId = parseInt(req.params.bookId, 10); // Parse ID here

     // Validate parsed ID
    if (isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid book ID." });
    }

     // Check if the user actually borrowed this book and if it's currently overdue
     db.get("SELECT id, borrowedBy, dueDate FROM books WHERE id = ?", [bookId], (err, book) => { // Use parsed bookId
        if (err) { return res.status(500).json({ message: "Server error checking book status." }); }
        if (!book) { return res.status(404).json({ message: "Book not found." }); }
        if (book.borrowedBy !== userId) { return res.status(403).json({ message: "You cannot pay for a book you haven't borrowed." }); }
        if (!book.dueDate) { return res.status(400).json({ message: "Cannot determine payment status; due date missing." }); }

        const now = new Date();
        const due = new Date(book.dueDate);

        if (now <= due) {
            return res.status(400).json({ message: "Book is not overdue. No payment required." });
        }

        // --- Payment Simulation ---
        console.log(`SIMULATION: Payment processed for overdue book ${bookId} by user ${userId}.`);
        // No DB changes in simulation. Frontend handles UI update.
        res.status(200).json({ message: "Payment simulated successfully. You may now return the book." });

    });
});


module.exports = router;