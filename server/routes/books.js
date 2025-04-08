// server/routes/books.js
const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/books - List all books (requires login)
router.get('/', authenticateToken, (req, res) => {
    // Select all relevant book fields, join with users for borrower name
    const sql = `
        SELECT
            b.id, b.title, b.author, b.isBorrowed, b.borrowedBy,
            b.coverImageUrl, b.borrowedAt, b.dueDate, -- Include new fields
            u.username as borrowerUsername
        FROM books b
        LEFT JOIN users u ON b.borrowedBy = u.id
        ORDER BY b.title COLLATE NOCASE -- Case-insensitive sorting
    `;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error("Error fetching books:", err.message);
            return res.status(500).json({ message: "Failed to retrieve books." });
        }
        // Convert boolean and ensure dates are handled correctly
        const books = rows.map(book => ({
            ...book,
            isBorrowed: book.isBorrowed === 1,
            // Dates are likely stored as strings (ISO format recommended), pass them directly
            borrowedAt: book.borrowedAt,
            dueDate: book.dueDate
        }));
        res.json(books);
    });
});

// POST /api/books/borrow - Borrow a book (requires login)
router.post('/borrow', authenticateToken, (req, res) => {
    const { bookId, duration } = req.body; // Expect duration (in days)
    const userId = req.user.id; // Get user ID from authenticated token

    if (!bookId || duration === undefined || duration === null) {
        return res.status(400).json({ message: "Book ID and duration are required." });
    }

    const borrowDuration = parseInt(duration, 10);
    // Validate duration (e.g., 1 to 7 days)
    if (isNaN(borrowDuration) || borrowDuration < 1 || borrowDuration > 7) {
        return res.status(400).json({ message: "Duration must be between 1 and 7 days." });
    }

    // Calculate dates
    const borrowedAt = new Date();
    const dueDate = new Date();
    dueDate.setDate(borrowedAt.getDate() + borrowDuration);

    // Store dates in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) for consistency and ease of parsing
    const borrowedAtISO = borrowedAt.toISOString();
    const dueDateISO = dueDate.toISOString();

    // Atomic update using WHERE clause to prevent race conditions
    const sql = `
        UPDATE books
        SET isBorrowed = 1, borrowedBy = ?, borrowedAt = ?, dueDate = ?
        WHERE id = ? AND isBorrowed = 0
    `;

    db.run(sql, [userId, borrowedAtISO, dueDateISO, bookId], function (err) {
        if (err) {
            console.error("Error borrowing book:", err.message);
            return res.status(500).json({ message: "Failed to borrow book due to server error." });
        }

        // Check if any row was actually updated
        if (this.changes === 0) {
            // Could be book doesn't exist OR it was already borrowed
            db.get("SELECT id, isBorrowed FROM books WHERE id = ?", [bookId], (err, book) => {
                if (err) {
                    console.error("Error checking book status after borrow attempt:", err.message);
                    return res.status(500).json({ message: "Failed to verify book status." });
                }
                 if (book && book.isBorrowed === 1) { // Check isBorrowed specifically
                    return res.status(409).json({ message: "Book is already borrowed by someone else." });
                } else if (!book) {
                    return res.status(404).json({ message: "Book not found." });
                } else {
                     // This state (exists but isBorrowed=0 and update failed) is unlikely with atomic SQL but handle defensively
                    console.error(`Borrow failed unexpectedly for book ${bookId}. isBorrowed=${book?.isBorrowed}`);
                    return res.status(500).json({ message: "Failed to borrow book for an unknown reason." });
                }
            });
        } else {
            // Successfully borrowed
            // Send back the due date in a user-friendly format if desired
            res.status(200).json({
                message: `Book borrowed successfully. Due on ${dueDate.toLocaleDateString()}.`,
                 dueDate: dueDateISO // Also send ISO format for frontend use
                });
        }
    });
});

// POST /api/books/return - Return a book (requires login)
router.post('/return', authenticateToken, (req, res) => {
    const { bookId } = req.body;
    const userId = req.user.id; // User trying to return the book

    if (!bookId) {
        return res.status(400).json({ message: "Book ID is required." });
    }

    // Optional: Check for overdue fine status before allowing return
    // This depends on the desired workflow. Here, we allow return,
    // payment is handled separately via the /api/users/me/pay endpoint.
    // If payment MUST happen first, add checks here against the dueDate.

    // Atomic update: Only allow the user who borrowed it to return it, and clear relevant fields
    const sql = `
        UPDATE books
        SET isBorrowed = 0, borrowedBy = NULL, borrowedAt = NULL, dueDate = NULL
        WHERE id = ? AND borrowedBy = ?
    `;

    db.run(sql, [bookId, userId], function (err) {
        if (err) {
            console.error("Error returning book:", err.message);
            return res.status(500).json({ message: "Failed to return book due to server error." });
        }

        if (this.changes === 0) {
            // Check why update failed: Book not found, not borrowed, or borrowed by someone else
            db.get("SELECT id, borrowedBy FROM books WHERE id = ?", [bookId], (err, book) => {
                if (err) {
                    console.error("Error checking book status after return attempt:", err.message);
                    return res.status(500).json({ message: "Failed to verify book status." });
                }
                if (!book) {
                    return res.status(404).json({ message: "Book not found." });
                } else if (book.borrowedBy === null) {
                     // Maybe already returned by another request?
                    return res.status(400).json({ message: "Book is not currently borrowed." });
                } else if (book.borrowedBy !== userId) {
                     // Should not be possible if the WHERE clause worked, but check anyway
                    return res.status(403).json({ message: "You cannot return a book you haven't borrowed." });
                } else {
                      // Unknown reason
                    console.error(`Return failed unexpectedly for book ${bookId}. borrowedBy=${book?.borrowedBy}`);
                    return res.status(500).json({ message: "Failed to return book for an unknown reason." });
                }
            });
        } else {
            // Successfully returned
            res.status(200).json({ message: "Book returned successfully." });
        }
    });
});

module.exports = router;